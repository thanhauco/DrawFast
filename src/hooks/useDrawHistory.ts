
import type { DrawingShape } from '@/types/draw';
import { useState, useCallback } from 'react';

const MAX_HISTORY_LENGTH = 50; // Limit history size

export interface DrawHistoryReturn {
  currentShapes: DrawingShape[];
  setCurrentShapes: (shapes: DrawingShape[] | ((prevShapes: DrawingShape[]) => DrawingShape[])) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  recordHistory: (shapes: DrawingShape[]) => void;
}

export function useDrawHistory(initialShapes: DrawingShape[] = []): DrawHistoryReturn {
  const [history, setHistory] = useState<DrawingShape[][]>([initialShapes]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const currentShapes = history[currentIndex];

  const recordHistory = useCallback((shapes: DrawingShape[]) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(shapes);
    if (newHistory.length > MAX_HISTORY_LENGTH) {
      newHistory.shift(); // Remove oldest entry if history is too long
    }
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex]);

  const setCurrentShapes = useCallback((shapesUpdater: DrawingShape[] | ((prevShapes: DrawingShape[]) => DrawingShape[])) => {
    const newShapes = typeof shapesUpdater === 'function' ? shapesUpdater(currentShapes) : shapesUpdater;
    recordHistory(newShapes);
  }, [currentShapes, recordHistory]);
  

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prevIndex) => prevIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return { currentShapes, setCurrentShapes, undo, redo, canUndo, canRedo, recordHistory };
}
