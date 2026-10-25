/**
 * Serveur Vite des tests navigateur : pages de tests/browser/harness, vrais composants
 * de src/, fonctions serveur et client Supabase remplacés par des stubs journalisés.
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const harness = join(here, "harness");
const stubs = join(harness, "stubs");
const src = join(here, "..", "..", "src");

/** Fonctions serveur qui écrivent : aucune ne doit partir sans clic explicite. */
export const WRITES = [
  "saveStudioAnalysis",
  "deleteStudioAnalysis",
  "createReview",
  "qualifyStudioSubmission",
  "reviewStudioMetric",
];

export async function startHarness() {
  const server = await createServer({
    configFile: false,
    root: harness,
    logLevel: "error",
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: [
        { find: /^@tanstack\/react-start$/, replacement: join(stubs, "react-start.ts") },
        {
          find: /^@\/lib\/studio\/studio\.functions$/,
          replacement: join(stubs, "studio.functions.ts"),
        },
        {
          find: /^@\/lib\/studio\/review\.functions$/,
          replacement: join(stubs, "review.functions.ts"),
        },
        {
          find: /^@\/integrations\/supabase\/client$/,
          replacement: join(stubs, "supabase-client.ts"),
        },
        { find: /^@\//, replacement: `${src}/` },
      ],
    },
    server: { host: "127.0.0.1", port: 5199, strictPort: false },
  });
  await server.listen();
  return { server, base: server.resolvedUrls.local[0].replace(/\/$/, "") };
}
