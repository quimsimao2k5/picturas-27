FROM python:3.11-slim

WORKDIR /app

COPY ./rotate .

COPY ./utils ./utils
RUN pip install --no-cache-dir -r ./utils/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python","-u", "rotate.py"]