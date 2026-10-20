import sys
import json
import datetime
import pytz
import pytz

from PIL import Image

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env

class Rotate:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG('picturas-rotate-tool-ms', 'rotate', env.RABBITMQ_HOST, env.RABBITMQ_PORT, env.RABBITMQ_USERNAME, env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1600,
            'error_processing': 1601
        }

    def rotate_image(self, img_path, store_img_path, degrees, expand=True):
        img = self._img_handler.get_img(img_path)
        new_img = img.rotate(degrees, expand=expand)
        self._img_handler.store_img(new_img, store_img_path)

    def rotate_callback(self, ch, method, properties, body):
        print('Received msg')
        json_str = body.decode()
        print(json_str)
        info = json.loads(json_str)
        
        msg_id = info['messageId']
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']
        degrees = info['parameters']['degrees']
        
        resp_msg_id = f'rotate-{self._counter}-{msg_id}'
        self._counter += 1

        if procedure != 'rotate':
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(msg_id, resp_msg_id, cur_timestamp, 'error', processing_time, None, self._codes['wrong_procedure'], "The procedure received does not fit into this tool", img_path)
            return

        try:
            self.rotate_image(img_path, store_img_path, degrees)

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()
            
            self._tool_msg.send_msg(msg_id, resp_msg_id, cur_timestamp, 'success', processing_time, store_img_path)
        except Exception:
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()
            
            self._tool_msg.send_msg(msg_id, resp_msg_id, cur_timestamp, 'error', processing_time, None, self._codes['error_processing'], "An error occurred while processing the image", img_path)

    def exec(self, args):
        while True:
            self._tool_msg.read_msg(self.rotate_callback)

if __name__ == '__main__':
    rotate = Rotate()
    rotate.exec(sys.argv)