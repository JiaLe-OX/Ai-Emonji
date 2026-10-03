FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl ca-certificates \
       libxcb1 libglib2.0-0 libgl1 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN mkdir -p /app/weights \
    && curl -L --fail --retry 3 \
       -o /app/weights/yolov8n-face-lindevs.pt \
       "https://huggingface.co/JiaLe-OX/ai-emonjj-models/resolve/main/yolov8n-face-lindevs.pt" \
    && curl -L --fail --retry 3 \
       -o /app/weights/model_q4.onnx \
       "https://huggingface.co/JiaLe-OX/ai-emonjj-models/resolve/main/model_q4.onnx"

ENV YOLO_FACE_MODEL=/app/weights/yolov8n-face-lindevs.pt
ENV EMOTION_MODEL=/app/weights/model_q4.onnx
ENV EMOTION_PREPROCESS=imagenet

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
