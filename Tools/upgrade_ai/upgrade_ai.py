import datetime
import json
import sys

import numpy as np
import cv2
from PIL import Image, ImageEnhance

import pytz

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env

class Upgrade_ai:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG(
            'picturas-upgrade-ai-tool-ms',
            'upgrade_ai',
            env.RABBITMQ_HOST,
            env.RABBITMQ_PORT,
            env.RABBITMQ_USERNAME,
            env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1800,
            'error_processing': 1801
        }
        
    def apply_clahe(self, image_cv, clip_limit=1.0, tile_grid_size=(32,32), alpha=0.8):
        
        lab = cv2.cvtColor(image_cv, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
        cl = clahe.apply(l)

        merged_lab = cv2.merge((cl, a, b))
        enhanced_bgr = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)

        # Blend to reduce over-contrast
        blended = cv2.addWeighted(enhanced_bgr, alpha, image_cv, 1 - alpha, 0)
        return blended

    def enhance_image_pil(self, pil_img, brightness=1.02, contrast=1.02, saturation=1.02):
        
        # Only convert palette images 
        if pil_img.mode == 'P':
            pil_img = pil_img.convert('RGB')
        
        # Saturation
        enhancer = ImageEnhance.Color(pil_img)
        pil_img = enhancer.enhance(saturation)
        
        # Brightness
        enhancer = ImageEnhance.Brightness(pil_img)
        pil_img = enhancer.enhance(brightness)
        
        # Contrast
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(contrast)
        
        return pil_img
    
    def decide_enhancement_parameters(self, img_path):
        return {
            "brightness": 1.02,
            "contrast": 1.02,
            "saturation": 1.02,
            "clip_limit": 1.0,
            "tile_grid_size": 32,
            "alpha": 0.8
        }
        
    def enhance_image(self, img_path, store_img_path):
        # load image
        image = self._img_handler.get_img(img_path).convert('RGB')
        
        params = self.decide_enhancement_parameters(img_path)

        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # Apply CLAHE
        enhanced_cv = self.apply_clahe(
            img_cv,
            clip_limit=params["clip_limit"],
            tile_grid_size=(params["tile_grid_size"], params["tile_grid_size"]),
            alpha=params["alpha"]
        )

        enhanced_pil = Image.fromarray(cv2.cvtColor(enhanced_cv, cv2.COLOR_BGR2RGB))

        final_pil = self.enhance_image_pil(
            enhanced_pil,
            brightness=params["brightness"],
            contrast=params["contrast"],
            saturation=params["saturation"]
        )
        
        # this would be good to ensure quality but we use store_img so rip
        # final_pil.save(output_path, quality=95, optimize=True)
        self._img_handler.store_img(final_pil, store_img_path)

    def upgrade_ai_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        msg_id = info['messageId']

        timestamp = datetime.datetime.fromisoformat(info['timestamp'])

        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']

        resp_msg_id = f'upgrade-ai-{self._counter}-{msg_id}'
        self._counter += 1

        if procedure != 'upgrade_ai':
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(
                msg_id, 
                resp_msg_id,
                cur_timestamp,
                'error',
                processing_time,
                None,
                self._codes['wrong_procedure'], 
                "The procedure received does not fit into this tool", 
                img_path
            )
            
            return

        try:
            self.enhance_image(img_path, store_img_path)

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(
                msg_id,
                resp_msg_id,
                cur_timestamp,
                'success',
                processing_time,
                store_img_path
            )
        except Exception as e:
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(
                msg_id,
                resp_msg_id,
                cur_timestamp,
                'error',
                processing_time,
                None,
                self._codes['error_processing'],
                str(e),
                img_path
            )

    def exec(self, args):
        while True:
            self._tool_msg.read_msg(self.upgrade_ai_callback)

if __name__ == "__main__":
    upgrade_ai = Upgrade_ai()
    upgrade_ai.exec(sys.argv)