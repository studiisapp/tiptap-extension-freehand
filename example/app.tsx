import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { DrawingNode } from "tiptap-extension-freehand";

export function App() {
	const editor = useEditor({
		extensions: [
			StarterKit,
			DrawingNode.configure({
				features: {
					globalOverlay: true,
					straightenOnHold: false,
					angleSnap: true,
				},
				brushes: {
					pen: {
						composite: "source-over",
						thinning: 0.6,
						simulatePressure: true,
						sizeMul: 1.0,
						opacityMul: 1.0,
					},
					marker: {
						composite: "source-over",
						thinning: 0.0,
						simulatePressure: false,
						sizeMul: 2.0,
						opacityMul: 0.95,
					},
					highlighter: {
						composite: "multiply",
						thinning: 0.0,
						simulatePressure: false,
						sizeMul: 3.0,
						opacityMul: 0.25,
					},
					eraser: {
						composite: "destination-out",
						thinning: 0.0,
						simulatePressure: false,
						sizeMul: 1.8,
						opacityMul: 1.0,
					},
				},
			}),
		],
		content: `
      <h2>Endless Board</h2>
      ${Array.from({ length: 20 })
				.map(() => `<p>Draw everywhere …</p>`)
				.join("")}
    `,
	});

	useEffect(() => {
		if (!editor) return;
		editor.commands.setDrawingTool("pen");
		editor.commands.enableGlobalDrawing();
	}, [editor]);

	if (!editor) return null;

	return (
		<div style={{ padding: 24 }}>
			<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
				<button onClick={() => editor.commands.setDrawingTool("pen")}>
					Pen
				</button>
				<button onClick={() => editor.commands.setDrawingTool("marker")}>
					Marker
				</button>
				<button onClick={() => editor.commands.setDrawingTool("highlighter")}>
					Highlighter
				</button>
				<button onClick={() => editor.commands.setDrawingTool("eraser")}>
					Eraser
				</button>
				<button onClick={() => editor.commands.enableGlobalDrawing()}>
					Freehand on
				</button>
				<button onClick={() => editor.commands.disableGlobalDrawing()}>
					Freehand off
				</button>
				<button onClick={() => editor.commands.setDrawingColor("#FF2027")}>
					Switch Color
				</button>
			</div>
			<div
				style={{
					border: "1px solid #e5e7eb",
					borderRadius: 16,
					padding: 16,
					background: "#fafafa",
					position: "relative",
				}}
			>
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}
