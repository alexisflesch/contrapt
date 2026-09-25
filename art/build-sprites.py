#!/usr/bin/env python3
"""Exporte les sprites du plateau depuis les sources de `art/assets/`.

Convention (ADR 0007 § Convention de sprite) : 128 px par unité monde à @2x,
fond transparent, cadre d'un calque = empreinte monde qu'il déclare dans
`src/domain/family-geometry.ts`. Les calques d'une même famille sont recadrés
sur un cadre commun mesuré dans les sources, pour rester alignés.

Dépendances hors dépôt : Python 3, Pillow, numpy, pngquant.
Usage : python3 art/build-sprites.py   (depuis la racine du dépôt)

Le script affiche aussi les géométries mesurées (polygones, fenêtres, pivot),
reportées à la main dans `family-geometry.ts`. Il n'est pas lancé par la gate :
les PNG produits sont commités, et `sprite-assets.test.ts` vérifie leurs
dimensions contre la géométrie du domaine.
"""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art" / "assets"
OUT = ROOT / "public" / "assets" / "sprites"
THUMBS = OUT / "thumbs"
PX_PER_UNIT = 128
ALPHA_NOISE = 8  # alpha résiduel des sources générées, effacé avant recadrage


def load(relative: str) -> Image.Image:
    image = Image.open(ART / relative).convert("RGBA")
    data = np.array(image)
    data[data[:, :, 3] <= ALPHA_NOISE] = 0
    return Image.fromarray(data)


def px(world: float) -> int:
    return max(1, round(world * PX_PER_UNIT))


def export(image: Image.Image, box: tuple[float, float, float, float], world_w: float, world_h: float, name: str) -> Image.Image:
    cropped = image.crop(tuple(round(v) for v in box))
    sprite = cropped.resize((px(world_w), px(world_h)), Image.LANCZOS)
    save(sprite, OUT / f"{name}@2x.png")
    return sprite


def save(sprite: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sprite.save(path)
    subprocess.run(
        ["pngquant", "--force", "--skip-if-larger", "--quality=70-95", "--output", str(path), str(path)],
        check=False,
    )


def hull(points: list[tuple[int, int]], max_vertices: int = 8) -> list[tuple[int, int]]:
    """Enveloppe convexe réduite à `max_vertices` sommets (limite Box2D/Planck)."""
    pts = sorted(set(points))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list[tuple[int, int]] = []
    upper: list[tuple[int, int]] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    result = lower[:-1] + upper[:-1]
    while len(result) > max_vertices:
        def lost(i: int) -> float:
            a, b, c = result[i - 1], result[i], result[(i + 1) % len(result)]
            return abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]))
        result.pop(min(range(len(result)), key=lost))
    return result


def outline(image: Image.Image) -> list[tuple[int, int]]:
    alpha = np.array(image)[:, :, 3] > 64
    points = []
    for y in range(alpha.shape[0]):
        xs = np.nonzero(alpha[y])[0]
        if len(xs):
            points += [(int(xs.min()), y), (int(xs.max()), y)]
    return points


def to_world(points, origin, scale) -> list[list[float]]:
    return [[round((x - origin[0]) * scale, 4), round((y - origin[1]) * scale, 4)] for x, y in points]


