#!/usr/bin/env python3
"""Generate the V2 hero figure: 48-frame sequence (WebP, alpha) of the MindCurator
centre figure + a normal map derived from the mid frame (Sobel on luminance).
Figure = studio browser window showing rotating project screenshots, orbiting
project cards, rotating green arc ring, glow ellipse. Own artwork, local only."""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.expanduser("~/workspace/projects/mindcurator-autopilot-v2")
IMG = os.path.join(ROOT, "assets/img")
OUT = os.path.join(ROOT, "assets/gl/frames")
os.makedirs(OUT, exist_ok=True)
W, H = 880, 1100
N = 48
GREEN = (60, 190, 105, 255)
LIGHT = (241, 242, 243, 255)
DARK = (16, 16, 16, 255)

shots = []
for name in ["alessandro", "paradise", "mayuri", "videotheque", "malgudi", "shashiclicks"]:
    im = Image.open(os.path.join(IMG, f"work-{name}.webp")).convert("RGB")
    shots.append(im)

def cover(im, w, h):
    s = max(w / im.width, h / im.height)
    im2 = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = 0; y = 0
    return im2.crop((x, y, x + w, y + h))

def rrect(draw, box, r, **kw):
    draw.rounded_rectangle(box, radius=r, **kw)

def card(base, shot, w, h, cx, cy, angle, border=LIGHT):
    tile = Image.new("RGBA", (w + 24, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    rrect(d, [12, 8, 12 + w, 8 + h], 26, fill=(20, 20, 20, 255), outline=border, width=3)
    pic = cover(shot, w - 16, h - 52).convert("RGBA")
    tile.paste(pic, (20, 44))
    d.ellipse([28, 20, 40, 32], fill=GREEN)
    d.ellipse([48, 20, 60, 32], fill=(120, 120, 120, 255))
    d.ellipse([68, 20, 80, 32], fill=(90, 90, 90, 255))
    tile = tile.rotate(angle, resample=Image.BICUBIC, expand=True)
    base.alpha_composite(tile, (round(cx - tile.width / 2), round(cy - tile.height / 2)))

def ease(t):  # easeInOutSine
    return -(math.cos(math.pi * t) - 1) / 2

frames = []
for i in range(N):
    t = i / (N - 1)
    e = ease(t)
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(base, "RGBA")
    # glow ellipse (bottom centre, pulses slightly)
    gw = 560 + 60 * math.sin(t * math.pi)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W/2 - gw/2, H - 300, W/2 + gw/2, H - 60], fill=(60, 190, 105, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    base.alpha_composite(glow)
    # rotating arc ring behind main window
    ring = Image.new("RGBA", (760, 760), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    start = -90 + 140 * e
    rd.arc([30, 30, 730, 730], start=start, end=start + 210, fill=GREEN, width=10)
    rd.arc([70, 70, 690, 690], start=start + 180, end=start + 300, fill=(241, 242, 243, 120), width=4)
    ring = ring.rotate(0, resample=Image.BICUBIC)
    base.alpha_composite(ring, (round(W/2 - 380), round(430 - 380 + 30 * math.sin(t * math.pi))))
    # orbiting mini cards (behind main on left/right)
    for k, (shot, ph, rx, ry, w2) in enumerate([
        (shots[1], 0.0, 300, 210, 250), (shots[3], 2.4, 310, 260, 230),
        (shots[4], 4.2, 280, 190, 210), (shots[5], 1.2, 260, 300, 200)]):
        ang = ph + 0.9 * e + 0.12 * math.sin(t * math.pi * 2 + ph)
        cx = W / 2 + math.cos(ang) * rx * (1 if k % 2 == 0 else -1) * (1 if k < 2 else 0.92)
        cy = 470 + math.sin(ang) * ry * 0.55 - 40 * e
        if k >= 2:
            cx = W / 2 - math.cos(ang) * rx * 0.9
        card(base, shot, w2, round(w2 * 0.72), cx, cy, -8 + 16 * e * (1 if k % 2 == 0 else -1))
    # main studio window (centre figure)
    mw, mh = 470, 620
    scale = 0.94 + 0.09 * e
    mw2, mh2 = round(mw * scale), round(mh * scale)
    cx, cy = W / 2, 470 - 26 * e
    idx = min(5, int(t * 6.999))
    nxt = min(5, idx + 1)
    frac = (t * 6.999) - idx
    win = Image.new("RGBA", (mw2 + 24, mh2 + 24), (0, 0, 0, 0))
    wd = ImageDraw.Draw(win)
    rrect(wd, [12, 12, 12 + mw2, 12 + mh2], 34, fill=(18, 18, 18, 255), outline=LIGHT, width=3)
    picA = cover(shots[idx], mw2 - 24, mh2 - 92).convert("RGBA")
    picB = cover(shots[nxt], mw2 - 24, mh2 - 92).convert("RGBA")
    if frac > 0.75 and nxt != idx:
        picA = Image.blend(picA, picB, (frac - 0.75) / 0.25)
    win.paste(picA, (24, 74))
    wd.ellipse([36, 34, 52, 50], fill=GREEN)
    wd.ellipse([62, 34, 78, 50], fill=(130, 130, 130, 255))
    wd.ellipse([88, 34, 104, 50], fill=(95, 95, 95, 255))
    # wordmark bar inside window footer
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except Exception:
        font = ImageFont.load_default()
    wd.text((36, mh2 - 52), "MindCurator", font=font, fill=LIGHT)
    wd.text((36 + 218, mh2 - 52), "STUDIO", font=font, fill=GREEN)
    base.alpha_composite(win, (round(cx - win.width / 2), round(cy - win.height / 2)))
    # green dot badge travelling on ring
    ba = math.radians(-90 + 140 * e + 210)
    bx, by = W / 2 + 350 * math.cos(ba), 460 + 350 * math.sin(ba)
    d.ellipse([bx - 15, by - 15, bx + 15, by + 15], fill=GREEN, outline=LIGHT, width=3)
    base.save(os.path.join(OUT, f"fig-{i:03d}.webp"), "WEBP", quality=84, method=4)
    frames.append(base)
    print("frame", i)

# normal map from mid frame luminance (Sobel)
mid = frames[N // 2].convert("L")
a = np.asarray(mid).astype(np.float32) / 255.0
gx = np.zeros_like(a); gy = np.zeros_like(a)
gx[:, 1:-1] = a[:, 2:] - a[:, :-2]
gy[1:-1, :] = a[2:, :] - a[:-2, :]
strength = 2.2
nx = -gx * strength; ny = gy * strength; nz = np.ones_like(a)
ln = np.sqrt(nx**2 + ny**2 + nz**2)
nrm = np.stack([(nx / ln * 0.5 + 0.5) * 255, (ny / ln * 0.5 + 0.5) * 255, (nz / ln * 0.5 + 0.5) * 255], axis=-1).astype(np.uint8)
Image.fromarray(nrm, "RGB").save(os.path.join(ROOT, "assets/gl/normal.png"))
# alpha mask reuse: mid frame saved as poster too
frames[0].save(os.path.join(ROOT, "assets/gl/poster.webp"), "WEBP", quality=85, method=4)
print("normal + poster done")
