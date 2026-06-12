# Forocoches Premium Agent Guide

This directory contains the source project for the generated userscript at
`../forocoches-premium.user.js`. The browser extension watches that root
userscript file, so keep the path stable and use the build command to update it.

## Quick Start

- Install dependencies with `bun install` if `node_modules` is missing.
- Type-check with `bun run check`.
- Build with `bun run build`.
- After building, sanity-check the generated root userscript with
  `node --check ../forocoches-premium.user.js`.
- Run the real-site Playwright smoke flow with `bun run e2e` when a change
  could affect forum or thread behavior.
- Test browser behavior through Chrome DevTools Protocol on port `19999`.
- Do not stage `../forocoches-premium.user.js.backup-*` files unless the user
  explicitly asks for them.

## Runtime Shape

The script runs on ForoCoches pages and then chooses the relevant controller:

- Forum thread-list pages use `createForumPageController`.
- Thread detail pages use `createThreadPageController`.
- Unknown pages exit after the basic duplicate-instance guard.

The entry path is:

```text
src/index.ts
  -> src/app.ts
  -> src/app/runForocochesPremium.ts
  -> src/app/core/runForocochesPremiumCore.ts
```

`runForocochesPremiumCore.ts` waits for DOM readiness, prevents duplicate
instances with `INSTANCE_KEY`, creates both page controllers, and lets each
controller decide whether it applies to the current URL.

## Architecture

```text
src/
  app/core/              Page orchestration and feature controllers.
  adapters/forocoches/   ForoCoches-specific DOM parsing and native HTML reuse.
  config/                Constants, selectors, keyboard shortcuts, cache limits,
                         query parameter names, and DOM ids/classes.
  domain/                Pure-ish data rules: posts, quote graphs, tags,
                         pagination, forum-thread filtering and sorting.
  services/              Cross-feature services such as keyboard handling,
                         query-state helpers, and IndexedDB cache access.
  shared/                Small generic helpers that are not ForoCoches-specific.
  styles/parts/          CSS fragments injected by the build script.
  ui/                    UI building blocks and DOM patch helpers.
  ui/components/         TSX components rendered with Preact.
scripts/
  build.ts               Bun build pipeline.
dist/
  bundle.js              Raw generated bundle.
  forocoches-premium.user.js
                         Generated userscript copy.
```

## Layering Rules

- `app/core` coordinates behavior. It can call adapters, domain helpers,
  services, and UI modules.
- `adapters/forocoches` is the boundary around unstable ForoCoches HTML. Put
  selectors, native table parsing, cloned native pagers, and site-specific DOM
  extraction there when possible.
- `domain` should not depend on the live DOM. Prefer plain records and pure
  functions here.
- `services/threadCache` owns IndexedDB details. Keep schema/version changes
  centralized around `config/cache.ts` and `services/threadCache/db.ts`.
- `ui/components` is for new interface we own. Use TSX + Preact.
- `ui/*Dom.ts` is for patching or moving existing ForoCoches DOM, or for small
  imperative helpers where TSX would add noise.
- `styles/parts` owns visual styling. Add or adjust classes there instead of
  scattering inline styles.

## UI Guidance

This project intentionally mixes two UI styles:

- Use direct DOM manipulation for small page patches, moving native nodes, or
  changing ForoCoches-owned markup.
- Use Preact TSX for new UI surfaces owned by the script, such as control rows,
  modals, pagers, tag chips, and larger panels.

Preact is configured through `tsconfig.json` with `jsxImportSource: "preact"`.
`src/ui/render.ts` provides a small bridge for current call sites that expect an
`HTMLElement` from a TSX component. For future stateful Preact islands, prefer
mounting with Preact `render()` into a stable container instead of rendering to a
temporary host and moving the element.

## Forum List Features

Main files:

- `forumPageController.ts` coordinates the forum-list page.
- `forumThreadCacheController.ts` scrapes recent pages and updates IndexedDB.
- `forumThreadListRenderer.ts` renders cached records into the native list area.
- `forumPageKeyboardController.ts` handles thread selection and shortcuts.
- `forumTagsController.ts` computes and renders tag filters.
- `forumLayoutController.ts` moves/hides native layout pieces and controls the
  left panel.

The forum list is rendered dynamically from IndexedDB records. By default it
queries the most recently seen non-hidden records. If `fcp_tag` is present in the
URL, it filters by tag. Local live search filters by title only.

`forumThreadCacheController.ts` scrapes page 1 first, then recent forum pages up
to `FORUM_THREAD_CACHE_RECENT_PAGES`. Before merging a scraped page into the
in-memory cache, compare that page's thread ids against a snapshot of ids that
were cached before the current scrape began. If every thread on a scraped page
was already in that snapshot, save/update that page and stop scraping further
pages. Do not compare against `cachedForumThreads` after merging the current
page, because that would make the just-scraped page look previously cached.

Hidden threads are stored on the forum-thread cache record with `isHidden` and
`hiddenAt`. Pressing `h` hides the selected thread. The "Hilos escondidos" modal
shows hidden records.

## Thread Page Features

Main files:

