import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (pathFromRoot: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../../${pathFromRoot}`, import.meta.url)),
    "utf8",
  );

describe("production compose config", () => {
  it("defines the API, data kernel, and Postgres services as one internal stack", () => {
    const compose = readWorkspaceFile("docker-compose.yml");

    expect(compose).toContain("  postgres:");
    expect(compose).toContain("  data-kernel:");
    expect(compose).toContain("  api:");
    expect(compose).toContain("dockerfile: ./apps/api/Dockerfile");
    expect(compose).toContain("DATA_KERNEL_URL: http://data-kernel:8790");
    expect(compose).toContain("AGENT_CHECKPOINT_URL:");
    expect(compose).toContain("condition: service_healthy");
    expect(compose).not.toContain("api-env:");
    expect(compose).not.toContain("echo AGENT_CHECKPOINT_URL");
  });

  it("builds the API image from the pnpm workspace and exposes a healthcheck", () => {
    const dockerfile = readWorkspaceFile("apps/api/Dockerfile");

    expect(dockerfile).toContain("pnpm install --frozen-lockfile");
    expect(dockerfile).toContain("pnpm --filter @creator/api build");
    expect(dockerfile).toContain(
      'CMD ["pnpm", "--filter", "@creator/api", "start"]',
    );
    expect(dockerfile).toContain("/health");
  });
});
