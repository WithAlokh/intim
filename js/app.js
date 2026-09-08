/**
 * IntIm Master Application Controller - Clean Light Theme
 */

import { MeshProtocol } from './core/MeshProtocol.js';
import { TensorSharder } from './core/TensorSharder.js';
import { PipelineExecutor } from './core/PipelineExecutor.js';
import { MODEL_REGISTRY } from './models/MicroLlama.js';
import { MeshTopology3D } from './visualizers/MeshTopology3D.js';
import { LayerDistribution } from './visualizers/LayerDistribution.js';
import { TelemetryHUD } from './visualizers/TelemetryHUD.js';

class IntImApp {
  constructor() {
    this.mesh = new MeshProtocol();
    this.sharder = TensorSharder;
    this.executor = new PipelineExecutor(this.mesh, this.sharder);
    
    this.selectedModelKey = 'llama-3-70b';
    this.currentAllocations = [];

    this.initVisualizers();
    this.bindUIEvents();
    this.recalculateAndRender();
  }

  initVisualizers() {
    this.topology3D = new MeshTopology3D('meshTopologyCanvas');
    this.layerDist = new LayerDistribution('layerShardingBar', 'layerLegendContainer');
    this.telemetryHUD = new TelemetryHUD();
  }

  getCurrentModel() {
    return MODEL_REGISTRY[this.selectedModelKey] || MODEL_REGISTRY['llama-3-70b'];
  }

  recalculateAndRender() {
    const modelSpec = this.getCurrentModel();
    const nodes = this.mesh.getNodes();

    // Partition layers
    this.currentAllocations = this.sharder.partitionModel(nodes, modelSpec);

    // Update 3D topology
    this.topology3D.updateClusterData(nodes, this.currentAllocations);

    // Update layer distribution bar
    this.layerDist.render(this.currentAllocations, modelSpec.totalLayers);

    // Update telemetry gauges
    this.telemetryHUD.updateMetrics(nodes, modelSpec);

    // Render node list cards
    this.renderNodeList();
  }

  renderNodeList() {
    const container = document.getElementById('nodeListContainer');
    if (!container) return;

    container.innerHTML = '';
    const nodes = this.mesh.getNodes();

    nodes.forEach(node => {
      const isOnline = node.status === 'online';
      const alloc = this.currentAllocations.find(a => a.nodeId === node.id);

      const card = document.createElement('div');
      card.className = `node-card ${!isOnline ? 'node-offline' : ''}`;
      card.id = `card-${node.id}`;

      card.innerHTML = `
        <div class="node-card-header">
          <div class="node-identity">
            <span class="status-dot" style="background-color: ${isOnline ? node.color : '#94a3b8'};"></span>
            <div>
              <div class="node-name">${node.name}</div>
              <div class="node-hw-specs">${node.deviceType} &bull; ${node.ip}</div>
            </div>
          </div>
          <span class="node-role-badge ${node.role === 'master' ? 'role-master' : 'role-worker'}">${node.role}</span>
        </div>

        <div class="node-metrics-grid">
          <div class="node-metric-cell">
            <span class="node-metric-label">VRAM</span>
            <span class="node-metric-val">${node.vramGB} GB</span>
          </div>
          <div class="node-metric-cell">
            <span class="node-metric-label">COMPUTE</span>
            <span class="node-metric-val">${node.tflops} TFLOPS</span>
          </div>
          <div class="node-metric-cell">
            <span class="node-metric-label">PING</span>
            <span class="node-metric-val">${node.pingMs} ms</span>
          </div>
        </div>

        ${alloc && isOnline ? `
          <div style="font-size: 0.72rem; color: #475569; display: flex; justify-content: space-between; font-weight: 500;">
            <span>Layers ${alloc.startLayer}-${alloc.endLayer}</span>
            <span>(${alloc.allocatedVRAMGB} GB allocated)</span>
          </div>
        ` : ''}

        <div class="node-actions">
          <button class="canvas-btn" style="font-size: 0.72rem; padding: 3px 8px;" data-action="toggle-status" data-node-id="${node.id}">
            ${isOnline ? 'Disconnect' : 'Connect'}
          </button>
          ${node.role !== 'master' ? `
            <button class="node-btn-icon" title="Remove Node" data-action="remove-node" data-node-id="${node.id}">
              &times;
            </button>
          ` : ''}
        </div>
      `;

      container.appendChild(card);
    });
  }

