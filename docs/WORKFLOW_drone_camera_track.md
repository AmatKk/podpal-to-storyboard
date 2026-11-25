# Drone shot → 3D camera track → CG background replacement (Blender)

A reproducible workflow for replacing everything except the road (and the car on it) in a drone shot with a CG
environment. **Camera tracking is the core of it.** The workflow is written for an AI coding agent (e.g. Claude Code)
working with a human VFX artist. Every step is a small deterministic script, and the agent checks each result
visually before going on.

Tested on: Windows 11, Blender 5.2 (Cycles/EEVEE), Python 3.12, pycolmap 4.2.1 (CPU), OpenCV 4/5, ffmpeg.
The test plate was a downloaded drone clip: 7.3 s, 23.976 fps, 1920×1080 with letterbox burned in, already graded,
H.264-compressed. The camera dives from ~23 m looking down to ~3 m chasing the car.

---

## 0. Overview

| Step | What | Tool | Output |
|---|---|---|---|
| 1 | Plate prep (crop letterbox, PNG sequence) | ffmpeg | `plate/plate_####.png` |
| 2 | Camera solve (structure-from-motion) | pycolmap (COLMAP) | `solve/sparse/<n>/` |
| 3 | Orient + scale (ground plane, metric scale) | numpy | `solve/solve.json` |
| 4 | Re-level to the **road surface** | numpy | `solve/solve.json` (backup `solve_ground.json`) |
| 5 | Camera into Blender + **track check render** | Blender headless | `VFX_Dron_test.blend`, `check/` |
| 6 | Road centre line in 3D (for matte + CG road) | OpenCV + ray-casting | `road/road_path.json` |
| 7 | Road matte = 3D ribbon rendered through the solved camera | Blender EEVEE | `matte/matte_####.png` |
| 8 | CG environment, clay pass, beauty, comp | Blender Cycles + numpy/ffmpeg | `clay/`, `render/`, `comp/` |

Folder layout (`<root>`):
```
<root>/
  plate/            plate_0001.png … (cropped, untouched otherwise)
  solve/            database.db, sparse/, solve.json, solve_ground.json
  road/             road_path.json, debug masks
  check/ matte/ clay/ render/ comp/
  _scripts/         all scripts below
  _venv/            python venv with pycolmap + opencv
```

---

## 1. Plate prep

**Find the burned-in letterbox first.** Black bars ruin the solve and the lens model, because the principal point
ends up off-centre and the trackers lock onto the bar edges.

```bash
ffmpeg -i shot.mp4 -vf "cropdetect=24:16:0" -frames:v 100 -f null - 2>&1 | grep -o "crop=[0-9:]*" | sort | uniq -c
# -> crop=1920:816:0:132
ffmpeg -i shot.mp4 -vf "crop=1920:816:0:132" -start_number 1 plate/plate_%04d.png
```

- Note the exact frame rate (`r_frame_rate=24000/1001`). In Blender use `fps=24, fps_base=1.001`.
- Make a contact sheet and **look at every part of the shot**. Our clip had no cut, but the drone flies *over*
  the car at the end, so the car (a moving object) fills a big part of the last frames. That matters for the solve.

---

## 2. Camera solve with COLMAP (pycolmap)

Why COLMAP rather than Blender's tracker? It runs fully headless and scripted: no clip editor, no UI clicks. It
solves focal length + distortion and gives a dense set of 3D points we use later for ground/scale. Blender's tracker
operators need a Clip Editor context, so you cannot drive them from `blender -b`.

```bash
py -3.12 -m venv _venv
_venv/Scripts/python.exe -m pip install pycolmap opencv-python
```

`_scripts/solve_colmap.py`:
```python
import sys, os, shutil, time
import pycolmap
root = sys.argv[1]
img = os.path.join(root, "plate"); out = os.path.join(root, "solve"); os.makedirs(out, exist_ok=True)
db = os.path.join(out, "database.db")
if os.path.exists(db): os.remove(db)
sp = os.path.join(out, "sparse"); shutil.rmtree(sp, ignore_errors=True); os.makedirs(sp)

ro = pycolmap.ImageReaderOptions(); ro.camera_model = "SIMPLE_RADIAL"      # f, cx, cy, k1
eo = pycolmap.FeatureExtractionOptions(); eo.sift.max_num_features = 8000
pycolmap.extract_features(db, img, camera_mode=pycolmap.CameraMode.SINGLE,   # ONE camera for the whole clip
                          reader_options=ro, extraction_options=eo, device=pycolmap.Device.cpu)
po = pycolmap.SequentialPairingOptions(); po.overlap = 12                    # video -> sequential matching
po.loop_detection = False
pycolmap.match_sequential(db, pairing_options=po, device=pycolmap.Device.cpu)
recs = pycolmap.incremental_mapping(db, img, sp, options=pycolmap.IncrementalPipelineOptions())
for k, r in recs.items():
    print(k, r.summary())
    for cid, c in r.cameras.items(): print("camera", c.model, c.width, c.height, list(c.params))
```

