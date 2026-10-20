import sys
import json
import datetime
import numpy as np
import pytz

import cv2
import pytesseract

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env

class Text_AI:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG(
            'picturas-text-ai-tool-ms', 
            'text_ai', 
            env.RABBITMQ_HOST, 
            env.RABBITMQ_PORT, 
            env.RABBITMQ_USERNAME,  
            env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1100,
            'error_processing': 1101
        }
        self.custom_config = r'--oem 3 --psm 6'
        self._total_processed_counter = 0

    def ocr(self, image_path, store_txt_path):
        
        # load image
        pil_image = self._img_handler.get_img(image_path)
        
        # convert format
        img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        gray = cv2.medianBlur(gray, 3)

        text = pytesseract.image_to_string(gray, config=self.custom_config)
        text = '\n'.join(line.strip() for line in text.splitlines() if line.strip())
        
        # Generate detection summary text
        text_path = f"{store_txt_path}_text_ai_{self._total_processed_counter}.txt"
        self._total_processed_counter += 1
        
        with open(text_path, 'w', encoding='utf-8') as text_file:
            text_file.write(text)
    
        return text_path

    def ocr_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        msg_id = info['messageId']

        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_txt_path = info['parameters']['outputImageURI']

        resp_msg_id = f'text_ai-{self._counter}-{msg_id}'
        self._counter += 1
        if procedure != 'text_ai':
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
            text_path = self.ocr(img_path, store_txt_path)

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg( 
                msg_id, 
                resp_msg_id, 
                cur_timestamp, 
                'success', 
                processing_time, 
                text_path,
                type='text'
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
                'text',
                self._codes['error_processing'], 
                str(e), 
                img_path
            )

    def exec(self, args):
        while True:
            self._tool_msg.read_msg(self.ocr_callback)

if __name__ == "__main__":
    bgrem = Text_AI()
    bgrem.exec(sys.argv)