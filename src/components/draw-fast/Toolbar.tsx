
"use client";

import * as React from 'react'; // Added React import
import type { ShapeTool, ShapeStyle } from '@/types/draw';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Square,
  Circle,
  Minus,
  Type,
  Undo,
  Redo,
  Download,
  Upload,
  Trash2,
  Palette,
  Settings2,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Eraser
} from 'lucide-react';
import { ArrowToolIcon } from './icons/ArrowToolIcon';

interface ToolbarProps {
  selectedTool: ShapeTool;
  onToolChange: (tool: ShapeTool) => void;
  currentStyle: ShapeStyle;
  onStyleChange: (style: Partial<ShapeStyle>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportSVG: () => void;
  onExportJSON: () => void;
  onImportJSON: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearCanvas: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function Toolbar({
  selectedTool,
  onToolChange,
  currentStyle,
  onStyleChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportSVG,
  onExportJSON,
  onImportJSON,
  onClearCanvas,
  onZoomIn,
  onZoomOut,
}: ToolbarProps) {
  const importJsonInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importJsonInputRef.current?.click();
  };
  
  const commonShapeTools: ShapeTool[] = ['rectangle', 'circle', 'line', 'arrow', 'text'];
  const isShapeToolActive = commonShapeTools.includes(selectedTool);

  return (
    <div className="p-3 bg-card shadow-md flex flex-col md:flex-row md:items-center gap-4 w-full border-b">
      <div className="flex items-center gap-2 flex-wrap">
        <ToggleGroup
          type="single"
          value={selectedTool}
          onValueChange={(value) => {
            if (value) onToolChange(value as ShapeTool);
          }}
          aria-label="Drawing Tools"
        >
          <ToggleGroupItem value="select" aria-label="Select Tool">
            <MousePointer2 className="h-5 w-5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="rectangle" aria-label="Rectangle Tool">
            <Square className="h-5 w-5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="circle" aria-label="Circle Tool">
            <Circle className="h-5 w-5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="line" aria-label="Line Tool">
            <Minus className="h-5 w-5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="arrow" aria-label="Arrow Tool">
            <ArrowToolIcon className="h-5 w-5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="text" aria-label="Text Tool">
            <Type className="h-5 w-5" />
          </ToggleGroupItem>
           <ToggleGroupItem value="eraser" aria-label="Eraser Tool">
            <Eraser className="h-5 w-5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="h-8 hidden md:block" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Styling Options">
              <Palette className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 space-y-4">
            <div>
              <Label htmlFor="strokeColor" className="text-sm">Stroke Color</Label>
              <Input
                id="strokeColor"
                type="color"
                value={currentStyle.strokeColor}
                onChange={(e) => onStyleChange({ strokeColor: e.target.value })}
                className="h-8 mt-1"
                disabled={selectedTool === 'eraser'}
              />
            </div>
            <div>
              <Label htmlFor="fillColor" className="text-sm">Fill Color</Label>
              <Input
                id="fillColor"
                type="color"
                value={currentStyle.fillColor}
                onChange={(e) => onStyleChange({ fillColor: e.target.value })}
                className="h-8 mt-1"
                disabled={!isShapeToolActive || selectedTool === 'line' || selectedTool === 'arrow' || selectedTool === 'eraser'}
              />
            </div>
            <div>
              <Label htmlFor="strokeWidth" className="text-sm">Stroke Width</Label>
              <Input
                id="strokeWidth"
                type="number"
                min="1"
                max="50"
                value={currentStyle.strokeWidth}
                onChange={(e) => onStyleChange({ strokeWidth: parseInt(e.target.value, 10) || 1 })}
                className="h-8 mt-1"
                disabled={selectedTool === 'eraser'}
              />
            </div>
            {selectedTool === 'text' && (
              <div>
                <Label htmlFor="fontSize" className="text-sm">Font Size</Label>
                <Input
                  id="fontSize"
                  type="number"
                  min="8"
                  max="128"
                  value={currentStyle.fontSize}
                  onChange={(e) => onStyleChange({ fontSize: parseInt(e.target.value, 10) || 16 })}
                  className="h-8 mt-1"
                />
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <Separator orientation="vertical" className="h-8 hidden md:block" />

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Undo className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
          <Redo className="h-5 w-5" />
        </Button>
      </div>
      
      <Separator orientation="vertical" className="h-8 hidden md:block" />

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" onClick={onZoomIn} aria-label="Zoom In">
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomOut} aria-label="Zoom Out">
          <ZoomOut className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-grow hidden md:block"></div> {/* Spacer */}

      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2" aria-label="File Operations">
              <Settings2 className="h-5 w-5" />
              <span className="hidden sm:inline">File</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={onExportSVG}>
              <Download className="h-4 w-4" /> Export SVG
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={onExportJSON}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleImportClick}>
              <Upload className="h-4 w-4" /> Import JSON
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={onImportJSON}
              ref={importJsonInputRef}
              className="hidden"
            />
             <Separator className="my-1" />
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={onClearCanvas}>
              <Trash2 className="h-4 w-4" /> Clear Canvas
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