Result on the test plate (CPU, ~4 min): **174/174 frames registered**, 12,220 points, mean reprojection error
**0.78 px** (acceptable for compressed, motion-blurred footage; aim for < 1 px). Focal length 975.5 px on 1920 px
width, about 18.3 mm full-frame equivalent (89° horizontal FOV), k1 ≈ 0.01.

Notes:
- COLMAP may produce **several models** (tiny ones made of 2 images). Always take the one with the most registered
  images.
- The moving car was not masked. RANSAC rejected its features as outliers. If the moving object fills a large part
  of many frames, give COLMAP per-image masks (`ImageReaderOptions.mask_path`).
- Sequential matching with `overlap=12` is right for continuous video. Do not use exhaustive matching on long
  clips: it is slow and adds false matches on repetitive textures (forest, road markings).

---

## 3. Orient and scale (`export_solve.py`)

COLMAP's world has an arbitrary rotation, origin and scale. We want:
- **Z up**, with the **ground plane at Z = 0** (RANSAC plane on the 3D points + SVD refine; flip the normal so the
  cameras are above it);
- **+Y = direction of flight** (first→last camera projected on the ground);
- origin = ground point under the last camera;
- **metric scale**.

**Scale is the trap.** We first measured the road width at the last frame. That row crossed a junction where the road
widens, so the result was 40 % off. The fix was to measure on a straight stretch and cross-check against a known
object in the same frame: the car (Audi A6 Avant, 1.87 m wide), measured at bumper height so it sits close to the
ground plane. Road width between edge lines came out at 7.0 m and a lane at 3.6 m. Sanity checks: drone speed
(~100 km/h, plausible) and camera height at the end (~3 m behind the car).

Scale formula: cast two pixel rays (left/right road edge, same image row) onto the ground plane and set
`scale = known_width_m / distance_between_hits`.

Converting COLMAP cameras to Blender:
```python
# COLMAP: world->cam  [R|t]; camera axes x right, y DOWN, z FORWARD
R_c2w = R.T ; C = -R.T @ t                       # camera centre in world
flip  = diag(1, -1, -1)                          # -> Blender camera axes (x right, y up, -z forward)
R_blender = Rw @ R_c2w @ flip                    # Rw = world(COLMAP) -> aligned world
C_blender = (Rw @ (C - origin)) * scale
```
Blender camera: `sensor_fit='HORIZONTAL'`, `sensor_width=36`, `lens = f_px / image_width * 36`.

