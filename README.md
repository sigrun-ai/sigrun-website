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

> **Why a snapshot and not an npm dependency?** `@sigrun/shared` 0.2.0
> through 0.4.0 were published without their `dist/`, so
> `import "@sigrun/shared/themes"` failed for anyone installing the package
> standalone. **Fixed in 0.4.1** (`prepublishOnly: npm run build`) and
> verified live at 0.4.2. The snapshot is kept anyway because the CI build
> has no workspace link to the core checkout; `npm run sync` is a
> maintainer step, not a build step.

## Deploying

Cloudflare **Workers** with static assets (`Workers & Pages → sigrun-website`).
Build command `npm run build`, deploy command `npx wrangler deploy`.

There is no "build output directory" field in a Worker's settings — the
assets directory in `wrangler.toml` is that setting, and the file is its only
source of truth:

```toml
name = "sigrun-website"   # must equal the Worker name
[assets]
directory = "./dist"
not_found_handling = "404-page"
```

A name mismatch produces "Update wrangler.toml in your repo to keep settings
consistent". Verified locally with `npx wrangler@4 deploy --dry-run` (reads
all six files from `dist/`) and `npx wrangler@4 dev` (200 on `/` and
`/themes.css`, 404 + the custom page on an unmatched path).

The custom domain is `sigrun.sh`.

Note that `.sh` is a shell-script TLD by convention, so `/` must keep
serving the site — there is deliberately no `curl … | sh` installer here
(sigrun installs with `npm i -g @sigrun/sigrun`).

## Not affiliated

The footer says it plainly, on every page: this project shares a name with
Sigrun GmbH ([sigrun.com](https://sigrun.com/), business education) and
Deeptree Corp ([sigrun.io](https://sigrun.io/), an AI policy-gate runtime).
Keep that line.
