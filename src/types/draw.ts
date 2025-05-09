
export type ShapeTool = 'select' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface ShapeStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number; // For text
  fontFamily: string; // For text
}

export interface BaseShape {
  id: string;
  type: ShapeTool;
  style: ShapeStyle;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[]; // For lines, arrows
  radius?: number; // For circles
  text?: string; // For text
  // For future selection and transformation
  selected?: boolean; 
  rotation?: number;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: [Point, Point]; // Start and end points relative to shape x,y or absolute? Let's use absolute for now.
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: [Point, Point];
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
}

export type DrawingShape = RectangleShape | CircleShape | LineShape | ArrowShape | TextShape;

export interface DrawingState {
  shapes: DrawingShape[];
  selectedTool: ShapeTool;
  currentStyle: ShapeStyle;
  canvasSize: { width: number; height: number };
  zoomFactor: number;
  panOffset: Point;
  // For text input specifically
  isTextEditing: boolean;
  textEditingValue: string;
  textEditingPosition: Point | null;
}

export const DEFAULT_STYLE: ShapeStyle = {
  strokeColor: '#000000',
  fillColor: 'transparent', // Default to no fill for most shapes initially
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
};
