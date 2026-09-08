/**
 * IntIm Telemetry HUD
 * Updates real-time gauges: Virtual VRAM, Cluster TFLOPS, Network Latency RTT, Token Velocity.
 */

export class TelemetryHUD {
  constructor() {
    this.vramValueEl = document.getElementById('metricPooledVRAM');
    this.vramBarEl = document.getElementById('meterVRAMFill');
    this.tflopsValueEl = document.getElementById('metricClusterTFLOPS');
    this.tflopsBarEl = document.getElementById('meterTFLOPSFill');
    this.latencyValueEl = document.getElementById('metricAvgLatency');
    this.tokensSecValueEl = document.getElementById('metricTokensSec');
  }

  updateMetrics(nodes, modelSpec) {
    const activeNodes = nodes.filter(n => n.status === 'online');
    
    // Total pooled VRAM
    const totalVRAM = activeNodes.reduce((acc, n) => acc + n.vramGB, 0);
    const requiredVRAM = modelSpec ? modelSpec.totalParamsGB : 16;
    
    // Total compute TFLOPS
    const totalTFLOPS = activeNodes.reduce((acc, n) => acc + n.tflops, 0);
    
    // Average Latency
    const avgLatency = activeNodes.length > 0 
      ? Math.round(activeNodes.reduce((acc, n) => acc + n.pingMs, 0) / activeNodes.length)
      : 0;

    if (this.vramValueEl) {
      this.vramValueEl.innerHTML = `${totalVRAM.toFixed(1)} <span class="meter-unit">GB</span>`;
    }
    if (this.vramBarEl) {
      const vramPercent = Math.min(100, Math.round((requiredVRAM / (totalVRAM || 1)) * 100));
      this.vramBarEl.style.width = `${vramPercent}%`;
    }

    if (this.tflopsValueEl) {
      this.tflopsValueEl.innerHTML = `${totalTFLOPS.toFixed(1)} <span class="meter-unit">TFLOPS</span>`;
    }
    if (this.tflopsBarEl) {
      this.tflopsBarEl.style.width = `${Math.min(100, Math.round((totalTFLOPS / 120) * 100))}%`;
    }

    if (this.latencyValueEl) {
      this.latencyValueEl.innerHTML = `${avgLatency} <span class="meter-unit">ms RTT</span>`;
    }
  }

  setGenerationSpeed(tokensPerSec) {
    if (this.tokensSecValueEl) {
      this.tokensSecValueEl.innerHTML = `${tokensPerSec} <span class="meter-unit">tok/s</span>`;
    }
  }
}
