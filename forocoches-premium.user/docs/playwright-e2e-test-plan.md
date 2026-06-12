# ForoCoches Premium Playwright E2E Test Plan

## Goal

Create one headed Playwright test, running in Chrome, that validates the main
ForoCoches Premium userscript flows against the real ForoCoches site.

The test should be implemented as a single spec with many `test.step(...)`
sections. It must not automate credentials. It should open ForoCoches, guide
the user to the login screen, wait for manual login, and continue only after the
user confirms they are logged in.

## Non-Goals

- Do not create multiple independent tests for these flows.
- Do not mock ForoCoches pages.
- Do not automate login credentials.
- Do not make permanent user-account changes. Any hidden thread must be restored
  before the test exits, including in failure cleanup.

## Browser Profile and Script Injection

Use headed Chrome, not bundled Chromium.

Recommended Playwright setup:

- Use `chromium.launchPersistentContext(userDataDir, { channel: "chrome",
  headless: false })` so the test can optionally reuse an authenticated
  session.
- Put the profile directory inside the future test directory, for example
  `forocoches-premium.user/tests/.chrome-profile`.
- Add that profile directory to `forocoches-premium.user/.gitignore` when the
  test directory is created, so cookies and credentials never enter the repo.
- The test must not require Tampermonkey, Violentmonkey, or any userscript
  extension. It should inject the built userscript directly.
- Run `bun run build` before starting the test so
  `../forocoches-premium.user.js` is current.

Script injection:

1. Read the generated userscript from `../forocoches-premium.user.js`.
2. Read `src/userscript-header.txt` and parse the `@match` directives.
3. Install an init script before the first navigation.
4. On every new document, compare `location.href` against those parsed
   `@match` patterns.
5. Inject/evaluate the userscript only when the URL matches exactly the same
   pages the userscript manager would match.

At the time of writing, the header contains:

```text
@match https://forocoches.com/foro/*
@run-at document-start
```

The implementation should still parse the header instead of hard-coding this
match in the test. If the login URL is inside that match, the script should run
there too. If ForoCoches sends login through a URL outside the match, the test
must not inject the script on that page.

Manual-login flow:

1. Open `https://forocoches.com/foro/` after the init script has been installed.
2. Clear the userscript IndexedDB data immediately, before login and before any
   feature assertions. Do not clear cookies, localStorage, or the browser
   profile.
3. Tell the user in the terminal that they must log in manually.
4. If the page is not logged in, navigate to the login screen or click the login
   entry point.
5. Pause for manual login. Implementation options:
   - Use a terminal prompt such as `Press Enter after logging in`.
   - Or show a small page overlay button that the user clicks after login.
   - Avoid `page.pause()` unless the test will only run in Playwright debug
     mode.
6. After confirmation, assert that the session is logged in by checking for a
   stable logged-in signal, such as the profile link or absence of the login
   form.

The script injection must already be active before this login flow starts. This
lets the test catch regressions where the userscript breaks login or other
pre-authenticated ForoCoches pages that match the userscript header.

## Shared Helpers to Implement

Use helpers to keep the single test readable.

- `gotoGeneral(page)`: navigate to `https://forocoches.com/foro/forumdisplay.php?f=2`.
- `loadUserscriptMetadata()`: read `src/userscript-header.txt` and extract
  `@match` patterns.
- `installUserscriptInjection(context)`: call `context.addInitScript(...)`
  before any page is opened; evaluate the generated userscript only on URLs
  matched by the parsed metadata.
- `waitForPremiumReady(page)`: wait for userscript UI to exist, such as
  `#fc-premium-forum-controls-row` on forum pages or
  `#fc-premium-thread-search-panel` on thread pages.
- `clearPremiumIndexedDb(page, stores?)`: clear the userscript IndexedDB stores
  or delete the userscript database from the ForoCoches origin. It must run once
  at the start of the test before login. It should be a no-op if the database
  does not exist yet.
