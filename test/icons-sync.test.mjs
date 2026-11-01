/**
 * Drift guard: `icons/` must be byte-identical to the app's icons in the
 * core repo (`webui/public/`). The always-run case pins the fail-loud
 * contract of `syncIcons`; the comparison skips when no core checkout is
 * present (a GitHub-only clone has no sibling to compare against).
 */

import assert from "node:assert/strict";
import { access, mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
	ICONS,
	iconsSourceDir,
	resolveCorePath,
	syncIcons,
} from "../scripts/sync-themes.mjs";

const source = iconsSourceDir(resolveCorePath());
const exists = await access(join(source, ICONS[0])).then(
	() => true,
	() => false,
);

test("syncIcons fails loudly on a missing core and writes nothing", async () => {
	const out = await mkdtemp(join(tmpdir(), "sigrun-icons-"));
	await assert.rejects(syncIcons("/nonexistent", out), /favicon\.svg/);
	assert.deepEqual(await readdir(out), []);
});

test("icons/ matches the app's icons", { skip: !exists }, async () => {
	for (const f of ICONS) {
		assert.deepEqual(
			await readFile(new URL(`../icons/${f}`, import.meta.url)),
			await readFile(join(source, f)),
			`icons/${f} is stale — run \`npm run sync\``,
		);
	}
});
