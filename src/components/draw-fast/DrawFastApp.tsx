
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DrawingShape, ShapeTool, ShapeStyle, Point, TextShape } from '@/types/draw';
import { DEFAULT_STYLE } from '@/types/draw';
import { Toolbar, type AiGenerationMode } from './Toolbar';
import { Canvas } from './Canvas';
import { useDrawHistory } from '@/hooks/useDrawHistory';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { generateDiagram, type AiPromptInput, type AiGeneratedShapes } from '@/ai/flows/generate-diagram-flow';
import type { DrawingShape as ZodDrawingShape } from '@/types/draw.zod';


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

  // AI Generation State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [currentAiMode, setCurrentAiMode] = useState<AiGenerationMode | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);


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
    recordHistory(newShapes); 
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This cannot be undone from history.')) {
      recordHistory([]); 
      toast({ title: "Canvas Cleared", description: "All shapes have been removed." });
    }
  };

  const handleExportSVG = () => {
    const svgElement = document.querySelector('svg'); 
    if (!svgElement) {
      toast({ title: "Export Error", description: "Could not find SVG element.", variant: "destructive" });
      return;
    }
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    
    const backgroundRectOriginal = svgClone.querySelector('rect[width="100%"][height="100%"]');
    if (backgroundRectOriginal) {
      backgroundRectOriginal.setAttribute('fill', '#FFFFFF');
    } else {
        const newBgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        newBgRect.setAttribute('width', svgClone.getAttribute('width') || '100%');
        newBgRect.setAttribute('height', svgClone.getAttribute('height') || '100%');
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
          if (Array.isArray(importedShapes)) { 
             setCurrentShapes(importedShapes); 
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
      event.target.value = ''; 
    }
  };

  const handleTextEditStart = (position: Point) => {
    setIsTextEditing(true);
    setTextEditingPosition(position);
    setTextEditingValue(""); 
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
      style: { ...style, fillColor: 'transparent' }, 
    };
    const approxCharWidth = style.fontSize * 0.6;
    const approxCharHeight = style.fontSize;
    newTextShape.width = text.split('\n').reduce((max, line) => Math.max(max, line.length), 0) * approxCharWidth;
    newTextShape.height = text.split('\n').length * approxCharHeight * 1.2; // 1.2 for line height

    handleShapesChange([...currentShapes, newTextShape]);
    setTextEditingValue("");
  };

  const handleZoomIn = () => setZoomFactor(prev => Math.min(prev * 1.2, 5)); 
  const handleZoomOut = () => setZoomFactor(prev => Math.max(prev / 1.2, 0.2)); 

  const debouncedSetCurrentShapes = useCallback(
    debounce((newShapes: DrawingShape[]) => {
      recordHistory(newShapes);
    }, 100), 
    [recordHistory]
  );

  const handleEraserShapesChange = (newShapes: DrawingShape[]) => {
    debouncedSetCurrentShapes(newShapes);
  };

  // AI Generation Handlers
  const handleOpenAiModal = (mode: AiGenerationMode) => {
    setCurrentAiMode(mode);
    setAiPrompt(""); 
    setIsAiModalOpen(true);
  };

  const handleSubmitAiPrompt = async () => {
    if (!aiPrompt.trim() || !currentAiMode) return;

    setIsAiLoading(true);
    try {
      let generatedData: AiGeneratedShapes | null = null;
      const input: AiPromptInput = { prompt: aiPrompt };

      switch (currentAiMode) {
        case 'diagram':
          generatedData = await generateDiagram(input);
          break;
        // case 'board':
        //   // generatedData = await generateBoard(input); // Placeholder for future
        //   break;
        // case 'timeline':
        //   // generatedData = await generateTimeline(input); // Placeholder for future
        //   break;
        // case 'plan':
        //   // generatedData = await generateProjectPlan(input); // Placeholder for future
        //   break;
        default:
          toast({ title: "Error", description: "Invalid AI mode selected.", variant: "destructive" });
          setIsAiLoading(false);
          setIsAiModalOpen(false);
          return;
      }

      if (generatedData && generatedData.shapes && generatedData.shapes.length > 0) {
        // Cast Zod-defined shapes to internal DrawingShape type
        // This is a type assertion; ensure ZodDrawingShape is compatible or add a mapping function
        const newShapesFromAI = generatedData.shapes.map(shape => ({
          ...shape,
          style: { ...DEFAULT_STYLE, ...shape.style }, // Ensure all style fields are present
        } as DrawingShape)); // Type assertion

        handleShapesChange([...currentShapes, ...newShapesFromAI]);
        toast({ title: "AI Generation Complete", description: `${currentAiMode.charAt(0).toUpperCase() + currentAiMode.slice(1)} generated successfully.` });
      } else {
        toast({ title: "AI Generation", description: `No shapes were generated for the ${currentAiMode}. Try a different prompt.`, variant: "default" });
      }
    } catch (error: any) {
      console.error(`Error generating ${currentAiMode}:`, error);
      toast({ title: "AI Generation Error", description: `Failed to generate ${currentAiMode}. ${error.message || 'Please try again.'}`, variant: "destructive" });
    } finally {
      setIsAiLoading(false);
      setIsAiModalOpen(false);
    }
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
          onOpenAiModal={handleOpenAiModal} // Pass handler to Toolbar
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

      {/* AI Generation Modal */}
      {isAiModalOpen && currentAiMode && (
        <Dialog open={isAiModalOpen} onOpenChange={(open) => {
          if (!open && isAiLoading) return; // Prevent closing while loading
          setIsAiModalOpen(open);
          if (!open) setCurrentAiMode(null); // Reset mode on close
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate {currentAiMode.charAt(0).toUpperCase() + currentAiMode.slice(1)} with AI</DialogTitle>
              <DialogDescription>
                Enter a prompt to describe the {currentAiMode} you want to create. 
                The AI will attempt to generate shapes on your canvas.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Textarea
                id="ai-prompt"
                placeholder={`E.g., "A simple flowchart for a user login process with 3 steps and decision points"`}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[120px] resize-y"
                disabled={isAiLoading}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAiModalOpen(false)} disabled={isAiLoading}>Cancel</Button>
              <Button onClick={handleSubmitAiPrompt} disabled={isAiLoading || !aiPrompt.trim()}>
                {isAiLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : 'Generate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => void; // Ensure return type is void if func is void
}

