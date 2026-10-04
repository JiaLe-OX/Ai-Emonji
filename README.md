# AI Emonjj

AI Emonjj 是一个前后端分离的人物图片 emonjj 工具。用户上传人物照片后，系统检测人脸、估计基础表情，并在浏览器中完成 emonjj 添加、替换、拖动、缩放、旋转和 PNG 导出。

## 目录

```text
frontend/   React + TypeScript + Vite 页面与 Canvas 编辑器
backend/    FastAPI 图片预测接口
docs/       产品规格与实施计划
```

## 本地启动

后端：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

打开 `http://localhost:5173`。前端默认请求 `http://localhost:8000`，可通过 `frontend/.env` 中的 `VITE_API_URL` 修改。

## 模型与权重

当前本地配置使用 YOLOv8n-face 和 Xenova 表情 ONNX 模型。权重文件不提交到 GitHub（GitHub 单文件限制和仓库体积限制），请放入 `backend/weights/`：

- `yolov8n-face-lindevs.pt`
- `model_q4.onnx`

启动前设置环境变量：

```powershell
cd backend
pip install -r requirements.txt
New-Item -ItemType Directory -Force weights
# 将兼容 Ultralytics 的 YOLOv8-face .pt 权重放入 backend/weights/
$env:YOLO_FACE_MODEL = "./weights/yolov8n-face-lindevs.pt"
$env:EMOTION_MODEL = "./weights/model_q4.onnx"
$env:EMOTION_PREPROCESS = "imagenet"
uvicorn app.main:app --reload --port 8000
```

前端无需修改，API 会返回人脸框和 7 类表情结果。

## 开源项目与模型来源

- [EmojiFace](https://github.com/Steve-Mr/EmojiFace)：参考人脸检测后叠加 emoji 的产品思路和 Canvas 编辑流程；没有直接复制其前端代码或素材。
- [yolov8-face](https://github.com/derronqi/yolov8-face)：参考 YOLO 人脸检测模型的使用方式。当前权重使用 YOLOv8n-face 兼容权重。
- [Xenova/facial_emotions_image_detection](https://huggingface.co/Xenova/facial_emotions_image_detection)：使用其 ONNX 表情分类模型 `model_q4.onnx`，请按模型仓库许可证和使用条款保留来源说明。

项目内置 emoji 使用浏览器原生 Unicode emoji，不包含第三方 SVG 贴纸包。

## 许可提醒

正式部署前请核对第三方代码、模型权重和数据集的许可证，并在公开仓库保留对应版权说明。
