# Tiptap Freehand Drawing Extension

A TipTap extension that lets you draw freehand on top of your editor.

Two modes:
- Global Overlay (GoodNotes/OneNote style): draw anywhere on an "infinite" canvas that sits transparently on top of the entire editor - no block placement required.
- Block Mode: insert a drawing block as a regular node in the document.

The extension persists strokes in the document (as JSON in a node attribute).

Built with:
- TipTap v3 (@tiptap/core, @tiptap/react)
- perfect-freehand (pressure-simulated strokes)

---

## Features

- Draw anywhere (globalOverlay) or as a block node
- Brushes: pen, marker, highlighter, eraser (eraser uses destination-out) - You can overwrite these brushes with your own ones
- Pressure simulation (via perfect-freehand)
- Smoothing, thinning, opacity, size controls
- Optional: straighten-on-hold and angle snap
- All strokes are persisted in the document JSON

---

## Install

This package expects TipTap and React to be present in your app.

```bash
# with pnpm
pnpm add tiptap-extension-freehand

# or npm
npm i tiptap-extension-freehand

# or yarn
yarn add tiptap-extension-freehand
```

---

## Quick Start (React, Global Overlay)

This gives you the “draw anywhere” experience. The overlay node is auto-inserted and covers the whole editor.

```tsx
import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { DrawingNode } from "tiptap-extension-freehand";

export function App() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      DrawingNode.configure({
        features: {
          globalOverlay: true,   // <— draw anywhere (no block to place)
          straightenOnHold: true,
          angleSnap: 15,         // number (degrees) or true (= 15)
        },
        brushes: {
          pen:        { composite: "source-over", thinning: 0.6, simulatePressure: true,  sizeMul: 1.0, opacityMul: 1.0 },
          marker:     { composite: "source-over", thinning: 0.0, simulatePressure: false, sizeMul: 2.0, opacityMul: 0.95 },
          highlighter:{ composite: "multiply",   thinning: 0.0, simulatePressure: false, sizeMul: 3.0, opacityMul: 0.25 },
          eraser:     { composite: "destination-out", thinning: 0.0, simulatePressure: false, sizeMul: 1.8, opacityMul: 1.0 },
        },
      }),
    ],
    content: `
      <h2>Endless Board</h2>
      ${Array.from({ length: 20 }).map(() => `<p>Draw everywhere …</p>`).join("")}
    `,
  });

  useEffect(() => {
    if (!editor) return;
    // Pick a tool and enable drawing (activates overlay pointer-events)
    editor.commands.setDrawingTool("pen");
    editor.commands.enableGlobalDrawing();
  }, [editor]);

  if (!editor) return null;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => editor.commands.setDrawingTool("pen")}>Pen</button>
        <button onClick={() => editor.commands.setDrawingTool("marker")}>Marker</button>
        <button onClick={() => editor.commands.setDrawingTool("highlighter")}>Highlighter</button>
        <button onClick={() => editor.commands.setDrawingTool("eraser")}>Eraser</button>
        <button onClick={() => editor.commands.enableGlobalDrawing()}>Freehand on</button>
        <button onClick={() => editor.commands.disableGlobalDrawing()}>Freehand off</button>
      </div>

      <div
        className="editor paper paper-grid"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 16,
          position: "relative",   // the overlay NodeView uses absolute positioning
          background: "#fafafa",
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

Notes:
- The overlay NodeView positions itself absolutely inside the editor root and scales to the editor’s scrollHeight.
- “Active” toggles pointer-events on the overlay. Use `enableGlobalDrawing()` / `disableGlobalDrawing()` or set a tool via `setDrawingTool(...)` to activate.

---

## Block Mode (insert a drawing like a regular node)

If you prefer a classical “canvas block” inside the document:

```tsx
import { DrawingNode } from "tiptap-extension-freehand";

const editor = useEditor({
  extensions: [
    StarterKit,
    DrawingNode.configure({
      features: { globalOverlay: false }, // default
      brushes: {/* same as above */},
    }),
  ],
  content: `<p>Insert a drawing block below:</p>`,
});

// Insert a drawing node at the current selection
editor.commands.insertDrawing({
  width: 800,
  height: 400,
});
```

---

## API

### Configure options

```ts
type BrushPreset = {
  composite: GlobalCompositeOperation; // e.g. "source-over" | "multiply" | "destination-out"
  thinning: number;                    // (-1..1) perfect-freehand thinning
  simulatePressure: boolean;           // simulate pressure from speed
  sizeMul?: number;                    // per-brush size multiplier
  opacityMul?: number;                 // per-brush opacity multiplier
  smoothingMul?: number;               // per-brush smoothing multiplier
  streamlineMul?: number;              // per-brush streamline multiplier
};

type DrawingFeatures = {
  globalOverlay?: boolean;             // draw everywhere on an overlay (no block required)
  straightenOnHold?: boolean;          // hold to straighten freehand to a line
  angleSnap?: boolean | number;        // true=15°, or a degree number (e.g. 15, 30)
};

type DrawingOptions = {
  features: DrawingFeatures;
  brushes: Record<string, BrushPreset>;
};
```

Typical presets:

```ts
brushes: {
  pen:         { composite: "source-over",     thinning: 0.6, simulatePressure: true,  sizeMul: 1.0, opacityMul: 1.0 },
  marker:      { composite: "source-over",     thinning: 0.0, simulatePressure: false, sizeMul: 2.0, opacityMul: 0.95 },
  highlighter: { composite: "multiply",        thinning: 0.0, simulatePressure: false, sizeMul: 3.0, opacityMul: 0.25 },
  eraser:      { composite: "destination-out", thinning: 0.0, simulatePressure: false, sizeMul: 1.8, opacityMul: 1.0 },
}
```

### Commands

- insertDrawing(attrs?)
  - Insert a drawing node at the current selection (block mode).
  - attrs: width, height, size, smoothing, color, opacity, tool

- clearDrawing()
  - Clears all paths in the global overlay node (if present) or the selected drawing node.

- setDrawingTool(tool: string)
  - Sets the active tool (pen/marker/highlighter/eraser or your own key).
  - In global overlay mode, also activates drawing.

- enableGlobalDrawing()
  - Activates pointer-events on the overlay node (globalOverlay mode).

- disableGlobalDrawing()
  - Deactivates pointer-events on the overlay node (globalOverlay mode).

### Node attributes (persisted)

For the drawing node (overlay or block):

```ts
{
  // Canvas logical size used by the NodeView
  width: number;
  height: number;

  // Brush defaults (can be changed via commands)
  size: number;          // base stroke size
  smoothing: number;     // 0..1 smoothing for perfect-freehand
  color: string;         // hex string, e.g. "#000000"
  opacity: number;       // 0..1
  tool: string;          // key referencing your brush preset

  // Overlay flags
  overlay?: boolean;     // marks the node as “global overlay”
  active?: boolean;      // pointer-events toggle for overlay

  // Persisted strokes
  paths: Array<{
    points: Array<{ x: number; y: number; pressure?: number }>;
    color: string;
    size: number;
    opacity: number;
    tool: string;
  }>;
}
```

The entire `paths` array is part of the TipTap/ProseMirror document JSON. No separate storage required.

## Contributing

PRs welcome!

Suggested local workflow:
- `pnpm i`
- Build the package and run the example app with `pnpm dev`

If you open an issue, please include:
- TipTap versions (@tiptap/core, @tiptap/react)
- Browser/OS
- Minimal reproduction (codesandbox, repo, or snippet)

---

## License

MIT

---

## Acknowledgements

- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) by Steve Ruiz — amazing stroke generation.
- TipTap team for the great editor foundation.