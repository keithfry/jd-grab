# Cleans up a raw context-menu screenshot for the Chrome Web Store listing:
# lightly blurs the page text, deep-blurs sensitive patches (company name,
# other extensions), keeps the menus sharp, and fits onto a 1280x800 canvas.
#
# Usage: python3 scripts/process-menu-shot.py [src.png] [out.png]
# The MENUS/DEEP region boxes below are tuned for a 1820x1006 capture —
# adjust them for a new screenshot.

import sys
from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else 'menu-src.png'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'context-menu.png'

img = Image.open(SRC).convert('RGB')
w, h = img.size  # 1820x1006

light = img.filter(ImageFilter.GaussianBlur(4))
deep = img.filter(ImageFilter.GaussianBlur(18))

out = light.copy()

# Keep the two menu boxes sharp
MENUS = [
    (683, 225, 1170, 1006),   # main context menu
    (1160, 725, 1650, 885),   # JD Grab submenu
]
for b in MENUS:
    out.paste(img.crop(b), b[:2])

# Deep-blur patches: "Lineal" occurrences + AI Custom Prompts row
DEEP = [
    (108, 8, 228, 55),        # "Lineal" in "About Lineal" heading
    (2, 62, 105, 108),        # "Lineal" starting paragraph
    (2, 640, 115, 688),       # "Lineal's" in The Opportunity para
    (695, 683, 1145, 730),    # AI Custom Prompts menu row
]
for b in DEEP:
    out.paste(deep.crop(b), b[:2])

# Fit onto 1280x800 white canvas (CWS screenshot spec, 24-bit no alpha)
scale = min(1280 / w, 800 / h)
nw, nh = round(w * scale), round(h * scale)
resized = out.resize((nw, nh), Image.LANCZOS)
canvas = Image.new('RGB', (1280, 800), 'white')
canvas.paste(resized, ((1280 - nw) // 2, (800 - nh) // 2))
canvas.save(OUT)
print('saved', OUT, canvas.size, canvas.mode)
