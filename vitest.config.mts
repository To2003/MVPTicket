import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` explota fuera de Next: en tests lo reemplazamos por un módulo vacío.
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    // Los tests de base comparten una base de datos: corren en un solo proceso, en serie.
    pool: "forks",
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
