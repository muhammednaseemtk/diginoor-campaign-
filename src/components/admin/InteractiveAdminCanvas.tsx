'use client';

import { useRef, useEffect, useState } from 'react';
import { PhotoArea } from '@/lib/types/template';
import { loadImage, renderPosterToCanvas, drawRoundedRect } from '@/lib/image-processor';

interface InteractiveAdminCanvasProps {
  posterImageUrl: string;
  posterWidth: number;
  posterHeight: number;
  photoArea: PhotoArea;
  onPhotoAreaChange: (newArea: PhotoArea) => void;
  showSamplePreview: boolean;
  sampleImageUrl?: string;
}

type DragMode = 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | null;

export function InteractiveAdminCanvas({
  posterImageUrl,
  posterWidth,
  posterHeight,
  photoArea,
  onPhotoAreaChange,
  showSamplePreview,
  sampleImageUrl = '/templates/sample-portrait.jpg',
}: InteractiveAdminCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterImgRef = useRef<HTMLImageElement | null>(null);
  const sampleImgRef = useRef<HTMLImageElement | null>(null);

  const [posterLoaded, setPosterLoaded] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>('crosshair');

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initialArea: PhotoArea } | null>(null);

  // Load poster image
  useEffect(() => {
    let isCancelled = false;
    loadImage(posterImageUrl)
      .then((img) => {
        if (!isCancelled) {
          posterImgRef.current = img;
          setPosterLoaded(true);
        }
      })
      .catch((err) => console.error('Failed to load poster image:', err));

    return () => {
      isCancelled = true;
    };
  }, [posterImageUrl]);

  // Load sample image
  useEffect(() => {
    let isCancelled = false;
    if (sampleImageUrl) {
      loadImage(sampleImageUrl)
        .then((img) => {
          if (!isCancelled) {
            sampleImgRef.current = img;
            setSampleLoaded(true);
          }
        })
        .catch((err) => console.error('Failed to load sample image:', err));
    }
    return () => {
      isCancelled = true;
    };
  }, [sampleImageUrl]);

  // Redraw whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    const poster = posterImgRef.current;
    if (!canvas || !poster) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = posterWidth || poster.naturalWidth || 1080;
    const targetH = posterHeight || poster.naturalHeight || 1350;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    if (showSamplePreview && sampleImgRef.current) {
      renderPosterToCanvas({
        posterImage: poster,
        userImage: sampleImgRef.current,
        photoArea,
        canvas,
        showPlaceholderGuide: false,
      });
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(poster, 0, 0, targetW, targetH);
    }

    // Always draw administrative overlay bounding box and handles
    const { x, y, width: w, height: h, borderRadius = 0 } = photoArea;

    ctx.save();
    // Semi-transparent blue fill
    ctx.fillStyle = showSamplePreview ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.25)';
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, w, h, borderRadius);
    ctx.fill();

    // Vibrant border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.stroke();

    // Draw handles
    const handleSize = 14;
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.5;

    const handles = [
      { x: x, y: y }, // NW
      { x: x + w / 2, y: y }, // N
      { x: x + w, y: y }, // NE
      { x: x + w, y: y + h / 2 }, // E
      { x: x + w, y: y + h }, // SE
      { x: x + w / 2, y: y + h }, // S
      { x: x, y: y + h }, // SW
      { x: x, y: y + h / 2 }, // W
    ];

    handles.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Center Coordinate Label Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    const label = `${Math.round(w)} × ${Math.round(h)} px  (X:${Math.round(x)}, Y:${Math.round(y)})`;
    ctx.font = 'bold 20px system-ui, sans-serif';
    const textWidth = ctx.measureText(label).width;
    const badgeX = x + (w - textWidth - 24) / 2;
    const badgeY = y + h / 2 - 16;

    if (w > textWidth + 30 && h > 50) {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, textWidth + 24, 34, 8);
      } else {
        ctx.rect(badgeX, badgeY, textWidth + 24, 34);
      }
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, badgeX + 12, badgeY + 24);
    }

    ctx.restore();
  }, [posterWidth, posterHeight, photoArea, showSamplePreview, posterLoaded, sampleLoaded]);

  // Convert screen coordinates to canvas native coordinates
  const getPointCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    return getPointCoords(e.clientX, e.clientY);
  };

  const getHandleUnderMouse = (mx: number, my: number): DragMode => {
    const { x, y, width: w, height: h } = photoArea;
    const tolerance = 24; // slightly larger hit area for comfortable touch on mobile

    if (Math.hypot(mx - x, my - y) < tolerance) return 'nw';
    if (Math.hypot(mx - (x + w), my - y) < tolerance) return 'ne';
    if (Math.hypot(mx - (x + w), my - (y + h)) < tolerance) return 'se';
    if (Math.hypot(mx - x, my - (y + h)) < tolerance) return 'sw';

    if (Math.abs(my - y) < tolerance && mx >= x && mx <= x + w) return 'n';
    if (Math.abs(my - (y + h)) < tolerance && mx >= x && mx <= x + w) return 's';
    if (Math.abs(mx - x) < tolerance && my >= y && my <= y + h) return 'w';
    if (Math.abs(mx - (x + w)) < tolerance && my >= y && my <= y + h) return 'e';

    if (mx >= x && mx <= x + w && my >= y && my <= y + h) return 'move';

    return null;
  };

  const updateDrag = (curX: number, curY: number) => {
    if (!dragMode || !dragStart) return;

    const dx = curX - dragStart.x;
    const dy = curY - dragStart.y;
    const initial = dragStart.initialArea;

    let newX = initial.x;
    let newY = initial.y;
    let newW = initial.width;
    let newH = initial.height;

    const minSize = 40;
    const maxW = posterWidth;
    const maxH = posterHeight;

    if (dragMode === 'move') {
      newX = Math.max(0, Math.min(maxW - initial.width, initial.x + dx));
      newY = Math.max(0, Math.min(maxH - initial.height, initial.y + dy));
    } else {
      if (dragMode.includes('w')) {
        const potentialW = initial.width - dx;
        if (potentialW >= minSize) {
          newX = Math.max(0, initial.x + dx);
          newW = initial.width + (initial.x - newX);
        }
      }
      if (dragMode.includes('e')) {
        newW = Math.max(minSize, Math.min(maxW - initial.x, initial.width + dx));
      }
      if (dragMode.includes('n')) {
        const potentialH = initial.height - dy;
        if (potentialH >= minSize) {
          newY = Math.max(0, initial.y + dy);
          newH = initial.height + (initial.y - newY);
        }
      }
      if (dragMode.includes('s')) {
        newH = Math.max(minSize, Math.min(maxH - initial.y, initial.height + dy));
      }
    }

    onPhotoAreaChange({
      ...photoArea,
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const mode = getHandleUnderMouse(coords.x, coords.y);
    if (mode) {
      setDragMode(mode);
      setDragStart({ x: coords.x, y: coords.y, initialArea: { ...photoArea } });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (!dragMode || !dragStart) {
      const hoverMode = getHandleUnderMouse(coords.x, coords.y);
      switch (hoverMode) {
        case 'nw':
        case 'se':
          setCursorStyle('nwse-resize');
          break;
        case 'ne':
        case 'sw':
          setCursorStyle('nesw-resize');
          break;
        case 'n':
        case 's':
          setCursorStyle('ns-resize');
          break;
        case 'e':
        case 'w':
          setCursorStyle('ew-resize');
          break;
        case 'move':
          setCursorStyle('move');
          break;
        default:
          setCursorStyle('crosshair');
      }
      return;
    }

    updateDrag(coords.x, coords.y);
  };

  const handleMouseUp = () => {
    setDragMode(null);
    setDragStart(null);
  };

  // Touch Support for mobile and tablet touchscreens
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const coords = getPointCoords(touch.clientX, touch.clientY);
    const mode = getHandleUnderMouse(coords.x, coords.y);
    if (mode) {
      setDragMode(mode);
      setDragStart({ x: coords.x, y: coords.y, initialArea: { ...photoArea } });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragMode || !dragStart || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const coords = getPointCoords(touch.clientX, touch.clientY);
    updateDrag(coords.x, coords.y);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-[#0D0D0D] border border-[#262626] flex items-center justify-center p-2"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseUp}
        className="max-w-full h-auto object-contain block select-none rounded-xl"
        style={{ maxHeight: '720px', cursor: cursorStyle, touchAction: 'none' }}
      />
    </div>
  );
}
