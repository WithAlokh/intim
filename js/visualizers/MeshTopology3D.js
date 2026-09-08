/**
 * IntIm 3D Interactive Mesh Topology Visualizer - White + Teal Green Theme
 */

export class MeshTopology3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.nodes = [];
    this.allocations = [];
    this.activePackets = [];
    
    this.angleX = 0.35;
    this.angleY = 0;
    this.autoRotateSpeed = 0.0025;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.initCanvasResize();
    this.initInteraction();
    this.startRenderLoop();
  }

  initCanvasResize() {
    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    window.addEventListener('resize', resize);
    resize();
  }

  initInteraction() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.angleY += dx * 0.008;
        this.angleX += dy * 0.008;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
  }

  updateClusterData(nodes, allocations) {
    this.nodes = nodes;
    this.allocations = allocations;
  }

  emitTensorPacket(sourceNodeId, targetNodeId, color = '#0d9488') {
    this.activePackets.push({
      sourceId: sourceNodeId,
      targetId: targetNodeId,
      progress: 0.0,
      speed: 0.035 + Math.random() * 0.02,
      color: color,
      radius: 5
    });
  }

  project3DTo2D(x, y, z, centerX, centerY) {
    let cosY = Math.cos(this.angleY);
    let sinY = Math.sin(this.angleY);
    let x1 = x * cosY - z * sinY;
    let z1 = z * cosY + x * sinY;

    let cosX = Math.cos(this.angleX);
    let sinX = Math.sin(this.angleX);
    let y2 = y * cosX - z1 * sinX;
    let z2 = z1 * cosX + y * sinX;

    const fov = 350;
    const distance = fov / (fov + z2);

    return {
      x: centerX + x1 * distance,
      y: centerY + y2 * distance,
      scale: distance,
      z: z2
    };
  }

  startRenderLoop() {
    const render = () => {
      if (!this.ctx) return;
      const width = this.canvas.width / window.devicePixelRatio;
      const height = this.canvas.height / window.devicePixelRatio;
      const centerX = width / 2;
      const centerY = height / 2;

      if (!this.isDragging) {
        this.angleY += this.autoRotateSpeed;
      }

      this.ctx.clearRect(0, 0, width, height);

      // Clean Central Ring
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 85, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#ccfbf1';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.restore();

      const nodeCount = this.nodes.length;
      const radius = Math.min(width, height) * 0.36;
      const projectedNodes = [];

      for (let i = 0; i < nodeCount; i++) {
        const node = this.nodes[i];
        const theta = (i / (nodeCount || 1)) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta * 2) * 15;
        const z = Math.sin(theta) * radius;

        const proj = this.project3DTo2D(x, y, z, centerX, centerY);
        const alloc = this.allocations.find(a => a.nodeId === node.id);

        projectedNodes.push({
          node,
          alloc,
          proj,
          x: proj.x,
          y: proj.y,
          z: proj.z,
          scale: proj.scale,
          color: node.color || '#0d9488'
        });
      }

      projectedNodes.sort((a, b) => b.z - a.z);

      // Mesh Interconnection Lines
      this.ctx.lineWidth = 1.5;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];
          if (n1.node.status === 'online' && n2.node.status === 'online') {
            this.ctx.beginPath();
            this.ctx.moveTo(n1.x, n1.y);
            this.ctx.lineTo(n2.x, n2.y);
            this.ctx.strokeStyle = '#99f6e4';
            this.ctx.stroke();
          }
        }
      }

      // Animated Packets
      for (let p = this.activePackets.length - 1; p >= 0; p--) {
        const pkt = this.activePackets[p];
        const src = projectedNodes.find(pn => pn.node.id === pkt.sourceId);
        const tgt = projectedNodes.find(pn => pn.node.id === pkt.targetId);

        if (src && tgt) {
          pkt.progress += pkt.speed;
          if (pkt.progress >= 1.0) {
            this.activePackets.splice(p, 1);
            continue;
          }

          const px = src.x + (tgt.x - src.x) * pkt.progress;
          const py = src.y + (tgt.y - src.y) * pkt.progress;

          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.arc(px, py, pkt.radius, 0, Math.PI * 2);
          this.ctx.fillStyle = pkt.color;
          this.ctx.fill();
          this.ctx.restore();
        }
      }

      // Nodes
      projectedNodes.forEach(pn => {
        const isOnline = pn.node.status === 'online';
        const nodeRadius = (pn.node.role === 'master' ? 14 : 11) * pn.scale;

        this.ctx.save();
        
        // Outer ring
        this.ctx.beginPath();
        this.ctx.arc(pn.x, pn.y, nodeRadius + 4, 0, Math.PI * 2);
        this.ctx.strokeStyle = isOnline ? pn.color : '#cbd5e1';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Node Body
        this.ctx.beginPath();
        this.ctx.arc(pn.x, pn.y, nodeRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = isOnline ? '#ffffff' : '#f1f5f9';
        this.ctx.fill();

        // Inner Core
        this.ctx.beginPath();
        this.ctx.arc(pn.x, pn.y, nodeRadius * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = isOnline ? pn.color : '#94a3b8';
        this.ctx.fill();

        // Label Text
        this.ctx.font = `600 ${Math.max(10, Math.round(11 * pn.scale))}px 'Inter', sans-serif`;
        this.ctx.fillStyle = isOnline ? '#0f172a' : '#94a3b8';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(pn.node.name, pn.x, pn.y + nodeRadius + 14);

        // Subtitle Text
        if (pn.alloc && isOnline) {
          this.ctx.font = `500 ${Math.max(9, Math.round(10 * pn.scale))}px 'Inter', sans-serif`;
          this.ctx.fillStyle = '#0f766e';
          this.ctx.fillText(`Layers ${pn.alloc.startLayer}-${pn.alloc.endLayer} • ${pn.node.vramGB}GB`, pn.x, pn.y + nodeRadius + 27);
        }

        this.ctx.restore();
      });

      requestAnimationFrame(render);
    };

    render();
  }
}
