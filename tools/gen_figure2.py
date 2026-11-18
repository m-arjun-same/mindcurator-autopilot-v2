#!/usr/bin/env python3
"""V2 visual-fix figure: ONE central person (Pexels 10930061, side profile facing
left, black turtleneck, black bg — free stock, NOT Dinesh, NOT Autopilot's asset).
48-frame scroll-scrubbed sequence: subtle push-in + halftone dot treatment like
the reference (dots over figure), luminance-keyed alpha so the dark clothing
dissolves into the black stage exactly like the ref character. Normal map via
Sobel from the mid frame. Own processing, local only."""
import math, os
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw

ROOT = os.path.expanduser("~/workspace/projects/mindcurator-autopilot-v2")
SRC = os.path.join(ROOT, "tools/person-source.jpg")
OUT = os.path.join(ROOT, "assets/gl/frames")
os.makedirs(OUT, exist_ok=True)
W, H = 880, 1100
N = 48

src = Image.open(SRC).convert("RGB")
# person: scale so head+shoulders fill the frame height, face left-of-centre
# source 1400x1749; crop a 0.8-aspect window around the head/shoulders
sw, sh = src.size
crop_w = int(sh * 0.80)
# head sits upper-right in source; keep face in left half of our frame
x0 = int(sw * 0.16); y0 = int(sh * 0.015)
base_crop = src.crop((x0, y0, x0 + crop_w, y0 + sh - int(sh * 0.015)))
base = base_crop.resize((W, int(W * base_crop.height / base_crop.width)), Image.LANCZOS)
print("base", base.size)

def halftone(img_arr, lum):
    """Dot pattern like the ref: dark dots on lit skin, light dots in shadow."""
    out = img_arr.astype(np.float32)
    step = 9
    h, w = lum.shape
    gy, gx = np.mgrid[0:h:step, 0:w:step]
    cell = lum[0:h:step, 0:w:step]
    # dark dots where lit
    r_dark = np.clip((cell - 0.45) * 5.2, 0, 3.4)
    # light dots where dark
    r_light = np.clip((0.42 - cell) * 4.6, 0, 3.0)
    yy, xx = np.mgrid[0:h, 0:w]
    for radii, val, alpha in [(r_dark, 0.0, 0.34), (r_light, 255.0, 0.30)]:
        # distance to nearest grid centre, vectorised per radius map via coarse grid trick:
        idx_y = np.clip((yy // step), 0, radii.shape[0] - 1)
        idx_x = np.clip((xx // step), 0, radii.shape[1] - 1)
        rmap = radii[idx_y, idx_x]
        cx = idx_x * step + step / 2.0; cy = idx_y * step + step / 2.0
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        mask = (dist <= rmap) & (rmap > 0.4)
        out[mask] = out[mask] * (1 - alpha) + val * alpha
    return out

frames = []
for i in range(N):
    t = i / (N - 1)
    e = t * t * (3 - 2 * t)  # smoothstep push-in
    scale = 1.00 + 0.17 * e
    bw, bh = round(W * scale), round(base.height * scale)
    fr = base.resize((bw, bh), Image.LANCZOS)
    # anchor: face stays near (0.40W, 0.34H); drift left/up slightly as it pushes in
    ox = int(W * 0.40 - bw * 0.40 - 26 * e)
    oy = int(H * 0.34 - bh * 0.30 - 30 * e)
    canvas = Image.new("RGB", (W, H), (5, 5, 5))
    canvas.paste(fr, (ox, oy))
    canvas = ImageEnhance.Contrast(canvas).enhance(1.06)
    canvas = ImageEnhance.Brightness(canvas).enhance(1.02)
    a = np.asarray(canvas).astype(np.float32)
    lum = (0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]) / 255.0
    a = halftone(a, lum)
    # alpha: hard luminance key — photo bg (~0.02-0.06) must go FULLY transparent
    # or the plane reads as a warm panel on the black stage; lit skin stays solid,
    # shadow side dissolves like the ref character.
    alpha = np.clip((lum - 0.055) / 0.16, 0, 1)
    a = a * (0.30 + 0.70 * alpha[:, :, None])  # darken semi-transparent zones toward stage black
    fade = np.ones_like(lum)
    fb = int(H * 0.78)
    fade[fb:, :] = np.linspace(1, 0.25, H - fb)[:, None]
    # edge fade so the plane boundary can never read as a rectangle on the stage
    ey = np.ones(H); ey[:70] = np.linspace(0, 1, 70); ey[-40:] *= np.linspace(1, 0.4, 40)
    ex = np.ones(W); ex[:46] = np.linspace(0, 1, 46); ex[-46:] *= np.linspace(1, 0, 46)
    fade = fade * ey[:, None] * ex[None, :]
    alpha = (alpha * fade * 255).astype(np.uint8)
    out = np.dstack([np.clip(a, 0, 255).astype(np.uint8), alpha])
    im = Image.fromarray(out, "RGBA")
    im.save(os.path.join(OUT, f"fig-{i:03d}.webp"), "WEBP", quality=86, method=4)
    frames.append(im)
    print("frame", i)

mid = frames[N // 2].convert("L")
arr = np.asarray(mid).astype(np.float32) / 255.0
gx = np.zeros_like(arr); gy = np.zeros_like(arr)
gx[:, 1:-1] = arr[:, 2:] - arr[:, :-2]
gy[1:-1, :] = arr[2:, :] - arr[:-2, :]
s = 2.2
nx = -gx * s; ny = gy * s; nz = np.ones_like(arr)
ln = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
nrm = np.stack([(nx / ln * .5 + .5) * 255, (ny / ln * .5 + .5) * 255, (nz / ln * .5 + .5) * 255], -1).astype(np.uint8)
Image.fromarray(nrm, "RGB").save(os.path.join(ROOT, "assets/gl/normal.png"))
Image.fromarray(nrm, "RGB").save(os.path.join(ROOT, "assets/gl/normal.webp"), "WEBP", quality=85)
poster = Image.new("RGBA", (W, H), (13, 13, 13, 255))
poster.alpha_composite(frames[0])
poster.convert("RGB").save(os.path.join(ROOT, "assets/gl/poster.webp"), "WEBP", quality=86)
print("normal + poster done")
