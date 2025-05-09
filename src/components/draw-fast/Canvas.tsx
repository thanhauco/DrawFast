
"use client";

import type { DrawingShape, Point, ShapeStyle, ShapeTool, TextShape } from '@/types/draw';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CanvasProps {
  shapes: DrawingShape[];
  onShapesChange: (shapes: DrawingShape[]) => void;
  selectedTool: ShapeTool;
  currentStyle: ShapeStyle;
  previewShape: DrawingShape | null;
  setPreviewShape: (shape: DrawingShape | null) => void;
  isTextEditing: boolean;
  textEditingValue: string;
  textEditingPosition: Point | null;
  onTextEditStart: (position: Point) => void;
  onTextEditEnd: (text: string, position: Point, style: ShapeStyle) => void;
  onTextEditChange: (value: string) => void;
  zoomFactor: number;
  panOffset: Point;
  setPanOffset: React.Dispatch<React.SetStateAction<Point>>;
  canvasSize: { width: number; height: number };
}

export function Canvas({
  shapes,
  onShapesChange,
  selectedTool,
  currentStyle,
  previewShape,
  setPreviewShape,
  isTextEditing,
  textEditingValue,
  textEditingPosition,
  onTextEditStart,
  onTextEditEnd,
  onTextEditChange,
  zoomFactor,
  panOffset,
  setPanOffset,
  canvasSize,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const getMousePosition = (event: React.MouseEvent<SVGSVGElement | HTMLDivElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (event.clientX - CTM.e - panOffset.x) / CTM.a / zoomFactor,
      y: (event.clientY - CTM.f - panOffset.y) / CTM.d / zoomFactor,
    };
  };
  
  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isTextEditing) return;
    const pos = getMousePosition(event);

    if (event.button === 1 || (event.button === 0 && event.altKey)) { // Middle mouse or Alt+Left Click for panning
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      return;
    }
    
    if (event.button !== 0) return; // Only left click for drawing

    setIsDrawing(true);
    setStartPoint(pos);

    if (selectedTool === 'text') {
      onTextEditStart(pos);
    } else if (selectedTool === 'eraser') {
      eraseAtPoint(pos);
    } else if (selectedTool !== 'select') {
      const id = crypto.randomUUID();
      // Initialize preview shape
      switch (selectedTool) {
        case 'rectangle':
          setPreviewShape({ id, type: 'rectangle', x: pos.x, y: pos.y, width: 0, height: 0, style: currentStyle });
          break;
        case 'circle':
          setPreviewShape({ id, type: 'circle', x: pos.x, y: pos.y, radius: 0, style: currentStyle });
          break;
        case 'line':
        case 'arrow':
          setPreviewShape({ id, type: selectedTool, x: pos.x, y: pos.y, points: [pos, pos], style: currentStyle });
          break;
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning && lastPanPoint) {
      const dx = event.clientX - lastPanPoint.x;
      const dy = event.clientY - lastPanPoint.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      return;
    }

    if (!isDrawing || !startPoint || selectedTool === 'select' || selectedTool === 'text' || isTextEditing) return;
    
    const pos = getMousePosition(event);

    if (selectedTool === 'eraser') {
      eraseAtPoint(pos);
      return;
    }

    if (!previewShape) return;

    switch (previewShape.type) {
      case 'rectangle':
        setPreviewShape({
          ...previewShape,
          x: Math.min(startPoint.x, pos.x),
          y: Math.min(startPoint.y, pos.y),
          width: Math.abs(pos.x - startPoint.x),
          height: Math.abs(pos.y - startPoint.y),
        });
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2));
        setPreviewShape({ ...previewShape, x: startPoint.x, y: startPoint.y, radius });
        break;
      case 'line':
      case 'arrow':
        setPreviewShape({ ...previewShape, points: [startPoint, pos] });
        break;
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (isTextEditing && textEditingPosition) {
      // Handled by text input blur/enter
    } else if (isDrawing && previewShape && selectedTool !== 'select' && selectedTool !== 'text' && selectedTool !== 'eraser') {
      onShapesChange([...shapes, previewShape]);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    setPreviewShape(null);
  };

  const eraseAtPoint = (point: Point) => {
    const eraserSize = currentStyle.strokeWidth * 2; // Eraser size based on stroke width
    const newShapes = shapes.filter(shape => {
      // Basic bounding box check for simplicity
      // More precise hit detection would be needed for complex shapes or pixel-perfect erasing
      if (shape.type === 'rectangle' && shape.width !== undefined && shape.height !== undefined) {
        return !(point.x > shape.x - eraserSize && point.x < shape.x + shape.width + eraserSize &&
                 point.y > shape.y - eraserSize && point.y < shape.y + shape.height + eraserSize);
      }
      if (shape.type === 'circle' && shape.radius !== undefined) {
        const dist = Math.sqrt(Math.pow(point.x - shape.x, 2) + Math.pow(point.y - shape.y, 2));
        return dist > shape.radius + eraserSize;
      }
      // For lines/arrows, check distance to line segment. Simplified: check endpoints.
      if ((shape.type === 'line' || shape.type === 'arrow') && shape.points) {
         const [p1, p2] = shape.points;
         const dist1 = Math.sqrt(Math.pow(point.x - p1.x, 2) + Math.pow(point.y - p1.y, 2));
         const dist2 = Math.sqrt(Math.pow(point.x - p2.x, 2) + Math.pow(point.y - p2.y, 2));
         return !(dist1 < eraserSize || dist2 < eraserSize); // This is a very rough check
      }
      if (shape.type === 'text' && shape.width !== undefined && shape.height !== undefined) { // Approximate text bounding box
        return !(point.x > shape.x - eraserSize && point.x < shape.x + shape.width + eraserSize &&
                 point.y > shape.y - shape.height - eraserSize && point.y < shape.y + eraserSize);
      }
      return true;
    });
    if (newShapes.length !== shapes.length) {
       onShapesChange(newShapes);
    }
  };


  useEffect(() => {
    if (isTextEditing && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [isTextEditing]);

  const handleTextareaBlur = () => {
    if (isTextEditing && textEditingPosition) {
      onTextEditEnd(textEditingValue, textEditingPosition, currentStyle);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isTextEditing && textEditingPosition) {
        onTextEditEnd(textEditingValue, textEditingPosition, currentStyle);
      }
    }
  };

  const renderShape = (shape: DrawingShape) => {
    const { id, type, style } = shape;
    const baseProps = {
      stroke: style.strokeColor,
      strokeWidth: style.strokeWidth,
      fill: style.fillColor,
    };

    switch (type) {
      case 'rectangle':
        const rect = shape as import('@/types/draw').RectangleShape;
        return <rect key={id} x={rect.x} y={rect.y} width={rect.width} height={rect.height} {...baseProps} />;
      case 'circle':
        const circ = shape as import('@/types/draw').CircleShape;
        return <circle key={id} cx={circ.x} cy={circ.y} r={circ.radius} {...baseProps} />;
      case 'line':
        const line = shape as import('@/types/draw').LineShape;
        return <line key={id} x1={line.points[0].x} y1={line.points[0].y} x2={line.points[1].x} y2={line.points[1].y} {...baseProps} fill="none" />;
      case 'arrow':
        const arrow = shape as import('@/types/draw').ArrowShape;
        const markerId = `arrowhead-${id}`;
        return (
          <g key={id}>
            <defs>
              <marker
                id={markerId}
                markerWidth="10"
                markerHeight="7"
                refX="10" 
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={style.strokeColor} />
              </marker>
            </defs>
            <line
              x1={arrow.points[0].x}
              y1={arrow.points[0].y}
              x2={arrow.points[1].x}
              y2={arrow.points[1].y}
              {...baseProps}
              fill="none"
              markerEnd={`url(#${markerId})`}
            />
          </g>
        );
      case 'text':
        const textShape = shape as TextShape;
        return (
          <text
            key={id}
            x={textShape.x}
            y={textShape.y}
            fontSize={style.fontSize}
            fontFamily={style.fontFamily}
            fill={style.strokeColor} // Text uses strokeColor for its color
            dominantBaseline="hanging"
          >
            {textShape.text}
          </text>
        );
      default:
        return null;
    }
  };
  
  // This is a simple way to set canvas size.
  // For a production app, you might want a more robust solution for resizing.
  const effectiveCanvasWidth = canvasSize.width * 2; // Make canvas larger than viewport for panning
  const effectiveCanvasHeight = canvasSize.height * 2;


  return (
    <div className="flex-grow w-full h-full bg-card overflow-hidden relative cursor-crosshair" style={{ touchAction: 'none' }}>
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // End drawing if mouse leaves canvas
        className="w-full h-full"
        // viewBox defines the coordinate system of the SVG.
        // This will be affected by panOffset and zoomFactor to simulate camera movement.
        // However, for simplicity with getScreenCTM, we keep viewBox static and use transform on a group.
        // viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} 
      >
        <rect width="100%" height="100%" fill="var(--card)" />
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomFactor})`}>
          {/* Optional: Render a grid or background pattern here */}
          <rect x={-effectiveCanvasWidth/4} y={-effectiveCanvasHeight/4} width={effectiveCanvasWidth} height={effectiveCanvasHeight} fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth={1/zoomFactor} />

          {shapes.map(renderShape)}
          {previewShape && renderShape(previewShape)}
        </g>
      </svg>
      {isTextEditing && textEditingPosition && (
        <textarea
          ref={textInputRef}
          value={textEditingValue}
          onChange={(e) => onTextEditChange(e.target.value)}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          style={{
            position: 'absolute',
            left: `${(textEditingPosition.x * zoomFactor) + panOffset.x}px`,
            top: `${(textEditingPosition.y * zoomFactor) + panOffset.y}px`,
            transform: `scale(${zoomFactor})`, // Scale textarea with zoom
            transformOrigin: 'top left',
            minWidth: '100px',
            minHeight: `${currentStyle.fontSize * 1.5}px`,
            fontSize: `${currentStyle.fontSize}px`, // Font size applied directly
            fontFamily: currentStyle.fontFamily,
            lineHeight: '1.2',
            border: '1px dashed var(--primary)',
            outline: 'none',
            padding: '2px',
            background: 'var(--card)',
            color: 'var(--foreground)',
            zIndex: 100,
          }}
          className="shadow-lg rounded-sm"
        />
      )}
    </div>
  );
}
