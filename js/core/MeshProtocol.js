/**
 * IntIm P2P Mesh Protocol & Node Cluster Manager
 * Handles zero-config discovery, heartbeats, latency telemetry, and cluster topology state.
 */

export class MeshProtocol {
  constructor() {
    this.clusterId = 'intim-mesh-alpha-7x';
    this.nodes = [];
    this.listeners = [];
    this.packetLossRate = 0.0; // 0% to 100%
    this.simulatedBaseLatencyMs = 12; // Base local network RTT

    this.initDefaultCluster();
  }

  initDefaultCluster() {
    this.nodes = [
      {
        id: 'node-0-master',
        name: "Alok's Rig (RTX 3060)",
        role: 'master',
        deviceType: 'Desktop GPU',
        vramGB: 12.0,
        tflops: 13.0,
        pingMs: 2,
        status: 'online',
        color: '#00f5ff',
        ip: '192.168.1.104',
        layersHeld: []
      },
      {
        id: 'node-1-worker',
        name: "Rohan's MacBook Air (M2)",
        role: 'worker',
        deviceType: 'Unified SoC',
        vramGB: 16.0,
        tflops: 15.8,
        pingMs: 14,
        status: 'online',
        color: '#9d4edd',
        ip: '192.168.1.112',
        layersHeld: []
      },
      {
        id: 'node-2-worker',
        name: "Priya's Laptop (RTX 4060)",
        role: 'worker',
        deviceType: 'Mobile GPU',
        vramGB: 8.0,
        tflops: 14.5,
        pingMs: 18,
        status: 'online',
        color: '#00ff88',
        ip: '192.168.1.120',
        layersHeld: []
      },
      {
        id: 'node-3-worker',
        name: "Lab Server (Tesla T4)",
        role: 'worker',
        deviceType: 'DataCenter GPU',
        vramGB: 16.0,
        tflops: 8.1,
        pingMs: 24,
        status: 'online',
        color: '#ffb703',
        ip: '192.168.1.150',
        layersHeld: []
      }
    ];
  }

  getNodes() {
    return this.nodes;
  }

  getActiveNodes() {
    return this.nodes.filter(n => n.status === 'online');
  }

  addNode(nodeConfig) {
    const defaultColors = ['#3a86ff', '#f72585', '#4cc9f0', '#7209b7', '#06d6a0'];
    const color = defaultColors[this.nodes.length % defaultColors.length];
    
    const newNode = {
      id: `node-${Date.now().toString(36)}`,
      name: nodeConfig.name || `Worker Node ${this.nodes.length + 1}`,
      role: 'worker',
      deviceType: nodeConfig.deviceType || 'Consumer GPU',
      vramGB: parseFloat(nodeConfig.vramGB) || 8.0,
      tflops: parseFloat(nodeConfig.tflops) || 10.0,
      pingMs: Math.floor(Math.random() * 20) + 10,
      status: 'online',
      color: color,
      ip: `192.168.1.${100 + this.nodes.length}`,
      layersHeld: []
    };

    this.nodes.push(newNode);
    this.notifyStateChange('node_joined', newNode);
    return newNode;
  }

  removeNode(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.role === 'master') {
      // Elect new master if master leaves
      const nextOnline = this.nodes.find(n => n.id !== nodeId && n.status === 'online');
      if (nextOnline) {
        nextOnline.role = 'master';
      }
    }

    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.notifyStateChange('node_removed', { nodeId });
  }

  toggleNodeStatus(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.status = node.status === 'online' ? 'offline' : 'online';
    this.notifyStateChange('node_status_changed', node);
  }

  /**
   * Simulate a packet transmission with real-world latency & packet loss check
   */
  async transmitActivationPacket(sourceNodeId, targetNodeId, payloadSizeKB) {
    if (Math.random() < this.packetLossRate) {
      throw new Error(`Packet dropped due to simulated network packet loss between ${sourceNodeId} and ${targetNodeId}`);
    }

    const target = this.nodes.find(n => n.id === targetNodeId);
    const latency = (target ? target.pingMs : 15) + this.simulatedBaseLatencyMs;
    
    // Artificial wait matching realistic network hop
    await new Promise(resolve => setTimeout(resolve, Math.max(10, latency / 2)));
    return { success: true, latencyMs: latency, transferKB: payloadSizeKB };
  }

  setPacketLossRate(rate) {
    this.packetLossRate = Math.max(0, Math.min(0.9, rate));
    this.notifyStateChange('network_condition_changed', { packetLoss: this.packetLossRate });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyStateChange(event, data) {
    this.listeners.forEach(cb => cb(event, data, this.nodes));
  }
}
