"""Rebuild the original static illustration, icon sprite and social preview.

Runtime site has no dependencies. This optional asset helper uses Pillow.
"""
from pathlib import Path
import math
import re
import colorsys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'

def sculpture_lines(size=600):
    lines = []
    def center(t):
        r = 1.15 + .42 * math.cos(3 * t)
        return (r * math.cos(2 * t), r * math.sin(2 * t), .42 * math.sin(3 * t))
    def normalize(v):
        length = math.sqrt(sum(x * x for x in v)) or 1
        return tuple(x / length for x in v)
    def cross(a, b):
        return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
    for band in range(40):
        points = []
        depths = []
        for step in range(201):
            p = step / 200 * math.tau
            t = band / 40 * math.tau + .22 * p
            ahead, behind = center(p + .0008), center(p - .0008)
            tangent = normalize(tuple(a-b for a,b in zip(ahead, behind)))
            binormal = normalize(cross(tangent, (0, 0, 1)))
            normal = normalize(cross(binormal, tangent))
            radius = .17 + math.sin(band * 1.7) * .012
            x, y, z = tuple(c + radius * (math.cos(t)*n + math.sin(t)*b) for c,n,b in zip(center(p), normal, binormal))
            rx = x * math.cos(.68) - z * math.sin(.68)
            rz = x * math.sin(.68) + z * math.cos(.68)
            ry = y * math.cos(-.48) - rz * math.sin(-.48)
            depth = rz * math.cos(-.48) + y * math.sin(-.48)
            perspective = 3.8 / (4.8 - depth)
            points.append((size / 2 + rx * size * .23 * perspective, size / 2 + ry * size * .23 * perspective))
            depths.append(depth)
        lines.append((sum(depths) / len(depths), points))
    return sorted(lines)

lines = sculpture_lines()
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">']
for i, (depth, pts) in enumerate(lines):
    light = max(.24, min(.98, .56 + depth * .16))
    color = colorsys.hls_to_rgb((18 + i / 39 * 12) / 360, (36 + light * 34) / 100, .74)
    hex_color = '#' + ''.join(f'{round(c * 255):02x}' for c in color)
    coords = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    svg.append(f'<polyline points="{coords}" stroke="{hex_color}" stroke-opacity=".72" stroke-width="1.3"/>')
svg.append('</svg>')
(ASSETS / 'sculpture.svg').write_text('\n'.join(svg), encoding='utf-8')

symbols = ['<svg xmlns="http://www.w3.org/2000/svg">']
for path in sorted((ASSETS / 'icons').glob('*.svg')):
    source = path.read_text(encoding='utf-8')
    body = re.sub(r'^<svg[^>]*>', '', source).removesuffix('</svg>')
    symbols.append(f'<symbol id="{path.stem}" viewBox="0 0 24 24">{body}</symbol>')
symbols.append('</svg>')
(ASSETS / 'icons.svg').write_text('\n'.join(symbols), encoding='utf-8')

image = Image.new('RGB', (1200, 630), '#202522')
draw = ImageDraw.Draw(image)
font_dir = ASSETS / 'fonts'
title_font = ImageFont.truetype(str(font_dir / 'manrope-600.ttf'), 69)
small_font = ImageFont.truetype(str(font_dir / 'manrope-400.ttf'), 23)
mono_font = ImageFont.truetype(str(font_dir / 'ibm-plex-mono-400.ttf'), 13)
draw.text((56, 38), 'ANV—Ai', font=small_font, fill='#f9f8f1')
draw.line((56, 95, 1144, 95), fill='#4b5449')
draw.text((56, 128), 'ИИ-КОНСАЛТИНГ ДЛЯ БИЗНЕСА', font=mono_font, fill='#c0c7bd')
draw.text((52, 180), 'Меньше рутины.', font=title_font, fill='#f9f8f1')
draw.text((52, 265), 'Больше', font=title_font, fill='#f6a77a')
draw.text((52, 350), 'возможностей.', font=title_font, fill='#f6a77a')
draw.text((56, 523), 'Люди. Процессы. Искусственный интеллект.', font=small_font, fill='#c0c7bd')
for i, (depth, points) in enumerate(lines):
    light = max(.24, min(.98, .56 + depth * .16))
    color = colorsys.hls_to_rgb((18 + i / 39 * 12) / 360, (36 + light * 34) / 100, .74)
    rgb = tuple(round(c * 255) for c in color)
    draw.line([(x * .78 + 650, y * .78 + 115) for x, y in points], fill=rgb, width=1)
image.save(ASSETS / 'og.png', optimize=True)
print('Built sculpture.svg, icons.svg and og.png')
