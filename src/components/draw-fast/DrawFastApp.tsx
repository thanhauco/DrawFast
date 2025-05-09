
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DrawingShape, ShapeTool, ShapeStyle, Point, TextShape, DrawingState } from '@/types/draw';
import { DEFAULT_STYLE } from '@/types/draw';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { useDrawHistory } from '@/hooks/useDrawHistory';
import { useToast } from '@/hooks/use-toast';

export function DrawFastApp() {
  const { toast } = useToast();
  const { currentShapes, setCurrentShapes, undo, redo, canUndo, canRedo, recordHistory } = useDrawHistory([]);
  
  const [selectedTool, setSelectedTool] = useState<ShapeTool>('select');
  const [currentStyle, setCurrentStyle] = useState<ShapeStyle>(DEFAULT_STYLE);
  const [previewShape, setPreviewShape] = useState<DrawingShape | null>(null);
  
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [textEditingValue, setTextEditingValue] = useState("");
  const [textEditingPosition, setTextEditingPosition] = useState<Point | null>(null);

  const [zoomFactor, setZoomFactor] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        setCanvasSize({
          width: canvasContainerRef.current.offsetWidth,
          height: canvasContainerRef.current.offsetHeight,
        });
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);


  const handleStyleChange = (styleUpdate: Partial<ShapeStyle>) => {
    setCurrentStyle((prev) => ({ ...prev, ...styleUpdate }));
  };

  const handleShapesChange = (newShapes: DrawingShape[]) => {
    recordHistory(newShapes); // Use recordHistory to update shapes and manage history
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This cannot be undone from history.')) {
      // Clear history and set to initial empty state
      recordHistory([]); // This will effectively clear shapes and reset history to this state
      toast({ title: "Canvas Cleared", description: "All shapes have been removed." });
    }
  };

  const handleExportSVG = () => {
    const svgElement = document.querySelector('svg'); // A bit hacky, ideally get ref from Canvas
    if (!svgElement) {
      toast({ title: "Export Error", description: "Could not find SVG element.", variant: "destructive" });
      return;
    }
    // Create a clone to modify for export (e.g., ensure all styles are inline)
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Set background for SVG export
    const backgroundRect = svgClone.querySelector('rect[fill="var(--card)"]');
    if (backgroundRect) {
        backgroundRect.setAttribute('fill', '#FFFFFF'); // Explicit white background
    } else { // If no background rect, add one
        const newBgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newBgRect.setAttribute('width', '100%');
        newBgRect.setAttribute('height', '100%');
        newBgRect.setAttribute('fill', '#FFFFFF');
        svgClone.insertBefore(newBgRect, svgClone.firstChild);
    }

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drawfast_diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "SVG Exported", description: "Diagram saved as SVG." });
  };

  const handleExportJSON = () => {
    const jsonData = JSON.stringify(currentShapes, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drawfast_diagram.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "JSON Exported", description: "Diagram saved as JSON." });
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedShapes = JSON.parse(e.target?.result as string) as DrawingShape[];
          // Validate importedShapes structure if necessary
          if (Array.isArray(importedShapes)) { // Basic check
             setCurrentShapes(importedShapes); // This will record history
             toast({ title: "JSON Imported", description: "Diagram loaded from JSON." });
          } else {
            throw new Error("Invalid JSON format");
          }
        } catch (error) {
          console.error('Error importing JSON:', error);
          toast({ title: "Import Error", description: "Failed to import JSON. Invalid file format.", variant: "destructive" });
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input for same-file uploads
    }
  };

  const handleTextEditStart = (position: Point) => {
    setIsTextEditing(true);
    setTextEditingPosition(position);
    setTextEditingValue(""); // Start with empty text
  };

  const handleTextEditEnd = (text: string, position: Point, style: ShapeStyle) => {
    setIsTextEditing(false);
    setTextEditingPosition(null);
    if (text.trim() === "") return;

    const newTextShape: TextShape = {
      id: crypto.randomUUID(),
      type: 'text',
      x: position.x,
      y: position.y,
      text: text,
      style: { ...style, fillColor: 'transparent' }, // Text doesn't use fill color, uses stroke for text color
    };
    // Estimate width/height for text shape for eraser or selection later (very basic)
    const approxCharWidth = style.fontSize * 0.6;
    const approxCharHeight = style.fontSize;
    newTextShape.width = text.length * approxCharWidth;
    newTextShape.height = approxCharHeight;

    handleShapesChange([...currentShapes, newTextShape]);
    setTextEditingValue("");
  };

  const handleZoomIn = () => setZoomFactor(prev => Math.min(prev * 1.2, 5)); // Max zoom 5x
  const handleZoomOut = () => setZoomFactor(prev => Math.max(prev / 1.2, 0.2)); // Min zoom 0.2x

  // Debounce setCurrentShapes to avoid too many history entries during erase
  const debouncedSetCurrentShapes = useCallback(
    debounce((newShapes: DrawingShape[]) => {
      recordHistory(newShapes);
    }, 100), // 100ms debounce
    [recordHistory]
  );

  const handleEraserShapesChange = (newShapes: DrawingShape[]) => {
    debouncedSetCurrentShapes(newShapes);
  };


  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <header className="shrink-0">
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          currentStyle={currentStyle}
          onStyleChange={handleStyleChange}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onExportSVG={handleExportSVG}
          onExportJSON={handleExportJSON}
          onImportJSON={handleImportJSON}
          onClearCanvas={handleClearCanvas}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </header>
      <main ref={canvasContainerRef} className="flex-grow relative overflow-hidden">
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Canvas
            shapes={currentShapes}
            onShapesChange={selectedTool === 'eraser' ? handleEraserShapesChange : handleShapesChange}
            selectedTool={selectedTool}
            currentStyle={currentStyle}
            previewShape={previewShape}
            setPreviewShape={setPreviewShape}
            isTextEditing={isTextEditing}
            textEditingValue={textEditingValue}
            textEditingPosition={textEditingPosition}
            onTextEditStart={handleTextEditStart}
            onTextEditEnd={handleTextEditEnd}
            onTextEditChange={setTextEditingValue}
            zoomFactor={zoomFactor}
            panOffset={panOffset}
            setPanOffset={setPanOffset}
            canvasSize={canvasSize}
          />
        )}
      </main>
      <footer className="shrink-0 p-2 text-center text-xs text-muted-foreground border-t">
        DrawFast - Simple Drawing App
      </footer>
    </div>
  );
}

// Simple debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}
