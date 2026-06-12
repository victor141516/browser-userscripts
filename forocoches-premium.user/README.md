# Forocoches Premium userscript

Source project for `../forocoches-premium.user.js`.

The browser extension still watches the original userscript file one directory
above this project. Do not delete or replace that file. The build script keeps
that path stable by truncating the existing file and writing the compiled
bundle into it.

## Commands

```bash
bun run check
bun run build
```

`bun run build`:

1. Generates the Tampermonkey/Violentmonkey metadata block with a timestamped
   version.
2. Reads `src/styles/parts/*.css`.
3. Bundles `src/index.ts` for the browser with Bun.
4. Injects the CSS as a string define.
5. Writes `dist/forocoches-premium.user.js`.
6. Empties `../forocoches-premium.user.js` and writes the generated userscript
   back into that same file path.

A pre-refactor backup was created next to the original userscript before the
first generated write.

## Structure

```text
src/
  index.ts                 Entry point. Starts the userscript.
  app.ts                   Main compatibility core migrated from the old file.
  config/
    constants.ts           Barrel export used by the compatibility core.
    cache.ts               IndexedDB/cache limits and schema versions.
    domIds.ts              DOM ids/classes created by the script.
    keyboard.ts            Keyboard shortcuts.
    query.ts               Query parameter names.
    selectors.ts           Stable selectors and data attributes.
    domain.ts              Miscellaneous domain constants.
  shared/
    dom.ts                 Small typed DOM/text/url helpers.
  styles/
    parts/                 Injected stylesheet fragments.
  ui/
    shortcutHelp.tsx       Small JSX DOM factory and shortcut-help row.
scripts/
  build.ts                 Bun build pipeline.
dist/
  bundle.js                Raw Bun bundle.
  forocoches-premium.user.js
                            Generated userscript copy.
```

## Runtime model

`src/app.ts` still owns the feature orchestration: page detection, keyboard
navigation, forum-list rendering, thread scraping, IndexedDB cache, quote graph
views, and thread message filtering. The migrated core is checked by TypeScript:
use interfaces, type aliases, typed function signatures, and explicit DOM
narrowing instead of JSDoc type comments.

The first stable extraction pass moved low-risk pieces out of the old monolith:

- metadata generation into `scripts/build.ts`
- CSS into `src/styles/parts/*.css`
- constants into focused config files
- reusable typed DOM helpers into `src/shared/dom.ts`
- a shortcut-help UI fragment into TSX

Future refactors should continue peeling features out of `app.ts` by boundary:
cache, forum list, thread rendering, quote graph, keyboard navigation, and
header/toolbar UI.
