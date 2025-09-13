import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { DrawingNode } from "tiptap-extension-freehand";

export function App() {
	const editor = useEditor({
		extensions: [StarterKit, DrawingNode],
		content: `
      <p>Text above</p>
      <div data-type="drawing"></div>
      <p>Text below</p>
    `,
	});

	if (!editor) return null;

	function updateDrawingAttrs(attrs: Record<string, any>) {
		const { from, to } = editor.state.selection;

		editor.state.doc.nodesBetween(from, to, (node, pos) => {
			if (node.type.name === "drawing") {
				editor
					.chain()
					.setNodeSelection(pos)
					.updateAttributes("drawing", attrs)
					.run();
			}
		});
	}

	return (
		<div
			style={{
				fontFamily: "Inter, system-ui, sans-serif",
				padding: 24,
				display: "grid",
				gap: 16,
			}}
		>
			<h1 style={{ margin: 0 }}>Tiptap Freehand Demo</h1>

			<div
				style={{
					display: "flex",
					gap: 8,
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				<button
					onClick={() =>
						editor.commands.insertDrawing({ width: 800, height: 400 })
					}
					style={{
						padding: "8px 12px",
						borderRadius: 12,
						border: "1px solid #e5e7eb",
						cursor: "pointer",
					}}
				>
					Insert Drawing
				</button>

				<button
					onClick={() => editor.commands.clearDrawing()}
					style={{
						padding: "8px 12px",
						borderRadius: 12,
						border: "1px solid #e5e7eb",
						cursor: "pointer",
					}}
				>
					Clear Drawing
				</button>

				<input
					type="color"
					defaultValue="#000000"
					onChange={(e) => updateDrawingAttrs({ color: e.target.value })}
					style={{ cursor: "pointer" }}
				/>

				<label style={{ display: "flex", alignItems: "center", gap: 4 }}>
					Size:
					<input
						type="range"
						min={1}
						max={50}
						defaultValue={8}
						onChange={(e) =>
							updateDrawingAttrs({ size: parseInt(e.target.value) })
						}
					/>
				</label>
			</div>

			<div
				style={{
					border: "1px solid #e5e7eb",
					borderRadius: 16,
					padding: 16,
					background: "#fafafa",
				}}
			>
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}
