'use client';

import { useRef, useEffect, useState } from 'react';
import { PhotoArea, PosterTextOverlay } from '@/lib/types/template';
import { loadImage, renderPosterToCanvas, drawRoundedRect } from '@/lib/image-processor';

interface InteractiveAdminCanvasProps {
  posterImageUrl: string;
  posterWidth: number;
  posterHeight: number;
  photoArea: PhotoArea;
  onPhotoAreaChange: (newArea: PhotoArea) => void;
  showSamplePreview: boolean;
  sampleImageUrl?: string;
  textOverlays?: PosterTextOverlay[];
  onTextOverlaysChange?: (newOverlays: PosterTextOverlay[]) => void;
  selectedTextId?: string | null;
  onSelectTextId?: (id: string | null) => void;
  disablePhotoArea?: boolean;
}

type DragMode =
  | 'move'
  | 'nw'
  | 'ne'
  | 'se'
  | 'sw'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'text-move'
  | null;

/**
 * Calculates the bounding box of a text overlay in native canvas coordinates
 */
export function computeTextBounds(
  ctx: CanvasRenderingContext2D,
  item: PosterTextOverlay,
  targetWidth: number,
  targetHeight: number,
  padding = 8
) {
  const fontSize = item.fontSize || 54;
  const fontWeight = item.fontWeight || 'bold';
  const fontFamily = item.fontFamily || 'system-ui, -apple-system, sans-serif';
  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(item.text || 'Text');
  const textW = Math.max(metrics.width, 24);
  const textH = fontSize;
  ctx.restore();

  const posX = item.x !== undefined ? item.x : Math.round(targetWidth / 2);
  const posY = item.y !== undefined ? item.y : Math.round(targetHeight * 0.88);
  const align = item.textAlign || 'center';

  let boxLeft: number;
  if (align === 'center') {
    boxLeft = posX - textW / 2;
  } else if (align === 'right') {
    boxLeft = posX - textW;
  } else {
    boxLeft = posX;
  }
  const boxTop = posY - textH / 2;

  return {
    x: boxLeft - padding,
    y: boxTop - padding,
    width: textW + padding * 2,
    height: textH + padding * 2,
    posX,
    posY,
    textW,
    textH,
  };
}

