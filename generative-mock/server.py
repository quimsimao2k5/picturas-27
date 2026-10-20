from flask import Flask, request, send_file, jsonify
from PIL import Image
import io
import time

import numpy as np
import cv2

app = Flask(__name__)

@app.get("/sdapi/v1/samplers")
def samplers():
    return jsonify([{"name": "mock-inpaint"}])

@app.post("/outpaint")
def outpaint():
    t0 = time.time()

    f_img = request.files["image"]
    f_mask = request.files.get("mask")

    prompt = request.form.get("prompt", "")
    negative = request.form.get("negative_prompt", "")
    steps = request.form.get("steps", "")
    guidance = request.form.get("guidance", "")
    seed = request.form.get("seed", "")

    img_pil = Image.open(f_img.stream).convert("RGB")
    w, h = img_pil.size
    img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

    print(
        f"[OUTPAINT] canvas={w}x{h} mask={'yes' if f_mask else 'no'} "
        f"prompt_len={len(prompt)} neg_len={len(negative)} steps={steps} guidance={guidance} seed={seed}",
        flush=True,
    )

    if f_mask is None:
        out_bgr = img
        print("[OUTPAINT] NO MASK -> returning original", flush=True)
    else:
        mask_pil = Image.open(f_mask.stream).convert("L")

        if mask_pil.size != img_pil.size:
            print(f"[OUTPAINT] WARNING mask_size={mask_pil.size} != img_size={img_pil.size}", flush=True)
            mask_pil = mask_pil.resize(img_pil.size, resample=Image.NEAREST)

        mask = np.array(mask_pil)
        mask_min, mask_max = int(mask.min()), int(mask.max())

        # binário: 255 = área a preencher
        mask_bin = (mask > 0).astype(np.uint8) * 255
        mask_bin = cv2.GaussianBlur(mask_bin, (0, 0), 3)
        mask_bin = (mask_bin > 10).astype(np.uint8) * 255

        filled = int((mask_bin > 0).sum())
        total = int(mask_bin.size)
        ratio = filled / max(total, 1)

        cy, cx = h // 2, w // 2
        center = int(mask_bin[cy, cx])
        tl = int(mask_bin[0, 0])
        tr = int(mask_bin[0, w - 1])
        bl = int(mask_bin[h - 1, 0])
        br = int(mask_bin[h - 1, w - 1])

        print(
            f"[OUTPAINT] mask min={mask_min} max={mask_max} filled={filled}/{total} ({ratio:.3f}) "
            f"center={center} corners={tl},{tr},{bl},{br}",
            flush=True,
        )

        radius = 7  # testar 5/7/9
        out_bgr = cv2.inpaint(img, mask_bin, radius, cv2.INPAINT_TELEA)

    dt_ms = int((time.time() - t0) * 1000)
    print(f"[OUTPAINT] done {dt_ms}ms", flush=True)

    out_rgb = cv2.cvtColor(out_bgr, cv2.COLOR_BGR2RGB)
    out_pil = Image.fromarray(out_rgb)

    buf = io.BytesIO()
    out_pil.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860, debug=False)