  bindUIEvents() {
    // Model Select
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        this.selectedModelKey = e.target.value;
        this.recalculateAndRender();
      });
    }

    // Node list action delegation
    const nodeContainer = document.getElementById('nodeListContainer');
    if (nodeContainer) {
      nodeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const nodeId = btn.dataset.nodeId;

        if (action === 'toggle-status') {
          this.mesh.toggleNodeStatus(nodeId);
          this.recalculateAndRender();
        } else if (action === 'remove-node') {
          this.mesh.removeNode(nodeId);
          this.recalculateAndRender();
        }
      });
    }

    // Add Node Form
    const addNodeBtn = document.getElementById('btnAddNode');
    if (addNodeBtn) {
      addNodeBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('newNodeName');
        const vramInput = document.getElementById('newNodeVRAM');
        const tflopsInput = document.getElementById('newNodeTFLOPS');

        const name = nameInput.value.trim() || `Worker Laptop ${this.mesh.getNodes().length + 1}`;
        const vram = parseFloat(vramInput.value) || 8.0;
        const tflops = parseFloat(tflopsInput.value) || 12.0;

        this.mesh.addNode({ name, vramGB: vram, tflops });
        nameInput.value = '';
        this.recalculateAndRender();
      });
    }

    // Prompt Presets
    document.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
          promptInput.value = pill.dataset.prompt;
        }
      });
    });

    // Run Inference Button
    const runBtn = document.getElementById('btnRunInference');
    const promptInput = document.getElementById('promptInput');
    const tokenOutput = document.getElementById('tokenStreamOutput');
    const pipelineHopsContainer = document.getElementById('pipelineHopsContainer');

    if (runBtn) {
      runBtn.addEventListener('click', async () => {
        if (this.executor.isGenerating) {
          this.executor.cancel();
          runBtn.innerHTML = 'Run Inference';
          return;
        }

        const prompt = promptInput.value.trim();
        if (!prompt) return;

        runBtn.innerHTML = 'Stop Execution';
        runBtn.classList.add('btn-danger');
        tokenOutput.innerHTML = '';
        pipelineHopsContainer.innerHTML = '';

        const modelSpec = this.getCurrentModel();

        await this.executor.runDistributedInference(prompt, modelSpec, {
          onPipelineHop: (hop) => {
            if (hop.sourceNodeId && hop.targetNodeId && hop.sourceNodeId !== hop.targetNodeId) {
              const srcNode = this.mesh.getNodes().find(n => n.id === hop.sourceNodeId);
              this.topology3D.emitTensorPacket(hop.sourceNodeId, hop.targetNodeId, srcNode ? srcNode.color : '#2563eb');
            }

            const hopEl = document.createElement('div');
            hopEl.className = 'pipeline-hop-node hop-active';
            hopEl.innerHTML = `
              <span>${hop.sourceName || 'Master'}</span>
              <span class="hop-arrow">&rarr;</span>
              <span>${hop.targetName || 'Worker'}</span>
              <span style="color: var(--accent-primary); font-size: 0.68rem;">(${hop.bytesTransferred}B INT8)</span>
            `;
            pipelineHopsContainer.appendChild(hopEl);
            pipelineHopsContainer.scrollLeft = pipelineHopsContainer.scrollWidth;

            const activeCard = document.getElementById(`card-${hop.sourceNodeId}`);
            if (activeCard) {
              activeCard.classList.add('active-transmitting');
              setTimeout(() => activeCard.classList.remove('active-transmitting'), 300);
            }
          },

          onToken: (token, meta) => {
            const span = document.createElement('span');
            span.className = 'token-word';
            span.textContent = token;
            tokenOutput.appendChild(span);
            tokenOutput.scrollTop = tokenOutput.scrollHeight;
            this.telemetryHUD.setGenerationSpeed(meta.tokensPerSec);
          },

          onComplete: () => {
            runBtn.innerHTML = 'Run Inference';
            runBtn.classList.remove('btn-danger');
          },

          onError: (err) => {
            tokenOutput.innerHTML += `\n\n<span style="color: #e11d48;">[Pipeline Error]: ${err.message}</span>`;
            runBtn.innerHTML = 'Run Inference';
            runBtn.classList.remove('btn-danger');
          }
        });
      });
    }

    // Simulator Buttons
    const btnKillRandom = document.getElementById('btnKillRandom');
    if (btnKillRandom) {
      btnKillRandom.addEventListener('click', () => {
        const workers = this.mesh.getActiveNodes().filter(n => n.role !== 'master');
        if (workers.length > 0) {
          const victim = workers[Math.floor(Math.random() * workers.length)];
          this.mesh.toggleNodeStatus(victim.id);
          this.recalculateAndRender();
          
          const tokenOutput = document.getElementById('tokenStreamOutput');
          if (tokenOutput) {
            tokenOutput.innerHTML += `\n<span style="color: #d97706;">[Fault Tolerance]: Node "${victim.name}" disconnected. Re-partitioned active cluster in 1.4ms.</span>\n`;
            tokenOutput.scrollTop = tokenOutput.scrollHeight;
          }
        }
      });
    }

    const btnSpikeLatency = document.getElementById('btnSpikeLatency');
    if (btnSpikeLatency) {
      btnSpikeLatency.addEventListener('click', () => {
        this.mesh.simulatedBaseLatencyMs = this.mesh.simulatedBaseLatencyMs === 12 ? 85 : 12;
        btnSpikeLatency.textContent = this.mesh.simulatedBaseLatencyMs > 12 ? 'High Latency (85ms)' : 'Normal Latency (12ms)';
        this.recalculateAndRender();
      });
    }

    // Python SDK Modal toggle
    const btnOpenSDK = document.getElementById('btnOpenSDK');
    const modalOverlay = document.getElementById('sdkModalOverlay');
    const modalClose = document.getElementById('modalCloseBtn');

    if (btnOpenSDK && modalOverlay) {
      btnOpenSDK.addEventListener('click', () => modalOverlay.classList.add('active'));
    }
    if (modalClose && modalOverlay) {
      modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
    }
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
      });
    }
  }
}

// Bootstrap Application when DOM loads
window.addEventListener('DOMContentLoaded', () => {
  window.intimApp = new IntImApp();
});
