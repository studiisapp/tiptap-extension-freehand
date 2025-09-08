import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { DrawingNode } from "tiptap-extension-freehand";

export function App() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      DrawingNode
    ],
    content: `
      <p>Text oben</p>
      <div data-type="drawing"></div>
      <p>Text unten</p>
    `
  });

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Tiptap Freehand</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => editor?.commands.insertDrawing({ width: 800, height: 400 })}
          style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", cursor: "pointer" }}
        >
          Insert Drawing
        </button>
        <button
          onClick={() => editor?.commands.clearDrawing()}
          style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", cursor: "pointer" }}
        >
          Clear Drawing
        </button>
      </div>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fafafa" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}