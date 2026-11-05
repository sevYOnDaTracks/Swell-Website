import { CONTENT_TYPES, streamUpload, uploadSize } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  const size = await uploadSize(file);
  if (size === null) return new Response("Not found", { status: 404 });

  const headers = {
    "Content-Type": CONTENT_TYPES[file.split(".").pop()!],
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };

  // En production, Nginx sert /media directement depuis le disque ; cette route
  // sert en développement. Content-Length est indispensable : sans lui, Safari
  // refuse de lire les extraits audio et les vidéos.
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    // "bytes=-500" désigne les 500 derniers octets.
    const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(streamUpload(file, start, end), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new Response(streamUpload(file, 0, size - 1), { headers: { ...headers, "Content-Length": String(size) } });
}
