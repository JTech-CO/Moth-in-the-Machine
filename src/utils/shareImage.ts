import type { ResultPresentation } from '@/utils/resultPresentation';

export const SHARE_IMAGE_SIZE = 1080;

const FONT_FAMILY = '"Courier Prime", "Courier New", monospace';
const DEFAULT_FONT_TIMEOUT_MS = 900;

type ShareCanvas = HTMLCanvasElement | OffscreenCanvas;
type ShareContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface ShareImageDependencies {
  readonly createOffscreenCanvas?: (width: number, height: number) => OffscreenCanvas | null;
  readonly createHtmlCanvas?: (width: number, height: number) => HTMLCanvasElement | null;
  readonly loadFont?: (font: string, sample: string) => Promise<unknown>;
  readonly fontTimeoutMs?: number;
  readonly scheduleTimeout?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  readonly cancelTimeout?: (timeout: ReturnType<typeof setTimeout>) => void;
}

export class ShareImageError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ShareImageError';
  }
}

function defaultOffscreenCanvas(width: number, height: number): OffscreenCanvas | null {
  if (typeof OffscreenCanvas === 'undefined') {
    return null;
  }

  return new OffscreenCanvas(width, height);
}

function defaultHtmlCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function defaultFontLoader(font: string, sample: string): Promise<unknown> {
  if (typeof document === 'undefined' || document.fonts === undefined) {
    return Promise.resolve();
  }

  return document.fonts.load(font, sample);
}

async function waitForFont(dependencies: ShareImageDependencies): Promise<void> {
  const loadFont = dependencies.loadFont ?? defaultFontLoader;
  const schedule = dependencies.scheduleTimeout ?? globalThis.setTimeout;
  const cancel = dependencies.cancelTimeout ?? globalThis.clearTimeout;
  const timeoutMs = Math.max(0, dependencies.fontTimeoutMs ?? DEFAULT_FONT_TIMEOUT_MS);

  await new Promise<void>((resolve) => {
    let settled = false;
    const timeoutState: { value?: ReturnType<typeof setTimeout> } = {};
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutState.value !== undefined) {
        cancel(timeoutState.value);
      }
      resolve();
    };
    timeoutState.value = schedule(finish, timeoutMs);

    Promise.resolve()
      .then(() => loadFont(`700 48px ${FONT_FAMILY}`, 'MOTH IN THE MACHINE'))
      .then(finish, finish);
  });
}

function createOffscreenCanvas(dependencies: ShareImageDependencies): OffscreenCanvas | null {
  const createOffscreen = dependencies.createOffscreenCanvas ?? defaultOffscreenCanvas;

  try {
    return createOffscreen(SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE);
  } catch {
    // Some browsers expose OffscreenCanvas while rejecting construction. Use the DOM fallback.
    return null;
  }
}

function createHtmlCanvas(dependencies: ShareImageDependencies): HTMLCanvasElement | null {
  const createHtml = dependencies.createHtmlCanvas ?? defaultHtmlCanvas;
  let canvas: HTMLCanvasElement | null;

  try {
    canvas = createHtml(SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE);
  } catch (error) {
    throw new ShareImageError('This browser cannot create a canvas for the share image.', {
      cause: error,
    });
  }

  if (canvas !== null) {
    canvas.width = SHARE_IMAGE_SIZE;
    canvas.height = SHARE_IMAGE_SIZE;
  }

  return canvas;
}

function drawBackground(context: ShareContext): void {
  const paper = context.createLinearGradient(0, 0, SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE);
  paper.addColorStop(0, '#f3e8c8');
  paper.addColorStop(0.48, '#dfc991');
  paper.addColorStop(1, '#b99658');
  context.fillStyle = paper;
  context.fillRect(0, 0, SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE);

  const age = context.createRadialGradient(540, 470, 120, 540, 540, 760);
  age.addColorStop(0, 'rgba(255, 250, 225, 0.28)');
  age.addColorStop(0.7, 'rgba(83, 52, 18, 0.08)');
  age.addColorStop(1, 'rgba(37, 22, 8, 0.34)');
  context.fillStyle = age;
  context.fillRect(0, 0, SHARE_IMAGE_SIZE, SHARE_IMAGE_SIZE);

  context.strokeStyle = 'rgba(62, 39, 13, 0.62)';
  context.lineWidth = 5;
  context.strokeRect(34, 34, 1012, 1012);
  context.strokeStyle = 'rgba(62, 39, 13, 0.24)';
  context.lineWidth = 2;
  context.strokeRect(48, 48, 984, 984);
}

function drawTape(context: ShareContext): void {
  context.save();
  context.translate(540, 490);
  context.rotate(-0.075);
  context.fillStyle = 'rgba(217, 178, 89, 0.54)';
  context.fillRect(-285, -105, 570, 210);
  context.strokeStyle = 'rgba(92, 62, 21, 0.38)';
  context.lineWidth = 3;
  context.strokeRect(-285, -105, 570, 210);

  context.strokeStyle = 'rgba(110, 75, 27, 0.2)';
  context.lineWidth = 2;
  for (let x = -260; x <= 260; x += 52) {
    context.beginPath();
    context.moveTo(x, -98);
    context.lineTo(x + 22, 98);
    context.stroke();
  }
  context.restore();
}

