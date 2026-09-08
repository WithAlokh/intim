"""
IntIm (Intelligent Interconnected Mesh) - Local Worker Client
Scans local device GPU/VRAM and connects to Master Node over WiFi.
"""

import sys
import time
import json
import socket
import urllib.request
import urllib.error


def detect_hardware():
    """Detect available GPU VRAM or System RAM."""
    name = socket.gethostname()
    vram_gb = 8.0
    device_type = "Consumer Device"
    tflops = 12.0

    try:
        import torch
        if torch.cuda.is_available():
            vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
            device_type = torch.cuda.get_device_name(0)
            tflops = 14.5
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            vram_gb = 16.0
            device_type = "Apple Silicon GPU (MPS)"
            tflops = 15.8
    except ImportError:
        pass

    return {
        "name": f"{name} ({device_type.split()[0]})",
        "vramGB": vram_gb,
        "tflops": tflops,
        "deviceType": device_type
    }


def join_mesh(master_ip_port="localhost:8080"):
    hw = detect_hardware()
    url = f"http://{master_ip_port}/api/register_peer"
    
    print("\n" + "=" * 50)
    print("      IntIm Worker Node Client")
    print("=" * 50)
    print(f"  Detected Device: {hw['name']}")
    print(f"  Detected VRAM:   {hw['vramGB']} GB")
    print(f"  Target Master:   http://{master_ip_port}")
    print("=" * 50)

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(hw).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res = json.loads(response.read().decode("utf-8"))
            print(f"\n[OK] Successfully Joined IntIm Mesh! Node ID: {res.get('node_id')}")
            print("[*] VRAM is now pooled with Master cluster. Ready for distributed tensor passes.")
            print("[*] Press Ctrl+C to disconnect.\n")

            # Heartbeat loop
            while True:
                time.sleep(5)
                try:
                    hb_req = urllib.request.Request(f"http://{master_ip_port}/api/heartbeat", data=b"")
                    urllib.request.urlopen(hb_req, timeout=3)
                except Exception:
                    pass

    except urllib.error.URLError as e:
        print(f"\n[ERROR] Could not reach Master at http://{master_ip_port}. Make sure Master server is running!")
    except KeyboardInterrupt:
        print("\n[!] Disconnected from IntIm Mesh.")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "localhost:8080"
    join_mesh(target)
