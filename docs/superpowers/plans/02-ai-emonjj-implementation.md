# 02. AI Emonji Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local MVP with separate `frontend/` and `backend/` folders for uploading a person image, detecting faces through a FastAPI-compatible inference endpoint, applying emonji layers, editing one layer, and exporting PNG.

**Architecture:** The React frontend owns upload state, Canvas composition, emonji assets, and export. The Python backend exposes `POST /predict` with YOLOv8n-face and ONNX emotion inference, plus a demo fallback when weights are unavailable. Production deployment uses Alibaba Cloud ECS with Docker and Nginx.

**Tech Stack:** React, TypeScript, Vite, Canvas 2D, FastAPI, Python 3.11, Pillow, pytest.

**Spec:** `docs/superpowers/specs/01-ai-emonji-product-design.md`

## Global Constraints

- 图片最大 10 MB，支持 JPG、PNG、WebP。
- 单次最多处理 30 张人脸。
- 表情结果显示为模型推测，并允许用户覆盖。
- 不保存历史图片或任务。
- 前端与后端必须位于独立文件夹。
- 生产部署使用阿里云 ECS、Docker、Nginx 和 HTTPS。

---

### Task 1: Backend prediction API

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/schemas.py`
- Create: `backend/app/predictor.py`
- Create: `backend/requirements.txt`
- Create: `backend/tests/test_predictor.py`

**Interfaces:**
- Consumes: uploaded image bytes through `POST /predict`.
- Produces: `{ image, faces, warnings }` matching the product spec.

- [ ] **Step 1: Write validation tests** for accepted formats, oversized images, and stable demo response shape.
- [ ] **Step 2: Run `pytest -q`** and confirm the tests fail because backend modules do not exist.
- [ ] **Step 3: Implement FastAPI route, image validation, and the YOLOv8n-face predictor with a demo fallback.** Keep the predictor isolated so YOLOv8-face/SCRFD can replace it later.
- [ ] **Step 4: Run `pytest -q`** and confirm all backend tests pass.

### Task 2: Frontend editor

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/assets.ts`
- Create: `frontend/src/styles.css`
- Create: `frontend/public/emonji/*.svg`

**Interfaces:**
- Consumes: `PredictionResponse` from `/predict`.
- Produces: editable `EmojiLayer[]` and downloadable PNG.

- [ ] **Step 1: Add the Vite React TypeScript shell and local emonji SVG assets.**
- [ ] **Step 2: Implement upload validation, preview canvas, and backend request state.**
- [ ] **Step 3: Implement one-click mapping from emotions to assets and Canvas rendering.**
- [ ] **Step 4: Implement selected-face editing: asset replacement, scale, rotation, offsets, hide, and reset.**
- [ ] **Step 5: Implement PNG export with overlays but without debug boxes.**
- [ ] **Step 6: Run `npm run build`** and confirm the frontend compiles.

### Task 3: Local developer documentation

**Files:**
- Create: `README.md`
- Create: `frontend/.env.example`
- Create: `backend/.env.example`

**Interfaces:**
- Documents: local startup commands, API URL configuration, and future model replacement boundary.

- [ ] **Step 1: Document separate frontend/backend startup.**
- [ ] **Step 2: Document YOLOv8n-face, ONNX emotion inference, local startup, and Alibaba ECS deployment.**
- [ ] **Step 3: Verify all referenced paths and commands exist.**
