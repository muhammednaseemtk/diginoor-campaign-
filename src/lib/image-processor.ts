import { PhotoArea } from '@/lib/types/template';

export interface RenderOptions {
  posterImage: HTMLImageElement;
  userImage?: HTMLImageElement | null;
  photoArea: PhotoArea;
  canvas: HTMLCanvasElement;
  showPlaceholderGuide?: boolean;
}

/**
 * Loads an image from a URL or Data URL with cross-origin support
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image from ${src}: ${err}`));
    img.src = src;
  });
}

/**
 * Cross-browser rounded rectangle drawing for Canvas 2D
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 0
): void {
  const r = Math.max(0, Math.min(radius || 0, Math.abs(width) / 2, Math.abs(height) / 2));
  if (r === 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
}

/**
 * Calculates high-quality "object-fit: cover" coordinates that preserve the person's face/upper body
 * without stretching, distortion, or aspect ratio changes.
 */
export function calculateCoverFit(
  userWidth: number,
  userHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const scale = Math.max(targetWidth / userWidth, targetHeight / userHeight);
  const renderWidth = userWidth * scale;
  const renderHeight = userHeight * scale;

  // Center horizontally
  const offsetX = (targetWidth - renderWidth) / 2;

  // For portrait / people photos, head & eyes are generally in the top 25%-35% of the frame.
  // When cropping excess height, bias slightly toward the top (30% instead of 50%) to avoid cutting off hair/head.
  let offsetY = 0;
  if (renderHeight > targetHeight) {
    const excessHeight = renderHeight - targetHeight;
    offsetY = Math.max(-excessHeight, Math.min(0, -excessHeight * 0.3));
  } else {
    offsetY = (targetHeight - renderHeight) / 2;
  }

  return {
    renderWidth,
    renderHeight,
    offsetX,
    offsetY,
  };
}

/**
 * Renders the composite poster (Poster + User Photo inside Photo Area) onto a canvas
 */
export function renderPosterToCanvas({
  posterImage,
  userImage,
  photoArea,
  canvas,
  showPlaceholderGuide = false,
}: RenderOptions): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) return;

  const targetWidth = posterImage.naturalWidth || posterImage.width || 1080;
  const targetHeight = posterImage.naturalHeight || posterImage.height || 1350;

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const {
    x = 0,
    y = 0,
    width: pw = targetWidth,
    height: ph = targetHeight,
    borderRadius = 0,
    layer = 'inside',
  } = photoArea;

  const drawUserPhoto = () => {
    if (!userImage) return;
    const uw = userImage.naturalWidth || userImage.width;
    const uh = userImage.naturalHeight || userImage.height;

    const { renderWidth, renderHeight, offsetX, offsetY } = calculateCoverFit(uw, uh, pw, ph);

    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, pw, ph, borderRadius);
    ctx.clip();

    ctx.drawImage(userImage, x + offsetX, y + offsetY, renderWidth, renderHeight);
    ctx.restore();
  };

  const drawPosterImage = () => {
    ctx.drawImage(posterImage, 0, 0, targetWidth, targetHeight);
  };

  if (layer === 'behind') {
    // Mode for posters with transparent cutout windows: photo is drawn behind, poster on top
    if (userImage) {
      drawUserPhoto();
    }
    drawPosterImage();
  } else {
    // Standard mode: poster drawn first, then user photo clipped into designated photoArea
    drawPosterImage();
    if (userImage) {
      drawUserPhoto();
    }
  }

  // If no user photo yet and placeholder guide requested, show an interactive indicator
  if (!userImage && showPlaceholderGuide) {
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, pw, ph, borderRadius);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Creates a high-resolution export Data URL directly from poster & user photo sources
 */
export async function generateExportDataUrl(
  posterUrl: string,
  userPhotoUrl: string,
  photoArea: PhotoArea,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.98
): Promise<string> {
  const [posterImg, userImg] = await Promise.all([
    loadImage(posterUrl),
    loadImage(userPhotoUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = posterImg.naturalWidth || posterImg.width || 1080;
  canvas.height = posterImg.naturalHeight || posterImg.height || 1350;

  renderPosterToCanvas({
    posterImage: posterImg,
    userImage: userImg,
    photoArea,
    canvas,
    showPlaceholderGuide: false,
  });

  return canvas.toDataURL(format, quality);
}

/**
 * Programmatically triggers file download in browser
 */
export function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
