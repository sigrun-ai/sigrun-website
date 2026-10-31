/**
 * Drift guard: `src/themes.generated.mjs` must equal what the core repo
 * currently exports. Skips (loudly) when the core checkout is absent — a
 * GitHub-only clone of this repo has no sibling to compare against.
 */

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

import {
	generate,
	resolveCorePath,
	themesSourcePath,
} from "../scripts/sync-themes.mjs";

const corePath = resolveCorePath();
const source = themesSourcePath(corePath);

const exists = await access(source).then(
	() => true,
	() => false,
);

test("generated tokens match the core's themes.ts", { skip: !exists }, async () => {
	assert.ok(exists, `no themes.ts at ${source}`);
	const committed = await readFile(
		new URL("../src/themes.generated.mjs", import.meta.url),
		"utf8",
	);
	assert.equal(
		committed,
		await generate(corePath),
		"src/themes.generated.mjs is stale — run `npm run sync`",
	);
});