- `collectRequests(page, predicate)`: record network requests matching a
  predicate, with helpers for distinct `forumdisplay.php?page=N` and
  `showthread.php?page=N` requests.
- `visibleForumRows(page)`: return visible thread rows, excluding hidden rows.
- `visibleThreadPosts(page)`: return visible `.fc-premium-post-wrapper`
  elements, excluding elements hidden by page/filter attributes.
- `selectedForumRow(page)` and `selectedThreadPost(page)`: use
  `[data-fc-premium-selected]`.
- `extractForumThreadTitle(row)`: use `a[id^='thread_title_']`.
- `extractForumThreadTags(row)`: use visible tag chips, preferably
  `[data-fc-premium-tag]`.
- `extractForumThreadReplyCount(row)`: parse the numeric replies/messages field
  from the stats cells on the right. Keep this parser isolated because native
  ForoCoches markup may vary.
- `pickDistinctSearchWord(textA, textB)`: tokenize both strings, normalize
  accents/case/punctuation, and return a word present in `textB` but absent from
  `textA`.
- `waitForForumScrapeIdle(page)`: wait until
  `#fc-premium-forum-loading-status[data-fc-premium-loading="false"]`.
- `waitForThreadLoadIdle(page)`: wait until the thread search/status text no
  longer contains the loading marker.
- `safeRestoreHiddenThread(page, titleOrThreadId)`: best-effort cleanup helper
  used in `finally`.

## Data and State Strategy

The test must always clear userscript IndexedDB state at startup, even when the
browser profile is new or non-persistent. This avoids stale thread/forum cache
state while preserving cookies in the optional persistent profile.

The General page checks need both a fresh-cache pass and a cached reload pass.

Recommended sequence:

1. Create the Chrome context and install userscript injection.
2. Navigate to `https://forocoches.com/foro/`.
3. Clear all userscript IndexedDB data before login.
4. Complete manual login, or confirm the existing session is already logged in.
5. Navigate to General and capture network requests while the initial scrape
   runs against the now-empty IndexedDB cache.
6. Wait for the scraper to become idle.
7. Run cached reload assertions without clearing IndexedDB again.

For thread tests, do not clear all state globally unless needed. The test should
choose a thread dynamically and may rely on the userscript cache behavior. If a
thread must be refreshed, use the visible `Actualizar cache` control instead of
directly deleting records unless the specific check requires a clean cache.

## Single Test Outline

Use one Playwright test:

```text
test("ForoCoches Premium full real-site smoke flow", async ({}, testInfo) => {
  await test.step("Start Chrome and install userscript injection", ...);
  await test.step("Clear userscript IndexedDB", ...);
  await test.step("Manual login", ...);
  await test.step("General initial scrape", ...);
  await test.step("General cached reload", ...);
  ...
});
```

Prefer `test.step` names that match the sections below.

## General Page Flow

### Step 1: Fresh General Scrape

1. Navigate to General.
2. Start request collection for `forumdisplay.php` requests.
3. Reload General if needed to start from a clean post-login General page.
4. Wait for premium UI and forum scrape idle.
5. Assert that pagination exists and exposes more than 3 pages.
6. Assert that requests were made to distinct forum pages through pagination.
   The exact count may depend on the current scraper heuristic, but a fresh
   cache should trigger multiple page requests up to the configured recent-page
   limit or until the scraper stop condition applies.
7. Record:
   - visible thread count
   - first page URL
   - first few visible thread ids/titles

### Step 2: Cached General Reload

1. Stop and reset request collection.
2. Reload General without clearing cache.
3. Wait for premium UI and scrape idle.
4. Assert the visible thread count equals the count recorded before reload.
5. Assert that request volume is low:
   - Ideally zero extra `forumdisplay.php?page=N` requests when page 1 was fully
     cached.
   - Allow a small threshold if the live forum changed while the test was
     running.

### Step 3: Forum Keyboard Selection

