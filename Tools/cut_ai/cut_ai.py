import cv2
import sys
import json
import datetime
import pytz
import torch
import torchvision.transforms as transforms
from PIL import Image
import numpy as np

from utils.img_handler import Img_Handler
from utils.tool_msg import ToolMSG
import utils.env as env

class CutAI:
    def __init__(self):
        self._img_handler = Img_Handler()
        self._tool_msg = ToolMSG(
            'picturas-cut-ai-tool-ms',
            'cut_ai',
            env.RABBITMQ_HOST,
            env.RABBITMQ_PORT,
            env.RABBITMQ_USERNAME,
            env.RABBITMQ_PASSWORD
        )
        self._counter = 0
        self._codes = {
            'wrong_procedure': 2000,
            'error_processing': 2001
        }
        
        try:
            # Initialize model and device
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

            self.model = torch.hub.load('pytorch/vision:v0.10.0', 'mobilenet_v2', pretrained=True)
            self.model = torch.nn.Sequential(*list(self.model.children())[:-1])
            self.model.to(self.device)
            self.model.eval()

            # Image preprocessing transform
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                   std=[0.229, 0.224, 0.225])
            ])
        except Exception as e:
            raise RuntimeError(f"Failed to initialize model: {str(e)}")

    def get_saliency_map(self, image):
        """Expect PIL Image, return numpy array saliency map"""
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        img_tensor = self.transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            features = self.model(img_tensor)
            saliency_map = torch.mean(features, dim=1)
        saliency_map = saliency_map[0].cpu().numpy()
        # Get original image size for proper resizing
        width, height = image.size
        saliency_map = cv2.resize(saliency_map, (width, height))
        
        # Enhance contrast
        saliency_map = (saliency_map - saliency_map.min()) / (saliency_map.max() - saliency_map.min() + 1e-8)
        saliency_map = np.power(saliency_map, 0.4)
        saliency_map = cv2.GaussianBlur(saliency_map, (5, 5), 0)
        return saliency_map

    def create_binary_mask(self, saliency_map):
        """Create binary mask from saliency map."""
        saliency_uint8 = (saliency_map * 255).astype(np.uint8)
        
        binary_mask = cv2.adaptiveThreshold(
            saliency_uint8,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            -2
        )
        
        kernel = np.ones((5,5), np.uint8)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
        
        return binary_mask

    def find_optimal_crop(self, image, saliency_map):
        """Find the optimal crop region."""
        height, width = image.shape[:2]
        binary_mask = self.create_binary_mask(saliency_map)
        contours, _ = cv2.findContours(
            binary_mask,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        if contours:
            min_area = (width * height) * 0.005
            valid_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > min_area]
            
            if valid_contours:
                all_points = np.concatenate(valid_contours)
                hull = cv2.convexHull(all_points)
                x, y, w, h = cv2.boundingRect(hull)
                
                # Adjust small crops
                if w < width * 0.5:
                    new_x = max(0, x - (width * 0.1))
                    new_w = min(width - new_x, w + (width * 0.2))
                    x, w = new_x, new_w
                
                if h < height * 0.5:
                    new_y = max(0, y - (height * 0.1))
                    new_h = min(height - new_y, h + (height * 0.2))
                    y, h = new_y, new_h
                
                # Add minimal padding
                padding_x = int(w * 0.05)
                padding_y = int(h * 0.05)
                x = max(0, x - padding_x)
                y = max(0, y - padding_y)
                w = min(width - x, w + 2 * padding_x)
                h = min(height - y, h + 2 * padding_y)
                return x, y, w, h
        
        # Fallback to rule-of-thirds crop
        w = int(width * 0.75)
        h = int(height * 0.75)
        x = (width - w) // 2
        y = (height - h) // 2
        return x, y, w, h

    def cut_ai(self, img_path, store_img_path):
        
        # load as PIL image
        pil_img = self._img_handler.get_img(img_path)
        
        # Get saliency map
        saliency_map = self.get_saliency_map(pil_img)
        
        # Convert PIL to numpy for cropping
        img_array = np.array(pil_img)
        
        # Find crop coordinates
        x, y, w, h = self.find_optimal_crop(img_array, saliency_map)
        
        # Crop the PIL image
        cropped_pil_img = pil_img.crop((x, y, x+w, y+h))
        
        self._img_handler.store_img(cropped_pil_img, store_img_path)

    def cut_ai_callback(self, ch, method, properties, body):
        json_str = body.decode()
        info = json.loads(json_str)
        msg_id = info['messageId']
        
        timestamp = datetime.datetime.fromisoformat(info['timestamp'])
        
        procedure = info['procedure']
        img_path = info['parameters']['inputImageURI']
        store_img_path = info['parameters']['outputImageURI']

        resp_msg_id = f'cut-ai-{self._counter}-{msg_id}'
        self._counter += 1

        if procedure != 'cut_ai':
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
            self.cut_ai(img_path, store_img_path)

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
            self._tool_msg.read_msg(self.cut_ai_callback)

if __name__ == "__main__":
    cut_ai = CutAI()
    cut_ai.exec(sys.argv)