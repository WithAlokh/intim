/**
 * IntIm Tensor & Layer Sharding Engine
 * Dynamically partitions deep transformer layers across heterogenous consumer hardware.
 */

export class TensorSharder {
  /**
   * Calculate layer distribution across active nodes
   * @param {Array<Object>} nodes - Array of active IntIm nodes
   * @param {Object} modelSpec - Model specifications { totalLayers, totalParamsGB, name, hiddenDim }
   * @returns {Array<Object>} Array of shard allocations per node
   */
  static partitionModel(nodes, modelSpec) {
    const activeNodes = nodes.filter(n => n.status === 'online');
    if (activeNodes.length === 0) {
      return [];
    }

    const totalLayers = modelSpec.totalLayers || 32;
    const modelVRAMGB = modelSpec.totalParamsGB || 16;
    const gbPerLayer = modelVRAMGB / totalLayers;

    // Calculate total available VRAM in the cluster
    const totalClusterVRAM = activeNodes.reduce((acc, n) => acc + n.vramGB, 0);
    const totalComputeTFLOPS = activeNodes.reduce((acc, n) => acc + n.tflops, 0);

    // Weighted capacity score = 65% VRAM weight + 35% Compute TFLOPS weight
    const nodeScores = activeNodes.map(node => {
      const vramShare = node.vramGB / (totalClusterVRAM || 1);
      const computeShare = node.tflops / (totalComputeTFLOPS || 1);
      return {
        node,
        score: (vramShare * 0.65) + (computeShare * 0.35)
      };
    });

    // Normalize scores
    const sumScores = nodeScores.reduce((acc, ns) => acc + ns.score, 0);
    
    // Allocate integer layers
    let currentLayer = 0;
    const allocations = [];

    for (let i = 0; i < nodeScores.length; i++) {
      const { node, score } = nodeScores[i];
      const normalizedRatio = score / (sumScores || 1);
      
      let layerCount = 0;
      if (i === nodeScores.length - 1) {
        // Last node gets whatever is remaining
        layerCount = Math.max(1, totalLayers - currentLayer);
      } else {
        layerCount = Math.max(1, Math.round(normalizedRatio * totalLayers));
        // Clamp to not exceed totalLayers
        if (currentLayer + layerCount > totalLayers) {
          layerCount = totalLayers - currentLayer;
        }
      }

      const startLayer = currentLayer;
      const endLayer = Math.min(totalLayers - 1, currentLayer + layerCount - 1);
      const allocatedVRAM = +(layerCount * gbPerLayer).toFixed(2);

      allocations.push({
        nodeId: node.id,
        nodeName: node.name,
        role: node.role,
        startLayer,
        endLayer,
        layerCount,
        allocatedVRAMGB: allocatedVRAM,
        vramUtilizationPercent: Math.min(100, Math.round((allocatedVRAM / node.vramGB) * 100)),
        color: node.color,
        isMaster: node.role === 'master'
      });

      currentLayer += layerCount;
      if (currentLayer >= totalLayers) break;
    }

    return allocations;
  }

  /**
   * Verify if cluster has sufficient pooled VRAM to host the requested model
   */
  static validateClusterCapacity(nodes, modelSpec) {
    const activeNodes = nodes.filter(n => n.status === 'online');
    const totalVRAM = activeNodes.reduce((acc, n) => acc + n.vramGB, 0);
    const requiredVRAM = modelSpec.totalParamsGB;

    return {
      canHost: totalVRAM >= requiredVRAM,
      totalVRAM,
      requiredVRAM,
      deficit: Math.max(0, +(requiredVRAM - totalVRAM).toFixed(1)),
      utilizationPercent: +(Math.min(100, (requiredVRAM / totalVRAM) * 100)).toFixed(1)
    };
  }
}