- `threadPageController.ts` coordinates thread pages.
- `threadPageLoader.ts` loads thread pages progressively. With no complete
  cache, it loads the full thread. With a complete cache, it always refreshes
  page 1 and then refreshes the previously last-seen page through the current
  last page.
- `threadPagePaginationController.ts` intercepts native page navigation and
  swaps messages with JavaScript.
- `threadGraphViewController.ts` handles "quoted by" and conversation views.
- `threadPostRenderer.ts` renders `PostRecord` data back into message DOM.
- `threadPostFilterController.ts` runs the visible message search/filter panel.
- `threadPageKeyboardController.ts` handles selected-post navigation and actions.
- `threadPageHeaderController.ts` reshapes the thread header and search area.

The normal thread view keeps chronological order, except the first post remains
first and the top cited messages can be promoted near the top. Graph views are
stored in query params so reload/back/forward can restore the view.

`threadPostRenderer.ts` should avoid rebuilding `#posts` when the visible page is
unchanged. Compute any stable render signature before clearing or replacing
children, especially before `postsElement.textContent = ""`. The signature should
represent the currently visible page's post sequence and HTML. Avoid including
global metadata such as quote rank or reply counts when the goal is to preserve
existing embeds, because those values can change as later pages load even though
the visible post DOM does not need to be rebuilt.

## Cache Model

IndexedDB database:

- Database name: `THREAD_CACHE_DB_NAME`.
- Thread-message store: `THREAD_CACHE_STORE_NAME`, keyed by `threadId`.
- Forum-thread-list store: `FORUM_THREAD_CACHE_STORE_NAME`, keyed by thread id.

Important config lives in `src/config/cache.ts`:

- `THREAD_CACHE_MAX_AGE_MS`: expiry for cached thread messages.
- `THREAD_CACHE_MAX_BYTES`: approximate maximum total thread-message cache size.
- `THREAD_CACHE_DB_VERSION`: bump when IndexedDB stores or indexes change.
- `THREAD_CACHE_RECORD_VERSION`: bump when cached thread post shape changes.
- `FORUM_THREAD_CACHE_RECORD_VERSION`: bump when cached forum-thread shape
  changes.
- `FORUM_THREAD_CACHE_RECENT_PAGES`: how many recent forum pages are scraped in
  the background.
- `FORUM_THREAD_CACHE_MAX_RECORDS`: maximum retained forum-list records.

When changing cache record shapes, update validation code in
`services/threadCache/validation.ts`, bump the relevant record version, and test
both fresh-cache and existing-cache paths.

Thread cache records store `lastSeenPageNumber`. On a cached thread page load,
the browser document supplies page 1, and the loader refreshes the previous
`lastSeenPageNumber`; if the current last-page link points beyond it, the loader
also refreshes each new page through the current last page. Determine the current
last page from the "Ultimo/Last" link URL when available, not from plain pager
text.

## Query Parameters

Thread-page state is stored with names from `THREAD_STATE_QUERY_PARAMS`:

- `fcp_graph`: graph view type.
- `fcp_root`: root post id for graph views.
- `fcp_related`: related/selected post id where needed.
- `fcp_page`: page filter.
- `fcp_author`: thread message author filters.
- `fcp_search`: thread message text search.

Forum-list state uses `FORUM_STATE_QUERY_PARAMS`:

- `fcp_tag`: selected tag filter.

Preserve unknown and native ForoCoches query params when updating URLs. Avoid
assigning `location.hash` for keyboard selection because that triggers browser
hash scrolling; use history APIs when the URL must change without automatic
scroll.

## Keyboard Shortcuts

Shortcut constants live in `src/config/keyboard.ts`. The visible shortcut help
should be derived from those constants, not duplicated by hand.

Current important actions:

- `ArrowUp` / `ArrowDown`: move selected post or thread.
- `ArrowLeft` / `ArrowRight`: move to previous or next page on thread and
  forum-list pages.
- `Escape`: clear active thread view/filter.
- `?`: open shortcut help.
- `Enter`: quote the selected post on thread pages, open selected thread on
  forum-list pages.
- `Cmd/Ctrl + Enter`: open selected thread in a new tab.
- `l`: return from a thread page to the forum thread list.
- `h`: hide selected thread on forum-list pages.
- `n`: new reply in the current thread.
- `m`: multiquote selected post.

Keyboard handlers should ignore modified arrow keys so browser shortcuts like
`Cmd + ArrowUp` keep their native behavior.

## Glossary

- Active graph view: A non-standard thread view such as quoted-by or
  conversation-chain, represented by `ActiveGraphView`.
- Forum page: A ForoCoches `forumdisplay.php` thread-list page.
- Forum thread record: Cached metadata for one thread-list row, represented by
  `ForumThreadRecord`.
- Hidden thread: A forum thread with `isHidden: true`; it is excluded from the
  main list and shown in the hidden-threads modal.
- Native pager: The original ForoCoches page navigation HTML, reused but
  intercepted so page changes feel instant.
- OP: Original poster. OP-specific visual labels are intentionally avoided
  because ForoCoches already marks OP posts visually.
