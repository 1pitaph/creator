import { describe, expect, it } from "vitest";

import { GRID_SIZE, createCompositeTikTokSampler, generateLogoPixels, getCellCoverage } from "./pixelLogoGeometry";

describe("pixelLogoGeometry", () => {
  it("generates no pixels when the sampler never hits the logo", () => {
    expect(generateLogoPixels({ gridSize: 4, sampler: () => false })).toEqual([]);
  });

  it("generates only cells that belong to the sampled logo area", () => {
    const pixels = generateLogoPixels({
      coverageThreshold: 1,
      gridSize: 4,
      sampleCount: 1,
      sampler: (x, y) => x >= 6 && x < 18 && y >= 6 && y < 18
    });

    expect(pixels.map((pixel) => pixel.id)).toEqual(["1-1", "1-2", "2-1", "2-2"]);
  });

  it("filters low coverage cells but preserves center-hit cells", () => {
    const lowCoverage = generateLogoPixels({
      coverageThreshold: 0.28,
      gridSize: 1,
      sampleCount: 3,
      sampler: (x, y) => x === 6 && y === 6
    });
    const centerHit = generateLogoPixels({
      coverageThreshold: 0.28,
      gridSize: 1,
      sampleCount: 3,
      sampler: (x, y) => x === 12 && y === 12
    });

    expect(lowCoverage).toHaveLength(0);
    expect(centerHit).toHaveLength(1);
  });

  it("reports coverage and center hit separately", () => {
    expect(
      getCellCoverage({
        column: 0,
        gridSize: 1,
        row: 0,
        sampleCount: 3,
        sampler: (x, y) => x === 12 && y === 12
      })
    ).toEqual({ centerHit: true, coverage: 1 / 9 });
  });

  it("builds a composite sampler from the three TikTok logo offsets", () => {
    const sampler = createCompositeTikTokSampler((x, y) => Math.abs(x - 0.35) < 0.001 && Math.abs(y + 0.25) < 0.001);

    expect(sampler(0, 0)).toBe(true);
  });

  it("uses a static fallback mask instead of a full square grid", () => {
    const fallbackPixels = generateLogoPixels({ sampler: null });

    expect(fallbackPixels.length).toBeGreaterThan(0);
    expect(fallbackPixels.length).toBeLessThan(GRID_SIZE * GRID_SIZE);
  });
});
