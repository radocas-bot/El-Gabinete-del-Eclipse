#!/usr/bin/env python3
"""
Servidor local offline y LAN para "El Gabinete del Eclipse — Escape Room 3D".
Sirve los archivos estáticos (incluyendo PWA manifest y Service Worker) sin
dependencias externas y muestra la URL Wi-Fi local para jugar desde el móvil.

Uso:
    python server.py
    python server.py --port 8080
    python server.py --host 127.0.0.1 --no-browser
"""

import argparse
import functools
import http.server
import socket
import threading
import webbrowser
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent


class GameHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".ico": "image/x-icon",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        print(f"  [HTTP] {self.address_string()} - {format % args}")


def detect_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(0.5)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if ip and not ip.startswith("127."):
                return ip
    except OSError:
        pass
    try:
        ip = socket.gethostbyname(socket.gethostname())
        if ip and not ip.startswith("127."):
            return ip
    except OSError:
        pass
    return "127.0.0.1"


def find_free_port(host: str, preferred_port: int, max_tries: int = 50) -> int:
    for port in range(preferred_port, preferred_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
                return port
            except OSError:
                continue
    raise RuntimeError(
        f"No se encontró ningún puerto libre entre {preferred_port} y {preferred_port + max_tries - 1}."
    )


def main():
    parser = argparse.ArgumentParser(
        description="Servidor local y LAN para El Gabinete del Eclipse (3D Escape Room PWA)"
    )
    parser.add_argument("--host", default="0.0.0.0", help="Dirección de escucha (por defecto: 0.0.0.0 para PC y móvil en Wi-Fi)")
    parser.add_argument("--port", type=int, default=8000, help="Puerto inicial (por defecto: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="No abrir automáticamente el navegador")
    args = parser.parse_args()

    port = find_free_port(args.host, args.port)
    local_host = "127.0.0.1" if args.host in ("0.0.0.0", "::", "") else args.host
    local_url = f"http://{local_host}:{port}/index.html"
    lan_ip = detect_lan_ip()
    lan_url = f"http://{lan_ip}:{port}/index.html"

    handler = functools.partial(GameHTTPRequestHandler, directory=str(ROOT_DIR))
    server = http.server.ThreadingHTTPServer((args.host, port), handler)

    print("============================================================")
    print("   EL GABINETE DEL ECLIPSE — Escape Room 3D (Offline / PWA)")
    print("============================================================")
    print(f"   Directorio : {ROOT_DIR}")
    print(f"   PC (Local) : {local_url}")
    if args.host in ("0.0.0.0", "::", "") and lan_ip != "127.0.0.1":
        print(f"   Móvil WiFi : {lan_url}")
        print("   (Abre esta dirección en tu móvil conectado al mismo Wi-Fi)")
    print("   Pulsa Ctrl+C para detener el servidor.")
    print("============================================================")

    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(local_url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando El Gabinete del Eclipse... ¡Hasta pronto!")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
