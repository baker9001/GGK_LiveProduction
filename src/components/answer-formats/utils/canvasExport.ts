/**
 * Utility functions for exporting canvas drawings
 */

/**
 * Export canvas to PNG data URL
 */
export function canvasToPNG(canvas: HTMLCanvasElement, quality: number = 0.9): string {
  return canvas.toDataURL('image/png', quality);
}

/**
 * Export canvas to JPEG data URL
 */
export function canvasToJPEG(canvas: HTMLCanvasElement, quality: number = 0.85): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Export canvas to Blob
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Export canvas to SVG string (for Fabric.js canvases)
 */
export function fabricCanvasToSVG(fabricCanvas: any): string {
  if (fabricCanvas && typeof fabricCanvas.toSVG === 'function') {
    return fabricCanvas.toSVG();
  }
  return '';
}

/**
 * Export Fabric.js canvas to JSON
 */
export function fabricCanvasToJSON(fabricCanvas: any): string {
  if (fabricCanvas && typeof fabricCanvas.toJSON === 'function') {
    return JSON.stringify(fabricCanvas.toJSON());
  }
  return '';
}

/**
 * Load Fabric.js canvas from JSON
 */
export function loadFabricCanvasFromJSON(fabricCanvas: any, json: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fabricCanvas || typeof fabricCanvas.loadFromJSON !== 'function') {
      reject(new Error('Invalid Fabric canvas'));
      return;
    }

    try {
      const data = JSON.parse(json);
      fabricCanvas.loadFromJSON(data, () => {
        fabricCanvas.renderAll();
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download canvas as file
 */
export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL();
  link.click();
}

/**
 * Create a thumbnail from canvas
 */
export async function createThumbnail(
  canvas: HTMLCanvasElement,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> {
  const thumbnailCanvas = document.createElement('canvas');
  const ctx = thumbnailCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  let { width, height } = canvas;

  // Calculate thumbnail dimensions
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  width = width * ratio;
  height = height * ratio;

  thumbnailCanvas.width = width;
  thumbnailCanvas.height = height;

  ctx.drawImage(canvas, 0, 0, width, height);

  return thumbnailCanvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Merge multiple canvases into one
 */
export function mergeCanvases(canvases: HTMLCanvasElement[]): HTMLCanvasElement {
  if (canvases.length === 0) {
    throw new Error('No canvases to merge');
  }

  if (canvases.length === 1) {
    return canvases[0];
  }

  // Find maximum dimensions
  const maxWidth = Math.max(...canvases.map(c => c.width));
  const maxHeight = Math.max(...canvases.map(c => c.height));

  const mergedCanvas = document.createElement('canvas');
  mergedCanvas.width = maxWidth;
  mergedCanvas.height = maxHeight;

  const ctx = mergedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw all canvases onto the merged canvas
  canvases.forEach(canvas => {
    ctx.drawImage(canvas, 0, 0);
  });

  return mergedCanvas;
}

/**
 * Clear canvas
 */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Fill canvas with background color
 */
export function fillCanvasBackground(
  canvas: HTMLCanvasElement,
  color: string = '#ffffff'
): void {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Export Fabric.js canvas to image (data URL)
 * Used by DiagramCanvas component
 */
export async function exportCanvasToImage(
  fabricCanvas: any,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.9
): Promise<string> {
  if (!fabricCanvas) {
    throw new Error('Invalid Fabric canvas');
  }

  // Fabric.js has built-in toDataURL method
  return fabricCanvas.toDataURL({
    format: format === 'png' ? 'png' : 'jpeg',
    quality,
    multiplier: 1
  });
}

/**
 * Export Fabric.js canvas to JSON string
 * Used by DiagramCanvas component
 */
export function exportCanvasToJSON(fabricCanvas: any): string {
  if (!fabricCanvas || typeof fabricCanvas.toJSON !== 'function') {
    throw new Error('Invalid Fabric canvas');
  }

  return JSON.stringify(fabricCanvas.toJSON());
}