function drawMothSilhouette(context: ShareContext): void {
  context.save();
  context.translate(540, 490);
  context.rotate(0.04);
  context.fillStyle = '#24180d';
  context.strokeStyle = '#24180d';
  context.lineWidth = 10;
  context.lineCap = 'round';

  context.beginPath();
  context.moveTo(-18, -22);
  context.bezierCurveTo(-98, -134, -252, -142, -224, -18);
  context.bezierCurveTo(-205, 72, -98, 86, -18, 35);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(18, -22);
  context.bezierCurveTo(98, -134, 252, -142, 224, -18);
  context.bezierCurveTo(205, 72, 98, 86, 18, 35);
  context.closePath();
  context.fill();

  context.beginPath();
  context.ellipse(0, 12, 29, 103, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(0, -90, 34, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.moveTo(-12, -111);
  context.bezierCurveTo(-38, -165, -82, -168, -102, -142);
  context.moveTo(12, -111);
  context.bezierCurveTo(38, -165, 82, -168, 102, -142);
  context.stroke();
  context.restore();
}

function drawHeader(context: ShareContext, presentation: ResultPresentation): void {
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.fillStyle = '#251a0e';
  context.font = `700 66px ${FONT_FAMILY}`;
  context.fillText('MOTH IN THE MACHINE', 540, 132);
  context.font = `400 25px ${FONT_FAMILY}`;
  context.fillText('HARVARD COMPUTATION LABORATORY · MARK II · 1947', 540, 190);

  context.fillStyle = '#6e4514';
  context.font = `700 30px ${FONT_FAMILY}`;
  context.fillText(`${presentation.statusLabel} · ${presentation.stageCode}`, 540, 246);
  context.fillStyle = '#251a0e';
  context.font = `700 38px ${FONT_FAMILY}`;
  context.fillText(presentation.stageName.toUpperCase(), 540, 292);
}

function drawResultMetrics(context: ShareContext, presentation: ResultPresentation): void {
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.fillStyle = '#8a5d14';
  context.font = `700 112px ${FONT_FAMILY}`;
  const stars = `${'★'.repeat(presentation.stars)}${'☆'.repeat(3 - presentation.stars)}`;
  context.fillText(stars, 540, 700);

  context.fillStyle = '#251a0e';
  context.font = `700 34px ${FONT_FAMILY}`;
  context.fillText(`TIME  ${presentation.timeLabel}`, 540, 790);
  context.fillText(`HEALTH  ${presentation.healthLabel}`, 540, 842);
}

function drawFooter(context: ShareContext): void {
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(67, 42, 14, 0.5)';
  context.beginPath();
  context.moveTo(240, 892);
  context.lineTo(840, 892);
  context.stroke();

  context.fillStyle = '#5f3e18';
  context.font = `700 28px ${FONT_FAMILY}`;
  context.fillText('#MothInTheMachine  #FirstComputerBug', 540, 944);
  context.font = `400 20px ${FONT_FAMILY}`;
  context.fillText('A FLIGHT RECORDED IN THE MACHINE LOGBOOK', 540, 992);
}

export function drawShareImage(context: ShareContext, presentation: ResultPresentation): void {
  context.save();
  try {
    drawBackground(context);
    drawHeader(context, presentation);
    drawTape(context);
    drawMothSilhouette(context);
    drawResultMetrics(context, presentation);
    drawFooter(context);
  } finally {
    context.restore();
  }
}

async function canvasToPngBlob(canvas: ShareCanvas): Promise<Blob> {
  if ('convertToBlob' in canvas && typeof canvas.convertToBlob === 'function') {
    try {
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      if (blob === null) {
        throw new ShareImageError('The share image encoder returned no PNG data.');
      }
      return blob;
    } catch (error) {
      if (error instanceof ShareImageError) {
        throw error;
      }
      throw new ShareImageError('The share image could not be encoded as PNG.', { cause: error });
    }
  }

  if (!('toBlob' in canvas) || typeof canvas.toBlob !== 'function') {
    throw new ShareImageError('This canvas cannot encode PNG images.');
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new ShareImageError('The share image encoder returned no PNG data.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

async function renderAndEncode(
  canvas: ShareCanvas,
  presentation: ResultPresentation,
): Promise<Blob> {
  const context = canvas.getContext('2d');

  if (context === null) {
    throw new ShareImageError('The share image canvas has no 2D rendering context.');
  }

  drawShareImage(context, presentation);
  return canvasToPngBlob(canvas);
}

export async function generateShareImage(
  presentation: ResultPresentation,
  dependencies: ShareImageDependencies = {},
): Promise<Blob> {
  await waitForFont(dependencies);
  const offscreen = createOffscreenCanvas(dependencies);
  let offscreenFailure: unknown;

  if (offscreen !== null) {
    try {
      return await renderAndEncode(offscreen, presentation);
    } catch (error) {
      offscreenFailure = error;
    }
  }

  const htmlCanvas = createHtmlCanvas(dependencies);
  if (htmlCanvas !== null) {
    return renderAndEncode(htmlCanvas, presentation);
  }

  if (offscreenFailure instanceof Error) {
    throw offscreenFailure;
  }

  throw new ShareImageError('This browser cannot create a canvas for the share image.');
}
