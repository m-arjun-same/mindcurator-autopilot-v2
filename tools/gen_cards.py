#!/usr/bin/env python3
"""GL floating cards in the reference's language: small translucent dark-glass
chart cards — project screenshot miniaturised on top, a green growth line +
candles below, tiny name/value labels. NOT full posters. Own artwork."""
import os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.expanduser("~/workspace/projects/mindcurator-autopilot-v2")
IMG = os.path.join(ROOT, "assets/img")
OUT = os.path.join(ROOT, "assets/gl/cards")
os.makedirs(OUT, exist_ok=True)
W, H = 690, 465
GREEN = (60, 190, 105, 255); RED = (232, 84, 74, 255); LIGHT = (241, 242, 243, 255)

def cover(im, w, h):
    s = max(w / im.width, h / im.height)
    im2 = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return im2.crop((0, 0, w, h))

try:
    f_name = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    f_val = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
    f_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
except Exception:
    f_name = f_val = f_sub = ImageFont.load_default()

projects = [
    ("alessandro", "Alessandro Pet Spa", "LIVE"),
    ("paradise", "Paradise Restaurant", "LIVE"),
    ("videotheque", "Videotheque", "LIVE"),
    ("shashiclicks", "ShashiClicks", "LIVE"),
    ("mayuri", "Mayuri Footwears", "LIVE"),
]
for k, (slug, name, val) in enumerate(projects):
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(card, "RGBA")
    d.rounded_rectangle([3, 3, W - 3, H - 3], radius=38, fill=(18, 19, 21, 148), outline=(255, 255, 255, 90), width=2)
    shot = Image.open(os.path.join(IMG, f"work-{slug}.webp")).convert("RGB")
    pic = cover(shot, W - 56, 218)
    mask = Image.new("L", pic.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pic.width, pic.height], radius=22, fill=255)
    card.paste(pic, (28, 26), mask)
    d = ImageDraw.Draw(card, "RGBA")
    d.ellipse([30, 262, 48, 280], fill=GREEN)
    d.text((60, 254), name, font=f_name, fill=LIGHT)
    d.text((W - 118, 250), val, font=f_val, fill=GREEN)
    d.text((32, 292), "Built by MindCurator Studio", font=f_sub, fill=(241, 242, 243, 150))
    # candlesticks + growth line, seeded per project
    rng = random.Random(42 + k)
    base_y = 415; v = 0.0; pts = []
    for cx in range(8):
        x = 44 + cx * 52
        dv = rng.uniform(-16, 22); v += dv * 0.4
        top = base_y - 34 - v - rng.uniform(0, 14); bot = top + rng.uniform(18, 44)
        col = GREEN if dv >= 0 else RED
        d.line([x + 9, top - 8, x + 9, bot + 8], fill=col, width=3)
        d.rectangle([x, top, x + 18, bot], fill=col)
        pts.append((x + 9, (top + bot) / 2))
    line = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(line).line([(32, 428), (200, 408), (360, 414), (520, 386), (W - 36, 356)], fill=GREEN, width=5, joint="curve")
    card.alpha_composite(line)
    card.save(os.path.join(OUT, f"card-{slug}.webp"), "WEBP", quality=86, method=4)
    print("card", slug)
print("done")
