"""Rotate the two open Jeep doors back to a closed position and re-export the
GLB on top of the existing 4x4_jeep.glb. Same TCP-execute-code protocol as the
other probe scripts (port 9876).

Math: each door's child meshes are at matrix_world = identity-ish (no local
rotation, but inherits the Sketchfab/RootNode parent scale). To rotate a door
around a WORLD-space vertical hinge, we:
  R_world = T(hinge) @ Rz(angle) @ T(-hinge)
  L = M_world_inv @ R_world @ M_world           # express in mesh-local space
  v.co <- L @ v.co
This bakes the rotation into vertex coordinates, so the empty's transform
stays untouched and gltf export emits a single closed-door mesh per side.
"""
import json
import socket
import sys

HOST, PORT, T = "127.0.0.1", 9876, 60.0
GLB_OUT = r"C:\Users\baral\Downloads\car racing\4x4_jeep.glb"
SHOT_OUT = r"C:\Users\baral\Downloads\car racing\jeep_doors_after.png"

PY = r'''
import bpy, math, json
from mathutils import Matrix, Vector

GLB_OUT = r"GLB_OUT_TOKEN"
SHOT_OUT = r"SHOT_OUT_TOKEN"

# (empty name, world-space hinge XY, signed Z rotation in radians to close)
SPECS = [
    ("Door",  Vector(( 0.858, -0.436, 0.0)),  +math.radians(48.6)),
    ("Door1", Vector((-1.065, -0.433, 0.0)),  -math.radians(48.5)),
]

log = {"applied": [], "warnings": []}

for empty_name, hinge, angle in SPECS:
    empty = bpy.data.objects.get(empty_name)
    if empty is None:
        log["warnings"].append(f"{empty_name} not in scene")
        continue
    R_world = (Matrix.Translation(hinge)
               @ Matrix.Rotation(angle, 4, "Z")
               @ Matrix.Translation(-hinge))
    for child in empty.children:
        if child.type != "MESH" or child.data is None:
            continue
        mw = child.matrix_world.copy()
        L = mw.inverted() @ R_world @ mw
        # Make mesh data single-user just in case it's shared with another obj.
        if child.data.users > 1:
            child.data = child.data.copy()
        for v in child.data.vertices:
            v.co = L @ v.co
        child.data.update()
        log["applied"].append({
            "empty": empty_name,
            "mesh": child.name,
            "angle_deg": round(math.degrees(angle), 2),
            "hinge": [round(c, 4) for c in hinge],
        })

bpy.context.view_layer.update()

# Snapshot of the resulting doors' bboxes so we can sanity-check the close.
def world_bbox(name):
    o = bpy.data.objects.get(name)
    if o is None or o.type != "MESH":
        return None
    mw = o.matrix_world
    pts = [mw @ v.co for v in o.data.vertices]
    if not pts:
        return None
    xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
    return {"min": [round(min(xs),3), round(min(ys),3), round(min(zs),3)],
            "max": [round(max(xs),3), round(max(ys),3), round(max(zs),3)]}

log["after"] = {n: world_bbox(n) for n in
                ["Door_Body_0", "Door_Glass_0", "Door1_Body_0", "Door1_Glass_0",
                 "Body1_Body_0"]}

# Render a quick viewport screenshot from the front-left for visual verification.
try:
    bpy.context.scene.render.image_settings.file_format = "PNG"
    bpy.context.scene.render.filepath = SHOT_OUT
    bpy.ops.render.opengl(write_still=True)
    log["screenshot"] = SHOT_OUT
except Exception as exc:
    log["warnings"].append(f"screenshot failed: {exc}")

# Re-export the WHOLE scene to the same GLB path. We select all objects and
# export with the same Sketchfab-importer convention so our viewer's custom
# loader still finds the Door / Door1 / Tire etc. node names.
try:
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format="GLB",
        export_yup=True,
        use_visible=True,
        use_renderable=False,
        use_active_collection=False,
        use_selection=False,
        export_apply=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    log["export"] = "ok"
except Exception as exc:
    log["warnings"].append(f"export failed: {exc}")
    log["export"] = "fail"

print(json.dumps(log, indent=2))
'''.replace("GLB_OUT_TOKEN", GLB_OUT.replace("\\", "\\\\")) \
   .replace("SHOT_OUT_TOKEN", SHOT_OUT.replace("\\", "\\\\"))


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
    print(json.dumps(data, indent=2)[:4000])


if __name__ == "__main__":
    main()
