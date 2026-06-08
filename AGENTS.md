# Development Notes

## Script Creation

When a new script is needed, create a new `.user.js` file in this directory with
Tampermonkey metadata headers before adding implementation code.

After creating a new script file, ask the user to add it to the userscript
extension and enable the extension's file tracking option. The extension should
watch the local file and update the installed userscript whenever the file
changes.

## Code Style

- Write scripts in JavaScript.
- Use JSDoc typedefs and parameter/return annotations wherever practical.
- Prefer stable selectors over generated or obfuscated class names.
- Keep selector logic modular so individual site layout changes are easy to fix.
- Keep each userscript self-contained unless the user asks for shared tooling.

## Testing

Test browser behavior with the Chrome DevTools Protocol.

- Default CDP port: `19999`.
- If port `19999` is not available, ask the user to open Chrome with DevTools
  Protocol on that port, or ask which port is currently being used.
- Prefer testing in the user's existing browser session so cookies and logged-in
  state match real usage.
- For new tabs opened through `/json/new`, wait until the tab has navigated away
  from `about:blank` before injecting or evaluating page-specific code.

Useful checks:

- Run `node --check <script>.user.js` after edits.
- Verify selectors in the live page before relying on them.
- Exercise keyboard shortcuts with real or synthetic CDP keyboard events.
- Confirm visual state through computed styles or screenshots when styling
  changes matter.

## Git

Make a separate commit for each meaningful change or feature. Keep commits
focused: implementation, visual improvement, keyboard behavior, and docs should
be separate when they are developed separately.
