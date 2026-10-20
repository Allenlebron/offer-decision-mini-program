"""Render the fixed, data-free celebration share cover (Pillow, macOS fonts)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

scale = 2
image = Image.new("RGB", (1000 * scale, 800 * scale), "#F8FAFC")
draw = ImageDraw.Draw(image)
font_path = "/System/Library/Fonts/STHeiti Medium.ttc"

def circle(x, y, radius, fill=None, outline=None, width=1):
    draw.ellipse(tuple(int(v * scale) for v in (x-radius, y-radius, x+radius, y+radius)), fill=fill, outline=outline, width=width*scale)

def text(value, y, size, color):
    font = ImageFont.truetype(font_path, size * scale)
    draw.text((500 * scale, y * scale), value, font=font, fill=color, anchor="mm")

circle(500, 245, 112, outline="#C5E4D8", width=2)
circle(500, 245, 88, fill="#E8F5EE")
draw.line([(462*scale, 244*scale), (489*scale, 271*scale), (538*scale, 219*scale)], fill="#16785C", width=9*scale, joint="curve")
for x, y, radius, color in [(579, 165, 7, "#2463FF"), (414, 318, 6, "#7952C7"), (373, 233, 5, "#D9AA5B"), (668, 330, 4, "#16785C"), (319, 135, 4, "#2463FF")]:
    circle(x, y, radius, fill=color)
text("今日目标 · 已达成", 86, 25, "#526178")
text("今天的小目标", 439, 61, "#101827")
text("完成了。", 526, 68, "#101827")
text("好好生活，慢慢来。", 666, 28, "#526178")
image.resize((1000, 800), Image.Resampling.LANCZOS).save(Path(__file__).resolve().parents[1] / "images/share-celebration.png", optimize=True)
