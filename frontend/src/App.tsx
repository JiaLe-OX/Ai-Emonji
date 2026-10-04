import { useEffect, useRef, useState } from "react";
import { assets, recommendedAsset } from "./assets";
import type { EmojiLayer, Face, PredictionResponse } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const emotionLabel: Record<string, string> = { happy: "开心", sad: "悲伤", angry: "生气", surprise: "惊讶", fear: "害怕", disgust: "厌恶", neutral: "中性" };
let renderVersion = 0;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const predictionRef = useRef<PredictionResponse | null>(null);
  const layersRef = useRef<EmojiLayer[]>([]);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [layers, setLayers] = useState<EmojiLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const dragRef = useRef<{ faceId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const onPaste = async (event: ClipboardEvent) => {
        const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
        if (file) { event.preventDefault(); await handleFile(file); }
    };
    const onKeyDown = async (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key.toLowerCase() === "c" && image && canvasRef.current) {
        event.preventDefault();
        canvasRef.current.toBlob(async (blob) => { if (blob && navigator.clipboard?.write) await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); });
      }
    };
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("paste", onPaste); window.removeEventListener("keydown", onKeyDown); };
  }, [image]);

  useEffect(() => { imageRef.current = image; predictionRef.current = prediction; layersRef.current = layers; draw(canvasRef.current, image, prediction?.faces ?? [], layers, false, selectedIds); }, [image, prediction, layers, selectedIds]);

  async function handleFile(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("请上传 10 MB 以内的 JPG、PNG 或 WebP 图片。"); return;
    }
    renderVersion += 1;
    setImage(null);
    setPrediction(null);
    setLayers([]);
    setSelectedId(null);
    setSelectedIds([]);
    const objectUrl = URL.createObjectURL(file);
    const loaded = new Image();
    loaded.onload = async () => {
      setImage(loaded); setBusy(true);
      try {
        const form = new FormData(); form.append("image", file);
        const response = await fetch(`${API_URL}/predict`, { method: "POST", body: form });
        if (!response.ok) throw new Error("识别服务暂时不可用，请稍后重试。");
        setPrediction(await response.json()); setLayers([]); setSelectedId(null); setSelectedIds([]);
      } catch (reason) { setError(reason instanceof Error ? reason.message : "识别失败。"); }
      finally { setBusy(false); URL.revokeObjectURL(objectUrl); }
    };
    loaded.src = objectUrl;
  }

  function applyAll() {
    if (!prediction) return;
    setLayers(prediction.faces.map((face) => {
      const asset = recommendedAsset(face.emotion);
      return { faceId: face.id, assetId: asset.id, visible: true, x: 0, y: 0, scale: asset.defaultScale, rotation: 0, source: "recommended" };
    }));
  }

  function updateSelected(patch: Partial<EmojiLayer>) {
    const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
    if (ids.length) setLayers((current) => current.map((layer) => ids.includes(layer.faceId) ? { ...layer, ...patch, source: "manual" } : layer));
  }
  const selected = layers.find((layer) => layer.faceId === selectedId);
  const selectedFace = prediction?.faces.find((face) => face.id === selectedId);
  const selectedLayers = layers.filter((layer) => selectedIds.includes(layer.faceId));
  const editorLayer = selectedLayers[0] ?? selected;
  const editorFace = prediction?.faces.find((face) => face.id === editorLayer?.faceId) ?? selectedFace;

  return <main className={busy || exporting ? "shell is-processing" : "shell"}>
    {(busy || exporting) && <div className="processing-overlay" role="status" aria-live="polite"><div className="processing-card"><div className="processing-mark">✦</div><strong>{exporting ? "正在生成 PNG" : "正在检测人脸"}</strong><span>{exporting ? "正在合成表情图层，请稍候" : "正在分析人物位置与表情"}</span><div className="progress-track"><div className="progress-fill" /></div><small>{exporting ? "即将完成" : "模型处理中"}</small></div></div>}
    {editorOpen && <div className="editor-backdrop" onClick={() => setEditorOpen(false)} />}
    <header><div className="brand-block"><span className="eyebrow">人物照片表情贴纸工具</span><h1>AI Emonji</h1><p>给人物照片里的每张脸，配一张有情绪的 emonji。</p></div><div className="intro-rail"><span className="privacy">本地编辑 · 临时处理</span><span className="intro-note">识别人物表情，自动配对 emonji，再由你完成最后调整。</span></div></header>
    <section className="workspace">
      <div className="stage"><div className="stage-label"><span>Canvas / 01</span><span>PNG 输出</span></div>
        {!image && <label className="dropzone"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} /><strong>拖入人物图片</strong><span>或点击选择 JPG、PNG、WebP，最大 10 MB</span><small>支持 Ctrl / ⌘ + V 粘贴图片 · 处理后可用 Ctrl / ⌘ + C 复制结果</small></label>}
        <canvas ref={canvasRef} className={image ? "canvas visible" : "canvas"} onPointerDown={(event) => { if (!prediction || !canvasRef.current) return; const rect = canvasRef.current.getBoundingClientRect(); const sx = canvasRef.current.width / rect.width; const sy = canvasRef.current.height / rect.height; const x = (event.clientX - rect.left) * sx; const y = (event.clientY - rect.top) * sy; const hit = prediction.faces.find((face) => { const layer = layersRef.current.find((item) => item.faceId === face.id); const ox = layer?.x ?? 0, oy = layer?.y ?? 0; return x >= face.bbox.x + ox && x <= face.bbox.x + face.bbox.width + ox && y >= face.bbox.y + oy && y <= face.bbox.y + face.bbox.height + oy; }); if (!hit) { setSelectedId(null); setSelectedIds([]); return; } const multi = event.ctrlKey || event.metaKey || event.shiftKey; const nextIds = multi ? (selectedIds.includes(hit.id) ? selectedIds.filter((id) => id !== hit.id) : [...selectedIds, hit.id]) : [hit.id]; setSelectedId(hit.id); setSelectedIds(nextIds); if (!multi && nextIds.length === 1) { const layer = layersRef.current.find((item) => item.faceId === hit.id); dragRef.current = { faceId: hit.id, x: x - (layer?.x ?? 0), y: y - (layer?.y ?? 0) }; canvasRef.current.setPointerCapture(event.pointerId); } }} onPointerMove={(event) => { const drag = dragRef.current; const canvas = canvasRef.current; if (!drag || !canvas || !imageRef.current || !predictionRef.current) return; const rect = canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) * canvas.width / rect.width; const y = (event.clientY - rect.top) * canvas.height / rect.height; layersRef.current = layersRef.current.map((layer) => layer.faceId === drag.faceId ? { ...layer, x: x - drag.x, y: y - drag.y, source: "manual" } : layer); draw(canvas, imageRef.current, predictionRef.current.faces, layersRef.current, false, [drag.faceId]); }} onPointerUp={(event) => { if (dragRef.current) setLayers([...layersRef.current]); dragRef.current = null; canvasRef.current?.releasePointerCapture(event.pointerId); }} />
      </div>
      <aside className="panel">
        <div className="panel-title"><div><span className="panel-kicker">编辑器</span><strong>工作台</strong></div>{prediction && <b>{prediction.faces.length} 张脸</b>}</div>
        {error && <div className="error">{error}</div>}
        {!image && <div className="hint"><b>三步完成一张图</b><span>上传人物照片，识别表情，下载你的 emonji 图片。</span><div className="steps"><span><i>01</i> 上传</span><span><i>02</i> 匹配</span><span><i>03</i> 导出</span></div></div>}
        {busy && <div className="loading"><span className="spinner" />正在识别人脸与表情…</div>}
        {prediction && !busy && <>
          <div className="status">{prediction.faces.length ? "模型推测完成，可手动调整" : "没有识别到人脸"}</div>
          {prediction.warnings.map((warning) => <div className="warning" key={warning}>{warning}</div>)}
          <button className="primary" onClick={applyAll} disabled={!prediction.faces.length}>一键添加 emonji</button>
          <label className="secondary-button">重新上传<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} /></label>
          {editorLayer && editorFace && <div className={editorOpen ? "editor editor-modal" : "editor editor-compact"}><button className="editor-open-button" onClick={() => setEditorOpen(true)}>{editorOpen ? "编辑表情" : selectedIds.length > 1 ? `统一改 ${selectedIds.length} 个表情` : `编辑第 ${prediction.faces.indexOf(editorFace) + 1} 张脸 · ${assets.find((asset) => asset.id === editorLayer.assetId)?.emoji ?? "表情"}`}</button><div className="editor-heading"><b>{selectedIds.length > 1 ? `统一编辑 ${selectedIds.length} 个表情` : `编辑第 ${prediction.faces.indexOf(editorFace) + 1} 张脸`}</b><button className="modal-close" onClick={() => setEditorOpen(false)}>关闭</button></div><p className="drag-hint">拖动画布中的 emoji 可以移动位置</p><p className="multi-hint">按住 Ctrl / ⌘ 点击，可多选人物后统一替换表情</p><label className="emoji-select-label">替换表情<select value={editorLayer.assetId} onChange={(event) => updateSelected({ assetId: event.target.value })}>{assets.map((asset) => <option value={asset.id} key={asset.id}>{asset.emoji}　{asset.label}</option>)}</select></label><div className="selected-emoji-preview">{assets.find((asset) => asset.id === editorLayer.assetId)?.emoji}</div><label>缩放 <input type="range" min="0.5" max="2" step="0.05" value={editorLayer.scale} onChange={(event) => updateSelected({ scale: Number(event.target.value) })} /></label><label>旋转 <input type="range" min="-30" max="30" step="1" value={editorLayer.rotation} onChange={(event) => updateSelected({ rotation: Number(event.target.value) })} /></label><div className="button-row"><button onClick={() => updateSelected({ visible: !editorLayer.visible })}>{editorLayer.visible ? "隐藏" : "显示"}</button><button onClick={() => { const asset = recommendedAsset(editorFace.emotion); updateSelected({ assetId: asset.id, scale: asset.defaultScale, rotation: 0, x: 0, y: 0, visible: true }); }}>恢复推荐</button></div></div>}
          <button className="export" onClick={async () => { setExporting(true); await new Promise((resolve) => setTimeout(resolve, 450)); exportPng(canvasRef.current, image, prediction.faces, layers); setExporting(false); }}>下载 PNG</button>
        </>}
      </aside>
    </section>
    <section className="use-cases"><div className="use-cases-heading"><span className="eyebrow">Ways to use emoji</span><h2>照片加 Emoji，可以这样玩</h2></div><div className="use-cases-grid"><article><strong>添加反应和装饰</strong><p>把爱心、星星、火焰、眼睛等 Emoji 放到照片任意位置，为照片增加反应、趣味或个性。</p></article><article><strong>标出人物或重点</strong><p>用 Emoji 标记照片中的人物、物体、位置或其他细节，无需改动原图内容。</p></article><article><strong>用 Emoji 遮住人脸</strong><p>自动识别人脸，把 Emoji 应用到检测到的人脸，再按需要调整位置和大小。</p></article><article><strong>家庭照和合照</strong><p>不想让人物的脸出现在分享的照片中，可以使用 Emoji 遮住并导出新图片。</p></article></div></section>
  </main>;
}

