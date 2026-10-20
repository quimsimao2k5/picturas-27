import sys
import json
import datetime
import numpy as np

import pytz

from ultralytics import YOLO

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env

class Object_ai:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG(
            'picturas-object-ai-tool-ms', 
            'obj_ai', 
            env.RABBITMQ_HOST, 
            env.RABBITMQ_PORT, 
            env.RABBITMQ_USERNAME, 
            env.RABBITMQ_PASSWORD)
        
        self._counter = 0
        self._codes = {
            'wrong_procedure': 2100,
            'error_processing': 2101
        }
        
        try:
            self.model = YOLO('../models/yolov5su.pt')
            self.conf_threshold = 0.20
        except Exception as e:
            raise RuntimeError(f"Failed to initialize model: {str(e)}")
        
        self._total_processed_counter = 0
        
    def detect_objects(self, image_path, store_img_path, conf_threshold=0.20):
        
        #load image
        pil_img = self._img_handler.get_img(image_path)
        img = np.array(pil_img)
        
        # Get detections
        results = self.model(img, conf=conf_threshold)
        
        # Get dimensions
        height, width = img.shape[:2]
        
        text_path = f"{store_img_path}_obj_ai_{self._total_processed_counter}.txt"
        self._total_processed_counter += 1
        
        with open(text_path, 'w') as text_file:
            text_file.write("class,confidence,bx,by,bw,bh\n")
            
            # Process each detection
            for r in results:
                for box in r.boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    if conf > conf_threshold:
                        class_name = self.model.names[cls]
                        x1, y1, x2, y2 = map(float, box.xyxy[0])
                        
                        # Calculate normalized box coordinates like people_ai
                        bx = (x1 + x2) / (2 * width)
                        by = (y1 + y2) / (2 * height)
                        bw = (x2 - x1) / width
                        bh = (y2 - y1) / height
                        
                        # Write detection in same format as people_ai
                        line = f"{class_name},{conf:.2f},{bx:.2f},{by:.2f},{bw:.2f},{bh:.2f}\n"
                        text_file.write(line)
        
        return text_path

    def object_ai_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        msg_id = info['messageId']
        
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']
        conf_threshold = info['parameters'].get('confidenceThreshold', 0.20)

        resp_msg_id = f'object-ai-{self._counter}-{msg_id}'
        self._counter += 1
        if procedure != 'obj_ai':
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

            text_path = self.detect_objects(img_path, store_img_path, conf_threshold)

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            # Include detection results in the response
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
            self._tool_msg.read_msg(self.object_ai_callback)

if __name__ == "__main__":
    object_ai = Object_ai()
    object_ai.exec(sys.argv)