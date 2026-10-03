import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .predictor import predict_image
from .schemas import PredictionResponse

app = FastAPI(title="AI Emonjj API", version="0.1.0")
allowed_origins = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "https://emonji.jialeox.cn,http://localhost:5173,http://127.0.0.1:5173").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "AI Emonjj API", "status": "ok", "health": "/health", "predict": "/predict"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
async def predict(image: UploadFile = File(...)) -> PredictionResponse:
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail={"code": "INVALID_IMAGE", "message": "仅支持 JPG、PNG、WebP 图片"})
    try:
        return predict_image(await image.read())
    except ValueError as exc:
        code = str(exc)
        message = "图片过大，最大支持 10 MB" if code == "IMAGE_TOO_LARGE" else "无法读取图片，请更换文件"
        raise HTTPException(status_code=400, detail={"code": code, "message": message}) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"code": "MODEL_INFERENCE_FAILED", "message": f"模型推理失败：{exc}"}) from exc