export function InteractiveAdminCanvas({
  posterImageUrl,
  posterWidth,
  posterHeight,
  photoArea,
  onPhotoAreaChange,
  showSamplePreview,
  sampleImageUrl = '/templates/sample-portrait.jpg',
  textOverlays,
  onTextOverlaysChange,
  selectedTextId,
  onSelectTextId,
  disablePhotoArea = false,
}: InteractiveAdminCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterImgRef = useRef<HTMLImageElement | null>(null);
  const sampleImgRef = useRef<HTMLImageElement | null>(null);

  const [posterLoaded, setPosterLoaded] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>('default');

  // Internal selection state if not controlled externally
  const [internalSelectedTextId, setInternalSelectedTextId] = useState<string | null>(null);
  const activeSelectedTextId = selectedTextId !== undefined ? selectedTextId : internalSelectedTextId;

  const setActiveSelectedTextId = (id: string | null) => {
    setInternalSelectedTextId(id);
    onSelectTextId?.(id);
  };

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    initialArea?: PhotoArea;
    initialTextX?: number;
    initialTextY?: number;
    targetTextId?: string;
  } | null>(null);

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

  // Convert screen client coordinates to canvas native coordinates
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

  const getHandleUnderMouse = (mx: number, my: number): DragMode => {
    if (disablePhotoArea) return null;
    const { x, y, width: w, height: h } = photoArea;
    if (w <= 0 || h <= 0) return null;
    const tolerance = 24;

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

  const getTextUnderPoint = (
    mx: number,
    my: number,
    ctx: CanvasRenderingContext2D,
    targetW: number,
    targetH: number
  ): { item: PosterTextOverlay; index: number; id: string } | null => {
    const texts = textOverlays || photoArea.textOverlays || [];
    if (!texts || texts.length === 0) return null;

    // Search in reverse order so top-most item is hit first
    for (let i = texts.length - 1; i >= 0; i--) {
      const item = texts[i];
      if (!item || !item.text) continue;
      const itemId = item.id || `txt-${i}`;
      const bounds = computeTextBounds(ctx, item, targetW, targetH, 14);
      if (
        mx >= bounds.x &&
        mx <= bounds.x + bounds.width &&
        my >= bounds.y &&
        my <= bounds.y + bounds.height
      ) {
        return { item, index: i, id: itemId };
      }
    }
    return null;
  };

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

    const currentTexts = textOverlays || photoArea.textOverlays || [];

    // 1. Draw base poster, sample user photo (if any), and text overlays
    renderPosterToCanvas({
      posterImage: poster,
      userImage: showSamplePreview && sampleImgRef.current ? sampleImgRef.current : null,
      photoArea,
      canvas,
      showPlaceholderGuide: false,
      textOverlays: currentTexts,
    });

    // 2. Draw administrative photoArea overlay bounding box and handles if enabled
    if (!disablePhotoArea && photoArea.width > 0 && photoArea.height > 0) {
      const { x, y, width: w, height: h, borderRadius = 0 } = photoArea;

      ctx.save();
      ctx.fillStyle = showSamplePreview ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.22)';
      ctx.beginPath();
      drawRoundedRect(ctx, x, y, w, h, borderRadius);
      ctx.fill();

      // Dashed border for photoArea
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.stroke();

      // Handles for photoArea
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

      // PhotoArea coordinate label badge
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
    }

    // 3. Draw visual indication (selection border, anchor handles, and coordinate badge) for text overlays
    if (Array.isArray(currentTexts) && currentTexts.length > 0) {
      currentTexts.forEach((item, idx) => {
        if (!item || !item.text || !item.text.trim()) return;
        const itemId = item.id || `txt-${idx}`;
        const isSelected = activeSelectedTextId === itemId;
        const bounds = computeTextBounds(ctx, item, targetW, targetH, isSelected ? 10 : 6);

        if (isSelected) {
          ctx.save();
          // Semi-transparent highlight backdrop
          ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 6);
          } else {
            ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
          }
          ctx.fill();

          // Outer dashed selection outline
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 5]);
          ctx.stroke();

          // Inner solid line for contrast
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.stroke();

          // Selection anchor handles on all 4 corners and 4 edge centers
          const hSize = 10;
          const handles = [
            { x: bounds.x, y: bounds.y }, // NW
            { x: bounds.x + bounds.width / 2, y: bounds.y }, // N
            { x: bounds.x + bounds.width, y: bounds.y }, // NE
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }, // E
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // SE
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }, // S
            { x: bounds.x, y: bounds.y + bounds.height }, // SW
            { x: bounds.x, y: bounds.y + bounds.height / 2 }, // W
          ];

          handles.forEach((pt) => {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(pt.x - hSize / 2, pt.y - hSize / 2, hSize, hSize);
            ctx.fill();
            ctx.stroke();
          });

          // Floating position badge
          const posX = item.x !== undefined ? item.x : Math.round(targetW / 2);
          const posY = item.y !== undefined ? item.y : Math.round(targetH * 0.88);
          const badgeText = `Text: X:${Math.round(posX)}, Y:${Math.round(posY)}`;
          ctx.font = 'bold 15px system-ui, sans-serif';
          const tw = ctx.measureText(badgeText).width;
          const bw = tw + 20;
          const bh = 26;
          const bx = bounds.x + (bounds.width - bw) / 2;
          const by = Math.max(6, bounds.y - 32);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(bx, by, bw, bh, 6);
          } else {
            ctx.rect(bx, by, bw, bh);
          }
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.fillText(badgeText, bx + 10, by + 18);
          ctx.restore();
        } else {
          // Subtle hover indicator / dotted border for unselected text items
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
          ctx.restore();
        }
      });
    }
  }, [
    posterWidth,
    posterHeight,
    photoArea,
    showSamplePreview,
    posterLoaded,
    sampleLoaded,
    textOverlays,
    activeSelectedTextId,
    disablePhotoArea,
  ]);

  const updatePhotoAreaDrag = (curX: number, curY: number) => {
    if (!dragMode || !dragStart || !dragStart.initialArea) return;

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

  // Pointer event handlers (unifies mouse and touch dragging seamlessly)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getPointCoords(e.clientX, e.clientY);
    const targetW = canvas.width;
    const targetH = canvas.height;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    // 1. Check if user clicked a photo resize handle (highest priority for precision resizing)
    if (!disablePhotoArea && photoArea.width > 0 && photoArea.height > 0) {
      const handleMode = getHandleUnderMouse(coords.x, coords.y);
      if (handleMode && handleMode !== 'move') {
        setDragMode(handleMode);
        setDragStart({ x: coords.x, y: coords.y, initialArea: { ...photoArea } });
        return;
      }
    }

    // 2. Check if user clicked on any text overlay
    const textHit = getTextUnderPoint(coords.x, coords.y, ctx, targetW, targetH);
    if (textHit) {
      setActiveSelectedTextId(textHit.id);
      setDragMode('text-move');
      const startX = textHit.item.x !== undefined ? textHit.item.x : Math.round(targetW / 2);
      const startY = textHit.item.y !== undefined ? textHit.item.y : Math.round(targetH * 0.88);
      setDragStart({
        x: coords.x,
        y: coords.y,
        initialTextX: startX,
        initialTextY: startY,
        targetTextId: textHit.id,
      });
      return;
    }

    // 3. Check if user clicked inside photoArea to move the placeholder box
    if (!disablePhotoArea && photoArea.width > 0 && photoArea.height > 0) {
      const handleMode = getHandleUnderMouse(coords.x, coords.y);
      if (handleMode === 'move') {
        setActiveSelectedTextId(null);
        setDragMode('move');
        setDragStart({ x: coords.x, y: coords.y, initialArea: { ...photoArea } });
        return;
      }
    }

    // 4. Clicked on poster background: deselect text overlay
    setActiveSelectedTextId(null);
    setDragMode(null);
    setDragStart(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getPointCoords(e.clientX, e.clientY);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const targetW = canvas.width;
    const targetH = canvas.height;

    // Hover state when not actively dragging
    if (!dragMode || !dragStart) {
      if (!disablePhotoArea && photoArea.width > 0 && photoArea.height > 0) {
        const hoverMode = getHandleUnderMouse(coords.x, coords.y);
        if (hoverMode && hoverMode !== 'move') {
          switch (hoverMode) {
            case 'nw':
            case 'se':
              setCursorStyle('nwse-resize');
              return;
            case 'ne':
            case 'sw':
              setCursorStyle('nesw-resize');
              return;
            case 'n':
            case 's':
              setCursorStyle('ns-resize');
              return;
            case 'e':
            case 'w':
              setCursorStyle('ew-resize');
              return;
          }
        }
      }

      const textHit = getTextUnderPoint(coords.x, coords.y, ctx, targetW, targetH);
      if (textHit) {
        setCursorStyle('grab');
        return;
      }

      if (!disablePhotoArea && photoArea.width > 0 && photoArea.height > 0) {
        const hoverMode = getHandleUnderMouse(coords.x, coords.y);
        if (hoverMode === 'move') {
          setCursorStyle('move');
          return;
        }
      }

      setCursorStyle('default');
      return;
    }

    // Text dragging
    if (dragMode === 'text-move') {
      setCursorStyle('grabbing');
      if (
        dragStart.targetTextId !== undefined &&
        dragStart.initialTextX !== undefined &&
        dragStart.initialTextY !== undefined
      ) {
        const dx = coords.x - dragStart.x;
        const dy = coords.y - dragStart.y;
        let newX = Math.round(dragStart.initialTextX + dx);
        let newY = Math.round(dragStart.initialTextY + dy);

        // Clamp to poster canvas boundaries
        newX = Math.max(0, Math.min(targetW, newX));
        newY = Math.max(0, Math.min(targetH, newY));

        const texts = [...(textOverlays || photoArea.textOverlays || [])];
        const index = texts.findIndex((t, idx) => (t.id || `txt-${idx}`) === dragStart.targetTextId);
        if (index !== -1) {
          texts[index] = {
            ...texts[index],
            x: newX,
            y: newY,
          };
          if (onTextOverlaysChange) {
            onTextOverlaysChange(texts);
          } else {
            onPhotoAreaChange({
              ...photoArea,
              textOverlays: texts,
            });
          }
        }
      }
      return;
    }

    // PhotoArea drag or resize
    setCursorStyle('move');
    updatePhotoAreaDrag(coords.x, coords.y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if pointer capture release fails
    }
    setDragMode(null);
    setDragStart(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-[#0D0D0D] border border-[#262626] flex items-center justify-center p-2"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="max-w-full h-auto object-contain block select-none rounded-xl"
        style={{
          maxHeight: '720px',
          cursor: cursorStyle,
          touchAction: 'none',
        }}
      />
    </div>
  );
}
