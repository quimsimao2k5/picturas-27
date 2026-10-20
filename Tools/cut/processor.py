from PIL import Image

def process_image(img, **config) -> Image.Image:
    left, top, right, bottom = config["limits"]
    w, h = img.width, img.height
    return img.crop((left, top, w-right, h-bottom))
