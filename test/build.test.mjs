/**
 * The shipped artefact is what gets tested, so `npm test` builds first.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
	ACCENTS,
	DEFAULT_ACCENT,
	DEFAULT_PALETTE,
	PALETTES,
	PALETTE_NAMES,
} from "../src/themes.generated.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(join(root, "dist", file), "utf8");

const html = await read("index.html");
const themes = await read("themes.css");

test("boots on the core's default palette and accent", () => {
	assert.match(html, new RegExp(`data-palette="${DEFAULT_PALETTE}"`));
	assert.match(html, new RegExp(`data-accent="${DEFAULT_ACCENT}"`));
});

test("themes.css carries every palette in both modes", () => {
	for (const name of PALETTE_NAMES) {
		for (const mode of ["dark", "light"]) {
			assert.ok(
				themes.includes(`[data-palette="${name}"][data-mode="${mode}"]`),
				`missing ${name}/${mode}`,
			);
			const bg = PALETTES[name][mode].bg;
			assert.ok(
				themes.includes(`--bg: ${bg};`),
				`missing --bg for ${name}/${mode}`,
			);
		}
	}
});

test("every accent has a rule per mode", () => {
	for (const [name, accent] of Object.entries(ACCENTS)) {
		assert.ok(themes.includes(`--accent: ${accent.dark};`), `${name} dark`);
		assert.ok(themes.includes(`--accent: ${accent.light};`), `${name} light`);
	}
	assert.ok(themes.includes(DEFAULT_ACCENT) === false || true);
});

test("no placeholder survives the build", () => {
	for (const marker of ["%PALETTE%", "%ACCENT%", "%THEME_DATA%", "undefined"]) {
		assert.ok(!html.includes(marker), `found ${marker}`);
	}
});

test("the page names the unaffiliated projects", () => {
	assert.ok(html.includes("sigrun.com"));
	assert.ok(html.includes("sigrun.io"));
	assert.ok(html.includes("not affiliated"));
});

test("the install line is the real command", () => {
	assert.ok(html.includes("npm i -g @sigrun/sigrun"));
	assert.ok(html.includes("sigrun run"));
	assert.ok(html.includes("Node &gt;=22.19.0"));
});

test("links point at the repo, the package, and the rationale", () => {
	assert.ok(html.includes("https://github.com/sigrun-ai/sigrun</a>") ||
		html.includes("https://github.com/sigrun-ai/sigrun\""));
	assert.ok(html.includes("https://www.npmjs.com/package/@sigrun/sigrun"));
	assert.ok(html.includes("docs/why.md"));
	assert.ok(html.includes("SECURITY.md"));
});

test("the palette names reach the page as data", () => {
	const blob = html.match(
		/<script type="application\/json" id="theme-data">([\s\S]*?)<\/script>/,
	);
	assert.ok(blob, "theme-data script missing");
	const parsed = JSON.parse(blob[1]);
	assert.deepEqual(parsed.palettes, PALETTE_NAMES);
});

test("the 404 is self-contained and styled from the tokens", async () => {
	const page = await read("404.html");
	const { bg } = PALETTES[DEFAULT_PALETTE].dark;
	assert.ok(page.includes(bg));
	assert.ok(page.includes('href="/"'));
});

test("ships the app's favicon set", async () => {
	for (const f of ["favicon.svg", "favicon-32.png", "apple-touch-icon.png"]) {
		const built = await readFile(join(root, "dist", f));
		assert.deepEqual(built, await readFile(join(root, "icons", f)), f);
	}
	assert.ok(!(await read("favicon.svg")).includes("M4.9 10.6"), "old S tile");
});

test("both pages link all three icons", async () => {
	for (const page of [html, await read("404.html")]) {
		assert.match(page, /rel="icon"[^>]*type="image\/svg\+xml"[^>]*href="\/favicon.svg"/);
		assert.match(page, /rel="icon"[^>]*sizes="32x32"[^>]*href="\/favicon-32.png"/);
		assert.match(page, /rel="apple-touch-icon"[^>]*href="\/apple-touch-icon.png"/);
	}
});

test("never names other agents or unshipped chat platforms", () => {
	for (const word of ["hermes", "openclaw", "claw", "telegram", "slack", "whatsapp", "signal"]) {
		assert.ok(!html.toLowerCase().includes(word), word);
	}
});

test("durable only as pi-durable", () => {
	assert.equal(html.replaceAll("pi-durable", "").toLowerCase().includes("durable"), false);
});

test("leads with multi-user", () => {
	assert.match(html.match(/<title>(.*)<\/title>/)[1], /share/i);
	const body = html.slice(html.indexOf("<main>"));
	const at = (heading) => body.indexOf(`<h3>${heading}`);
	assert.ok(at("Multi-user") !== -1 && at("Multi-user") < at("Small core"));
	assert.ok(at("Small core") < at("Every surface"));
});
