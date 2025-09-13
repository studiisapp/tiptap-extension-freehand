export type Point = { x: number; y: number; pressure?: number };
export type Path = {
  points: Point[]
  color: string
  size: number
  opacity: number
}
export type Paths = Path[]


export type DrawingAttrs = {
  paths: Paths;
  width: number;
  height: number;
  size: number;
  smoothing: number;
};