function draw(canvas: HTMLCanvasElement | null, image: HTMLImageElement | null, faces: Face[], layers: EmojiLayer[], exportMode: boolean, selectedIds: string[]) {
  if (!canvas || !image) { if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); return; }
  const currentRender = ++renderVersion;
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
  const scale = image.naturalWidth / 1000;
  faces.forEach((face) => {
    const layer = layers.find((item) => item.faceId === face.id); const asset = layer && assets.find((item) => item.id === layer.assetId);
    if (!exportMode) { const ox = layer?.x ?? 0, oy = layer?.y ?? 0; ctx.strokeStyle = selectedIds.includes(face.id) ? "#ff6b4a" : "rgba(255,107,74,.7)"; ctx.lineWidth = selectedIds.includes(face.id) ? Math.max(3, 4 * scale) : Math.max(2, 3 * scale); ctx.strokeRect(face.bbox.x + ox, face.bbox.y + oy, face.bbox.width, face.bbox.height); }
    if (currentRender === renderVersion && layer?.visible && asset) { const size = face.bbox.width * layer.scale; ctx.save(); ctx.translate(face.bbox.x + face.bbox.width / 2 + layer.x, face.bbox.y + face.bbox.height / 2 + layer.y); ctx.rotate(layer.rotation * Math.PI / 180); ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(asset.emoji, 0, 0); ctx.restore(); }
  });
}

function exportPng(canvas: HTMLCanvasElement | null, image: HTMLImageElement | null, faces: Face[], layers: EmojiLayer[]) { if (!canvas || !image) return; draw(canvas, image, faces, layers, true, []); const link = document.createElement("a"); link.download = "ai-emonji.png"; link.href = canvas.toDataURL("image/png"); link.click(); draw(canvas, image, faces, layers, false, []); }
