"""Inspect FZ16 wheel hub: list all small meshes near front-wheel hub center,
classify which are concentric (would rotate with wheel) vs off-axis (fork side).
"""
import json, socket, sys

HOST, PORT, T = "127.0.0.1", 9876, 15.0
OUT = r"C:\Users\baral\Downloads\car racing\hub_dump.json"

PY = r'''
import bpy, json
from mathutils import Vector

# Find the FZ16 root and its world-space transform.
root = None
for o in bpy.data.objects:
    if o.name.startswith("FZ16") and o.type == "EMPTY":
        root = o
        break

if root is None:
    # Fallback: any object beginning with FZ16
    for o in bpy.data.objects:
        if o.name.startswith("FZ16"):
            root = o
            break

result = {"root": root.name if root else None, "meshes": []}

# Walk all FZ16 descendants
def collect(o, acc):
    acc.append(o)
    for c in o.children:
        collect(c, acc)

if root:
    objs = []
    collect(root, objs)
else:
    objs = [o for o in bpy.data.objects if o.name.startswith("FZ16")]

# First find the two tires (rubber). Largest disc-shaped meshes.
tires = []
for o in objs:
    if o.type != "MESH" or not o.data or not o.data.vertices:
        continue
    me = o.data
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    zs = [v.co.z for v in me.vertices]
    sx, sy, sz = max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs)
    cx, cy, cz = (max(xs)+min(xs))/2, (max(ys)+min(ys))/2, (max(zs)+min(zs))/2
    sizes = sorted([sx, sy, sz], reverse=True)
    # tire: two largest dims roughly equal, smallest ~half of largest
    if sizes[0] > 400 and abs(sizes[0]-sizes[1])/sizes[0] < 0.1 and sizes[2] < sizes[0]*0.5:
        tires.append({"name": o.name, "cx": cx, "cy": cy, "cz": cz, "sx": sx, "sy": sy, "sz": sz})

# Find front tire (highest +X)
tires.sort(key=lambda t: -t["cx"])
front = tires[0] if tires else None

result["tires"] = tires
result["front"] = front

# For all FZ16 meshes, list connected components and check proximity to front hub
import bmesh
report = []
for o in objs:
    if o.type != "MESH" or not o.data or not o.data.vertices:
        continue
    me = o.data
    # Use bmesh for connected components
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    visited = set()
    comps = []
    for v0 in bm.verts:
        if v0.index in visited:
            continue
        stack = [v0]
        verts = []
        while stack:
            v = stack.pop()
            if v.index in visited:
                continue
            visited.add(v.index)
            verts.append(v.co.copy())
            for e in v.link_edges:
                ov = e.other_vert(v)
                if ov.index not in visited:
                    stack.append(ov)
        if len(verts) < 3:
            continue
        xs = [p.x for p in verts]
        ys = [p.y for p in verts]
        zs = [p.z for p in verts]
        cmp = {
            "obj": o.name,
            "nv": len(verts),
            "cx": (max(xs)+min(xs))/2,
            "cy": (max(ys)+min(ys))/2,
            "cz": (max(zs)+min(zs))/2,
            "sx": max(xs)-min(xs),
            "sy": max(ys)-min(ys),
            "sz": max(zs)-min(zs),
        }
        comps.append(cmp)
    bm.free()

    # Filter: keep components whose 2D distance to front-hub (X-Z plane) is within 350mm
    if front:
        for c in comps:
            d = ((c["cx"]-front["cx"])**2 + (c["cz"]-front["cz"])**2)**0.5
            dy = abs(c["cy"]-front["cy"])
            if d < 350 and dy < 200:
                c["d_front"] = round(d, 1)
                c["dy_front"] = round(dy, 1)
                for k in ("cx","cy","cz","sx","sy","sz"):
                    c[k] = round(c[k], 1)
                report.append(c)

# Sort by axial offset then 2D distance
report.sort(key=lambda c: (c["dy_front"], c["d_front"]))
result["near_front_hub"] = report

with open(r"OUT_PATH_TOKEN", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
print("DONE", len(report), "components near front hub")
'''.replace("OUT_PATH_TOKEN", OUT.replace("\\", "\\\\"))

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
        print("[non-json]", raw[:400], file=sys.stderr); sys.exit(2)
    print(json.dumps(data, indent=2)[:1000])
    try:
        with open(OUT, "r", encoding="utf-8") as f:
            print("\n=== hub_dump.json ===")
            print(f.read())
    except Exception as e:
        print("file-read-fail:", e)

if __name__ == "__main__":
    main()
