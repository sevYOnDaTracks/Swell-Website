import { CONTENT_TYPES, readUpload } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  const data = await readUpload(file);
  if (!data) return new Response("Not found", { status: 404 });

  const headers = {
    "Content-Type": CONTENT_TYPES[file.split(".").pop()!],
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };

  // Requêtes partielles : nécessaires pour avancer dans un extrait audio.
  const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${data.length}` },
    });
  }

  return new Response(new Uint8Array(data), { headers });
}
