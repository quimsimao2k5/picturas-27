import os
from dotenv import load_dotenv

load_dotenv()

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST','rabbitmq')
RABBITMQ_PORT = os.getenv('RABBITMQ_PORT',5672)
RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME','user')  # Replace with your RabbitMQ username
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD','password')  # Replace with your RabbitMQ password
IMG_STORAGE_URL = os.getenv('RABBITMQ_PASSWORD','http://image-storage-service:3000/')

# Paths to MobileNet-SSD model files
MOBILENETSSD_PROTOTXT = os.getenv('MOBILENETSSD_PROTOTXT', './utils/models/MobileNetSSD_deploy.prototxt')
MOBILENETSSD_CAFFEMODEL = os.getenv('MOBILENETSSD_CAFFEMODEL', './utils/models/MobileNetSSD_deploy.caffemodel')