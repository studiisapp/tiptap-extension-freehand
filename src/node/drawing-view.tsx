import React, { useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { getStroke } from "perfect-freehand";
import type { Path, Point, Paths } from "../types";

function getSvgPathFromStroke(points: number[][]) {
  if (!points.length) return "";
  const d = points
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
  return `${d}`;
}

function drawPaths(ctx: CanvasRenderingContext2D, paths: Paths, size: number, smoothing: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const path of paths) {
    const outline = getStroke(path.map(p => [p.x, p.y, p.pressure ?? 0.5]), {
      size,
      thinning: 0.6,
      smoothing,
      streamline: 0.5,
      easing: t => t,
      simulatePressure: true
    });
    if (!outline.length) continue;
    ctx.beginPath();
    ctx.moveTo(outline[0][0], outline[0][1]);
    for (let i = 1; i < outline.length; i++) {
      ctx.lineTo(outline[i][0], outline[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.fill();
  }
}

export function DrawingView({ node, updateAttributes, selected }: NodeViewProps) {
  const { width, height, size, smoothing } = node.attrs as {
    width: number; height: number; size: number; smoothing: number;
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paths, setPaths] = useState<Paths>(node.attrs.paths || []);
  const [drawing, setDrawing] = useState<Path | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    
    drawPaths(ctx, paths, size, smoothing);
    
    if (drawing) drawPaths(ctx, [...paths, drawing], size, smoothing);
  }, [paths, drawing, width, height, size, smoothing]);

  useEffect(() => {
    updateAttributes({ paths });
  }, [paths]);

  function toCanvasPoint(e: React.PointerEvent) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    return { x, y, pressure } as Point;
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toCanvasPoint(e);
    setDrawing([p]);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing) return;
    const p = toCanvasPoint(e);
    setDrawing(d => (d ? [...d, p] : [p]));
  }

  function onPointerUp(e: React.PointerEvent) {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!drawing) return;
    const finished = drawing;
    setPaths(prev => [...prev, finished]);
    setDrawing(null);
  }

  function clearAll() {
    setPaths([]);
  }

  function exportPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.png";
    a.click();
  }

  return (
    <div data-type="drawing" style={{ display: "inline-block", border: selected ? "2px solid #6366f1" : "1px solid #e5e7eb", borderRadius: 16, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <button onClick={clearAll} style={{ padding: "6px 10px", borderRadius: 12, border: "1px solid #e5e7eb", cursor: "pointer" }}>Clear</button>
        <button onClick={exportPNG} style={{ padding: "6px 10px", borderRadius: 12, border: "1px solid #e5e7eb", cursor: "pointer" }}>Export PNG</button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: "none", background: "white", borderRadius: 12, display: "block" }}
      />
    </div>
  );
}