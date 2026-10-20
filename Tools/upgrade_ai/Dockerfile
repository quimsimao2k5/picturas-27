FROM python:3.11-slim

WORKDIR /app

COPY upgrade_ai/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ./utils/requirements.txt utils/requirements.txt
RUN pip install --no-cache-dir -r ./utils/requirements.txt

COPY ./upgrade_ai .
COPY ./utils ./utils

CMD [ "python", "-u", "upgrade_ai.py"]