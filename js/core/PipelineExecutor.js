/**
 * IntIm Pipeline Executor
 * Coordinates distributed token generation, activation pipeline hops, and audio feedback.
 */

import { QuantCompressor } from './QuantCompressor.js';
import { DistributedInferenceEngine } from '../models/MicroLlama.js';

export class PipelineExecutor {
  constructor(meshProtocol, tensorSharder) {
    this.mesh = meshProtocol;
    this.sharder = tensorSharder;
    this.isGenerating = false;
    this.shouldCancel = false;
    this.audioContext = null;
    this.soundEnabled = true;

    this.initAudio();
  }

  initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  playTokenPing(frequency = 880, duration = 0.035) {
    if (!this.soundEnabled || !this.audioContext) return;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      gain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Audio playback failsafe
    }
  }

  /**
   * Execute distributed inference across the P2P cluster
   */
  async runDistributedInference(prompt, modelSpec, callbacks = {}) {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.shouldCancel = false;

    const {
      onToken,
      onPipelineHop,
      onComplete,
      onError,
      onMetricsUpdate
    } = callbacks;

    try {
      // 1. Get current layer allocations
      const allocations = this.sharder.partitionModel(this.mesh.getNodes(), modelSpec);
      if (allocations.length === 0) {
        throw new Error("No online nodes available in the IntIm cluster!");
      }

      // Check cluster capacity
      const capacity = this.sharder.validateClusterCapacity(this.mesh.getNodes(), modelSpec);
      if (!capacity.canHost) {
        throw new Error(`Insufficient pooled VRAM! Cluster has ${capacity.totalVRAM}GB, but model requires ${capacity.requiredVRAM}GB.`);
      }

      const fullResponse = DistributedInferenceEngine.getResponseForPrompt(prompt, modelSpec.id);
      const words = fullResponse.split(/(\s+|\n+)/);

      let totalTokens = 0;
      let startTime = performance.now();
      let totalTransferredBytes = 0;

      // Simulate prompt ingest at Master node
      if (onPipelineHop) {
        onPipelineHop({
          step: 'prompt_ingest',
          sourceNodeId: allocations[0].nodeId,
          targetNodeId: allocations[0].nodeId,
          layers: `Embedding & Layers ${allocations[0].startLayer}-${allocations[0].endLayer}`,
          bytesTransferred: 0
        });
      }

      // Stream each token through the distributed pipeline
      for (let i = 0; i < words.length; i++) {
        if (this.shouldCancel) break;

        const word = words[i];
        if (!word) continue;

        // Simulate forward activation pass through all allocated shards
        for (let s = 0; s < allocations.length - 1; s++) {
          if (this.shouldCancel) break;

          const sourceShard = allocations[s];
          const targetShard = allocations[s + 1];

          // Simulate mock hidden activation tensor (e.g. 4096 elements)
          const dummyTensor = new Float32Array(modelSpec.hiddenDim ? Math.min(modelSpec.hiddenDim, 2048) : 1024);
          for (let k = 0; k < dummyTensor.length; k++) {
            dummyTensor[k] = (Math.random() * 2) - 1;
          }

          // Quantize for P2P transport
          const quantized = QuantCompressor.quantizeINT8(dummyTensor);
          totalTransferredBytes += quantized.data.byteLength;

          // Transmit packet through P2P mesh
          if (onPipelineHop) {
            onPipelineHop({
              step: 'activation_forward',
              sourceNodeId: sourceShard.nodeId,
              targetNodeId: targetShard.nodeId,
              sourceName: sourceShard.nodeName,
              targetName: targetShard.nodeName,
              fromLayers: `${sourceShard.startLayer}-${sourceShard.endLayer}`,
              toLayers: `${targetShard.startLayer}-${targetShard.endLayer}`,
              bytesTransferred: quantized.data.byteLength,
              compressionRatio: quantized.compressionRatio
            });
          }

          await this.mesh.transmitActivationPacket(sourceShard.nodeId, targetShard.nodeId, quantized.data.byteLength / 1024);
        }

        // Final node produces sampled token
        totalTokens++;
        const elapsedSec = (performance.now() - startTime) / 1000;
        const tokensPerSec = +(totalTokens / (elapsedSec || 1)).toFixed(1);

        if (onToken) {
          onToken(word, {
            tokenIndex: totalTokens,
            tokensPerSec,
            totalTransferredKB: +(totalTransferredBytes / 1024).toFixed(1)
          });
        }

        if (onMetricsUpdate) {
          onMetricsUpdate({
            tokensPerSec,
            totalTokens,
            elapsedSec: +elapsedSec.toFixed(2),
            networkTrafficMB: +(totalTransferredBytes / (1024 * 1024)).toFixed(2)
          });
        }

        // Play subtle acoustic telemetry feedback
        this.playTokenPing(600 + (totalTokens % 8) * 60);

        // Natural cadence delay
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 40) + 30));
      }

      if (onComplete) {
        onComplete({
          totalTokens,
          elapsedSec: +((performance.now() - startTime) / 1000).toFixed(2),
          tokensPerSec: +(totalTokens / (((performance.now() - startTime) / 1000) || 1)).toFixed(1)
        });
      }

    } catch (err) {
      console.error('Distributed inference error:', err);
      if (onError) onError(err);
    } finally {
      this.isGenerating = false;
    }
  }

  cancel() {
    this.shouldCancel = true;
    this.isGenerating = false;
  }
}