1. Assert the first visible thread row has `[data-fc-premium-selected]`.
2. Press `ArrowDown` twice.
3. Assert the third visible thread row is selected.
4. Press `ArrowUp` twice.
5. Assert the first visible thread row is selected again.

### Step 4: Tag Filter

1. Find a visible thread row with at least one tag chip.
2. Click one tag chip.
3. Wait for the forum list to update.
4. Assert every visible thread row contains that tag.
5. Click the same tag again, or use the clear control if that is the stable UI.
6. Assert the filter is removed by checking that at least one visible row no
   longer contains that tag.

### Step 5: Left Panel Toggle

1. Click the left-panel toggle button `#fc-premium-forum-sidebar-toggle`.
2. Assert the native left panel is visible.
3. Click the toggle again.
4. Assert the native left panel is hidden.

If the initial state is unknown, read it first and assert that each click flips
the state.

### Step 6: Forum Pagination

1. Record the current visible thread titles and current URL.
2. Click the next page link in `.pagenav`.
3. Wait for URL/list update.
4. Assert the URL page changes or the visible titles differ.
5. Navigate back to the original General URL before continuing.

### Step 7: Hide and Restore Thread

1. Select a visible thread row and record its title and thread id.
2. Press `h`.
3. Assert the row disappears from the main list.
4. Open the hidden-threads popup via `#fc-premium-hidden-threads-button`.
5. Assert the hidden thread appears in the popup.
6. Click restore for that thread.
7. Assert the thread returns to the main list.
8. Register the hidden thread in cleanup before hiding, and remove it from
   cleanup after restore succeeds.

## Forum Search Flow

1. Before typing anything, record the title of the first visible thread and the
   title of the second visible thread.
2. Tokenize both titles and choose a word present in the second title but absent
   from the first.
3. Type that word into the forum live-search input in the controls row.
4. Wait for filtering to settle.
5. Assert the second thread becomes the first visible result.
6. Press `Enter` in the search input.
7. Assert the URL changes and contains `search.php`, proving backend search was
   submitted.
8. Return to the General URL and wait for premium UI again.

If no suitable distinct word exists in the first two titles, try the third,
fourth, and fifth visible threads before failing with a clear diagnostic.

## Enter a Thread Dynamically

1. On General, find a visible thread with more than 30 messages/replies using
   the right-side stats cells.
2. Record:
   - thread title
   - thread id
   - row index among visible rows
3. Move selection using `ArrowDown` until that row is selected.
4. Press `Enter`.
5. Wait for `showthread.php` URL and premium thread UI.

## Thread Page Core Flow

### Step 1: Layout

1. Assert the normal ForoCoches left column with username/profile image is not
   visible on the thread page.
2. Use a robust check tied to the actual sidebar cell or hidden layout attribute,
   not just generic text.

### Step 2: Post Keyboard Navigation

1. Assert a post is selected.
2. Press `ArrowDown`.
3. Assert the selected post moved to the next visible post.
4. Press `ArrowUp`.
5. Assert selection returned to the original post.

### Step 3: Thread Page Pagination Shortcuts

1. Record current thread page number.
2. Press `ArrowRight`.
3. Assert the thread page URL or active page filter changes to the next page.
4. Press `ArrowLeft`.
5. Assert it returns to the original page.

Skip this step only if the chosen thread genuinely has one page; otherwise the
thread selection step should prefer multi-page threads.

### Step 4: Breadcrumbs

1. Assert the enhanced breadcrumbs contain the thread title recorded before
   entering the thread.
2. Do not validate the full breadcrumb route.

### Step 5: Shortcut Help

1. Assert `#fc-premium-shortcut-help-button` exists.
2. Click it.
3. Assert `#fc-premium-shortcut-help-popover` is visible and contains shortcut
   rows.
4. Click the button again.
5. Assert the popover is hidden.

## Quote and Conversation Flows

The initially chosen thread may not contain all quote cases. Implement a
candidate search loop that can inspect:

