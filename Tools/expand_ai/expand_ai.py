import os
import sys
import json
import datetime
import pytz
from io import BytesIO

import utils.env as env

from PIL import Image, ImageOps

from utils.tool_msg import ToolMSG
from utils.img_handler import Img_Handler

# ====== RF40: Generative Expand (HTTP outpaint) ======
# Define a URL do serviço gerativo (ex.: http://gen-ai:7860 ou http://comfyui:8188)
# Espera-se um endpoint: POST {GEN_EXPAND_URL}/outpaint
GEN_EXPAND_URL = os.getenv("GEN_EXPAND_URL", "").strip()

try:
    import requests  # adiciona requests ao requirements.txt do expand_ai
except Exception:
    requests = None


def _clamp_int(v, lo, hi, default):
    try:
        v = int(v)
        return max(lo, min(hi, v))
    except Exception:
        return default


def _clamp_float(v, lo, hi, default):
    try:
        v = float(v)
        return max(lo, min(hi, v))
    except Exception:
        return default


def _compute_padding(img_w, img_h, params: dict):
    """
    Suporta:
      - percent: número (ex: 25) => expande proporcionalmente em todas as direções
      - left/right/top/bottom: pixels
    Se percent existir, tem prioridade.
    """
    percent = params.get("percent", None)
    if percent is not None:
        p = _clamp_int(percent, 1, 200, 25)
        pad_x = int((img_w * p) / 100)
        pad_y = int((img_h * p) / 100)
        return pad_x, pad_x, pad_y, pad_y  # left, right, top, bottom

    left = _clamp_int(params.get("left", 0), 0, 4000, 0)
    right = _clamp_int(params.get("right", 0), 0, 4000, 0)
    top = _clamp_int(params.get("top", 0), 0, 4000, 0)
    bottom = _clamp_int(params.get("bottom", 0), 0, 4000, 0)
    return left, right, top, bottom


def _make_canvas_and_mask(img: Image.Image, left: int, right: int, top: int, bottom: int):
    new_w = img.width + left + right
    new_h = img.height + top + bottom

    # 1) pré-preenche com reflect (dá contexto ao inpaint)
    # reutiliza a tua lógica reflect (ou implementa simples)
    base = img.convert("RGB")

    canvas = Image.new("RGB", (new_w, new_h))
    canvas.paste(base, (left, top))

    if left > 0:
        strip = base.crop((0, 0, min(left, base.width), base.height))
        strip = ImageOps.mirror(strip)
        canvas.paste(strip.resize((left, base.height)), (0, top))

    if right > 0:
        strip = base.crop((max(base.width - right, 0), 0, base.width, base.height))
        strip = ImageOps.mirror(strip)
        canvas.paste(strip.resize((right, base.height)), (left + base.width, top))

    if top > 0:
        strip = canvas.crop((0, top, new_w, top + min(top, base.height)))
        strip = ImageOps.flip(strip)
        canvas.paste(strip.resize((new_w, top)), (0, 0))

    if bottom > 0:
        strip = canvas.crop((0, top + base.height - min(bottom, base.height), new_w, top + base.height))
        strip = ImageOps.flip(strip)
        canvas.paste(strip.resize((new_w, bottom)), (0, top + base.height))

    # 2) mask igual (255 nas margens, 0 na imagem original)
    mask = Image.new("L", (new_w, new_h), 255)
    mask.paste(0, (left, top, left + base.width, top + base.height))

    return canvas, mask


def _pil_to_png_bytes(im: Image.Image) -> bytes:
    bio = BytesIO()
    im.save(bio, format="PNG")
    bio.seek(0)
    return bio.getvalue()


def _generative_outpaint_http(canvas: Image.Image, mask: Image.Image, params: dict) -> Image.Image:
    """
    Chama um serviço externo para outpainting/inpainting.

    Contrato esperado:
      POST {GEN_EXPAND_URL}/outpaint (multipart/form-data)
        - image: PNG do canvas
        - mask: PNG da mask
        - prompt: string
        - negative_prompt: string (opcional)
        - steps: int (opcional)
        - guidance: float (opcional)
        - seed: int (opcional)
      Resposta: bytes PNG/JPG da imagem final
    """
    if not GEN_EXPAND_URL:
        raise RuntimeError("GEN_EXPAND_URL is not set (required for mode=generative).")

    if requests is None:
        raise RuntimeError("requests is not installed (add it to expand_ai requirements).")

    url = GEN_EXPAND_URL.rstrip("/") + "/outpaint"

    prompt = str(params.get("prompt", "") or "")
    negative = str(params.get("negativePrompt", "") or "")
    steps = _clamp_int(params.get("steps", 30), 5, 80, 30)
    guidance = _clamp_float(params.get("guidance", 7.0), 1.0, 20.0, 7.0)

    seed_raw = params.get("seed", None)
    seed = None
    if seed_raw is not None and str(seed_raw).strip() != "":
        try:
            seed = int(seed_raw)
        except Exception:
            seed = None

    timeout = _clamp_int(params.get("timeoutSec", 120), 10, 600, 120)

    files = {
        "image": ("image.png", _pil_to_png_bytes(canvas), "image/png"),
        "mask": ("mask.png", _pil_to_png_bytes(mask), "image/png"),
    }

    data = {
        "prompt": prompt,
        "negative_prompt": negative,
        "steps": str(steps),
        "guidance": str(guidance),
    }
    if seed is not None:
        data["seed"] = str(seed)

    resp = requests.post(url, files=files, data=data, timeout=timeout)
    resp.raise_for_status()

    out = Image.open(BytesIO(resp.content)).convert("RGB")
    return out