def composite(layers: list[tuple[Image.Image, tuple[int, int]]], size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    for layer, offset in layers:
        canvas.alpha_composite(layer, offset)
    return canvas


geometry: dict[str, object] = {}

# Balle : trois calques sur le cadre carré du disque de base.
ball_frame = (41, 38, 1211, 1208)
base = load("ball/ball-base.png")
spin = load("ball/ball-spin-pattern.png")
# Le motif tourne avec le corps : il est masqué au disque pour ne jamais en déborder.
mask = Image.new("L", spin.size, 0)
from PIL import ImageDraw  # noqa: E402

ImageDraw.Draw(mask).ellipse(ball_frame, fill=255)
spin.putalpha(Image.fromarray(np.minimum(np.array(spin)[:, :, 3], np.array(mask))))
ball_layers = [
    export(base, ball_frame, 0.6, 0.6, "ball-base"),
    export(spin, ball_frame, 0.6, 0.6, "ball-spin"),
    export(load("ball/ball-highlight.png"), ball_frame, 0.6, 0.6, "ball-highlight"),
]
save(composite([(layer, (0, 0)) for layer in ball_layers], ball_layers[0].size), THUMBS / "ball.png")

# Panier : arrière et lèvre avant sur le même cadre, empreinte figée 1,5 × 1,1.
basket_frame = (106, 278, 1148, 1029)
basket_layers = [
    export(load("basket/basket-back.png"), basket_frame, 1.5, 1.1, "basket-back"),
    export(load("basket/basket-front.png"), basket_frame, 1.5, 1.1, "basket-front"),
]
save(composite([(layer, (0, 0)) for layer in basket_layers], basket_layers[0].size), THUMBS / "basket.png")

# Poutre : pas de nouvelle source, la vignette reprend le sprite existant.
save(Image.open(OUT / "beam@2x.png").convert("RGBA"), THUMBS / "beam.png")

# Bascule : tablier 3 × 0,24 centré sur le pivot, pied posé sous le tablier.
fulcrum = load("seesaw/seesaw_fulcrum.png")
fulcrum_box = fulcrum.getbbox()
fulcrum_scale = 0.58 / (fulcrum_box[3] - fulcrum_box[1])
fulcrum_w = (fulcrum_box[2] - fulcrum_box[0]) * fulcrum_scale
seesaw_beam = export(load("seesaw/seesaw_beam.png"), load("seesaw/seesaw_beam.png").getbbox(), 3, 0.24, "seesaw-beam")
seesaw_fulcrum = export(fulcrum, fulcrum_box, fulcrum_w, 0.58, "seesaw-fulcrum")
fulcrum_center_x = (fulcrum_box[0] + fulcrum_box[2]) / 2
geometry["seesawFulcrum"] = {
    "width": round(fulcrum_w, 4),
    "polygon": [[x, round(y + 0.12, 4)] for x, y in to_world(hull(outline(fulcrum)), (fulcrum_center_x, fulcrum_box[1]), fulcrum_scale)],
}
beam_top = round(0.12 * PX_PER_UNIT)
save(
    composite(
        [(seesaw_fulcrum, ((seesaw_beam.width - seesaw_fulcrum.width) // 2, beam_top + seesaw_beam.height // 2)), (seesaw_beam, (0, 0))],
        (seesaw_beam.width, beam_top + seesaw_beam.height // 2 + seesaw_fulcrum.height),
    ),
    THUMBS / "seesaw.png",
)

# Masse : un calque, polygone de collision mesuré sur la silhouette.
mass = load("mass/mass-10kgs.png")
mass_box = mass.getbbox()
mass_scale = 0.8 / (mass_box[2] - mass_box[0])
mass_h = (mass_box[3] - mass_box[1]) * mass_scale
mass_sprite = export(mass, mass_box, 0.8, mass_h, "mass-10kg")
save(mass_sprite, THUMBS / "mass.png")
geometry["mass"] = {
    "height": round(mass_h, 4),
    "polygon": to_world(hull(outline(mass)), ((mass_box[0] + mass_box[2]) / 2, (mass_box[1] + mass_box[3]) / 2), mass_scale),
}

# Levier : origine au pivot. Le socle est symétrique autour du dôme ; la
# poignée est redressée à la verticale autour de son anneau puis recentrée
# sur le dôme, pour que gauche et droite soient deux états symétriques.
lever_base = load("lever/lever-base.png")
base_box = lever_base.getbbox()
lever_scale = 0.8 / (base_box[2] - base_box[0])
dome_x = (base_box[0] + base_box[2]) / 2
ring = (562.0, 869.0)
knob = (969.5, 458.5)
tilt = math.degrees(math.atan2(knob[0] - ring[0], ring[1] - knob[1]))
handle = load("lever/lever-handle.png").rotate(tilt, resample=Image.BICUBIC, center=ring)
handle = handle.transform(handle.size, Image.AFFINE, (1, 0, ring[0] - dome_x, 0, 1, 0), resample=Image.BICUBIC)
pivot = (dome_x, ring[1])
handle_box = handle.getbbox()
half = max(pivot[0] - handle_box[0], handle_box[2] - pivot[0])
handle_frame = (pivot[0] - half, handle_box[1], pivot[0] + half, handle_box[3])
lever_base_sprite = export(lever_base, base_box, 0.8, (base_box[3] - base_box[1]) * lever_scale, "lever-base")
lever_handle_sprite = export(
    handle, handle_frame, 2 * half * lever_scale, (handle_frame[3] - handle_frame[1]) * lever_scale, "lever-handle"
)
knob_distance = math.dist(ring, knob)
geometry["lever"] = {
    "artTiltDegrees": round(tilt, 2),
    "base": to_world([base_box[:2], base_box[2:]], pivot, lever_scale),
    "basePolygon": to_world(hull(outline(lever_base)), pivot, lever_scale),
    "handle": to_world([handle_frame[:2], handle_frame[2:]], pivot, lever_scale),
    "knobCenterY": round(-knob_distance * lever_scale, 4),
    "knobRadius": round(126 * lever_scale, 4),
    "ringRadius": round(97 * lever_scale, 4),
}
lever_px = lambda v: round(v * lever_scale * PX_PER_UNIT)  # noqa: E731
top = min(base_box[1], handle_frame[1])
save(
    composite(
        [
            (lever_base_sprite, (0, lever_px(base_box[1] - top))),
            (lever_handle_sprite, ((lever_base_sprite.width - lever_handle_sprite.width) // 2, lever_px(handle_frame[1] - top))),
        ],
        (lever_base_sprite.width, lever_px(max(base_box[3], handle_frame[3]) - top)),
    ),
    THUMBS / "lever.png",
)

# Convoyeur : cadre 3 unités de long. La bande défile derrière la fenêtre du
# cadre ; son sprite est une bande de la hauteur de la fenêtre, plus longue
# que la fenêtre d'exactement une période du motif, pour que le renderer n'ait
# qu'à décaler sa source.
frame = load("conveyor/conveyor-fixed-part.png")
frame_box = frame.getbbox()
conveyor_scale = 3 / (frame_box[2] - frame_box[0])
frame_center = ((frame_box[0] + frame_box[2]) / 2, (frame_box[1] + frame_box[3]) / 2)
conveyor_frame = export(frame, frame_box, 3, (frame_box[3] - frame_box[1]) * conveyor_scale, "conveyor-frame")
window = (434, 297, 1738, 433)
period = 407
belt_k = 77 / period
belt = load("conveyor/conveyor-moving-part.png")
window_px = math.ceil((window[2] - window[0]) * belt_k)
strip = belt.crop((0, window[1], math.ceil((window_px + 77) / belt_k), window[3]))
strip = strip.resize((window_px + 77, round((window[3] - window[1]) * belt_k)), Image.LANCZOS)
save(strip, OUT / "conveyor-belt@2x.png")
save(strip.transpose(Image.FLIP_LEFT_RIGHT), OUT / "conveyor-belt-left@2x.png")
geometry["conveyor"] = {
    "height": round((frame_box[3] - frame_box[1]) * conveyor_scale, 4),
    "window": to_world([window[:2], window[2:]], frame_center, conveyor_scale),
    "beltPeriod": round(period * conveyor_scale, 4),
    "beltSprite": {"width": strip.width, "height": strip.height, "windowWidth": window_px, "periodPx": 77},
}
window_offset = (round((window[0] - frame_box[0]) * conveyor_scale * PX_PER_UNIT), round((window[1] - frame_box[1]) * conveyor_scale * PX_PER_UNIT))
save(composite([(strip.crop((0, 0, window_px, strip.height)), window_offset), (conveyor_frame, (0, 0))], conveyor_frame.size), THUMBS / "conveyor.png")

print(json.dumps(geometry, indent=2))
