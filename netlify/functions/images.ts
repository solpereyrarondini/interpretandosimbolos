import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async (_req: Request, context: Context) => {
  const { key } = context.params;
  if (!KEY.test(key)) return new Response("Not found", { status: 404 });
  const entry = await getStore("symbol-images").getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) return new Response("Not found", { status: 404 });
  return new Response(entry.data, {
    headers: {
      "content-type": String(entry.metadata.contentType || "image/webp"),
      // Image keys are never reused, so the content for a key never changes.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = {
  path: "/api/images/:key",
  method: "GET",
};
