/**
 * Snapshot the core's theme tokens into `src/themes.generated.mjs`, and
 * the app's favicon set into `icons/`.
 *
 *   node scripts/sync-themes.mjs [--core <path>]
 *
 * Source of truth is `shared/src/themes.ts` in the sigrun core repo — the
 * same module the webui and tui read — so the site cannot drift from the
 * product's colours. The values are not transcribed: this imports the real
 * module (Node strips the types natively) and re-emits the exported data as
 * plain ESM.
 *
 * Why a committed snapshot rather than an npm dependency: the site has no
 * build-time network access in CI and no workspace link to core, so a plain
 * `@sigrun/shared` dependency would either need a network install or a
 * checkout of the core repo. A committed snapshot keeps the build hermetic;
 * `test/themes-sync.test.mjs` fails on drift whenever a core checkout is
 * available.
 */

import { execFile } from "node:child_process";
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, isAbsolute } from "node:path";
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
 *
 * The provenance line is deliberately MACHINE-INDEPENDENT: a relative path
 * plus a commit id. An absolute path would make the file differ between the
 * machine that synced it and CI, turning the drift test into noise.
 */
export async function generate(corePath) {
	const source = themesSourcePath(corePath);
	const mod = await import(pathToFileURL(source).href);

	let provenance = relative(root, source).replaceAll("\\", "/");
	if (isAbsolute(provenance)) provenance = "sigrun/" + "shared/src/themes.ts";
	try {
		const { stdout } = await run("git", [
			"-C",
			corePath,
			"rev-parse",
			"--short=12",
			"HEAD",
		]);
		provenance = `sigrun core @ ${stdout.trim()} — ${relative(resolve(root, ".."), source).replaceAll("\\", "/")}`;
	} catch {
		// Not a git checkout — the relative path alone is the provenance.
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
// Snapshot, not a dependency: the build has no workspace link to core.
// See scripts/sync-themes.mjs. test/themes-sync.test.mjs fails on drift.

${lines.join("\n\n")}
`;
}

/** The app's favicon set, copied verbatim (no transcription) from core. */
export const ICONS = ["favicon.svg", "favicon-32.png", "apple-touch-icon.png"];

export function iconsSourceDir(corePath) {
	return join(corePath, "webui", "public");
}

/**
 * Copy every icon into `outDir`. All sources are checked before anything is
 * written, so a missing or partial core checkout never leaves a half-updated
 * snapshot behind.
 */
export async function syncIcons(corePath, outDir) {
	const dir = iconsSourceDir(corePath);
	for (const name of ICONS) {
		const source = join(dir, name);
		await access(source).catch(() => {
			throw new Error(`no app icon at ${source}`);
		});
	}
	await mkdir(outDir, { recursive: true });
	for (const name of ICONS) {
		await copyFile(join(dir, name), join(outDir, name));
	}
}

const isMain =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
	const corePath = resolveCorePath();
	const out = join(root, "src", "themes.generated.mjs");
	await writeFile(out, await generate(corePath), "utf8");
	console.log(`wrote ${out}\n  from ${themesSourcePath(corePath)}`);
	const icons = join(root, "icons");
	await syncIcons(corePath, icons);
	console.log(`wrote ${icons}/ (${ICONS.length} icons)\n  from ${iconsSourceDir(corePath)}`);
}
