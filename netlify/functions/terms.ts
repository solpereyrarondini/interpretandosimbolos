import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { and, desc, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../../db/index.js";
import { terms } from "../../db/schema.js";

const LANGS = ["es", "en"];
const MAX_IMAGE_BYTES = 400 * 1024;

const images = () => getStore("symbol-images");
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const bad = (error: string, status = 400) => Response.json({ error }, { status });

function ownerToken(req: Request) {
  const t = req.headers.get("x-owner-token") || "";
  return t.length >= 16 && t.length <= 200 ? t : "";
}

function toPublic(row: typeof terms.$inferSelect, token: string) {
  return {
    id: row.id,
    term: row.term,
    langs: row.langs,
    note: row.note,
    char: row.char,
    img: row.imageKey ? `/api/images/${row.imageKey}` : "",
    ts: row.createdAt.getTime(),
    mine: !!token && row.ownerHash === hash(token),
  };
}

async function create(req: Request, token: string) {
  if (!token) return bad("missing_token", 401);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const term = String(body?.term ?? "").trim().slice(0, 120);
  const note = String(body?.note ?? "").trim().slice(0, 300);
  const char = String(body?.char ?? "").trim().slice(0, 16);
  const langs = Array.isArray(body?.langs) ? LANGS.filter((l) => body.langs.includes(l)) : [];
  const img = typeof body?.img === "string" ? body.img : "";
  if (!term) return bad("missing_term");
  if (!langs.length) return bad("missing_langs");
  if (!char && !img) return bad("missing_symbol");

  const id = randomUUID();
  let imageKey = "";
  if (!char && img) {
    const m = /^data:(image\/(?:webp|png|jpeg|gif));base64,([A-Za-z0-9+/=]+)$/.exec(img);
    if (!m) return bad("invalid_image");
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.byteLength > MAX_IMAGE_BYTES) return bad("image_too_large", 413);
    imageKey = id;
    await images().set(imageKey, bytes, { metadata: { contentType: m[1] } });
  }

  try {
    const [row] = await db
      .insert(terms)
      .values({ id, term, langs, note, char, imageKey, ownerHash: hash(token) })
      .returning();
    return Response.json(toPublic(row, token), { status: 201 });
  } catch (e) {
    if (imageKey) await images().delete(imageKey);
    throw e;
  }
}

async function remove(id: string, token: string) {
  if (!token) return bad("missing_token", 401);
  const [row] = await db
    .delete(terms)
    .where(and(eq(terms.id, id), eq(terms.ownerHash, hash(token))))
    .returning();
  if (!row) return bad("not_allowed", 403);
  if (row.imageKey) await images().delete(row.imageKey);
  return new Response(null, { status: 204 });
}

export default async (req: Request, context: Context) => {
  const token = ownerToken(req);
  const { id } = context.params;

  if (req.method === "GET" && !id) {
    const rows = await db.select().from(terms).orderBy(desc(terms.createdAt));
    return Response.json(rows.map((r) => toPublic(r, token)));
  }
  if (req.method === "POST" && !id) return create(req, token);
  if (req.method === "DELETE" && id) return remove(id, token);
  return bad("method_not_allowed", 405);
};

export const config: Config = {
  path: ["/api/terms", "/api/terms/:id"],
};
