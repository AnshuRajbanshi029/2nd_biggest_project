"""Direct probe of the Blender MCP add-on socket on localhost:9876 with a hard timeout.
Runs introspection Python and prints the result without using any MCP tool.
"""
import json
import socket
import sys

HOST = "127.0.0.1"
PORT = 9876
TIMEOUT_SECS = 8.0

OUT_PATH = r"C:\Users\baral\Downloads\car racing\wheel_dump.json"

PY = r'''
import bpy, json

def info(obj):
    mw = obj.matrix_world
    mw_decomp = mw.decompose()  # (translation, rotation_quat, scale)
    ml = obj.matrix_local
    ml_decomp = ml.decompose()
    d = {
        "name": obj.name,
        "type": obj.type,
        "parent": obj.parent.name if obj.parent else None,
        "loc_local": [round(v, 4) for v in obj.location],
        "rot_euler_local": [round(v, 4) for v in obj.rotation_euler],
        "rot_quat_local": [round(v, 6) for v in obj.rotation_quaternion],
        "matrix_local_decompose_quat": [round(v, 6) for v in ml_decomp[1]],
        "matrix_world_decompose_quat": [round(v, 6) for v in mw_decomp[1]],
        "matrix_world_translation": [round(v, 4) for v in mw.translation],
        "children": [c.name for c in obj.children],
    }
    if obj.type == "MESH":
        me = obj.data
        if me and me.vertices:
            xs = [v.co.x for v in me.vertices]
            ys = [v.co.y for v in me.vertices]
            zs = [v.co.z for v in me.vertices]
            d["geom_center_local"] = [round((min(xs)+max(xs))/2, 4),
                                      round((min(ys)+max(ys))/2, 4),
                                      round((min(zs)+max(zs))/2, 4)]
            d["geom_extent"] = {
                "x": [round(min(xs), 3), round(max(xs), 3)],
                "y": [round(min(ys), 3), round(max(ys), 3)],
                "z": [round(min(zs), 3), round(max(zs), 3)],
            }
            d["vert_count"] = len(me.vertices)
    return d

result = {}

# probe every FZ16 sub-mesh — identify wheels by extents (round and roughly equal in 2 axes)
fz_meshes = sorted([o.name for o in bpy.data.objects if o.name.startswith("FZ16")])
result["__fz_meshes__"] = fz_meshes
for n in fz_meshes:
    o = bpy.data.objects.get(n)
    if o:
        result[n] = info(o)

with open(r"OUT_PATH_TOKEN", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
'''.replace("OUT_PATH_TOKEN", OUT_PATH.replace("\\", "\\\\"))

def main():
    cmd = {"type": "execute_code", "params": {"code": PY}}
    payload = json.dumps(cmd).encode("utf-8")

    try:
        sock = socket.create_connection((HOST, PORT), timeout=TIMEOUT_SECS)
    except OSError as exc:
        print(f"[connect-fail] {exc}", file=sys.stderr)
        sys.exit(2)

    sock.settimeout(TIMEOUT_SECS)
    try:
        sock.sendall(payload)
        chunks = []
        while True:
            try:
                chunk = sock.recv(8192)
            except socket.timeout:
                print("[recv-timeout] no full response within %.1fs" % TIMEOUT_SECS, file=sys.stderr)
                break
            if not chunk:
                break
            chunks.append(chunk)
            try:
                json.loads(b"".join(chunks).decode("utf-8"))
                break
            except Exception:
                continue
    finally:
        sock.close()

    raw = b"".join(chunks).decode("utf-8", errors="replace")
    if not raw:
        print("[empty-response]", file=sys.stderr)
        sys.exit(3)

    try:
        data = json.loads(raw)
    except Exception:
        print("[non-json] raw=%r" % raw[:400], file=sys.stderr)
        sys.exit(4)

    if data.get("status") == "success":
        try:
            with open(r"C:\Users\baral\Downloads\car racing\wheel_dump.json", "r", encoding="utf-8") as f:
                print(f.read())
        except Exception as exc:
            print(f"[file-read-fail] {exc}", file=sys.stderr)
            print(json.dumps(data, indent=2))
    else:
        print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
