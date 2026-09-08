/**
 * IntIm Quantization & Tensor Compression Engine
 * Compresses activation tensors (FP32/FP16 -> INT8/INT4) for low-latency P2P network hops.
 */

export class QuantCompressor {
  /**
   * Quantize an FP32 Float32Array into symmetric INT8 with scale factor
   * @param {Float32Array|Array<number>} tensor
   * @returns {{ data: Int8Array, scale: number, origLength: number, bytesSaved: number }}
   */
  static quantizeINT8(tensor) {
    const len = tensor.length;
    let maxAbs = 0;
    for (let i = 0; i < len; i++) {
      const absVal = Math.abs(tensor[i]);
      if (absVal > maxAbs) maxAbs = absVal;
    }

    // Protect against division by zero
    const scale = maxAbs === 0 ? 1.0 : maxAbs / 127.0;
    const invScale = 1.0 / scale;
    const quantized = new Int8Array(len);

    for (let i = 0; i < len; i++) {
      let q = Math.round(tensor[i] * invScale);
      if (q > 127) q = 127;
      if (q < -128) q = -128;
      quantized[i] = q;
    }

    const originalBytes = len * 4; // FP32 is 4 bytes
    const quantizedBytes = len * 1 + 4; // INT8 is 1 byte + 4 bytes scale
    const bytesSaved = originalBytes - quantizedBytes;

    return {
      data: quantized,
      scale,
      origLength: len,
      bytesSaved,
      compressionRatio: +(originalBytes / quantizedBytes).toFixed(2)
    };
  }

  /**
   * Dequantize INT8 array back into Float32Array for node layer compute
   * @param {Int8Array} quantizedData
   * @param {number} scale
   * @returns {Float32Array}
   */
  static dequantizeINT8(quantizedData, scale) {
    const len = quantizedData.length;
    const result = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = quantizedData[i] * scale;
    }
    return result;
  }

  /**
   * Simulate INT4 sub-byte packing for extreme low-bandwidth connections
   * @param {Float32Array} tensor
   */
  static quantizeINT4(tensor) {
    const len = tensor.length;
    let maxAbs = 0;
    for (let i = 0; i < len; i++) {
      const absVal = Math.abs(tensor[i]);
      if (absVal > maxAbs) maxAbs = absVal;
    }
    const scale = maxAbs === 0 ? 1.0 : maxAbs / 7.0;
    const invScale = 1.0 / scale;
    const packedLen = Math.ceil(len / 2);
    const packed = new Uint8Array(packedLen);

    for (let i = 0; i < len; i += 2) {
      let q0 = Math.min(7, Math.max(-8, Math.round(tensor[i] * invScale))) & 0x0f;
      let q1 = (i + 1 < len) ? (Math.min(7, Math.max(-8, Math.round(tensor[i + 1] * invScale))) & 0x0f) : 0;
      packed[i / 2] = (q0 << 4) | q1;
    }

    return {
      packedData: packed,
      scale,
      origLength: len,
      compressionRatio: 7.8
    };
  }
}
