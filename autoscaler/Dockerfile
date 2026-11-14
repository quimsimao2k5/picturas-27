# autoscaler: adjusts the replicas of the video services to the size of their queues
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD [ "python", "-u", "autoscaler.py" ]
