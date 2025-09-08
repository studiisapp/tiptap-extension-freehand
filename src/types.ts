export type Point = { x: number; y: number; pressure?: number };
export type Path = Point[];
export type Paths = Path[];

export type DrawingAttrs = {
  paths: Paths;
  width: number;
  height: number;
  size: number;
  smoothing: number;
};