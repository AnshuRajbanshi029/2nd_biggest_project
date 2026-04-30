"""Final clean redo: re-import original GLB into Blender, compute the door's
EXACT outer-rear corner (single vertex with max X for right door / min X for
left), and rotate around the body-surface hinge so this corner lands ON the
body surface line. This guarantees outer-face flushness.
"""
import json
import socket
import sys

HOST, PORT, T = "127.0.0.1", 9876, 60.0
GLB_IN  = r"C:\Users\baral\Downloads\car racing\4x4_jeep_original.glb"
GLB_OUT = r"C:\Users\baral\Downloads\car racing\4x4_jeep.glb"
SHOT_OUT = r"C:\Users\baral\Downloads\car racing\jeep_doors_final.png"

PY = r'''
import bpy, math, json
from mathutils import Matrix, Vector

GLB_IN   = r"GLB_IN_TOKEN"
GLB_OUT  = r"GLB_OUT_TOKEN"
SHOT_OUT = r"SHOT_OUT_TOKEN"
LOG      = r"C:\\Users\\baral\\Downloads\\car racing\\doors_final_log.json"

log = {}

# 1. Wipe the previous Jeep hierarchy.
to_remove = []
for o in bpy.data.objects:
    n = o.name
    if (n in ("Sketchfab_model", "RootNode", "Red_Jeep")
        or n.startswith("4x4 Jeep")
        or n.startswith("B_Bum") or n.startswith("F_Bum")
        or n.startswith("Body1") or n.startswith("Boonet")
        or n.startswith("Door")  or n.startswith("Glass1")
        or n.startswith("Tire")):
        to_remove.append(o)
log["removed_count"] = len(to_remove)
for o in to_remove:
    bpy.data.objects.remove(o, do_unlink=True)
for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.textures):
    for item in list(blk):
        if item.users == 0:
            blk.remove(item)

# 2. Import pristine GLB.
bpy.ops.import_scene.gltf(filepath=GLB_IN)

# 3. Body's right/left exterior X.
body = bpy.data.objects["Body1_Body_0"]
xs_b = [(body.matrix_world @ v.co).x for v in body.data.vertices]
BODY_RIGHT_X = max(xs_b)
BODY_LEFT_X  = min(xs_b)

# 4. For each door, find the world-space vertex that is the OUTER-REAR corner.
#    For the right door, that's the vertex with the largest X coordinate.
#    For the left door, the smallest X coordinate. This vertex sits at the
#    rear-outer corner of the open door panel, and after the close it should
#    land on the body's right/left surface (X = +/- BODY_*_X).
def find_outer_rear(mesh_name, side):
    o = bpy.data.objects[mesh_name]
    mw = o.matrix_world
    pts = [mw @ v.co for v in o.data.vertices]
    return max(pts, key=lambda p: side * p.x)

SPECS = []
for empty_name, body_mesh, hinge_xy, side, body_x in [
    ("Door",  "Door_Body_0",  (BODY_RIGHT_X, -0.436), +1, BODY_RIGHT_X),
    ("Door1", "Door1_Body_0", (BODY_LEFT_X,  -0.433), -1, BODY_LEFT_X),
]:
    far = find_outer_rear(body_mesh, side)
    h = Vector((hinge_xy[0], hinge_xy[1], 0))
    vec = Vector((far.x - h.x, far.y - h.y, 0))
    cur_ang = math.atan2(vec.y, vec.x)
    # Target: rear-outer corner sits ON the body surface plane (X = body_x),
    # which means it's directly along +Y from the hinge (current_ang = pi/2).
    delta = (math.pi / 2) - cur_ang
    SPECS.append((empty_name, h, delta, far, vec))

log["applied"] = []
for empty_name, hinge, angle, far, vec in SPECS:
    R_world = (Matrix.Translation(hinge)
               @ Matrix.Rotation(angle, 4, "Z")
               @ Matrix.Translation(-hinge))
    empty = bpy.data.objects[empty_name]
    for child in empty.children:
        if child.type != "MESH" or child.data is None:
            continue
        if child.data.users > 1:
            child.data = child.data.copy()
        mw = child.matrix_world.copy()
        L = mw.inverted() @ R_world @ mw
        for v in child.data.vertices:
            v.co = L @ v.co
        child.data.update()
    log["applied"].append({
        "empty": empty_name,
        "hinge": [round(c, 4) for c in hinge],
        "angle_deg": round(math.degrees(angle), 4),
        "outer_rear_before": [round(far.x, 4), round(far.y, 4), round(far.z, 4)],
        "rear_vec": [round(vec.x, 4), round(vec.y, 4)],
    })

bpy.context.view_layer.update()

# 5. Verify.
def world_bbox(name):
    o = bpy.data.objects.get(name)
    if o is None or o.data is None:
        return None
    mw = o.matrix_world
    pts = [mw @ v.co for v in o.data.vertices]
    xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
    return {"min": [round(min(xs),4), round(min(ys),4), round(min(zs),4)],
            "max": [round(max(xs),4), round(max(ys),4), round(max(zs),4)]}

log["after"] = {n: world_bbox(n) for n in
                ["Door_Body_0", "Door_Glass_0", "Door1_Body_0", "Door1_Glass_0",
                 "Body1_Body_0"]}

# 6. Screenshot + export.
try:
    bpy.context.scene.render.image_settings.file_format = "PNG"
    bpy.context.scene.render.filepath = SHOT_OUT
    bpy.ops.render.opengl(write_still=True)
except Exception as exc:
    log.setdefault("warnings", []).append(f"screenshot failed: {exc}")

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
    log["export"] = f"fail: {exc}"

with open(LOG, "w", encoding="utf-8") as f:
    json.dump(log, f, indent=2)
'''.replace("GLB_IN_TOKEN",   GLB_IN.replace("\\", "\\\\")) \
   .replace("GLB_OUT_TOKEN",  GLB_OUT.replace("\\", "\\\\")) \
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
    print(buf.decode("utf-8", errors="replace")[:300])
    try:
        with open(r"C:\Users\baral\Downloads\car racing\doors_final_log.json",
                  encoding="utf-8") as f:
            print("\n=== doors_final_log.json ===")
            print(f.read())
    except Exception as exc:
        print("read-log-fail:", exc)


if __name__ == "__main__":
    main()