Full script (usage: `python export_solve.py <root> --road FRAME,ROW,X_LEFT,X_RIGHT,WIDTH_M`):
```python
import sys, os, json, glob
import numpy as np, pycolmap
root = sys.argv[1]; road = None
if "--road" in sys.argv:
    f, row, xl, xr, wm = sys.argv[sys.argv.index("--road") + 1].split(","); road = (int(f), float(row), float(xl), float(xr), float(wm))
recs = [pycolmap.Reconstruction(d) for d in sorted(glob.glob(os.path.join(root, "solve", "sparse", "*")))]
rec = max(recs, key=lambda r: r.num_reg_images()); cam = next(iter(rec.cameras.values()))
def c2w(im):
    T = im.cam_from_world() if callable(im.cam_from_world) else im.cam_from_world
    M = np.asarray(T.matrix()); R, t = M[:, :3], M[:, 3]; return R.T, -R.T @ t
frames = {int(os.path.splitext(im.name)[0].split("_")[-1]): c2w(im) for im in rec.images.values()
          if not (hasattr(im, "has_pose") and not im.has_pose)}
P = np.array([p.xyz for p in rec.points3D.values()]); E = np.array([p.error for p in rec.points3D.values()])
TL = np.array([p.track.length() for p in rec.points3D.values()]); C = np.array([p.color for p in rec.points3D.values()])
good = (TL >= 3) & (E < 2.0); Pg = P[good]
cams = np.array([frames[k][1] for k in sorted(frames)]); ext = np.linalg.norm(cams.max(0) - cams.min(0))
rng = np.random.default_rng(0); best = (0, None)
for _ in range(4000):                                    # RANSAC ground plane
    a, b, c = Pg[rng.choice(len(Pg), 3, replace=False)]; n = np.cross(b - a, c - a)
    if np.linalg.norm(n) < 1e-12: continue
    n /= np.linalg.norm(n); d = -n @ a; inl = np.abs(Pg @ n + d) < ext * 0.01
    if inl.sum() > best[0]: best = (inl.sum(), inl)
Q = Pg[best[1]]; cen = Q.mean(0); nrm = np.linalg.svd(Q - cen)[2][2]; d = -nrm @ cen
if cams.mean(0) @ nrm + d < 0: nrm, d = -nrm, -d
trav = cams[-1] - cams[0]; trav -= (trav @ nrm) * nrm; Y = trav / np.linalg.norm(trav); X = np.cross(Y, nrm)
Rw = np.stack([X, Y, nrm]); o = cams[-1] - (cams[-1] @ nrm + d) * nrm
align = lambda p: (Rw @ (np.asarray(p) - o).T).T
s = 1.0
if road:
    fr, row, xl, xr, wm = road; Rc, Cc = frames[fr]; f_, cx, cy = cam.params[:3]; hits = []
    for x in (xl, xr):
        ray = Rc @ np.array([(x - cx) / f_, (row - cy) / f_, 1.0]); hits.append(Cc + (-(Cc @ nrm + d) / (ray @ nrm)) * ray)
    s = wm / np.linalg.norm(hits[1] - hits[0])
flip = np.diag([1.0, -1.0, -1.0])
out = {"width": cam.width, "height": cam.height, "params": list(map(float, cam.params)), "scale": s, "frames": {}, "points": []}
for k in sorted(frames):
    Rc, Cc = frames[k]; out["frames"][k] = {"R": (Rw @ Rc @ flip).tolist(), "C": (align(Cc) * s).tolist()}
step = max(1, len(Pg) // 20000)
for p, c in zip((align(Pg) * s)[::step], C[good][::step]): out["points"].append([round(float(v), 3) for v in p] + [int(v) for v in c])
json.dump(out, open(os.path.join(root, "solve", "solve.json"), "w"))
```

---

## 4. Re-level to the road surface (`road_level.py`). Do not skip this.

The RANSAC plane follows the **dominant** ground: fields and verges. The road in our plate lies 0.3–0.7 m *below*
that plane, and in the last seconds the camera is only 2–4 m high. So a 0.5 m error shows up as the whole CG world
"floating" above the plate road, visible around second 5.

Fix: select the sparse points that lie on the asphalt (|x − road_x(y)| < 4.5 m, needs step 6 once), robustly fit
`z = a + b·y`, then apply `p' = Rx(−atan b) · (p − (0,0,a))` to every camera centre and point, and
`R' = Rx(−atan b) · R` to every camera rotation. Result here: `z = −0.643 − 0.00284·y` (σ 0.20 m from 227 points).

```python
m = (abs(dx) < 4.5) & (ylo < y < yhi) & (abs(z) < 2.5)
for _ in range(6):                       # iterative MAD outlier rejection
    b, a = np.polyfit(y[keep], z[keep], 1); r = z - (a + b*y)
    s = np.median(abs(r[keep])) * 1.4826; keep = abs(r) < 2.5*s
phi = -atan(b); Rx = [[1,0,0],[0,cos,-sin],[0,sin,cos]]
C' = Rx @ (C - [0,0,a]) ;  R' = Rx @ R ;  points likewise
```
Order in practice: steps 3 → 6 (rough road line) → 4 → 6 again (final road line).

---

## 5. Camera into Blender + track check

Headless Blender: `blender -b --factory-startup --python build_track_scene.py -- <root> render 50`.

