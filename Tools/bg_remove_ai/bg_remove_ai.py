import sys
import json
import datetime
import pytz

from rembg import remove
import utils.env as env

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG

class Background_Remove_AI:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG('picturas-bg-remove-ai-tool-ms', 
                                 'bg_remove_ai', 
                                 env.RABBITMQ_HOST, 
                                 env.RABBITMQ_PORT, 
                                 env.RABBITMQ_USERNAME, 
                                 env.RABBITMQ_PASSWORD)
        self._counter = 0
        self._codes = {
            'wrong_procedure': 1100,
            'error_processing': 1101
        }

    def background_remove(self, image_path, store_image_path):
        image = self._img_handler.get_img(image_path)
        new_image = remove(image)
        self._img_handler.store_img(new_image, store_image_path)

    def background_remove_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        
        msg_id = info['messageId']
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']

        resp_msg_id = f'bg-remove-ai-{self._counter}-{msg_id}'
        self._counter += 1

        if procedure != 'bg_remove_ai':
            cur_timestamp = datetime.datetime.now(pytz.utc)
            processing_time = (cur_timestamp - timestamp).total_seconds() * 1000
            cur_timestamp = cur_timestamp.isoformat()

            self._tool_msg.send_msg(msg_id, resp_msg_id, cur_timestamp, 'error', processing_time, None, self._codes['wrong_procedure'], "The procedure received does not fit into this tool", img_path)
            return

        try:
            self.background_remove(img_path, store_img_path)

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
            self._tool_msg.read_msg(self.background_remove_callback)

if __name__ == "__main__":
    bgrem = Background_Remove_AI()
    bgrem.exec(sys.argv)