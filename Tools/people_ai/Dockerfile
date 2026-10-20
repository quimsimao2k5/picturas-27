FROM python:3.11-slim

WORKDIR /app

RUN pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \  
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libfontconfig1 \
        libice6 \
        libxcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY people_ai/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
    
COPY ./utils/requirements.txt utils/requirements.txt
RUN pip install --no-cache-dir -r utils/requirements.txt

COPY ./people_ai .
COPY ./utils utils
COPY ./models ../models

CMD ["python", "-u", "people_ai.py"]
