import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const indexHtml = readFileSync("index.html", "utf8");

describe("index.html instant splash", () => {
  it("renders an inline splash before the React root", () => {
    const splashIndex = indexHtml.indexOf('id="instant-splash"');
    const rootIndex = indexHtml.indexOf('id="root"');
    const scriptIndex = indexHtml.indexOf('src="/src/main.tsx"');

    expect(splashIndex).toBeGreaterThan(-1);
    expect(rootIndex).toBeGreaterThan(splashIndex);
    expect(scriptIndex).toBeGreaterThan(rootIndex);
  });

  it("keeps instant splash styles and markup self-contained", () => {
    const styleMatch = /<style>([\s\S]*?)<\/style>/.exec(indexHtml);
    const splashMatch = /<div id="instant-splash"[\s\S]*?<\/div>/.exec(indexHtml);

    expect(styleMatch?.[1]).toContain("#instant-splash");
    expect(styleMatch?.[1]).not.toMatch(/url\(|@import|https?:\/\//);
    expect(splashMatch?.[0]).toContain("instant-splash__pixel");
    expect(splashMatch?.[0]).not.toMatch(/src=|href=|https?:\/\//);
  });
});
