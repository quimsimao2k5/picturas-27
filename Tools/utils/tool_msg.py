import json

from .rabbit_mq import Rabbit_MQ

"""
# Callback example for those who need it
def callback(ch, method, properties, body):
    print(f" [x] Received {body.decode()}")
"""

class ToolMSG:
    queues = {
        'border': 'border_queue',
        'brightness': 'brightness_queue',
        'contrast': 'contrast_queue',
        'cut': 'cut_queue',
        'scale': 'scale_queue',
        'saturation': 'saturation_queue',
        'binarization': 'binarization_queue',
        'rotate': 'rotate_queue',
        'resize': 'resize_queue',
        'cut_ai': 'cut_ai_queue',
        'upgrade_ai': 'upgrade_ai_queue',
        'bg_remove_ai': 'bg_remove_ai_queue',
        'text_ai': 'text_ai_queue',
        'obj_ai': 'obj_ai_queue',
        'people_ai': 'people_ai_queue',
        'expand_ai': 'expand_ai_queue',
        'project': 'project_queue'
    }
    
    def __init__(self, microservice_name, tool_name, rabbit_host, rabbit_port, username, password):
        self._microservice_name = microservice_name
        self._queue = self.queues[tool_name]
        self._proj_queue = self.queues['project']
        self._rabbit_mq = Rabbit_MQ(rabbit_host, rabbit_port, username, password)
    
    def read_msg(self, callback):
        self._rabbit_mq.read_rabbit_msg(self._queue, callback)

    def send_msg(self, msg_id, resp_msg_id, timestamp, status, processingTime, new_img_uri, type="image", err_code=None, err_msg=None, og_img_uri=None):

        msg = {}
        
        match status:
            case "success":
                msg = {
                    "messageId": resp_msg_id,
                    "correlationId": msg_id,
                    "timestamp": timestamp,
                    "status": status,
                    "output": {
                        "type": type,
                        "imageURI": new_img_uri
                    },
                    "metadata": {
                        "processingTime": processingTime,
                        "microservice": self._microservice_name
                    }
                }
            case "error":
                if err_code is None or err_msg is None or og_img_uri is None:
                    raise Exception("Make sure, in case of error status, err_code, err_msg and og_img_uri are not None")
                
                msg = {
                    "messageId": msg_id,
                    "correlationId": resp_msg_id,
                    "timestamp": timestamp,
                    "status": status,
                    "error": {
                        "code": err_code,
                        "message": err_msg,
                        "details": {
                            "inputFileURI": og_img_uri
                        }
                    },
                    "metadata": {
                        "processingTime": processingTime,
                        "microservice": self._microservice_name
                    }
                }
            case _:
                msg = {}
                
        msg = json.dumps(msg)    
            
        self._rabbit_mq.send_rabbit_msg(msg, self._proj_queue)
        
    