/**
 * Build `dist/` for static hosting.
 *
 * No bundler: the shell copied verbatim, `themes.css` generated from the
 * core's palette tokens (so every colour on the page is a token rather than
 * a literal), a self-contained 404, and the app's icons from `icons/`.
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
import { ICONS } from "./sync-themes.mjs";

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

/** The icon links both pages carry — the app's own set (see icons/). */
const ICON_LINKS = `<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;

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
${ICON_LINKS}
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
for (const icon of ICONS) {
	await copyFile(join(root, "icons", icon), join(dist, icon));
}

const html = (await readFile(join(root, "index.html"), "utf8"))
	.replaceAll("%PALETTE%", DEFAULT_PALETTE)
	.replaceAll("%ACCENT%", DEFAULT_ACCENT)
	.replaceAll("%THEME_DATA%", themeData());

await writeFile(join(dist, "index.html"), html, "utf8");
await writeFile(join(dist, "themes.css"), themesCss(), "utf8");
await writeFile(join(dist, "404.html"), notFound(), "utf8");

console.log(`built dist/ (${STATIC.length + ICONS.length + 2} files)`);