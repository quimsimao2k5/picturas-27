FROM python:3.10

WORKDIR /app

COPY expand_ai/requirements.txt /app/requirements.txt
COPY utils/requirements.txt /app/utils-requirements.txt

RUN pip install --no-cache-dir -r /app/utils-requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY expand_ai/expand_ai.py /app/expand_ai.py
COPY utils /app/utils

CMD ["python", "-u", "expand_ai.py"]
