# Tampermonkey Scripts

Local userscripts for small browser upgrades. The scripts are written in plain
JavaScript and are intended to be tracked by the userscript extension from the
files in this directory.

## Google Search Keyboard Navigation

File: `google-keyboard-navigation.user.js`

Adds keyboard result selection to Google Search pages.

- Selects the first real search result when a results page loads.
- Uses Arrow Up and Arrow Down to move between main results.
- Uses Enter to open the selected result.
- Draws a blue outline around the selected result and scales it slightly.
- Scrolls the selected result into view with smooth scrolling.
- Skips AI Overview results, navigation regions, related-question blocks, and
  nested sitelinks.
- Handles different result layouts, including video and recipe-like cards, by
  splitting multi-result modules into separate selectable owners.

The selector logic is intentionally split into small functions so Google layout
changes can usually be fixed in one place.

## Forocoches Premium

File: `forocoches-premium.user.js`

Improves Forocoches forum and thread pages.

### Thread Reading

On `showthread.php` pages, the script loads every page in the thread one by one
in the background. It parses each post and counts replies by looking for quote
links of the form `showthread.php?p=<postId>#post<postId>` inside post bodies.

After all pages are loaded, it rebuilds the post list so posts with the most
quote replies appear first. Highlighted posts get a visible citation badge such
as `7 citas - pagina 1`, plus compact links to the posts that quoted them.
Posts without quote replies remain after the highlighted group in their original
order. Posts written by the thread author get an `OP` badge so they remain easy
to identify after sorting. Quote links inside posts select and scroll to the
quoted post when it is present in the enhanced view.

Thread pages include view controls:

- `Top citados` links jump directly to the most quoted posts.
- `Citas` sorts every loaded post by quote count.
- `Original` restores chronological thread order while keeping citation badges.
- `Solo citados` shows only posts that were quoted by another post.
- `Compacto` hides bulky author metadata and narrows the author column.
- `Citas compactas` hides embedded quote bodies while keeping quote headers and
  jump links visible.
- `Todas paginas` controls whether the script loads the whole thread or only
  the current page. It is enabled by default.

The summary and controls stay sticky while scrolling through a thread.

The selected view, compact settings, and page-loading mode are saved in
localStorage and reused on later thread pages.
The script also remembers the last selected post per thread and restores it
when that thread is opened again.

### Tags

On forum listing pages, thread title tags written with `+`, such as `+HD` or
`+tocho`, are converted into colored chips. Tag colors are deterministic: the
same tag always gets the same color, and matching is case-insensitive, so `+HD`,
`+hd`, and `+Hd` share a color.

Clicking a tag chip filters the forum listing to threads with that same tag.
The filter bar shows how many threads match and includes a `Limpiar` button to
show every thread again.

### Keyboard Navigation

On forum listing pages:

- The first visible thread is selected by default.
- Arrow Up and Arrow Down move the selection between thread rows.
- Home and End jump to the first or last selectable row.
- Escape clears an active tag filter.
- Enter opens the selected thread.

On thread pages:

- After the quote-ranking pass finishes, the first sorted post is selected.
- Arrow Up and Arrow Down move between sorted posts.
- Home and End jump to the first or last rendered post.
- Enter opens the selected post permalink.

Keyboard handling ignores inputs, textareas, selects, and contenteditable
elements.
