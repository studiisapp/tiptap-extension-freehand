import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { BrushPreset, DrawingOptions } from "../types";
import { DrawingView } from "./drawing-view";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		drawing: {
			insertDrawing: (attrs?: Record<string, any>) => ReturnType;
			clearDrawing: () => ReturnType;
			setDrawingTool: (tool: string) => ReturnType;
			enableGlobalDrawing: () => ReturnType;
			disableGlobalDrawing: () => ReturnType;
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

function findOverlayPos(state: any, typeName: string) {
	let found: { pos: number; node: any } | null = null;
	state.doc.descendants((node: any, pos: number) => {
		if (node.type.name === typeName && node.attrs.overlay) {
			found = { pos, node };
			return false;
		}
		return true;
	});
	return found;
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
			},
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
		editor.state.doc.descendants((n) => {
			if (n.type.name === this.name && n.attrs.overlay) {
				hasOverlay = true;
				return false;
			}
			return true;
		});

		if (!hasOverlay) {
			const root = editor.view.dom as HTMLElement;
			const width = root.clientWidth || 800;
			const height = root.scrollHeight || 1200;

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
				(attrs) =>
				({ chain, state }) => {
					const pos = state.selection.$to.pos;
					return chain().insertContentAt(pos, { type: this.name, attrs }).run();
				},

			clearDrawing:
				() =>
				({ state, tr, dispatch }) => {
					const overlay = findOverlayPos(state, this.name);
					if (overlay) {
						const attrs = { ...overlay.node.attrs, paths: [] };
						if (dispatch)
							dispatch(tr.setNodeMarkup(overlay.pos, undefined, attrs));
						return true;
					}
					return false;
				},

			setDrawingTool:
				(tool: string) =>
				({ state, tr, dispatch }) => {
					const overlay = findOverlayPos(state, this.name);
					if (overlay) {
						const attrs = { ...overlay.node.attrs, tool, active: true };
						if (dispatch)
							dispatch(tr.setNodeMarkup(overlay.pos, undefined, attrs));
						return true;
					}
					if (dispatch) dispatch(tr.setMeta("noop", true));
					return true;
				},

			enableGlobalDrawing:
				() =>
				({ state, tr, dispatch }) => {
					const overlay = findOverlayPos(state, this.name);
					if (!overlay) return false;
					const attrs = { ...overlay.node.attrs, active: true };
					if (dispatch)
						dispatch(tr.setNodeMarkup(overlay.pos, undefined, attrs));
					return true;
				},

			disableGlobalDrawing:
				() =>
				({ state, tr, dispatch }) => {
					const overlay = findOverlayPos(state, this.name);
					if (!overlay) return false;
					const attrs = { ...overlay.node.attrs, active: false };
					if (dispatch)
						dispatch(tr.setNodeMarkup(overlay.pos, undefined, attrs));
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
