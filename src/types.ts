export type Point = { x: number; y: number; pressure?: number };
export type Path = {
	points: Point[];
	color: string;
	size: number;
	opacity: number;
};
export type Paths = Path[];

export type DrawingAttrs = {
	paths: any[];
	width: number;
	height: number;
	size: number;
	smoothing: number;
	color: string;
	opacity: number;
	tool: string;
	overlay?: boolean;
	active?: boolean;
};

export type DrawingFeatures = {
	straightenOnHold?: boolean;
	angleSnap?: boolean | number;
	globalOverlay?: boolean;
};

export type DrawingOptions = {
	features: DrawingFeatures;
	brushes: Record<string, BrushPreset>;
};

export type BrushPreset = {
	composite: GlobalCompositeOperation;
	thinning: number;
	simulatePressure: boolean;
	sizeMul?: number;
	opacityMul?: number;
	smoothingMul?: number;
	streamlineMul?: number;
};