```python
import bpy, json, os, sys
from mathutils import Matrix, Vector
root = sys.argv[sys.argv.index("--") + 1]; J = json.load(open(os.path.join(root, "solve", "solve.json")))
sc = bpy.context.scene; W, H = J["width"], J["height"]
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.fps, sc.render.fps_base = 24, 1.001
frames = sorted(int(k) for k in J["frames"]); sc.frame_start, sc.frame_end = frames[0], frames[-1]
cd = bpy.data.cameras.new("CAM_solve"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
cd.lens = J["params"][0] / W * 36; cd.clip_end = 30000
cam = bpy.data.objects.new("CAM_solve", cd); sc.collection.objects.link(cam); sc.camera = cam
prev = None
for k in frames:
    fr = J["frames"][str(k)]; M = Matrix(fr["R"]).to_4x4(); M.translation = Vector(fr["C"])
    e = M.to_euler("XYZ", prev) if prev else M.to_euler("XYZ"); prev = e   # euler-compatible -> no flips
    cam.location = M.translation; cam.rotation_euler = e
    cam.keyframe_insert("location", frame=k); cam.keyframe_insert("rotation_euler", frame=k)
# + plate as camera background image (viewport), + a 5 m wireframe grid on z=0 and a few cones on the road
```

**Track check:** render only the grid + cones (EEVEE, `film_transparent`) and overlay them on the plate:
```bash
ffmpeg -start_number 1 -i plate/plate_%04d.png -start_number 1 -i check/chk_%04d.png \
  -filter_complex "[0]scale=960:408[p];[p][1]overlay=format=auto" -r 24000/1001 track_check.mp4
```
Watch it. The cones must stay glued to the asphalt and the grid must not slide or "breathe". Check the end of the
shot specifically: low camera, large parallax, so errors show most there.

Then the **clay pass**: the whole CG scene with one grey material override
(`view_layer.material_override`), Cycles 16 spp + denoise, with the plate road comped on top. This is the best way to
judge track + ground level in motion before any look development.

### 5b. "The track shakes" at the low end of the shot: diagnose before you smooth

What we saw: from ~5 s (camera dropping from 5 m to 2.7 m) the CG started to "shake" against the plate.
**Do not smooth the camera blindly.** Smoothing a correct solve detaches it from the plate. Measure first:

1. **Camera step lengths** `|C[f+1] - C[f]|`. Our plate alternated **0.96 m / 1.45 m** (ratio 2:3) through the whole
   shot. That is pulldown judder: the source was shot at 60 fps and delivered at 23.976 by dropping frames
   (ffprobe: 174 frames @ 24000/1001, so it is baked into the delivery). The solve follows it correctly.
2. **Why it only shows when low:** if the CG ground is not exactly at the real ground height, every frame it slips by
   (height error / camera height) × (ground image motion). Uneven 2:3 steps turn that slip into a visible
   shake. With a 0.6 m height error at 2.8 m camera height, that is ~20 % of the ground motion, i.e. 10–20 px per frame.
   Fix = step 4 (re-level to the road). After that the shake is gone.
3. **Residual solve noise:** check whether the step pattern breaks anywhere (ours: frames 158–168 at the junction,
   1.55 / 0.90 / 1.71 / 0.86 instead of 1.46 / 0.96). Fix it with a **local bundle adjustment** on dense KLT tracks
   (`_scripts/refine_track.py`):
   - frames ≤ FIX (approved part) stay fixed;
   - later frames get 6-DOF corrections, with free 3D points;
   - Cauchy loss plus two rounds of per-track RMS cuts (6 px, then 2.5 px) reject the moving car (it flies with the
     drone, so its features look static);
   - a weak 2nd-difference prior on position/rotation (WC=60 px per m/frame², WR=150 px per rad/frame²) keeps the
     real judder.

   Result: median reprojection error 0.51 px, corrections ≤ 0.06° / a few cm, except one bad frame (0.17° / 24 cm).
   Re-key the Blender camera with `_scripts/update_camera.py` (no city rebuild needed).

```bash
_venv/Scripts/python.exe -I _scripts/refine_track.py <root> 90     # -> solve/solve_refined.json
cp solve/solve.json solve/solve_colmap_leveled.json && cp solve/solve_refined.json solve/solve.json
blender -b --factory-startup VFX_mesto.blend --python _scripts/update_camera.py -- <root>
```

Be careful with a naive "ground slip" metric. Raycasting lower-image features to z = 0 and comparing them with KLT
mixes in the car and bushes (z up to +2.6 m). It reports 20–80 px "slip" even on a correct camera. Use
triangulated static tracks (BA residual) instead.