- Post record: Parsed data for one message in a thread, represented by
  `PostRecord`.
- Promoted cited posts: Top quoted messages shown near the start of the normal
  thread view after the original post.
- Quote graph: Internal relation graph connecting posts to the posts they quote
  and the posts that quote them, represented by `ThreadGraph`.
- Thread page: A ForoCoches `showthread.php` page.
- Thread cache: IndexedDB cache containing scraped messages for a full thread.
- Thread search panel: Always-visible in-thread filter UI for message text and
  authors.

## Navigation Tips

- Start with `runForocochesPremiumCore.ts` to understand page detection.
- For a thread bug, inspect `threadPageController.ts` first, then follow the
  specific collaborator it calls.
- For post flicker, embed resets, or unexpected `#posts` rebuilds, inspect
  `threadPostRenderer.ts` first, then `threadPageLoader.ts`.
- For a forum-list bug, inspect `forumPageController.ts` first.
- For forum-list scraping that fetches too many or too few pages, inspect
  `forumThreadCacheController.ts`, especially `initializeForumThreadCache`,
  `scrapeRecentForumThreadPages`, and `saveScrapedForumThreadRecords`.
- For selector issues, check `config/selectors.ts` and the relevant
  `adapters/forocoches/*` file before changing controllers.
- For visual regressions, search CSS classes in `src/styles/parts` and then find
  their producers in `src/ui` or `src/app/core`.
- For cache bugs, inspect `services/threadCache/index.ts`, then the specific
  `threadCache.ts`, `forumCache.ts`, or `db.ts` module.
- Use `rg` before opening large files. Many feature names are reflected directly
  in function and file names.

## Testing Checklist

Before handing off a meaningful change:

1. Run `bun run check`.
2. Run `bun run build`.
3. Run `node --check ../forocoches-premium.user.js`.
4. Consider whether `bun run e2e` is appropriate for the change. Use it for
   changes that can affect end-to-end forum/thread behavior, keyboard flows,
   caching, filters, graph views, or generated userscript injection.
5. If styling or interaction changed, test in the user's live Chrome session via
   CDP on port `19999`.
6. For thread-page changes, test at least selection, page navigation, cache
   refresh, and one graph/filter view.
7. For thread render/cache changes, do not rely only on a fully cached thread:
   use `Actualizar cache` to exercise the real scraper path. For flicker fixes,
   observe child-list mutations on `#posts` through CDP so a final correct DOM
   does not hide unnecessary intermediate rebuilds.
8. For forum-list changes, test tag filtering, local search, pagination, hidden
   thread modal, and keyboard selection.
9. For forum-list scraper changes, instrument `window.fetch` through CDP and
   verify how many `forumdisplay.php?page=N` requests are made.
10. If you add a temporary scrape limit, logging, or CDP instrumentation for
   testing, remove it before the final build/commit. Use `rg` for obvious
   leftovers such as `slice(0, 3)`, `TEMP`, `TODO`, and debug logs.

## Playwright E2E

The project has a headed real-site Playwright smoke test at
`tests/forocoches-premium.e2e.spec.ts`. Run it with:

```sh
bun run e2e
```

The E2E test:

- runs against the real ForoCoches site, not mocked pages;
- uses Playwright's bundled Chromium with a persistent profile in
  `tests/.chrome-profile`;
- injects the built userscript directly from `../forocoches-premium.user.js`
  based on parsed `@match` metadata from `src/userscript-header.txt`;
- runs `bun run build` before browser startup so the generated userscript is
  current;
- clears only the userscript IndexedDB state at startup, preserving cookies and
  the browser profile;
- never automates credentials. If the profile is not logged in, the test opens
  the login page and waits for manual login confirmation in the terminal;
- prints every `test.step(...)` in the console via the list reporter, with
  per-step timeouts tuned from observed healthy runs.

Use the E2E test as a regression check when a change touches behavior covered by
the smoke flow: forum scraping/cache, forum filtering and pagination, keyboard
selection, hidden threads, thread loading/cache, breadcrumbs, shortcut help,
quote graph/conversation views, in-thread search, author filters, or hover
cards. Because it depends on live ForoCoches content, prefer robust selectors and
dynamic candidate search over fixed thread titles, tags, users, or post ids.

When adding or changing functionality, decide whether test coverage should change:

- For a new user-visible feature or a new end-to-end workflow, add or extend E2E
  coverage when it makes sense and can be tested reliably against the live site.
- For a bug fix or small modification to an existing covered flow, do not add a
  new E2E test by default; run or adjust the existing smoke flow if the fix
  changes its assumptions.
- For pure domain parsing, cache validation, or helper logic where live-site E2E
  would be brittle or too broad, prefer focused lower-level tests if/when such a
  test harness exists.

## Commit Hygiene

Keep commits focused by feature or refactor step. The generated root userscript
`../forocoches-premium.user.js` should be committed together with source changes
when the build output intentionally changes.

Do not commit temporary test aids such as scrape caps, extra logging, or CDP
instrumentation. Do not stage `../forocoches-premium.user.js.backup-*` files
unless the user explicitly asks for them.
