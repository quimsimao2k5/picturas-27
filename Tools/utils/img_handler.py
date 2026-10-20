from PIL import Image

class Img_HandlerException(Exception):
    def __init__(self, message, error_code = None):
        super().__init__(message)
        self.error_code = error_code

class Img_Handler:
    def __init__(self):
        pass

    def get_img(self, img_path:str) -> Image:
        return Image.open(img_path)
    
    def store_img(self, img: Image, img_path:str) -> None:
        img.save(img_path)
