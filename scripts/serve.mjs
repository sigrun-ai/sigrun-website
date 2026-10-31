/**
 * Local preview of `dist/`. Port 8080 is taken by signal-cli on this
 * machine, so the default is 4173 (Vite's preview convention).
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
	".html": "text/html; charset=utf-8",
	".svg": "image/svg+xml",
	".css": "text/css; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", "http://localhost");
	// Resolve inside `dist` only: strip leading slashes, normalize, then
	// reject anything that climbed out with `..`.
	const rel = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, "");
	if (rel.startsWith("..")) {
		res.writeHead(403).end("forbidden");
		return;
	}
	const path = join(root, rel === "" ? "index.html" : rel);
	try {
		const body = await readFile(path);
		res.writeHead(200, {
			"content-type": TYPES[extname(path)] ?? "application/octet-stream",
		});
		res.end(body);
	} catch {
		const body = await readFile(join(root, "404.html"));
		res.writeHead(404, { "content-type": TYPES[".html"] });
		res.end(body);
	}
}).listen(port, "127.0.0.1", () => {
	console.log(`preview: http://127.0.0.1:${port}/`);
});
