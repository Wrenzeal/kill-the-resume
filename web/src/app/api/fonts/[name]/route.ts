import { readFile } from "node:fs/promises";
import { join } from "node:path";

const allowedFontNames = new Set([
  "ktr-paper-sans.ttf",
  "ktr-paper-sans-bold.ttf",
  "ktr-paper-mono.ttf",
  "ktr-paper-mono-bold.ttf",
  "ktr-paper-cjk.ttf",
]);

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;

  if (!allowedFontNames.has(name)) {
    return new Response("Font not found", { status: 404 });
  }

  try {
    const bytes = await readFile(join(process.cwd(), "public", "fonts", name));

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "font/ttf",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Font not found", { status: 404 });
  }
}