def _expand_non_generative(img: Image.Image, params: dict) -> Image.Image:
    """
    Expand "não generativo" (o que tu já tinhas):
      - reflect: espelha bordas
      - edge: repete pixels da borda
      - solid: cor sólida (params.color "#RRGGBB")
    """
    mode = (params.get("mode") or "reflect").lower()

    left, right, top, bottom = _compute_padding(img.width, img.height, params)
    if left == right == top == bottom == 0:
        return img

    if mode == "solid":
        color = params.get("color", "#000000")
        return ImageOps.expand(img, border=(left, top, right, bottom), fill=color)

    if mode == "edge":
        return ImageOps.expand(img, border=(left, top, right, bottom)).transform(
            (img.width + left + right, img.height + top + bottom),
            Image.EXTENT,
            (0, 0, img.width + left + right, img.height + top + bottom),
        )

    # default: reflect
    new_w = img.width + left + right
    new_h = img.height + top + bottom
    canvas = Image.new(img.mode, (new_w, new_h))
    canvas.paste(img, (left, top))

    if left > 0:
        strip = img.crop((0, 0, min(left, img.width), img.height))
        strip = ImageOps.mirror(strip)
        canvas.paste(strip.resize((left, img.height)), (0, top))

    if right > 0:
        strip = img.crop((max(img.width - right, 0), 0, img.width, img.height))
        strip = ImageOps.mirror(strip)
        canvas.paste(strip.resize((right, img.height)), (left + img.width, top))

    if top > 0:
        strip = canvas.crop((0, top, new_w, top + min(top, img.height)))
        strip = ImageOps.flip(strip)
        canvas.paste(strip.resize((new_w, top)), (0, 0))

    if bottom > 0:
        strip = canvas.crop((0, top + img.height - min(bottom, img.height), new_w, top + img.height))
        strip = ImageOps.flip(strip)
        canvas.paste(strip.resize((new_w, bottom)), (0, top + img.height))

    return canvas


def _expand_image(img: Image.Image, params: dict) -> Image.Image:
    """
    RF40:
      - mode="generative" => cria canvas+mask e chama outpainting (HTTP)
    Caso contrário:
      - reflect/edge/solid => comportamento antigo (não-gerativo)
    """
    mode = (params.get("mode") or "reflect").lower()

    left, right, top, bottom = _compute_padding(img.width, img.height, params)
    if left == right == top == bottom == 0:
        return img

    if mode in ("generative", "inpaint", "outpaint"):
        canvas, mask = _make_canvas_and_mask(img, left, right, top, bottom)
        return _generative_outpaint_http(canvas, mask, params)

    return _expand_non_generative(img, params)


class ExpandAiTool:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG(
            "picturas-expand-ai-tool-ms",
            "expand_ai",
            env.RABBITMQ_HOST,
            int(env.RABBITMQ_PORT),
            env.RABBITMQ_USERNAME,
            env.RABBITMQ_PASSWORD,
        )
        self._counter = 0
        self._codes = {
            "wrong_procedure": 2400,
            "error_processing": 2401,
        }

    def expand_ai(self, img_path, store_img_path, params):
        img = self._img_handler.get_img(img_path)

        out = _expand_image(img, params)

        # guardar (mantém compatibilidade com o resto do sistema)
        self._img_handler.store_img(out, store_img_path)

    def expand_ai_callback(self, ch, method, properties, body):
        info = json.loads(body.decode())
        msg_id = info["messageId"]
        ts = info["timestamp"]

        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"

        timestamp = datetime.datetime.fromisoformat(ts)

        procedure = info["procedure"]
        params = info.get("parameters", {})
        img_path = params["inputImageURI"]
        store_img_path = params["outputImageURI"]

        resp_msg_id = f"expand-ai-{self._counter}-{msg_id}"
        self._counter += 1

        if procedure != "expand_ai":
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(
                msg_id,
                resp_msg_id,
                cur_timestamp,
                "error",
                processing_time,
                None,
                "image",
                self._codes["wrong_procedure"],
                "The procedure received does not fit into this tool",
                img_path,
            )
            return

        try:
            self.expand_ai(img_path, store_img_path, params)

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(
                msg_id,
                resp_msg_id,
                cur_timestamp,
                "success",
                processing_time,
                store_img_path,
            )
        except Exception as e:
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(
                msg_id,
                resp_msg_id,
                cur_timestamp,
                "error",
                processing_time,
                None,
                "image",
                self._codes["error_processing"],
                str(e),
                img_path,
            )

    def exec(self, args=None):
        while True:
            self._tool_msg.read_msg(self.expand_ai_callback)


if __name__ == "__main__":
    tool = ExpandAiTool()
    tool.exec(sys.argv)
