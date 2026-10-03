FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY weights ./weights

ENV YOLO_FACE_MODEL=/app/weights/yolov9e-face-lindevs.pt
ENV EMOTION_MODEL=/app/weights/model_q4.onnx
ENV EMOTION_PREPROCESS=imagenet

EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
