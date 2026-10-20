from PIL import Image, ImageOps
import sys
import json
import datetime
import pytz
from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env

class Border:
    def __init__(self):
        
        
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG('picturas-border-tool-ms', 'border', env.RABBITMQ_HOST, env.RABBITMQ_PORT, env.RABBITMQ_USERNAME, env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1200,
            'error_processing': 1201
        }

    def add_border(self, img_path, output_path, border_color, border_width):
        # get image
        img = self._img_handler.get_img(img_path)
        
        # add border
        image_with_border = ImageOps.expand(img, border=border_width, fill=border_color)
        
        # save image
        self._img_handler.store_img(image_with_border, output_path)

    #########################################
    def border_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        
        msg_id = info['messageId']
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']
        border_width = info['parameters']['borderWidth']
        r = info['parameters']['r']
        g = info['parameters']['g']
        b = info['parameters']['b']
        border_color = (r, g, b)
        
        resp_msg_id = f'border-{self._counter}-{msg_id}'
        self._counter += 1

        if procedure != 'border':
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(msg_id, resp_msg_id, cur_timestamp, 'error', processing_time, None, self._codes['wrong_procedure'], "The procedure received does not fit into this tool", img_path)
            return

        try:
            self.add_border(img_path, store_img_path, border_color, border_width)

            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()
            
            self._tool_msg.send_msg(msg_id, resp_msg_id, cur_timestamp, 'success', processing_time, store_img_path)
        except Exception:
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()
            
            self._tool_msg.send_msg(msg_id, resp_msg_id, cur_timestamp, 'error', processing_time, None, self._codes['error_processing'], "An error occured while processing the request", img_path)

    def exec(self, args):
        while True:
            self._tool_msg.read_msg(self.border_callback)

if __name__ == "__main__":
    border = Border()
    border.exec(sys.argv)
