"""
IntIm (Intelligent Interconnected Mesh) - Local Master Server
Zero-dependency HTTP & Peer Coordinator Server.
Hosts the Mission Control UI and coordinates local P2P workers over WiFi/LAN.
"""

import os
import sys
import json
import socket
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse


def get_local_ip():
    """Detect local LAN IP address of this machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# In-memory peer registry for live local devices
CONNECTED_PEERS = {}


class IntImMasterHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep console output clean
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # API: Return list of active connected peers
        if parsed.path == "/api/peers":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            peers_list = list(CONNECTED_PEERS.values())
            self.wfile.write(json.dumps(peers_list).encode("utf-8"))
            return

        # Serve static web dashboard files
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        # API: Register new worker node
        if parsed.path == "/api/register_peer":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                node_id = data.get("node_id", f"node-{len(CONNECTED_PEERS) + 1}")
                CONNECTED_PEERS[node_id] = {
                    "id": node_id,
                    "name": data.get("name", "Remote Worker"),
                    "vramGB": float(data.get("vramGB", 8.0)),
                    "tflops": float(data.get("tflops", 12.0)),
                    "deviceType": data.get("deviceType", "Client GPU"),
                    "ip": self.client_address[0],
                    "status": "online",
                    "role": "worker"
                }
                print(f"[+] New Peer Joined Mesh: {CONNECTED_PEERS[node_id]['name']} ({CONNECTED_PEERS[node_id]['vramGB']} GB VRAM from {self.client_address[0]})")
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "registered", "node_id": node_id}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
            return

        # API: Heartbeat
        if parsed.path == "/api/heartbeat":
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return


def start_server(port=8080):
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()
    
    server = HTTPServer(("0.0.0.0", port), IntImMasterHandler)
    
    print("\n" + "=" * 60)
    print("      IntIm Decentralized Mesh Master Server Active")
    print("=" * 60)
    print(f"  [1] Local PC Access:       http://localhost:{port}/index.html")
    print(f"  [2] WiFi / LAN Share Link: http://{local_ip}:{port}/index.html")
    print("=" * 60)
    print("  Share the [2] WiFi link with your friends on the same network!")
    print("  Their devices will appear on the dashboard in real-time.")
    print("  Press Ctrl+C to stop the Master server.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] IntIm Master Server stopped cleanly.")
        server.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    start_server(port)
