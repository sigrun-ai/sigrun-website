# sigrun.sh

The landing page for [sigrun](https://github.com/sigrun-ai/sigrun) — a
durable, multi-user personal-assistant server.

Static, no framework, no bundler. Four files out of `npm run build`:
`index.html`, `styles.css`, `app.js`, `themes.css` (plus a `404.html` and
`favicon.svg`).

## Colours come from the core

The palettes and accents are **not** duplicated here. `npm run sync` reads
`shared/src/themes.ts` out of a sibling sigrun checkout and regenerates
`src/themes.generated.mjs`; `npm run build` turns that into `themes.css`
custom properties. `npm test` fails if the snapshot is stale.

```sh
npm run sync     # regenerate the token snapshot from ../sigrun
npm run build    # dist/
npm run preview  # build + serve on http://127.0.0.1:4173
npm test         # build, then assert the artefact
```

`npm run sync` looks for the core at `../sigrun`; override with
`--core <path>` or `SIGRUN_CORE`.

> **Why a snapshot and not an npm dependency?** `@sigrun/shared` 0.2.0,
> 0.2.1 and 0.3.0 were published without their `dist/` (the `files`
> whitelist names it, but nothing builds it before `npm publish`), so
> `import "@sigrun/shared/themes"` fails for anyone installing the package
> standalone. `@sigrun/sigrun` only works because npm bundles a nested
> `node_modules/@sigrun/shared/dist` inside core's own tarball. When that
> publish is fixed, this repo can drop the snapshot for a plain dependency.

## Deploying

Cloudflare Pages, build command `npm run build`, output directory `dist`.
`wrangler.toml` pins the project name; the custom domain is `sigrun.sh`.

Note that `.sh` is a shell-script TLD by convention, so `/` must keep
serving the site — there is deliberately no `curl … | sh` installer here
(sigrun installs with `npm i -g @sigrun/sigrun`).

## Not affiliated

The footer says it plainly, on every page: this project shares a name with
Sigrun GmbH ([sigrun.com](https://sigrun.com/), business education) and
Deeptree Corp ([sigrun.io](https://sigrun.io/), an AI policy-gate runtime).
Keep that line.
