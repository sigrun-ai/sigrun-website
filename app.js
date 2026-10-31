/*
 * Palette + mode cycling.
 *
 * The palette names, accents, and each palette's default accent come from a
 * JSON blob the build stamps into the page, sourced from the core's theme
 * tokens — never a hand-written list, so a new palette in the core appears
 * here after `npm run sync`.
 *
 * The markup ships with the core's default palette, accent and mode already
 * applied, so the page is correct with JavaScript disabled; this only adds
 * choice.
 */

const data = JSON.parse(
	document.getElementById("theme-data")?.textContent ?? "{}",
);
const names = data.palettes ?? [];
const defaultAccents = data.defaultAccents ?? {};
const root = document.documentElement;

const paletteButton = document.querySelector("[data-palette-cycle]");
const paletteLabel = document.querySelector("[data-palette-label]");
const modeButton = document.querySelector("[data-mode-toggle]");
const modeLabel = document.querySelector("[data-mode-label]");

const STORE = "sigrun-site-prefs";

const titleCase = (slug) =>
	slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

function load() {
	try {
		return JSON.parse(localStorage.getItem(STORE) ?? "{}");
	} catch {
		return {};
	}
}

function save(prefs) {
	try {
		localStorage.setItem(STORE, JSON.stringify(prefs));
	} catch {
		// Storage disabled (private mode, quota) — the choice just won't persist.
	}
}

const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)");
const saved = load();

const state = {
	palette: names.includes(saved.palette) ? saved.palette : root.dataset.palette,
	accent: saved.accent ?? root.dataset.accent,
	mode:
		saved.mode === "light" || saved.mode === "dark"
			? saved.mode
			: prefersLight?.matches
				? "light"
				: "dark",
};

function paint() {
	root.dataset.palette = state.palette;
	root.dataset.accent = state.accent;
	root.dataset.mode = state.mode;
	root.style.colorScheme = state.mode;

	if (paletteLabel) paletteLabel.textContent = titleCase(state.palette);

	if (modeButton && modeLabel) {
		const next = state.mode === "dark" ? "light" : "dark";
		modeLabel.textContent = titleCase(state.mode);
		modeButton.setAttribute("aria-label", `Switch to ${next} mode`);
		modeButton.title = `Switch to ${next} mode`;
	}
}

paint();

paletteButton?.addEventListener("click", () => {
	const index = names.indexOf(state.palette);
	state.palette = names[(index + 1) % names.length];
	// Follow the palette's own default accent, exactly as the product does.
	state.accent = defaultAccents[state.palette] ?? state.accent;
	paint();
	save(state);
});

modeButton?.addEventListener("click", () => {
	state.mode = state.mode === "dark" ? "light" : "dark";
	paint();
	save(state);
});

// Follow the system only while the visitor has expressed no preference.
prefersLight?.addEventListener("change", (event) => {
	if (load().mode) return;
	state.mode = event.matches ? "light" : "dark";
	paint();
});
