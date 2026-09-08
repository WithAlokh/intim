/**
 * IntIm Neural Model Registry & Distributed Simulation Models
 */

export const MODEL_REGISTRY = {
  'llama-3-70b': {
    id: 'llama-3-70b',
    name: 'Llama-3-70B-Instruct (Quantized INT4/8)',
    totalLayers: 80,
    totalParamsGB: 40.0,
    hiddenDim: 8192,
    contextWindow: 128000,
    description: 'Ultra-high intelligence 70B parameter LLM split across the cluster.',
    badge: '70 Billion'
  },
  'deepseek-r1-67b': {
    id: 'deepseek-r1-67b',
    name: 'DeepSeek-R1-67B (Reasoning Shard)',
    totalLayers: 64,
    totalParamsGB: 34.0,
    hiddenDim: 7168,
    contextWindow: 64000,
    description: 'Reinforcement Learning reasoning model with multi-step chain-of-thought.',
    badge: 'Reasoning 67B'
  },
  'mistral-nemo-12b': {
    id: 'mistral-nemo-12b',
    name: 'Mistral-NeMo-12B (Apache 2.0)',
    totalLayers: 40,
    totalParamsGB: 14.0,
    hiddenDim: 5120,
    contextWindow: 128000,
    description: 'High efficiency multi-lingual model fitting perfectly on 2-3 laptops.',
    badge: '12 Billion'
  },
  'intim-micro-demo': {
    id: 'intim-micro-demo',
    name: 'IntIm-Micro-Engine (Instant Live Execution)',
    totalLayers: 16,
    totalParamsGB: 4.5,
    hiddenDim: 2048,
    contextWindow: 8192,
    description: 'Lightweight distributed model optimized for live instantaneous simulation.',
    badge: 'Micro 4.5GB'
  }
};

/**
 * Intelligent Token Generator simulating realistic distributed inference responses
 */
export class DistributedInferenceEngine {
  static getResponseForPrompt(prompt, modelId) {
    const p = prompt.toLowerCase();

    if (p.includes('strawberry') || p.includes('how many r')) {
      return `Based on distributed byte-level inspection across the 4 cluster nodes:\n\nThe word "strawberry" contains exactly 3 letter 'r's:\n1. st[r]awberry (1st)\n2. strawbe[r]ry (2nd)\n3. strawber[r]y (3rd)\n\nDistributed pipeline verified without tokenization distortion.`;
    }

    if (p.includes('code') || p.includes('python') || p.includes('algorithm') || p.includes('p2p')) {
      return `\`\`\`python
import intim

# Connect to the decentralized IntIm cluster
cluster = intim.MeshCluster.discover(network_id="intim-mesh-alpha-7x")
print(f"Connected to {len(cluster.nodes)} nodes with {cluster.total_vram_gb} GB pooled VRAM!")

# Auto-partition and load 70B model across all laptops
model = cluster.load_sharded_model("meta-llama/Llama-3-70B-Instruct")
output = model.generate("Explain quantum superposition in simple terms", max_tokens=150)
print(output)
\`\`\`
✨ Executed in parallel with 0 cloud GPU costs!`;
    }

    if (p.includes('quantum') || p.includes('superposition')) {
      return `Quantum superposition is a fundamental principle of quantum mechanics where a physical system exists simultaneously in multiple possible states or configurations until it is measured. \n\nIn computing terms, while classical bits are strictly 0 or 1, quantum qubits exist in a continuous linear combination of |0⟩ and |1⟩, allowing exponential parallel state evaluation across multidimensional Hilbert space.`;
    }

    if (p.includes('hindi') || p.includes('namaste') || p.includes('kya')) {
      return `IntIm P2P Mesh Cluster ke dwara yeh response alag-alag laptops ke GPU par parallelly process ho kar generate hua hai! \n\nSabhi devices ne milkar 70B model ki layers ko distribute kiya aur bina kisi cloud server ke 100% private aur free AI compute provide kiya.`;
    }

    return `[IntIm Distributed Pipeline Execution Result]\n\nPrompt Analysis: "${prompt}"\n\n1. Activations propagated through partitioned pipeline stages across active mesh peers.\n2. Ring-Attention KV-cache updated in real-time.\n3. Model weights pooled across heterogeneous consumer VRAM with zero latency bottlenecks.\n\nDemocratized AI is active: 100% decentralized, private, and peer-to-peer!`;
  }
}
