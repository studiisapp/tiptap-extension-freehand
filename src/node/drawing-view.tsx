import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { getStroke } from "perfect-freehand";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { BrushPreset } from "../types";

type Point = { x: number; y: number; pressure?: number };
type Path = {
	id: string;
	points: Point[];
	color: string;
	size: number;
	opacity: number;
	tool: string;
};
type Paths = Path[];

const HOLD_MS = 350;
const STILL_EPS = 2;
const MIN_LINE_LEN = 24;

function uuid() {
	return typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2);
}

function drawPaths(
	ctx: CanvasRenderingContext2D,
	paths: Paths,
	baseSmoothing: number,
	brushes: Record<string, BrushPreset>,
) {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	for (const path of paths) {
		const preset = brushes[path.tool] ?? brushes["pen"];
		const size = path.size * (preset.sizeMul ?? 1);
		const thinning = preset.thinning;
		const smoothing = baseSmoothing * (preset.smoothingMul ?? 1);
		const streamline = 0.5 * (preset.streamlineMul ?? 1);

		const outline = getStroke(
			path.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
			{
				size,
				thinning,
				smoothing,
				streamline,
				simulatePressure: preset.simulatePressure,
			},
		);
		if (!outline.length) continue;

		ctx.save();
		ctx.globalCompositeOperation = preset.composite;
		ctx.beginPath();
		ctx.moveTo(outline[0][0], outline[0][1]);
		for (let i = 1; i < outline.length; i++) {
			ctx.lineTo(outline[i][0], outline[i][1]);
		}
		ctx.closePath();

		const alpha = Math.max(
			0,
			Math.min(1, path.opacity * (preset.opacityMul ?? 1)),
		);
		ctx.globalAlpha = alpha;
		ctx.fillStyle = path.color;
		ctx.fill();
		ctx.restore();
	}
}