---

## 6. Road centre line in 3D (`road_path.py`)

For every 6th frame:
1. Key the asphalt: HSV, low saturation and mid value, plus white paint. Morphological open/close, then keep the
   largest component that reaches the lower part of the frame.
2. For each image row take the longest asphalt run. Its middle is the road centre and its ends are the edges.
3. Cast the pixel ray through the solved camera onto z = 0
   (`d = R @ [(u-cx)/f, -(v-cy)/f, -1]`, `t = -C.z/d.z`).

Then fit `x(y)` robustly. Result: ±0.6 m scatter, asphalt 8 m wide.

**Limitation:** far away (> ~150 m) there are few detections, and a side road or junction pulls the fit. Our
polynomial bent the CG road *left* where the real road goes *right*. Fix: the director drew the correct path on a
screenshot. We found the matching frame (minimum MSE against the rendered frames, ignoring the drawn strokes),
extracted the blue pixels, ray-cast them to the ground with that frame's camera, and merged them with the near-field
detections into a smoothed `y → x` table. **A human sketch plus ray-casting is a legitimate, precise input.**

---

## 7. Road matte without roto

The matte is a **3D ribbon** that follows the road centre line: asphalt plus ~2.5 m of verge each side, with a soft
falloff of 3.5 m. It is rendered through the solved camera in EEVEE (emission white, alpha). Because it lives in the
same 3D space as the camera, it never slides and needs no per-frame roto. Fade it out along the road (100–170 m) where
the plate road meets the horizon, so the CG road takes over there.

---

## 8. CG + comp (short)

- Build the CG world in the aligned frame: ground at z = 0 = road level, +Y = flight direction. Keep a clear
  corridor along `road_x(y)`. Continue the CG road beyond the matte along the same centre line.
- **Render the beauty with transparent sky.** If the scene has a compositor (e.g. mist haze), insert a `Set Alpha`
  node fed by the Render Layers alpha, otherwise the alpha is lost.
- Comp: `plate * matte + CG * (1 - matte)`. Grade the CG to the plate with **one** Lab mean/std transfer computed over
  several frames (stable, no flicker). Add a separate sky gradient sampled from the plate, a light horizon haze, a
  0.6 px blur and grain.
- **Drone plates are often shot with a short shutter.** Compare motion blur before enabling it in CG. Ours had to be
  off.

---

## Pitfalls we hit (and fixes)

| Symptom | Cause | Fix |
|---|---|---|
| Lens/solve weird, trackers on edges | burned-in letterbox | `cropdetect`, crop first |
| Scale off by 40 % | width measured at a junction | measure on a straight stretch, cross-check with a known object (car width) |
| CG world floats above the plate road | ground plane fitted to fields, not the road | re-level to road points (step 4) |
| CG road turns the wrong way far away | sparse detections + junction bias | human sketch → ray-cast → centre table |
| All rendered stills identical | `scene.frame_set()` + `render.render()` inside one headless script did not move the camera | render frames from CLI: `blender -b file.blend -S Scene -f 1,90,174` |
| Render 10× slower than expected | `--factory-startup` ignores user prefs → Cycles on CPU | render without it (or set GPU device in prefs) |
| Everything pink | blend moved, texture paths absolute to the old folder | relink `image.filepath` (`old_root → new_root`) |
| Megascans props 100× too large | some FBX exported in centimetres | per-asset scale fix using vertex extents (object `dimensions` are stale in headless) |
| `matrix_world`/`dimensions` read as 0 in headless | depsgraph not evaluated | `view_layer.update()` or compute from vertices/locations |
| Transparent sky lost | compositor haze mix dropped alpha | `Set Alpha` node |
| CG "shakes" only when the drone is low | 2:3 pulldown judder in the plate × CG ground at the wrong height | re-level (step 4); then fix local solve noise with `refine_track.py` (step 5b); never blind-smooth |
| Small props invisible | scattered grass/shrubs grew over them | keep a clear radius around props in the scatter |

## What to give the human, in order
1. Contact sheet of the plate + notes (cuts, moving objects, letterbox).
2. Solve stats (registered frames, reprojection error, focal length).
3. **Track check video** (grid + cones over the plate).
4. **Clay video** with the plate road comped. Get approval here.
5. Beauty stills (start / middle / end) for look approval, *then* the full render.
