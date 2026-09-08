/**
 * IntIm Layer Distribution Visualizer
 * Renders the proportional layer sharding map and node memory allocation bar.
 */

export class LayerDistribution {
  constructor(barContainerId, legendContainerId) {
    this.barContainer = document.getElementById(barContainerId);
    this.legendContainer = document.getElementById(legendContainerId);
  }

  render(allocations, totalLayers) {
    if (!this.barContainer || !this.legendContainer) return;

    this.barContainer.innerHTML = '';
    this.legendContainer.innerHTML = '';

    if (!allocations || allocations.length === 0) {
      this.barContainer.innerHTML = '<div style="padding: 4px 8px; font-size: 0.75rem; color: #ff0055;">No active nodes available to shard model layers.</div>';
      return;
    }

    allocations.forEach(alloc => {
      const widthPercent = (alloc.layerCount / (totalLayers || 1)) * 100;

      // 1. Shard Segment Bar
      const segment = document.createElement('div');
      segment.className = 'layer-shard-segment';
      segment.style.width = `${widthPercent}%`;
      segment.style.backgroundColor = alloc.color || '#00f5ff';
      segment.title = `${alloc.nodeName}: Layers ${alloc.startLayer}-${alloc.endLayer} (${alloc.allocatedVRAMGB} GB VRAM)`;
      segment.textContent = `L${alloc.startLayer}-${alloc.endLayer}`;

      this.barContainer.appendChild(segment);

      // 2. Legend Item
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <span class="legend-color-dot" style="background-color: ${alloc.color}"></span>
        <span>${alloc.nodeName} (${alloc.layerCount} layers / ${alloc.allocatedVRAMGB}GB)</span>
      `;
      this.legendContainer.appendChild(legendItem);
    });
  }
}
