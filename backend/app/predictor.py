from io import BytesIO

from PIL import Image, ImageOps

from .schemas import BBox, FacePrediction, ImageInfo, Landmarks, PredictionResponse
import numpy as np
import os

try:
    import onnxruntime as ort
except ImportError:
    ort = None

try:
    from ultralytics import YOLO
    YOLO_IMPORT_ERROR = ""
except Exception as exc:  # Keep API available and expose the actual runtime issue.
    YOLO = None
    YOLO_IMPORT_ERROR = f"{type(exc).__name__}: {exc}"


SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_BYTES = 10 * 1024 * 1024
MAX_FACES = int(__import__("os").getenv("MAX_FACES", "100"))
DEFAULT_YOLO_MODEL = "/app/weights/yolov8n-face-lindevs.pt"
DEFAULT_EMOTION_MODEL = "/app/weights/model_q4.onnx"
# emotion-ferplus-8.onnx follows the official FERPlus output order.
EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
EMOTION_THRESHOLD = float(os.getenv("EMOTION_THRESHOLD", "0.45"))


class EmotionClassifier:
    def __init__(self, path: str):
        if ort is None:
            raise RuntimeError("onnxruntime is not installed")
        self.session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        self.input = self.session.get_inputs()[0]
        shape = self.input.shape
        self.channels_first = self.input.name == "pixel_values" or (len(shape) == 4 and shape[1] == 3)
        self.channels = 3 if self.channels_first or (len(shape) == 4 and shape[-1] == 3) else 1
        self.height = int(shape[2]) if self.channels_first and isinstance(shape[2], int) else 224
        self.width = int(shape[3]) if self.channels_first and isinstance(shape[3], int) else 224
        self.preprocessing = os.getenv("EMOTION_PREPROCESS", "mobilenet")

    def predict(self, face: Image.Image) -> tuple[str, float]:
        prepared = face.convert("RGB").resize((self.width, self.height))
        tensor = np.asarray(prepared, dtype=np.float32) / 255.0
        if self.preprocessing == "imagenet":
            tensor = (tensor - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
        else:
            # MobileNetV2's Keras preprocessing scales RGB pixels to [-1, 1].
            tensor = tensor * 2.0 - 1.0
        if self.channels == 1:
            tensor = np.asarray(prepared.convert("L"), dtype=np.float32) / 255.0
            tensor = tensor[None, None, :, :] if self.channels_first else tensor[None, :, :, None]
        elif self.channels_first:
            tensor = np.transpose(tensor, (2, 0, 1))[None, ...]
        else:
            tensor = tensor[None, ...]
        logits = np.asarray(self.session.run(None, {self.input.name: tensor})[0][0], dtype=np.float32)
        probabilities = np.exp(logits - logits.max()); probabilities /= probabilities.sum()
        index = int(probabilities.argmax())
        confidence = float(probabilities[index])
        return (EMOTION_LABELS[index] if confidence >= EMOTION_THRESHOLD else "neutral", confidence)


_emotion_classifier: EmotionClassifier | None = None


def _get_emotion_classifier() -> EmotionClassifier | None:
    global _emotion_classifier
    model_path = os.getenv("EMOTION_MODEL") or DEFAULT_EMOTION_MODEL
    if not os.path.exists(model_path):
        return None
    if _emotion_classifier is None:
        _emotion_classifier = EmotionClassifier(model_path)
    return _emotion_classifier


def _yolo_predict(data: bytes) -> PredictionResponse | None:
    """Use YOLOv8-face when YOLO_FACE_MODEL points to a local .pt file."""
    model_path = os.getenv("YOLO_FACE_MODEL") or DEFAULT_YOLO_MODEL
    if YOLO is None or not os.path.exists(model_path):
        return None
    try:
        image = Image.open(BytesIO(data)).convert("RGB")
    except Exception:
        return None
    result = YOLO(model_path)(image, verbose=False)[0]
    classifier = _get_emotion_classifier()
    faces: list[FacePrediction] = []
    warnings = []
    if classifier is None:
        warnings.append("未配置 FERPlus 表情模型，表情暂使用 neutral。")
    if len(result.boxes) == 0:
        warnings.append("YOLO 未检测到人脸，请上传更清晰、正面且尺寸更大的图片。")
    for index, box in enumerate(result.boxes.xyxy.cpu().tolist()[:MAX_FACES], start=1):
        x1, y1, x2, y2 = [int(value) for value in box]
        width, height = max(1, x2 - x1), max(1, y2 - y1)
        cx, cy = x1 + width // 2, y1 + height // 2
        # FERPlus expects a tight, square grayscale face crop; excessive background
        # commonly collapses predictions into one class.
        side = max(width, height)
        cx, cy = x1 + width // 2, y1 + height // 2
        left = max(0, cx - side // 2 - side // 20)
        top = max(0, cy - side // 2 - side // 20)
        right = min(image.width, cx + side // 2 + side // 20)
        bottom = min(image.height, cy + side // 2 + side // 20)
        face_crop = ImageOps.autocontrast(image.crop((left, top, right, bottom)).convert("L")).convert("RGB")
        emotion, emotion_confidence = classifier.predict(face_crop) if classifier else ("neutral", 0.0)
        face_confidence = float(result.boxes.conf[index - 1].cpu().item())
        faces.append(FacePrediction(
            id=f"face-{index:03d}",
            bbox=BBox(x=x1, y=y1, width=width, height=height),
            landmarks=Landmarks(
                leftEye=[cx - width // 6, cy - height // 8],
                rightEye=[cx + width // 6, cy - height // 8],
                nose=[cx, cy],
                mouth=[cx, cy + height // 5],
            ),
            emotion=emotion,
            confidence=face_confidence,
            faceConfidence=face_confidence,
            emotionConfidence=emotion_confidence,
            needsReview=emotion_confidence < EMOTION_THRESHOLD,
        ))
    return PredictionResponse(
        image=ImageInfo(width=image.width, height=image.height),
        faces=faces,
        warnings=warnings,
    )


def model_status() -> dict[str, object]:
    yolo_path = os.getenv("YOLO_FACE_MODEL") or DEFAULT_YOLO_MODEL
    emotion_path = os.getenv("EMOTION_MODEL") or DEFAULT_EMOTION_MODEL
    return {
        "ultralytics_imported": YOLO is not None,
        "ultralytics_import_error": YOLO_IMPORT_ERROR,
        "yolo_model_path": yolo_path,
        "yolo_model_exists": os.path.exists(yolo_path),
        "emotion_model_path": emotion_path,
        "emotion_model_exists": os.path.exists(emotion_path),
    }


def predict_image(data: bytes) -> PredictionResponse:
    if len(data) > MAX_BYTES:
        raise ValueError("IMAGE_TOO_LARGE")

    yolo_result = _yolo_predict(data)
    if yolo_result is not None:
        return yolo_result

    try:
        source = Image.open(BytesIO(data))
        image_format = source.format
        image = source.convert("RGB")
    except Exception as exc:  # Pillow raises multiple format-specific exceptions.
        raise ValueError("INVALID_IMAGE") from exc

    if image_format and image_format not in SUPPORTED_FORMATS:
        raise ValueError("INVALID_IMAGE")

    width, height = image.size
    face_width = max(56, min(width // 5, 180))
    face_height = face_width
    x = max(0, (width - face_width) // 2)
    y = max(0, (height - face_height) // 2)
    cx, cy = x + face_width // 2, y + face_height // 2
    face = FacePrediction(
        id="face-001",
        bbox=BBox(x=x, y=y, width=face_width, height=face_height),
        landmarks=Landmarks(
            leftEye=[cx - face_width // 6, cy - face_height // 8],
            rightEye=[cx + face_width // 6, cy - face_height // 8],
            nose=[cx, cy],
            mouth=[cx, cy + face_height // 5],
        ),
        emotion="happy",
        confidence=0.72, faceConfidence=0.72, emotionConfidence=0.72,
    )
    return PredictionResponse(
        image=ImageInfo(width=width, height=height),
        faces=[face],
        warnings=[f"当前使用演示预测器：{model_status()}"],
    )
