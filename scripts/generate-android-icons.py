import os
from PIL import Image

SRC = os.path.join('assets', 'icon-arcade-3d.png')
RES = os.path.join('android', 'app', 'src', 'main', 'res')

if not os.path.exists(SRC) or not os.path.exists(RES):
    raise SystemExit('Missing source icon or android/app/src/main/res directory')

img = Image.open(SRC).convert('RGBA')

LEGACY_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

ADAPTIVE_SIZES = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
}

for folder, size in LEGACY_SIZES.items():
    out_dir = os.path.join(RES, folder)
    os.makedirs(out_dir, exist_ok=True)
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(out_dir, 'ic_launcher.png'), format='PNG', optimize=True)
    resized.save(os.path.join(out_dir, 'ic_launcher_round.png'), format='PNG', optimize=True)

for folder, size in ADAPTIVE_SIZES.items():
    out_dir = os.path.join(RES, folder)
    os.makedirs(out_dir, exist_ok=True)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = int(round(size * 0.66))
    fg = img.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(fg, (offset, offset), fg)
    canvas.save(os.path.join(out_dir, 'ic_launcher_foreground.png'), format='PNG', optimize=True)

values_dir = os.path.join(RES, 'values')
os.makedirs(values_dir, exist_ok=True)
bg_xml = os.path.join(values_dir, 'ic_launcher_background.xml')
with open(bg_xml, 'w', encoding='utf-8') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1a1e2e</color>\n</resources>\n')

print('Generated Android launcher icons in', RES)