- the current thread pages
- later pages of the same thread
- other suitable threads from General
- later General pages if needed

Keep a reasonable cap, for example 5 candidate threads and 5 pages per thread,
then fail with a detailed diagnostic if no suitable case is found. Avoid
unbounded crawling.

### Step 1: Find a Message Quoting an Earlier Message

1. Find a visible post containing an enhanced quote/conversation control. The
   source post must quote an earlier post.
2. Record:
   - source post id
   - quoted post id
   - any recursive quoted ancestors that are already visible or can be resolved
3. Click the "view conversation" control.
4. Assert the view changes, for example by URL query params or changed visible
   post set.
5. Assert the last visible post is the source post.
6. Assert the post immediately before it is the quoted post.
7. If that quoted post quotes another post, assert another ancestor appears
   above it.
8. Continue validating the recursive quote chain upward until reaching a post
   with no quoted ancestor.
9. Use browser Back.
10. Assert the original thread view is restored.

### Step 2: Find a Message That Has Been Quoted

1. Locate a post with a quote badge/link in the top bar, near the post number.
2. Record the target post id referenced by the quote badge.
3. Click the numeric quote link.
4. Assert the URL changes to reference that target post, usually via
   `#post<ID>` or `p=<ID>`.

### Step 3: Find a Message Quoted Multiple Times

1. Search current and later thread pages for a post with the "Ver todas" control
   in its quote badge.
2. Click "Ver todas".
3. Assert a quoted-by view opens.
4. Assert the first visible post is the quoted/root post.
5. Assert multiple visible posts below it quote that root post.

## In-Thread Message Search and Author Filters

1. Return to normal thread view and clear active filters if needed.
2. Record the text of the first visible message and second visible message.
3. Choose a word present in the second message but absent from the first.
4. Type that word in `#fc-premium-thread-search-text`.
5. Wait for filtering to settle.
6. Assert the second message becomes the first visible message.
7. Record the author name of that message.
8. In `#fc-premium-thread-search-author`, search/select that author and click
   Add.
9. Assert the message still appears.
10. Assert a selected-author chip/tag is created for that author.
11. Remove that chip using its `x` button.
12. Search the same word with a different author.
13. If there are no results, assert the empty state is shown.
14. If there are results, assert the first visible message is not authored by
   the original author.
15. Click "Limpiar".
16. Assert all filters are removed.
17. Assert the thread pagination returns to the original total page count
   recorded before filtering.

If no distinct word exists between the first and second messages, try later
visible messages before failing.

## User Hover Card

1. Hover a visible username in a thread post.
2. Wait for the native ForoCoches user card to appear.
3. Assert the card contains the same username.
4. Assert the card contains a profile image.
5. No deeper card validation is required.

## Cleanup

Always run cleanup in `finally`:

- Restore any hidden thread that was hidden during the test.
- Close popovers/modals if left open.
- Return to General if the test needs a known final page.
- Do not clear cookies or log the user out.

## Reliability Notes

- Prefer userscript ids and attributes when available:
  - `#fc-premium-forum-controls-row`
  - `#fc-premium-forum-loading-status`
  - `#fc-premium-forum-sidebar-toggle`
  - `#fc-premium-hidden-threads-button`
  - `#fc-premium-hidden-threads-modal`
  - `#fc-premium-thread-search-panel`
  - `#fc-premium-shortcut-help-button`
  - `[data-fc-premium-selected]`
  - `.fc-premium-post-wrapper`
- Use native ForoCoches selectors only at adapter boundaries, such as
  `#threadslist`, `.pagenav`, and `a[id^='thread_title_']`.
- Avoid fixed thread titles, fixed tags, fixed users, or fixed quote ids.
- Add diagnostic attachments on failure:
  - current URL
  - screenshot
  - visible thread titles or visible post ids
  - captured request URLs
- Keep network request assertions flexible enough for live-site changes but
  strict enough to catch regressions in scraper behavior.
