import type { NodeViewProps } from "@tiptap/react";
import { getStroke } from "perfect-freehand";
import React, { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number; pressure?: number };

type Path = {
	points: Point[];
	color: string;
	size: number;
	opacity: number;
};

type Paths = Path[];

function drawPaths(
	ctx: CanvasRenderingContext2D,
	paths: Paths,
	smoothing: number,
) {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	paths.forEach((path) => {
		const outline = getStroke(
			path.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
			{
				size: path.size,
				thinning: 0.6,
				smoothing,
				streamline: 0.5,
				simulatePressure: true,
			},
		);

		if (!outline.length) return;
		ctx.beginPath();
		ctx.moveTo(outline[0][0], outline[0][1]);
		for (let i = 1; i < outline.length; i++) {
			ctx.lineTo(outline[i][0], outline[i][1]);
		}
		ctx.closePath();
		ctx.fillStyle = path.color;
		ctx.globalAlpha = path.opacity;
		ctx.fill();
		ctx.globalAlpha = 1;
	});
}

export function DrawingView({
	node,
	updateAttributes,
	selected,
	editor,
	getPos,
}: NodeViewProps) {
	const { width, height, size, smoothing, color, opacity } = node.attrs as any;
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [paths, setPaths] = useState<Paths>(node.attrs.paths || []);
	const [drawing, setDrawing] = useState<Path | null>(null);
	const undoStack = useRef<Paths[]>([]);

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
		drawPaths(ctx, [...paths, ...(drawing ? [drawing] : [])], smoothing);
	}, [paths, drawing, width, height, smoothing]);

	useEffect(() => {
		updateAttributes({ paths });
	}, [paths, updateAttributes]);

	function toCanvasPoint(e: React.PointerEvent) {
		const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
		return { x, y, pressure };
	}

	function onPointerDown(e: React.PointerEvent) {
		// Verhindert, dass PM oder der Browser einen Drag/Select startet
		e.preventDefault();
		e.stopPropagation();

		// Optional: Node selektieren, damit Toolbar-Änderungen (Farbe/Size) ankommen
		const pos = typeof getPos === "function" ? getPos() : undefined;
		if (typeof pos === "number") {
			editor?.chain().setNodeSelection(pos).run();
		}

		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		setDrawing({
			points: [toCanvasPoint(e)],
			color,
			size,
			opacity,
		});
	}

	function onPointerMove(e: React.PointerEvent) {
		if (!drawing) return;
		e.preventDefault();
		e.stopPropagation();

		const p = toCanvasPoint(e);
		setDrawing((d) => (d ? { ...d, points: [...d.points, p] } : null));
	}

	function onPointerUp(e: React.PointerEvent) {
		if (!drawing) return;
		e.preventDefault();
		e.stopPropagation();

		(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		undoStack.current.push(paths);
		setPaths((prev) => [...prev, drawing]);
		setDrawing(null);
	}

	const clear = () => {
		undoStack.current.push(paths);
		setPaths([]);
	};

	const undo = () => {
		const prev = undoStack.current.pop();
		if (prev) setPaths(prev);
	};

	return (
		<canvas
			ref={canvasRef}
			width={width}
			height={height}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onDragStart={(e) => e.preventDefault()}
			onMouseDown={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			draggable={false}
			contentEditable={false as any}
			style={{
				touchAction: "none",
				userSelect: "none",
				WebkitUserSelect: "none",
				background: "white",
				borderRadius: 12,
				display: "block",
				border: selected ? "2px solid #6366f1" : "1px solid #e5e7eb",
			}}
			data-type="drawing"
		/>
	);
}
