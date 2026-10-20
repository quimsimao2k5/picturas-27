from processor import process_image
import sys
import json
import datetime
import pytz

from PIL import Image

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env
import utils.env as env

class Cut:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG('picturas-cut-tool-ms', 
                                 'cut',
                                 env.RABBITMQ_HOST, 
                                 env.RABBITMQ_PORT, 
                                 env.RABBITMQ_USERNAME, 
                                 env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1500,
            'error_processing': 1501
        }
    
    def cut_image(self, img_path, store_img_path, dimensions):
        # load image
        img = self._img_handler.get_img(img_path)
        
        # Validate dimensions
        # left, top, right, bottom = map(float, dimensions) 
        # dimensions = (round(left), round(top), round(right), round(bottom))
        
        # cut image
        new_img = img.crop(dimensions)
        
        # store image
        self._img_handler.store_img(new_img, store_img_path)
            
    def cut_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        
        msg_id = info['messageId']
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']
        
        left = info['parameters']['left']
        top = info['parameters']['top']
        right = info['parameters']['right']
        bottom = info['parameters']['bottom']
        
        resp_msg_id = f'cut-{self._counter}-{msg_id}'
        self._counter += 1

        if procedure != 'cut':
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(msg_id, 
                                    resp_msg_id, 
                                    cur_timestamp,
                                    'error', 
                                    processing_time, 
                                    None, 
                                    self._codes['wrong_procedure'], 
                                    "The procedure received does not fit into this tool", 
                                    img_path)
            return

        try:
            self.cut_image(img_path, store_img_path, (left,top,right,bottom))

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()
            
            self._tool_msg.send_msg(msg_id, 
                                    resp_msg_id, 
                                    cur_timestamp, 
                                    'success', 
                                    processing_time,
                                    store_img_path)
        except Exception as e:
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()
            
            self._tool_msg.send_msg(msg_id, 
                                    resp_msg_id, 
                                    cur_timestamp, 
                                    'error', 
                                    processing_time, 
                                    None, 
                                    self._codes['error_processing'], "An error occured while processing the request",
                                    str(e), 
                                    img_path)
                
        
    def exec(self, args):
        while True:
            self._tool_msg.read_msg(self.cut_callback)


if __name__ == "__main__":
    cut = Cut()
    cut.exec(sys.argv)