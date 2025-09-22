import { mergeAttributes, Node } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { BrushPreset, DrawingFeatures, DrawingOptions } from "../types";
import { DrawingView } from "./drawing-view";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		drawing: {
			insertDrawing: (attrs?: Record<string, any>) => ReturnType;
			clearDrawing: () => ReturnType;
			setDrawingTool: (tool: string) => ReturnType;
			enableGlobalDrawing: () => ReturnType;
			disableGlobalDrawing: () => ReturnType;
			setDrawingColor: (color: string) => ReturnType;
			setBrushSize: (size: number) => ReturnType;
			increaseBrushSize: (step?: number) => ReturnType;
			decreaseBrushSize: (step?: number) => ReturnType;
		};
	}
}

const defaultBrushes: Record<string, BrushPreset> = {
	pen: {
		composite: "source-over",
		thinning: 0.6,
		simulatePressure: true,
		sizeMul: 1.0,
		opacityMul: 1.0,
		smoothingMul: 1.0,
		streamlineMul: 1.0,
	},
	marker: {
		composite: "source-over",
		thinning: 0.0,
		simulatePressure: false,
		sizeMul: 2.0,
		opacityMul: 0.95,
		smoothingMul: 1.1,
		streamlineMul: 1.1,
	},
	highlighter: {
		composite: "multiply",
		thinning: 0.0,
		simulatePressure: false,
		sizeMul: 3.0,
		opacityMul: 0.25,
		smoothingMul: 1.15,
		streamlineMul: 1.15,
	},
	eraser: {
		composite: "destination-out",
		thinning: 0.0,
		simulatePressure: false,
		sizeMul: 1.8,
		opacityMul: 1.0,
		smoothingMul: 1.0,
		streamlineMul: 1.0,
	},
};

type OverlayHit = { pos: number; node: PMNode } | null;

function findOverlayPos(state: EditorState, typeName: string): OverlayHit {
	let found: OverlayHit = null;
	(state.doc as PMNode).descendants((node: PMNode, pos: number) => {
		if (node.type.name === typeName && (node.attrs as any)?.overlay) {
			found = { pos, node };
			return false;
		}
		return true;
	});
	return found;
}

const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 64;

function clampSize(v: number) {
	return Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, v));
}

export const DrawingNode = Node.create<DrawingOptions>({
	name: "drawing",
	group: "block",
	atom: true,
	selectable: true,
	draggable: false,
	defining: true,

	addOptions() {
		return {
			features: {
				straightenOnHold: false,
				angleSnap: false,
				globalOverlay: false,
			} as DrawingFeatures,
			brushes: defaultBrushes,
		};
	},

	addAttributes() {
		return {
			paths: { default: [] },
			width: { default: 800 },
			height: { default: 400 },
			size: { default: 8 },
			smoothing: { default: 0.5 },
			color: { default: "#000000" },
			opacity: { default: 1 },
			tool: { default: "pen" },
			overlay: { default: false },
			active: { default: false },
		};
	},

	parseHTML() {
		return [{ tag: "div[data-type='drawing']" }];
	},

	renderHTML({ HTMLAttributes }) {
		return ["div", mergeAttributes(HTMLAttributes, { "data-type": "drawing" })];
	},

	onCreate() {
		const { editor } = this;
		const { globalOverlay } = (this.options.features || {}) as DrawingFeatures;
		if (!globalOverlay) return;

		let hasOverlay = false;
		(editor.state.doc as PMNode).descendants((n: PMNode) => {
			if (n.type.name === this.name && (n.attrs as any)?.overlay) {
				hasOverlay = true;
				return false;
			}
			return true;
		});

		if (!hasOverlay) {
			const root = editor.view.dom as HTMLElement;
			const width = root?.clientWidth || 800;
			const height = root?.scrollHeight || 1200;

			editor
				.chain()
				.insertContentAt(0, {
					type: this.name,
					attrs: {
						width,
						height,
						overlay: true,
						active: true,
					},
				})
				.run();
		}
	},

	addCommands() {
		return {
			insertDrawing:
				(attrs?: Record<string, any>) =>
				({ chain, state }) => {
					const pos = (state as EditorState).selection.to;
					return chain().insertContentAt(pos, { type: this.name, attrs }).run();
				},

			clearDrawing:
				() =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);
					if (!hit) return false;
					const attrs = { ...(hit.node.attrs as any), paths: [] as any[] };
					if (dispatch)
						(dispatch as (t: Transaction) => void)(
							(tr as Transaction).setNodeMarkup(hit.pos, undefined, attrs),
						);
					return true;
				},

			setDrawingTool:
				(tool: string) =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);
					if (hit) {
						const attrs = { ...(hit.node.attrs as any), tool, active: true };
						if (dispatch)
							(dispatch as (t: Transaction) => void)(
								(tr as Transaction).setNodeMarkup(hit.pos, undefined, attrs),
							);
						return true;
					}
					if (dispatch)
						(dispatch as (t: Transaction) => void)(tr as Transaction);
					return true;
				},

			enableGlobalDrawing:
				() =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);
					if (!hit) return false;
					const attrs = { ...(hit.node.attrs as any), active: true };
					if (dispatch)
						(dispatch as (t: Transaction) => void)(
							(tr as Transaction).setNodeMarkup(hit.pos, undefined, attrs),
						);
					return true;
				},

			disableGlobalDrawing:
				() =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);
					if (!hit) return false;
					const attrs = { ...(hit.node.attrs as any), active: false };
					if (dispatch)
						(dispatch as (t: Transaction) => void)(
							(tr as Transaction).setNodeMarkup(hit.pos, undefined, attrs),
						);
					return true;
				},
			setDrawingColor:
				(color: string) =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);

					if (!hit) return false;
					const attrs = { ...hit.node.attrs, color };
					if (dispatch) {
						dispatch(tr.setNodeMarkup(hit.pos, undefined, attrs));
					}
					return true;
				},

			setBrushSize:
				(size: number) =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);
					if (!hit) return false;
					const attrs = { ...hit.node.attrs, size: clampSize(size) };
					if (dispatch) {
						dispatch(tr.setNodeMarkup(hit.pos, undefined, attrs));
					}
					return true;
				},
			increaseBrushSize:
				(step = 2) =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);
					if (!hit) return false;
					const current = (hit.node.attrs as any)?.size ?? 8;
					const next = clampSize(current + step);
					if (next === current) return true;
					const attrs = { ...hit.node.attrs, size: next };
					if (dispatch) {
						dispatch(tr.setNodeMarkup(hit.pos, undefined, attrs));
					}
					return true;
				},

			decreaseBrushSize:
				(step = 2) =>
				({ state, tr, dispatch }) => {
					const hit = findOverlayPos(state as EditorState, this.name);
					if (!hit) return false;
					const current = (hit.node.attrs as any)?.size ?? 8;
					const next = clampSize(current - step);
					if (next === current) return true;
					const attrs = { ...hit.node.attrs, size: next };
					if (dispatch) {
						dispatch(tr.setNodeMarkup(hit.pos, undefined, attrs));
					}
					return true;
				},
		};
	},

	addNodeView() {
		return ReactNodeViewRenderer(DrawingView, {
			stopEvent: () => true,
		});
	},
});
