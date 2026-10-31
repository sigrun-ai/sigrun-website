/**
 * Build `dist/` for static hosting.
 *
 * Four output files, no bundler: the shell copied verbatim, plus
 * `themes.css` generated from the core's palette tokens so every colour on
 * the page is a token rather than a literal.
 */

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	ACCENTS,
	ACCENT_NAMES,
	DEFAULT_ACCENT,
	DEFAULT_PALETTE,
	PALETTES,
	PALETTE_NAMES,
} from "../src/themes.generated.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const STATIC = ["index.html", "styles.css", "app.js"];

/** CSS custom properties for every palette × mode, plus every accent. */
export function themesCss() {
	const blocks = [];
	for (const [name, palette] of Object.entries(PALETTES)) {
		for (const mode of ["dark", "light"]) {
			const decls = Object.entries(palette[mode]).map(
				([token, value]) => `\t--${token}: ${value};`,
			);
			decls.push(`\t--accent: ${ACCENTS[palette.defaultAccent][mode]};`);
			blocks.push(
				`/* ${palette.label} — ${mode} (default accent: ${palette.defaultAccent}) */\n` +
					`:root[data-palette="${name}"][data-mode="${mode}"] {\n${decls.join("\n")}\n}`,
			);
		}
	}
	for (const name of ACCENT_NAMES) {
		const accent = ACCENTS[name];
		blocks.push(
			`/* ${accent.label} */\n` +
				`:root[data-accent="${name}"][data-mode="dark"] { --accent: ${accent.dark}; }\n` +
				`:root[data-accent="${name}"][data-mode="light"] { --accent: ${accent.light}; }`,
		);
	}
	return `/* GENERATED from src/themes.generated.mjs — do not edit. */\n\n${blocks.join("\n\n")}\n`;
}

/** The blob app.js reads for palette names (never a hand-written list). */
export function themeData() {
	return JSON.stringify({
		palettes: PALETTE_NAMES,
		accents: ACCENT_NAMES,
		/** Each palette's own default accent — what the product ships. */
		defaultAccents: Object.fromEntries(
			PALETTE_NAMES.map((name) => [name, PALETTES[name].defaultAccent]),
		),
		defaults: { palette: DEFAULT_PALETTE, accent: DEFAULT_ACCENT },
	});
}

/** The favicon is the default accent — regenerated with the tokens. */
function favicon() {
	const accent = ACCENTS[DEFAULT_ACCENT].dark;
	const ink = PALETTES[DEFAULT_PALETTE].dark.bg;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3.5" fill="${accent}"/><path d="M4.9 10.6c.7.6 1.7.9 2.7.9 1.6 0 2.5-.6 2.5-1.6 0-1-.8-1.3-2.3-1.7-1.9-.5-3-1.1-3-2.6C4.8 4 6.1 3.1 8 3.1c1.3 0 2.3.4 2.9.9l-.8 1.3C9.5 4.8 8.8 4.6 8 4.6c-1.1 0-1.8.4-1.8 1 0 .7.7.9 2.2 1.3 1.9.5 3.1 1.1 3.1 2.8 0 2-1.6 3-3.9 3-1.4 0-2.7-.4-3.5-1.1z" fill="${ink}"/></svg>`;
}

function notFound() {
	const palette = PALETTES[DEFAULT_PALETTE].dark;
	const accent = ACCENTS[DEFAULT_ACCENT].dark;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not here — Sigrun</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:${palette.bg};color:${palette.text};font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;padding:2rem;line-height:1.6}
h1{font-size:1.5rem;margin:0 0 .5rem;letter-spacing:-.01em}
p{color:${palette.muted};margin:0 0 .25rem}
a{color:${accent}}
</style>
</head>
<body>
<main>
	<h1>Nothing at this address.</h1>
	<p>The page you wanted is not here.</p>
	<p><a href="/">Back to sigrun.sh</a></p>
</main>
</body>
</html>
`;
}

await mkdir(dist, { recursive: true });
for (const file of STATIC) {
	await copyFile(join(root, file), join(dist, file));
}

const html = (await readFile(join(root, "index.html"), "utf8"))
	.replaceAll("%PALETTE%", DEFAULT_PALETTE)
	.replaceAll("%ACCENT%", DEFAULT_ACCENT)
	.replaceAll("%THEME_DATA%", themeData());

await writeFile(join(dist, "index.html"), html, "utf8");
await writeFile(join(dist, "themes.css"), themesCss(), "utf8");
await writeFile(join(dist, "favicon.svg"), favicon(), "utf8");
await writeFile(join(dist, "404.html"), notFound(), "utf8");

console.log(`built dist/ (${STATIC.length + 3} files)`);