export function DrawingView(props: NodeViewProps) {
	const { node, updateAttributes, editor, extension } = props;
	const {
		width,
		height,
		size,
		smoothing,
		color,
		opacity,
		tool,
		overlay,
		active,
	} = node.attrs as any;

	const options = extension?.options ?? {};
	const features = options.features ?? {};
	const brushes = (options.brushes ?? {}) as Record<string, BrushPreset>;
	const isGlobal = !!(features.globalOverlay && overlay);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const [drawing, setDrawing] = useState<Path | null>(null);

	useEffect(() => {
		const existing: Paths = (node.attrs.paths as Paths) || [];
		if (!existing.length) return;
		if (existing.every((p) => p.id)) return;

		const fixed = existing.map((p) => (p.id ? p : { ...p, id: uuid() }));
		queueMicrotask(() => {
			updateAttributes({ paths: fixed });
		});
	}, [node.attrs.paths, updateAttributes]);

	const straightenOnHold = !!features.straightenOnHold;
	const angleSnapStep = useMemo(() => {
		if (!features.angleSnap) return 0;
		return typeof features.angleSnap === "number" ? features.angleSnap : 15;
	}, [features.angleSnap]);

	useEffect(() => {
		if (!isGlobal) return;

		const root = editor.view.dom as HTMLElement;
		if (getComputedStyle(root).position === "static") {
			root.style.position = "relative";
		}

		let prevW = 0;
		let prevH = 0;
		const applyDims = () => {
			const w = root.clientWidth || 800;
			const h = root.scrollHeight || 1200;
			if (w !== prevW || h !== prevH) {
				prevW = w;
				prevH = h;
				queueMicrotask(() => {
					updateAttributes({ width: w, height: h });
				});
			}
		};

		applyDims();

		const ro = new ResizeObserver(applyDims);
		ro.observe(root);

		const mo = new MutationObserver(applyDims);
		mo.observe(root, { childList: true, subtree: true, attributes: false });

		const onScroll = () => requestAnimationFrame(applyDims);
		root.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			ro.disconnect();
			mo.disconnect();
			root.removeEventListener("scroll", onScroll);
		};
	}, [isGlobal, editor.view.dom, updateAttributes]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.max(1, Math.floor(width * dpr));
		canvas.height = Math.max(1, Math.floor(height * dpr));
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.scale(dpr, dpr);

		const committedPaths: Paths = (node.attrs.paths as Paths) || [];
		drawPaths(
			ctx,
			[...committedPaths, ...(drawing ? [drawing] : [])],
			smoothing,
			brushes,
		);
	}, [node.attrs.paths, drawing, width, height, smoothing, brushes]);

	const holdTimerRef = useRef<number | null>(null);
	const lastPointRef = useRef<Point | null>(null);
	const snappedRef = useRef<boolean>(false);

	function clearHoldTimer() {
		if (holdTimerRef.current) {
			clearTimeout(holdTimerRef.current);
			holdTimerRef.current = null;
		}
	}
	function armHoldTimer() {
		clearHoldTimer();
		if (!straightenOnHold) return;
		holdTimerRef.current = window.setTimeout(() => {
			trySnapToLine();
		}, HOLD_MS);
	}

	function toCanvasPoint(e: React.PointerEvent) {
		const canvas = canvasRef.current!;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
		return { x, y, pressure };
	}

	function trySnapToLine() {
		setDrawing((d) => {
			if (!d) return d;
			const pts = d.points;
			if (pts.length < 2) return d;
			const first = pts[0];
			const last = pts[pts.length - 1];
			const dx = last.x - first.x;
			const dy = last.y - first.y;
			const len = Math.hypot(dx, dy);
			if (len < MIN_LINE_LEN) return d;

			const ux = dx / len;
			const uy = dy / len;
			let maxDev = 0;
			let sumDev = 0;
			for (let i = 1; i < pts.length - 1; i++) {
				const px = pts[i].x - first.x;
				const py = pts[i].y - first.y;
				const dev = Math.abs(px * uy - py * ux);
				maxDev = Math.max(maxDev, dev);
				sumDev += dev;
			}
			const meanDev = sumDev / Math.max(pts.length - 2, 1);
			const MAX_DEV_PX = 3.5;
			if (maxDev <= MAX_DEV_PX && meanDev <= MAX_DEV_PX * 0.7) {
				snappedRef.current = true;
				let newFirst = first;
				let newLast = last;

				if (angleSnapStep) {
					const rad = (deg: number) => (deg * Math.PI) / 180;
					const theta = Math.atan2(dy, dx);
					const step = rad(angleSnapStep);
					const snappedTheta = Math.round(theta / step) * step;
					newLast = {
						...last,
						x: newFirst.x + Math.cos(snappedTheta) * len,
						y: newFirst.y + Math.sin(snappedTheta) * len,
					};
				}
				return { ...d, points: [newFirst, newLast] };
			}
			return d;
		});
	}

	function onPointerDown(e: React.PointerEvent) {
		if (!active) return;
		e.preventDefault();
		e.stopPropagation();

		const p = toCanvasPoint(e);
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
		snappedRef.current = false;
		lastPointRef.current = p;
		setDrawing({
			id: uuid(),
			points: [p],
			color,
			size,
			opacity,
			tool,
		});
		armHoldTimer();
	}

	function onPointerMove(e: React.PointerEvent) {
		if (!drawing || !active) return;
		e.preventDefault();
		e.stopPropagation();

		const p = toCanvasPoint(e);
		const prev = lastPointRef.current;
		const dist = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;

		if (snappedRef.current) {
			let nextEnd = p;
			if (angleSnapStep) {
				const rad = (deg: number) => (deg * Math.PI) / 180;
				const start = drawing.points[0];
				const dx = p.x - start.x;
				const dy = p.y - start.y;
				const r = Math.hypot(dx, dy);
				if (r >= MIN_LINE_LEN) {
					const theta = Math.atan2(dy, dx);
					const snappedTheta =
						Math.round(theta / rad(angleSnapStep)) * rad(angleSnapStep);
					nextEnd = {
						...p,
						x: start.x + Math.cos(snappedTheta) * r,
						y: start.y + Math.sin(snappedTheta) * r,
					};
				}
			}
			setDrawing((d) => (d ? { ...d, points: [d.points[0], nextEnd] } : d));
			lastPointRef.current = p;
			if (dist > STILL_EPS) armHoldTimer();
			return;
		}

		setDrawing((d) => (d ? { ...d, points: [...d.points, p] } : d));
		lastPointRef.current = p;
		if (dist > STILL_EPS) armHoldTimer();
	}

	const commitStroke = useCallback(
		(stroke: Path) => {
			const existing: Paths = (node.attrs.paths as Paths) || [];
			if (existing.some((p) => p.id === stroke.id)) return;
			const next = [...existing, stroke];
			queueMicrotask(() => {
				updateAttributes({ paths: next });
			});
		},
		[node.attrs.paths, updateAttributes],
	);

	function finishStroke(e: React.PointerEvent) {
		(e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
		clearHoldTimer();
		if (!drawing) return;
		commitStroke(drawing);
		setDrawing(null);
		snappedRef.current = false;
		lastPointRef.current = null;
	}

	function onPointerUp(e: React.PointerEvent) {
		if (!active) return;
		e.preventDefault();
		e.stopPropagation();
		finishStroke(e);
	}

	function onPointerCancel(e: React.PointerEvent) {
		if (!active) return;
		e.preventDefault();
		e.stopPropagation();
		(e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
		clearHoldTimer();
		setDrawing(null);
		snappedRef.current = false;
		lastPointRef.current = null;
	}

	const wrapperStyle: React.CSSProperties = isGlobal
		? {
				position: "absolute",
				inset: 0,
				pointerEvents: active ? "auto" : "none",
				zIndex: 10,
			}
		: {
				pointerEvents: active ? "auto" : "none",
			};

	return (
		<NodeViewWrapper
			style={wrapperStyle}
			data-overlay={isGlobal ? "true" : "false"}
		>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerCancel}
				onPointerLeave={(e) => {
					if ((e.buttons & 1) === 1) onPointerUp(e);
				}}
				onDragStart={(e) => e.preventDefault()}
				draggable={false}
				contentEditable={false as any}
				style={{
					touchAction: "none",
					userSelect: "none",
					WebkitUserSelect: "none",
					background: isGlobal ? "transparent" : "white",
					borderRadius: isGlobal ? 0 : 12,
					display: "block",
					border: isGlobal ? "none" : "1px solid #e5e7eb",
					width: "100%",
					height: "100%",
				}}
				data-type="drawing"
			/>
		</NodeViewWrapper>
	);
}
