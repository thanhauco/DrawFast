
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
    // Adjust for panOffset and zoomFactor before returning coordinates
    // The coordinates should be relative to the "world" space of the canvas content, not the screen.
    return {
        x: (event.clientX - panOffset.x) / zoomFactor - CTM.e / CTM.a,
        y: (event.clientY - panOffset.y) / zoomFactor - CTM.f / CTM.d,
    };
  };
  
  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isTextEditing) return;
     // Use clientX/clientY for panning start, as it's relative to viewport
    const screenPos = { x: event.clientX, y: event.clientY };

    if (event.button === 1 || (event.button === 0 && event.altKey)) { 
      setIsPanning(true);
      setLastPanPoint(screenPos);
      return;
    }
    
    if (event.button !== 0) return;

    const pos = getMousePosition(event); // Get world coordinates for drawing
    setIsDrawing(true);
    setStartPoint(pos);

    if (selectedTool === 'text') {
      onTextEditStart(pos);
    } else if (selectedTool === 'eraser') {
      eraseAtPoint(pos);
    } else if (selectedTool !== 'select') {
      const id = crypto.randomUUID();
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
    
    const pos = getMousePosition(event); // World coordinates

    if (!isDrawing || !startPoint || selectedTool === 'select' || selectedTool === 'text' || isTextEditing) {
        // If text tool is active but not drawing (i.e. before first click), update preview for text cursor
        if (selectedTool === 'text' && !isTextEditing) {
            // This could be used to show a text cursor preview if desired
        }
        return;
    }
    
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
      // Text input blur/enter handles this
    } else if (isDrawing && previewShape && selectedTool !== 'select' && selectedTool !== 'text' && selectedTool !== 'eraser') {
      if (previewShape.type === 'rectangle' && (previewShape.width === 0 || previewShape.height === 0)) {
        // Don't add zero-size rectangles
      } else if (previewShape.type === 'circle' && previewShape.radius === 0) {
        // Don't add zero-radius circles
      } else {
        onShapesChange([...shapes, previewShape]);
      }
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    setPreviewShape(null);
  };

  const eraseAtPoint = (point: Point) => {
    const eraserSensitivity = currentStyle.strokeWidth * 1.5 + 5; // Make eraser more sensitive
    const newShapes = shapes.filter(shape => {
      if (shape.type === 'rectangle' && shape.width !== undefined && shape.height !== undefined) {
        return !(point.x >= shape.x - eraserSensitivity && point.x <= shape.x + shape.width + eraserSensitivity &&
                 point.y >= shape.y - eraserSensitivity && point.y <= shape.y + shape.height + eraserSensitivity);
      }
      if (shape.type === 'circle' && shape.radius !== undefined) {
        const dist = Math.sqrt(Math.pow(point.x - shape.x, 2) + Math.pow(point.y - shape.y, 2));
        return dist > shape.radius - eraserSensitivity && dist > eraserSensitivity; // Check if outside or too small
      }
      if ((shape.type === 'line' || shape.type === 'arrow') && shape.points) {
         const [p1, p2] = shape.points;
         // Check distance from point to line segment
         const lenSq = (p2.x - p1.x)**2 + (p2.y - p1.y)**2;
         if (lenSq === 0) return Math.sqrt((point.x - p1.x)**2 + (point.y - p1.y)**2) > eraserSensitivity; // Point
         let t = ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / lenSq;
         t = Math.max(0, Math.min(1, t));
         const projX = p1.x + t * (p2.x - p1.x);
         const projY = p1.y + t * (p2.y - p1.y);
         return Math.sqrt((point.x - projX)**2 + (point.y - projY)**2) > eraserSensitivity;
      }
      if (shape.type === 'text' && shape.text && shape.width !== undefined && shape.height !== undefined) {
         // Use estimated width/height for text bounding box check
        return !(point.x >= shape.x - eraserSensitivity && point.x <= shape.x + shape.width + eraserSensitivity &&
                 point.y >= shape.y - eraserSensitivity && point.y <= shape.y + shape.height + eraserSensitivity);
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
      // Position calculation requires CTM from SVG, ensure it's available
        if (svgRef.current && textEditingPosition) {
            const CTM = svgRef.current.getScreenCTM();
            if (CTM) {
                const screenX = (textEditingPosition.x * zoomFactor * CTM.a) + CTM.e + panOffset.x;
                const screenY = (textEditingPosition.y * zoomFactor * CTM.d) + CTM.f + panOffset.y;
                
                textInputRef.current.style.left = `${screenX}px`;
                textInputRef.current.style.top = `${screenY}px`;
                // Font size also needs to be scaled by zoom factor for visual consistency
                textInputRef.current.style.fontSize = `${currentStyle.fontSize * zoomFactor}px`;
                textInputRef.current.style.minWidth = `${100 * zoomFactor}px`;
                textInputRef.current.style.minHeight = `${currentStyle.fontSize * 1.5 * zoomFactor}px`;

            }
        }
    }
  }, [isTextEditing, textEditingPosition, zoomFactor, panOffset, currentStyle.fontSize]);


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
     if (e.key === 'Escape') {
      setIsTextEditing(false); // Assuming onTextEditEnd handles cleanup
      onTextEditEnd("", textEditingPosition!, currentStyle); // Pass empty to cancel
    }
  };

  const renderShape = (shape: DrawingShape) => {
    const { id, type, style } = shape;
    const baseProps = {
      stroke: style.strokeColor,
      strokeWidth: style.strokeWidth / zoomFactor, // Scale stroke width inversely with zoom for visual consistency
      fill: style.fillColor === 'transparent' ? 'none' : style.fillColor, // SVG uses 'none' for transparent fill
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
        const markerId = `arrowhead-${id.replace(/[^a-zA-Z0-9]/g, '')}`; // Ensure valid ID
        const arrowStrokeWidth = style.strokeWidth / zoomFactor;
        return (
          <g key={id}>
            <defs>
              <marker
                id={markerId}
                markerWidth={Math.max(5, 10 * (arrowStrokeWidth / 2))} // Scale arrowhead with stroke width
                markerHeight={Math.max(3.5, 7 * (arrowStrokeWidth / 2))}
                refX={Math.max(5, 10 * (arrowStrokeWidth / 2))} // Adjust refX based on markerWidth
                refY={Math.max(1.75, 3.5 * (arrowStrokeWidth / 2))} // Adjust refY based on markerHeight
                orient="auto-start-reverse"
                markerUnits="userSpaceOnUse" // Important for scaling with strokeWidth
              >
                <polygon points={`0 0, ${Math.max(5,10 * (arrowStrokeWidth/2))} ${Math.max(1.75,3.5 * (arrowStrokeWidth/2))}, 0 ${Math.max(3.5,7 * (arrowStrokeWidth/2))}`} fill={style.strokeColor} />
              </marker>
            </defs>
            <line
              x1={arrow.points[0].x}
              y1={arrow.points[0].y}
              x2={arrow.points[1].x}
              y2={arrow.points[1].y}
              {...baseProps}
              strokeWidth={arrowStrokeWidth} // Use scaled stroke width
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
            fontSize={style.fontSize} // Font size is absolute, not scaled by zoom here. It's scaled in textarea.
            fontFamily={style.fontFamily}
            fill={style.strokeColor} 
            dominantBaseline="hanging"
            style={{ userSelect: 'none' }} // Prevent text selection on canvas
          >
            {textShape.text.split('\n').map((line, index) => (
                <tspan key={index} x={textShape.x} dy={index === 0 ? 0 : `${style.fontSize * 1.2}px`}>
                    {line}
                </tspan>
            ))}
          </text>
        );
      default:
        return null;
    }
  };
  
  const effectiveCanvasWidth = canvasSize.width * 3; // Larger virtual canvas for panning
  const effectiveCanvasHeight = canvasSize.height * 3;


  return (
    <div className="flex-grow w-full h-full bg-gray-100 overflow-hidden relative cursor-crosshair" style={{ touchAction: 'none' }}>
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} 
        className="w-full h-full"
      >
        {/* This rect acts as the background. Its fill is for visual appearance on screen. */}
        {/* For export, a white background might be hardcoded if this is themed. */}
        <rect width="100%" height="100%" fill="var(--canvas-background, #F3F4F6)" /> {/* Light gray background, fallback to #F3F4F6 */}
        
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomFactor})`}>
          {/* Optional: Render a grid or background pattern here, ensure it's within the "world" space */}
          {/* The grid lines should be scaled inversely by zoomFactor to maintain visual thickness */}
          <defs>
            <pattern id="grid" width={50/zoomFactor} height={50/zoomFactor} patternUnits="userSpaceOnUse">
              <path d={`M ${50/zoomFactor} 0 L 0 0 0 ${50/zoomFactor}`} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={1/zoomFactor}/>
            </pattern>
          </defs>
          <rect x={-effectiveCanvasWidth/3} y={-effectiveCanvasHeight/3} width={effectiveCanvasWidth} height={effectiveCanvasHeight} fill="url(#grid)" />

          {shapes.map(renderShape)}
          {previewShape && renderShape(previewShape)}
        </g>
      </svg>
      {isTextEditing && textEditingPosition && (
        // Textarea is positioned absolutely on top of the SVG
        <textarea
          ref={textInputRef}
          value={textEditingValue}
          onChange={(e) => onTextEditChange(e.target.value)}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          style={{
            position: 'absolute',
            // Initial position, will be updated by useEffect
            left: `0px`, 
            top: `0px`,
            // transformOrigin and fontSize are handled in useEffect to correctly use CTM for positioning and scaling
            transformOrigin: 'top left', 
            border: '1px dashed var(--primary)',
            outline: 'none',
            padding: '2px',
            background: 'var(--card)', 
            color: 'var(--foreground)',
            zIndex: 1000, // Ensure textarea is on top
            fontFamily: currentStyle.fontFamily,
            lineHeight: '1.2',
            overflow: 'hidden', // Hide scrollbars initially, adjust with content
            resize: 'none', // Can be 'both' if manual resize is desired
          }}
          className="shadow-lg rounded-sm"
        />
      )}
    </div>
  );
}

