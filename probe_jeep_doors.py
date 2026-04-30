"""Inspect the Jeep model in Blender (or import it from disk if missing) and
dump every object's name, parent, mesh extents and material so we can locate
the door meshes and figure out a hinge axis to close them.

Same TCP-execute-code protocol as probe_blender.py / probe_hub.py.
"""
import json
import socket
import sys

HOST, PORT, T = "127.0.0.1", 9876, 30.0
OUT = r"C:\Users\baral\Downloads\car racing\jeep_dump.json"
GLB = r"C:\Users\baral\Downloads\car racing\4x4_jeep.glb"

PY = r'''
import bpy, json, os

GLB = r"GLB_TOKEN"

# Detect whether the jeep is already loaded.
have_jeep = any(("door" in o.name.lower()) or o.name.lower().startswith("door") for o in bpy.data.objects)
if not have_jeep:
    bpy.ops.import_scene.gltf(filepath=GLB)

result = {"object_count": len(bpy.data.objects), "objects": []}

for o in bpy.data.objects:
    info = {
        "name": o.name,
        "type": o.type,
        "parent": o.parent.name if o.parent else None,
        "loc_world": [round(v, 4) for v in o.matrix_world.translation],
        "loc_local": [round(v, 4) for v in o.location],
        "rot_euler_local": [round(v, 4) for v in o.rotation_euler],
        "scale_local": [round(v, 4) for v in o.scale],
    }
    if o.type == "MESH" and o.data and o.data.vertices:
        me = o.data
        # World-space extents — much more useful for figuring out which side of
        # the car each door lives on.
        ws = [o.matrix_world @ v.co for v in me.vertices]
        xs = [p.x for p in ws]; ys = [p.y for p in ws]; zs = [p.z for p in ws]
        info["world_bbox_min"] = [round(min(xs),3), round(min(ys),3), round(min(zs),3)]
        info["world_bbox_max"] = [round(max(xs),3), round(max(ys),3), round(max(zs),3)]
        info["world_bbox_center"] = [round((min(xs)+max(xs))/2,3),
                                      round((min(ys)+max(ys))/2,3),
                                      round((min(zs)+max(zs))/2,3)]
        info["vert_count"] = len(me.vertices)
        info["material"] = me.materials[0].name if me.materials and me.materials[0] else None
    result["objects"].append(info)

with open(r"OUT_PATH_TOKEN", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
print("DONE", result["object_count"], "objects")
'''.replace("GLB_TOKEN", GLB.replace("\\", "\\\\")).replace("OUT_PATH_TOKEN", OUT.replace("\\", "\\\\"))


def main():
    sock = socket.create_connection((HOST, PORT), timeout=T)
    sock.settimeout(T)
    try:
        sock.sendall(json.dumps({"type": "execute_code", "params": {"code": PY}}).encode())
        buf = b""
        while True:
            try:
                ch = sock.recv(65536)
            except socket.timeout:
                break
            if not ch:
                break
            buf += ch
            try:
                json.loads(buf.decode("utf-8"))
                break
            except Exception:
                continue
    finally:
        sock.close()
    raw = buf.decode("utf-8", errors="replace")
    try:
        data = json.loads(raw)
    except Exception:
        print("[non-json]", raw[:600], file=sys.stderr); sys.exit(2)
    print(json.dumps(data, indent=2)[:600])
    try:
        with open(OUT, "r", encoding="utf-8") as f:
            print("\n=== jeep_dump.json (first 5KB) ===")
            print(f.read()[:5000])
    except Exception as e:
        print("file-read-fail:", e)


if __name__ == "__main__":
    main()
