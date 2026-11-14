"""Per-frame effects used by the video worker.

Each function mirrors exactly the PIL operation of the matching image
microservice (Tools/<tool>/<tool>.py), so that the same effect produces the
same result on an image and on every frame of a video. Parameter names are
the same ones the frontend already sends to the image tools.
"""
from PIL import Image, ImageEnhance, ImageOps


def brightness(img: Image.Image, brightness: float) -> Image.Image:
    return ImageEnhance.Brightness(img).enhance(float(brightness))


def contrast(img: Image.Image, contrastFactor: float) -> Image.Image:
    return ImageEnhance.Contrast(img).enhance(float(contrastFactor))


def saturation(img: Image.Image, saturationFactor: float) -> Image.Image:
    return ImageEnhance.Color(img).enhance(float(saturationFactor))


def rotate(img: Image.Image, degrees: float) -> Image.Image:
    return img.rotate(float(degrees), expand=True)


def resize(img: Image.Image, width: int, height: int) -> Image.Image:
    return img.resize((int(width), int(height)))


def binarization(img: Image.Image, threshold: int) -> Image.Image:
    t = int(threshold)
    gray = ImageOps.grayscale(img).point(lambda x: 0 if x < t else 255)
    return gray.convert("RGB")


def cut(img: Image.Image, left: int, top: int, right: int, bottom: int) -> Image.Image:
    return img.crop((int(left), int(top), int(right), int(bottom)))


def border(img: Image.Image, borderWidth: int, r: int, g: int, b: int) -> Image.Image:
    return ImageOps.expand(img, border=int(borderWidth), fill=(int(r), int(g), int(b)))


# Effects applied frame by frame
FRAME_EFFECTS = {
    "brightness": brightness,
    "contrast": contrast,
    "saturation": saturation,
    "rotate": rotate,
    "resize": resize,
    "binarization": binarization,
    "cut": cut,
    "border": border,
}

# Effects that act on time (only meaningful for video)
TIME_EFFECTS = {"trim", "speed"}

SUPPORTED = set(FRAME_EFFECTS) | TIME_EFFECTS


class UnsupportedEffect(Exception):
    pass


def apply_frame_effects(img: Image.Image, tools: list) -> Image.Image:
    """Applies the frame effects in `tools`, in the given order."""
    for tool in tools:
        name = tool["procedure"]
        if name in TIME_EFFECTS:
            continue
        fn = FRAME_EFFECTS.get(name)
        if fn is None:
            raise UnsupportedEffect(f"Effect '{name}' is not available for video")
        img = fn(img, **(tool.get("params") or {}))
        if img.mode != "RGB":
            img = img.convert("RGB")
    return img
