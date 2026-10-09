import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolve the `@/*` alias from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // `server-only` throws when imported outside a React Server environment.
      // Unit tests exercise server modules directly, so use its no-op entry.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Domain logic must not depend on the machine's timezone.
    env: { TZ: "UTC" },
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reporter: ["text", "html"],
      thresholds: {
        // Commercial invariants (constitution III) must be fully covered.
        "src/lib/domain/**/*.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
