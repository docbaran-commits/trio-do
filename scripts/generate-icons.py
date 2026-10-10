#!/usr/bin/env python3
"""Draw the 3 Lists home-screen icons: three pills, red, yellow, and green."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RED = (220, 38, 38, 255)
YELLOW = (250, 204, 21, 255)
GREEN = (22, 163, 74, 255)
INK = (36, 30, 26, 255)


def in_round_rect(x, y, left, top, width, height, radius):
    if x < left or y < top or x >= left + width or y >= top + height:
        return False
    r = radius
    cx = cy = None
    if x < left + r and y < top + r:
        cx, cy = left + r, top + r
    elif x >= left + width - r and y < top + r:
        cx, cy = left + width - r - 1, top + r
    elif x < left + r and y >= top + height - r:
        cx, cy = left + r, top + height - r - 1
    elif x >= left + width - r and y >= top + height - r:
        cx, cy = left + width - r - 1, top + height - r - 1
    else:
        return True
    dx = x + 0.5 - (cx + 0.5)
    dy = y + 0.5 - (cy + 0.5)
    return dx * dx + dy * dy <= (r - 0.15) ** 2


def paint(size, inset):
    bars = 3
    gap = size * 0.045
    bar_h = size * 0.11
    bar_w = size - inset * 2
    total = bars * bar_h + (bars - 1) * gap
    top = (size - total) / 2
    radius = bar_h / 2
    colors = [RED, YELLOW, GREEN]

    def pixel(x, y):
        for index, color in enumerate(colors):
            bar_top = top + index * (bar_h + gap)
            if in_round_rect(x, y, inset, bar_top, bar_w, bar_h, radius):
                return color
        return INK

    return pixel


def write_png(path, size, inset):
    scale = 4 if size <= 192 else 2
    big = size * scale
    sample = paint(big, inset * scale)
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(scale):
                for sx in range(scale):
                    px = sample(x * scale + sx, y * scale + sy)
                    for channel in range(4):
                        acc[channel] += px[channel]
            count = scale * scale
            row.extend(channel // count for channel in acc)
        rows.append(bytes(row))

    raw = b"".join(rows)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def main():
    write_png(ROOT / "public" / "icon-192.png", 192, 36)
    write_png(ROOT / "public" / "icon-512.png", 512, 96)
    write_png(ROOT / "public" / "icon-maskable-512.png", 512, 128)
    write_png(ROOT / "src" / "app" / "icon.png", 32, 5)
    write_png(ROOT / "src" / "app" / "apple-icon.png", 180, 34)


if __name__ == "__main__":
    main()
