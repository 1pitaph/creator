export const VIEWBOX_SIZE = 24;
export const GRID_SIZE = 18;
export const PIXEL_SIZE = VIEWBOX_SIZE / GRID_SIZE;
export const COVERAGE_THRESHOLD = 0.28;
export const SAMPLE_COUNT = 3;
export const TIKTOK_PATH =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

type LogoOffset = {
  x: number;
  y: number;
};

export type Pixel = {
  color: string;
  driftX: number;
  driftY: number;
  id: string;
  opacity: number;
  rotation: number;
  scale: number;
  x: number;
  y: number;
};

export type LogoSampler = (x: number, y: number) => boolean;

type GenerateLogoPixelsOptions = {
  coverageThreshold?: number;
  gridSize?: number;
  sampleCount?: number;
  sampler?: LogoSampler | null;
};

export const logoLayerOffsets: LogoOffset[] = [
  { x: 0, y: 0 },
  { x: -0.35, y: 0.25 },
  { x: 0.35, y: -0.2 }
];

const fallbackMaskRows = [
  ".........111......",
  ".........1111.....",
  ".........11111....",
  ".........11111111.",
  ".........111111111",
  ".........111111111",
  ".........11111111.",
  ".........111111...",
  ".......1111111....",
  ".....111111111....",
  "....1111111111....",
  "....111111111.....",
  "....111...111.....",
  "....11.....11.....",
  "....11.....111....",
  ".....11111111.....",
  "......111111......",
  ".......1111......."
];

const pickPixelColor = (row: number, column: number, index: number) => {
  if ((row + column * 2) % 11 === 0) {
    return "#25f4ee";
  }

  if ((row * 2 + column) % 13 === 0) {
    return "#fe2c55";
  }

  if ((row + column + index) % 4 === 0) {
    return "#18181b";
  }

  return "#71717a";
};

const createFallbackLogoSampler = (gridSize: number): LogoSampler => {
  const sourceGridSize = fallbackMaskRows.length;

  return (x, y) => {
    const row = Math.floor((y / VIEWBOX_SIZE) * sourceGridSize);
    const column = Math.floor((x / VIEWBOX_SIZE) * sourceGridSize);

    if (row < 0 || row >= sourceGridSize || column < 0 || column >= sourceGridSize) {
      return false;
    }

    return fallbackMaskRows[row]?.[column] === "1" && gridSize > 0;
  };
};

export const createCompositeTikTokSampler = (pointInBasePath: LogoSampler): LogoSampler => {
  return (x, y) => logoLayerOffsets.some((offset) => pointInBasePath(x - offset.x, y - offset.y));
};

export const createRuntimeTikTokSampler = (): LogoSampler | null => {
  if (typeof document === "undefined" || typeof Path2D !== "function") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context || typeof context.isPointInPath !== "function") {
    return null;
  }

  try {
    const path = new Path2D(TIKTOK_PATH);

    return createCompositeTikTokSampler((x, y) => context.isPointInPath(path, x, y));
  } catch {
    return null;
  }
};

export const getCellCoverage = ({
  column,
  gridSize = GRID_SIZE,
  row,
  sampleCount = SAMPLE_COUNT,
  sampler
}: {
  column: number;
  gridSize?: number;
  row: number;
  sampleCount?: number;
  sampler: LogoSampler;
}) => {
  const pixelSize = VIEWBOX_SIZE / gridSize;
  const x = column * pixelSize;
  const y = row * pixelSize;
  const centerX = x + pixelSize / 2;
  const centerY = y + pixelSize / 2;
  let hits = 0;

  for (let rowSample = 1; rowSample <= sampleCount; rowSample += 1) {
    for (let columnSample = 1; columnSample <= sampleCount; columnSample += 1) {
      const sampleX = x + (pixelSize * columnSample) / (sampleCount + 1);
      const sampleY = y + (pixelSize * rowSample) / (sampleCount + 1);

      if (sampler(sampleX, sampleY)) {
        hits += 1;
      }
    }
  }

  return {
    centerHit: sampler(centerX, centerY),
    coverage: hits / (sampleCount * sampleCount)
  };
};

export const generateLogoPixels = ({
  coverageThreshold = COVERAGE_THRESHOLD,
  gridSize = GRID_SIZE,
  sampleCount = SAMPLE_COUNT,
  sampler = createRuntimeTikTokSampler()
}: GenerateLogoPixelsOptions = {}): Pixel[] => {
  const activeSampler = sampler ?? createFallbackLogoSampler(gridSize);
  const pixelSize = VIEWBOX_SIZE / gridSize;
  const pixels: Pixel[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const { centerHit, coverage } = getCellCoverage({
        column,
        gridSize,
        row,
        sampleCount,
        sampler: activeSampler
      });

      if (!centerHit && coverage < coverageThreshold) {
        continue;
      }

      const index = row * gridSize + column;
      const distanceFromCenter = Math.hypot(column - (gridSize - 1) / 2, row - (gridSize - 1) / 2);

      pixels.push({
        color: pickPixelColor(row, column, index),
        driftX: (column - (gridSize - 1) / 2) * 0.16,
        driftY: (row - (gridSize - 1) / 2) * 0.16,
        id: `${row}-${column}`,
        opacity: Math.max(0.34, 0.98 - distanceFromCenter * 0.06),
        rotation: ((index % 9) - 4) * 4,
        scale: 0.66 + ((index % 4) * 0.08),
        x: column * pixelSize,
        y: row * pixelSize
      });
    }
  }

  return pixels;
};

export const pixels = generateLogoPixels();
