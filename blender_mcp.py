"""
Tiny Blender MCP TCP client.

The official addon (ahujasid/blender-mcp) exposes a JSON-over-TCP server on
localhost:9876. Commands are sent as one JSON object per request, and the
addon replies with a JSON object too. We only need 'execute_code' and
'get_scene_info' for this workflow.

Usage:
    from blender_mcp import call, run

    info = call("get_scene_info", {})
    print(info)

    run('''
import bpy
print([o.name for o in bpy.data.objects][:5])
''')
"""

from __future__ import annotations

import json
import socket
from typing import Any


HOST = "127.0.0.1"
PORT = 9876
TIMEOUT = 60.0


def call(cmd_type: str, params: dict[str, Any] | None = None) -> Any:
    """Send one MCP command, return the parsed 'result' (or raise)."""
    payload = {"type": cmd_type, "params": params or {}}
    data = json.dumps(payload).encode("utf-8")

    with socket.create_connection((HOST, PORT), timeout=TIMEOUT) as s:
        s.settimeout(TIMEOUT)
        s.sendall(data)

        # The addon responds with a single JSON object. It does NOT
        # delimit messages, so we read until the socket's buffer drains
        # and json.loads succeeds (the server closes/half-closes after
        # writing the full reply).
        chunks: list[bytes] = []
        while True:
            try:
                chunk = s.recv(8192)
            except socket.timeout:
                break
            if not chunk:
                break
            chunks.append(chunk)
            try:
                parsed = json.loads(b"".join(chunks).decode("utf-8"))
                # We got a complete object; stop draining.
                if parsed.get("status") == "error":
                    raise RuntimeError(
                        f"Blender MCP error: {parsed.get('message', parsed)}"
                    )
                return parsed.get("result", parsed)
            except json.JSONDecodeError:
                # incomplete — keep reading
                continue

    raise RuntimeError("Blender MCP closed without returning JSON")


def run(code: str) -> str:
    """Execute Python in Blender, return its captured stdout."""
    result = call("execute_code", {"code": code})
    if isinstance(result, dict):
        return result.get("result") or result.get("output") or json.dumps(result)
    return str(result)


if __name__ == "__main__":
    # Smoke test
    print(run("import bpy; print('blender', bpy.app.version_string)"))
