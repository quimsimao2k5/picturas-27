FROM python:3.11-slim

WORKDIR /app

COPY ./bg_remove_ai .

COPY ./utils ./utils
RUN pip install --no-cache-dir -r ./utils/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "-u", "bg_remove_ai.py"]