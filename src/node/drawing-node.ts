import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DrawingView } from "./drawing-view";
import type { DrawingAttrs } from "../types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    drawing: {
      insertDrawing: (attrs?: Partial<DrawingAttrs>) => ReturnType;
      clearDrawing: () => ReturnType;
    };
  }
}

export const DrawingNode = Node.create({
  name: "drawing",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  defining: true,

  addAttributes() {
    return {
      paths: {
        default: []
      },
      width: {
        default: 800
      },
      height: {
        default: 400
      },
      size: {
        default: 8
      },
      smoothing: {
        default: 0.5
      }
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='drawing']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "drawing" })];
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
        ({ commands }) => {
          return commands.updateAttributes(this.name, { paths: [] });
        }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingView);
  }
});