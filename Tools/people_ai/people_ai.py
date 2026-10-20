import sys
import json
import datetime
import numpy as np

import pytz

from ultralytics import YOLO

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env

class People_ai:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG(
            'picturas-people-ai-tool-ms', 
            'people_ai', 
            env.RABBITMQ_HOST, 
            env.RABBITMQ_PORT, 
            env.RABBITMQ_USERNAME, 
            env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 2200,
            'error_processing': 2201
        }
        
        try:
            self.model = YOLO('../models/yolov5su.pt')
            self.model.classes = [0]  # Only detect class 0 (person)
            self.conf_threshold = 0.4
        except Exception as e:
            raise RuntimeError(f"Failed to initialize model: {str(e)}")
        
        self._total_processed_counter = 0

    #1
    def count_people(self, img_path, store_img_path, conf_threshold=0.4):
        
        #load image
        pil_img = self._img_handler.get_img(img_path)
        img = np.array(pil_img)
        
        # Get detections
        results = self.model(img, classes=[0], conf=conf_threshold)
        
        # Get dimensions
        height, width = img.shape[:2]
        # Generate detection txt
        text_path = f"{store_img_path}_people_ai_{self._total_processed_counter}.txt"
        self._total_processed_counter += 1
        
        with open(text_path, 'w') as text_file:
            text_file.write("class,confidence,bx,by,bw,bh\n")
            
            for box in results[0].boxes:
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(float, box.xyxy[0])
            
                bx = (x1 + x2) / (2 * width)
                by = (y1 + y2) / (2 * height)
                bw = (x2 - x1) / width
                bh = (y2 - y1) / height
                
                line = f"person,{conf:.2f},{bx:.2f},{by:.2f},{bw:.2f},{bh:.2f}\n"
                text_file.write(line)
        
        return text_path
    

    def people_ai_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        msg_id = info['messageId']
        
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']
        conf_threshold = info['parameters'].get('confidenceThreshold', 0.4)

        resp_msg_id = f'people-ai-{self._counter}-{msg_id}'
        self._counter += 1
        if procedure != 'people_ai':
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
                self._codes['wrong_procedure'],  
                "The procedure received does not fit into this tool",  
                img_path                  
            )
            
            return

        try:

            #4
            text_path = self.count_people(img_path, store_img_path, conf_threshold)

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
            self._tool_msg.read_msg(self.people_ai_callback)

if __name__ == "__main__":
    people_ai = People_ai()
    people_ai.exec(sys.argv)