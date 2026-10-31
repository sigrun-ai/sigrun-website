/**
 * Snapshot the core's theme tokens into `src/themes.generated.mjs`.
 *
 *   node scripts/sync-themes.mjs [--core <path>]
 *
 * WHY A SNAPSHOT AND NOT AN npm DEPENDENCY: `@sigrun/shared` is published
 * WITHOUT its `dist/` (verified for 0.2.0, 0.2.1 and 0.3.0), so
 * `import "@sigrun/shared/themes"` fails for anyone installing it
 * standalone. `@sigrun/sigrun` only works because npm bundles the nested
 * `node_modules/@sigrun/shared/dist` inside core's own tarball. Until that
 * publish is fixed, the site cannot depend on the package.
 *
 * The values are still not transcribed: this imports `shared/src/themes.ts`
 * directly (Node strips the types natively) and re-emits the exported data
 * as plain ESM. One source of truth, one mechanical transform.
 */

import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const KEYS = [
	"PALETTES",
	"ACCENTS",
	"PALETTE_NAMES",
	"ACCENT_NAMES",
	"DEFAULT_PALETTE",
	"DEFAULT_ACCENT",
];

/** Where the core checkout lives. Override with --core or SIGRUN_CORE. */
export function resolveCorePath(argv = process.argv.slice(2), env = process.env) {
	const flag = argv.indexOf("--core");
	if (flag !== -1 && argv[flag + 1]) return resolve(argv[flag + 1]);
	if (env.SIGRUN_CORE) return resolve(env.SIGRUN_CORE);
	return resolve(root, "..", "sigrun");
}

export function themesSourcePath(corePath) {
	return join(corePath, "shared", "src", "themes.ts");
}

/**
 * Read the core's themes module and return the emitted ESM source.
 * Throws if the checkout (or its themes.ts) is missing.
 */
export async function generate(corePath) {
	const source = themesSourcePath(corePath);
	const mod = await import(pathToFileURL(source).href);

	let provenance = source;
	try {
		const { stdout } = await run("git", [
			"-C",
			corePath,
			"rev-parse",
			"--short=12",
			"HEAD",
		]);
		provenance = `${source} (sigrun core @ ${stdout.trim()})`;
	} catch {
		// Not a git checkout — the path alone is the provenance.
	}

	const lines = KEYS.map((key) => {
		if (!(key in mod)) {
			throw new Error(`${source} does not export ${key}`);
		}
		return `export const ${key} = ${JSON.stringify(mod[key], null, "\t")};`;
	});

	return `// GENERATED — do not edit by hand. Run: npm run sync
// Source: ${provenance}
//
// Why a snapshot instead of importing @sigrun/shared: the published
// 0.2.0/0.2.1/0.3.0 tarballs ship no dist/, so the package cannot be
// imported standalone. See scripts/sync-themes.mjs.

${lines.join("\n\n")}
`;
}

const isMain =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
	const corePath = resolveCorePath();
	const out = join(root, "src", "themes.generated.mjs");
	await writeFile(out, await generate(corePath), "utf8");
	console.log(`wrote ${out}\n  from ${themesSourcePath(corePath)}`);
}
