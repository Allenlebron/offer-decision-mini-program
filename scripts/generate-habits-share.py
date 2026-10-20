"""Render a fixed, data-free lifestyle share cover (Pillow, macOS fonts)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

image = Image.new("RGB", (1000, 800), "#F4F7FC")
draw = ImageDraw.Draw(image)
draw.rectangle((40, 40, 960, 760), fill="#FFFFFF")
font_path = "/System/Library/Fonts/STHeiti Medium.ttc"

def text(value, x, y, size, color):
    draw.text((x, y), value, font=ImageFont.truetype(font_path, size), fill=color)

text("三件小事", 90, 95, 30, "#526178")
text("把生活，", 90, 205, 72, "#101827")
text("过得更有劲。", 90, 300, 72, "#101827")
for index, (label, color) in enumerate([("练一点", "#16785C"), ("喝够水", "#2155CF"), ("睡好觉", "#7049B8")]):
    x = 90 + index * 275
    draw.rectangle((x, 450, x + 230, 456), fill=color)
    text(label, x, 485, 36, color)
text("薄肌 · 大水 · 大睡", 90, 665, 28, "#526178")
image.save(Path(__file__).resolve().parents[1] / "images/share-habits.png", optimize=True)
