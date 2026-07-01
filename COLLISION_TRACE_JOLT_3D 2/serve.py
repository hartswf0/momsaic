from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, threading, webbrowser

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
PORT = 8080
url = f"http://127.0.0.1:{PORT}/"
threading.Timer(0.8, lambda: webbrowser.open(url)).start()
print(f"Collision Trace Jolt 3D: {url}")
print("Keep this window open while playing. Press Ctrl+C to stop.")
ThreadingHTTPServer(("127.0.0.1", PORT), SimpleHTTPRequestHandler).serve_forever()
