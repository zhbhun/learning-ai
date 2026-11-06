"""Confetti celebration Slack emoji GIF (128x128, 12 frames @ 10fps)."""
import math
import random
import sys

sys.path.insert(0, "/Users/zhanghuabin/Projects/source/skills/anthropics-skills/skills/slack-gif-creator")

from core.easing import interpolate
from core.frame_composer import create_gradient_background, draw_star
from core.gif_builder import GIFBuilder
from core.validators import validate_gif
from PIL import Image, ImageDraw

W = H = 128
FPS = 10
N = 12
CX, CY = W / 2, H / 2
BURST = 2  # frame index where the pop happens

BG_TOP = (72, 42, 140)   # violet
BG_BOT = (26, 16, 64)    # dark indigo

PALETTE = [
    (255, 107, 107),  # red
    (255, 157, 0),    # orange
    (255, 221, 51),   # yellow
    (80, 250, 123),   # green
    (67, 216, 255),   # cyan
    (255, 102, 255),  # pink
    (255, 255, 255),  # white
]

random.seed(42)

# Total rotation is an integer multiple of 2*pi over the loop so spinning
# particles line up when the GIF wraps around.
particles = []
for i in range(30):
    particles.append(
        dict(
            ang=random.uniform(0, 2 * math.pi),
            speed=random.uniform(30, 64),
            kind=random.choice(["strip", "strip", "circle", "star"]),
            size=random.uniform(3.2, 6.4),
            color=PALETTE[i % len(PALETTE)],
            rot0=random.uniform(0, 2 * math.pi),
            turns=random.choice([-2, -1, 1, 1, 2]) * 2 * math.pi,
            wob=random.uniform(0.75, 1.25),
        )
    )


def blend(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a * (1 - t) + b * t) for a, b in zip(c1, c2))


def rot_rect_points(cx, cy, w, h, rot):
    cos, sin = math.cos(rot), math.sin(rot)
    pts = []
    for dx, dy in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        pts.append((cx + dx * cos - dy * sin, cy + dx * sin + dy * cos))
    return pts


def rot_star_points(cx, cy, size, rot):
    pts = []
    for i in range(10):
        a = rot + (i * 36 - 90) * math.pi / 180
        r = size if i % 2 == 0 else size * 0.42
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw_particle(draw, p, f, radius, scale, fade):
    color = blend(p["color"], BG_BOT, fade)
    rot = p["rot0"] + p["turns"] * f / N
    s = p["size"] * scale
    x = CX + radius * math.cos(p["ang"])
    y = CY + radius * math.sin(p["ang"]) * p["wob"]
    if p["kind"] == "strip":
        draw.polygon(rot_rect_points(x, y, s, s * 2.2, rot), fill=color)
    elif p["kind"] == "circle":
        draw.ellipse([x - s / 1.6, y - s / 1.6, x + s / 1.6, y + s / 1.6], fill=color)
    else:
        draw.polygon(rot_star_points(x, y, s * 0.9, rot), fill=color)


def make_frame(f):
    frame = create_gradient_background(W, H, BG_TOP, BG_BOT)
    draw = ImageDraw.Draw(frame)

    # Fade out over the last 3 frames so the loop lands on the gathering phase.
    fade = 0.0
    if f >= N - 3:
        fade = (f - (N - 3) + 0.5) / 3.0

    if f < BURST:
        # Anticipation: confetti ring spirals inward, glow swells.
        t = f / BURST
        ring_r = interpolate(44, 8, t, easing="ease_in")
        glow_r = interpolate(6, 20, t, easing="ease_out")
        for p in particles:
            draw_particle(draw, p, f, ring_r, scale=0.7 + 0.3 * t, fade=0.15 * (1 - t))
        draw.ellipse(
            [CX - glow_r, CY - glow_r, CX + glow_r, CY + glow_r],
            fill=blend((255, 240, 180), BG_BOT, 0.25),
        )
    else:
        # Pop: confetti flies out with gravity, star bursts at center.
        t = (f - BURST) / (N - 1 - BURST)
        for p in particles:
            dist = p["speed"] * interpolate(0, 1, t, easing="ease_out")
            y_grav = 16 * t * t  # accumulated gravity pulls confetti down
            ang = p["ang"]
            x = CX + dist * math.cos(ang)
            y = CY + dist * math.sin(ang) * p["wob"] + y_grav
            color = blend(p["color"], BG_BOT, fade)
            rot = p["rot0"] + p["turns"] * f / N
            s = p["size"] * (1 - 0.3 * fade)
            if p["kind"] == "strip":
                draw.polygon(rot_rect_points(x, y, s, s * 2.2, rot), fill=color)
            elif p["kind"] == "circle":
                draw.ellipse([x - s / 1.6, y - s / 1.6, x + s / 1.6, y + s / 1.6], fill=color)
            else:
                draw.polygon(rot_star_points(x, y, s * 0.9, rot), fill=color)

        # Center star: pops big with back_out overshoot, then shrinks away.
        pop = interpolate(0, 1, min(1.0, t * 3), easing="back_out")
        star_s = 22 * pop * (1 - 0.75 * t)
        if star_s > 1:
            glow_r = star_s * 1.7
            draw.ellipse(
                [CX - glow_r, CY - glow_r, CX + glow_r, CY + glow_r],
                fill=blend((255, 236, 150), BG_BOT, 0.55 + 0.3 * t),
            )
            draw_star(
                frame,
                (int(CX), int(CY)),
                int(star_s),
                fill_color=blend((255, 215, 64), BG_BOT, fade),
                outline_color=blend((255, 255, 255), BG_BOT, fade),
                outline_width=2,
            )

        # Twinkling sparkles near the burst.
        twinkle = math.sin(t * 2 * math.pi) * 0.5 + 0.5
        for sx, sy in [(30, 38), (98, 44), (84, 96), (40, 90)]:
            r = 3.5 * twinkle * (1 - fade)
            if r > 1:
                c = blend((255, 255, 255), BG_BOT, fade)
                draw.line([(sx - r, sy), (sx + r, sy)], fill=c, width=2)
                draw.line([(sx, sy - r), (sx, sy + r)], fill=c, width=2)

    return frame


out = "/Users/zhanghuabin/Projects/learning/ai/sandbox/slack-gif-creator/confetti-celebration.gif"
builder = GIFBuilder(width=W, height=H, fps=FPS)
builder.add_frames([make_frame(f) for f in range(N)])
builder.save(out, num_colors=48, optimize_for_emoji=True, remove_duplicates=True)

passes, info = validate_gif(out, is_emoji=True, verbose=True)
print("SLACK_READY" if passes else "VALIDATION_FAILED", info)
