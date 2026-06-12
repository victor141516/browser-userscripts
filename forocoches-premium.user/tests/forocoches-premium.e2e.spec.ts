import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";

type UserscriptMetadata = {
  matches: string[];
};

type RequestCollector = {
  urls: () => string[];
  distinctForumPages: () => number[];
  distinctThreadPages: () => number[];
  reset: () => void;
  stop: () => void;
};

type ForumRowSnapshot = {
  id: string;
  title: string;
  tags: string[];
  replies: number;
  url: string;
  selected: boolean;
};

type ThreadPostSnapshot = {
  id: string;
  author: string;
  text: string;
  selected: boolean;
};

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const PROFILE_DIR = path.join(TEST_DIR, ".chrome-profile");
const USERSCRIPT_PATH = path.resolve(PROJECT_DIR, "..", "forocoches-premium.user.js");
const HEADER_PATH = path.join(PROJECT_DIR, "src", "userscript-header.txt");

const FORUM_HOME_URL = "https://forocoches.com/foro/";
const GENERAL_URL = "https://forocoches.com/foro/forumdisplay.php?f=2";

const FORUM_CONTROLS = "#fc-premium-forum-controls-row";
const FORUM_LOADING_STATUS =
  '#fc-premium-forum-loading-status[data-fc-premium-loading="false"]';
const THREAD_SEARCH_PANEL = "#fc-premium-thread-search-panel";
const SELECTED = "[data-fc-premium-selected]";
const THREAD_TITLE_LINK = "a[id^='thread_title_'][href*='showthread.php?t=']";

// Based on Math.ceil(1.5 * observed duration), with a 3s floor for
// browser-scheduler and live-site jitter on very short steps.
const STEP_TIMEOUTS = {
  generalInitialScrape: 6_150,
  generalCachedReload: 3_000,
  forumKeyboardSelection: 3_000,
  tagFilter: 3_000,
  leftPanelToggle: 3_000,
  forumPagination: 3_000,
  hideAndRestoreThread: 3_000,
  forumSearchFlow: 8_700,
  enterThreadDynamically: 3_000,
  threadLayout: 3_000,
  postKeyboardNavigation: 3_000,
  threadPagePaginationShortcuts: 3_000,
  breadcrumbs: 3_000,
  shortcutHelp: 3_000,
  quoteAndConversationFlows: 15_000,
  threadMessageSearchAndAuthorFilters: 6_600,
  userHoverCard: 3_000,
} as const;

test.describe.configure({ mode: "serial" });
test.setTimeout(30 * 60 * 1000);

test("ForoCoches Premium full real-site smoke flow", async ({}, testInfo) => {
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let hiddenThreadToRestore: Pick<ForumRowSnapshot, "id" | "title"> | null =
    null;
  let generalUrl = GENERAL_URL;
  let selectedThread: ForumRowSnapshot | null = null;

  try {
    await test.step("Start bundled browser and install userscript injection", async () => {
      execFileSync("bun", ["run", "build"], {
        cwd: PROJECT_DIR,
        stdio: "inherit",
      });

      await mkdir(PROFILE_DIR, { recursive: true });
      const metadata = await loadUserscriptMetadata();
      const userscript = await readFile(USERSCRIPT_PATH, "utf8");

      context = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: false,
        viewport: { width: 1440, height: 1000 },
      });
      context.setDefaultTimeout(30_000);
      context.setDefaultNavigationTimeout(90_000);
      await installUserscriptInjection(context, metadata, userscript);

      page = context.pages()[0] ?? (await context.newPage());
      page.setDefaultTimeout(30_000);
      page.setDefaultNavigationTimeout(90_000);
    });

    await test.step("Clear userscript IndexedDB", async () => {
      const activePage = requirePage(page);
      await activePage.goto(FORUM_HOME_URL, { waitUntil: "domcontentloaded" });
      await clearPremiumIndexedDb(activePage);
    });

    await test.step("Manual login", async () => {
      const activePage = requirePage(page);
      await completeManualLogin(activePage);
    });

    let initialForumRows: ForumRowSnapshot[] = [];
    let initialForumRequests: RequestCollector;

    await test.step(
      "General initial scrape",
      async () => {
        const activePage = requirePage(page);
        initialForumRequests = collectRequests(activePage, isForumDisplayRequest);
        await gotoGeneral(activePage);
        generalUrl = activePage.url();
        await waitForPremiumReady(activePage);
        await waitForForumScrapeIdle(activePage);

        const pageCount = await getForumPagerPageCount(activePage);
        expect(pageCount, "General should expose several forum pages").toBeGreaterThan(3);

        initialForumRows = await visibleForumRows(activePage);
        expect(initialForumRows.length, "General should render visible threads").toBeGreaterThan(5);
        expect(
          initialForumRequests.distinctForumPages().length,
          "fresh cache should scrape more than one forum page",
        ).toBeGreaterThanOrEqual(2);
      },
      { timeout: STEP_TIMEOUTS.generalInitialScrape },
    );

    await test.step(
      "General cached reload",
      async () => {
        const activePage = requirePage(page);
        initialForumRequests.reset();
        await activePage.reload({ waitUntil: "domcontentloaded" });
        await waitForPremiumReady(activePage);
        await waitForForumScrapeIdle(activePage);

        const rowsAfterReload = await visibleForumRows(activePage);
        expect(rowsAfterReload.length).toBe(initialForumRows.length);
        expect(
          initialForumRequests.distinctForumPages().length,
          "cached reload should not crawl many forum pages",
        ).toBeLessThanOrEqual(2);
        initialForumRequests.stop();
      },
      { timeout: STEP_TIMEOUTS.generalCachedReload },
    );

    await test.step(
      "Forum keyboard selection",
      async () => {
        const activePage = requirePage(page);
        await expect.poll(() => selectedForumNavigationIndex(activePage)).toBe(0);
        await activePage.keyboard.press("ArrowDown");
        await activePage.keyboard.press("ArrowDown");
        await expect.poll(() => selectedForumNavigationIndex(activePage)).toBe(2);
        await activePage.keyboard.press("ArrowUp");
        await activePage.keyboard.press("ArrowUp");
        await expect.poll(() => selectedForumNavigationIndex(activePage)).toBe(0);
      },
      { timeout: STEP_TIMEOUTS.forumKeyboardSelection },
    );

    await test.step("Tag filter", async () => {
      const activePage = requirePage(page);
      const taggedRow = (await visibleForumRows(activePage)).find(
        (row) => row.tags.length > 0,
      );
      expect(taggedRow, "need a visible thread with a rendered tag").toBeTruthy();
      const tag = taggedRow!.tags[0]!;

      await activePage
        .locator(`[data-fc-premium-tag="${cssString(tag)}"]`)
        .first()
        .click();
      await waitForForumListChange(activePage);
      for (const row of await visibleForumRows(activePage)) {
        expect(row.tags).toContain(tag);
      }

      await activePage
        .locator(`[data-fc-premium-tag="${cssString(tag)}"]`)
        .first()
        .click();
      await waitForForumListChange(activePage);
      expect((await visibleForumRows(activePage)).some((row) => !row.tags.includes(tag))).toBe(
        true,
      );
    }, { timeout: STEP_TIMEOUTS.tagFilter });

    await test.step("Left panel toggle", async () => {
      const activePage = requirePage(page);
      const before = await isForumSidebarHidden(activePage);
      await activePage.locator("#fc-premium-forum-sidebar-toggle").click();
      await expect
        .poll(() => isForumSidebarHidden(activePage))
        .toBe(!before);
      await activePage.locator("#fc-premium-forum-sidebar-toggle").click();
      await expect
        .poll(() => isForumSidebarHidden(activePage))
        .toBe(before);
    }, { timeout: STEP_TIMEOUTS.leftPanelToggle });

    await test.step("Forum pagination", async () => {
      const activePage = requirePage(page);
      const beforeTitles = (await visibleForumRows(activePage)).map((row) => row.title);
      const beforeUrl = activePage.url();
      const nextPage = activePage
        .locator(".pagenav a[href*='forumdisplay.php']")
        .filter({ hasText: /^2$/ })
        .first();
      await expect(nextPage).toBeVisible();
      await nextPage.click();
      await waitForPremiumReady(activePage);
      await waitForForumScrapeIdle(activePage);
      const afterTitles = (await visibleForumRows(activePage)).map((row) => row.title);
      expect(activePage.url() !== beforeUrl || afterTitles.join("\n") !== beforeTitles.join("\n")).toBe(
        true,
      );
      await activePage.goto(beforeUrl, { waitUntil: "domcontentloaded" });
      await waitForPremiumReady(activePage);
      await waitForForumScrapeIdle(activePage);
      generalUrl = activePage.url();
    }, { timeout: STEP_TIMEOUTS.forumPagination });

    await test.step("Hide and restore thread", async () => {
      const activePage = requirePage(page);
      const row = (await visibleForumRows(activePage))[0];
      expect(row, "need a thread to hide").toBeTruthy();
      hiddenThreadToRestore = { id: row!.id, title: row!.title };
      await activePage.keyboard.press("h");
      await expect
        .poll(async () =>
          (await visibleForumRows(activePage)).some((item) => item.id === row!.id),
        )
        .toBe(false);

      await activePage.locator("#fc-premium-hidden-threads-button").click();
      await expect(activePage.locator("#fc-premium-hidden-threads-modal")).toBeVisible();
      const modalRow = activePage
        .locator("#fc-premium-hidden-threads-modal tr")
        .filter({ hasText: row!.title })
        .first();
      await expect(modalRow).toBeVisible();
      await modalRow.locator(".fc-premium-hidden-thread-restore").click();
      await expect
        .poll(async () =>
          (await visibleForumRows(activePage)).some((item) => item.id === row!.id),
        )
        .toBe(true);
      hiddenThreadToRestore = null;
    }, { timeout: STEP_TIMEOUTS.hideAndRestoreThread });

    await test.step("Forum search flow", async () => {
      const activePage = requirePage(page);
      await activePage.goto(generalUrl, { waitUntil: "domcontentloaded" });
      await waitForPremiumReady(activePage);
      await waitForForumScrapeIdle(activePage);
      const rows = await visibleForumRows(activePage);
      const searchCase = pickDistinctSearchCase(rows.map((row) => row.title));
      expect(searchCase, "need a distinct word in the first visible titles").toBeTruthy();

      const searchInput = activePage.locator(`${FORUM_CONTROLS} input[name='query']`);
      await expect(searchInput).toBeVisible();
      await searchInput.fill(searchCase!.word);
      await waitForForumListChange(activePage);
      expect((await visibleForumRows(activePage))[0]?.title).toBe(searchCase!.targetText);

      await Promise.all([
        activePage.waitForURL(/search\.php/, { timeout: 30_000 }),
        searchInput.press("Enter"),
      ]);
      expect(activePage.url()).toContain("search.php");
      await activePage.goto(generalUrl, { waitUntil: "domcontentloaded" });
      await waitForPremiumReady(activePage);
      await waitForForumScrapeIdle(activePage);
    }, { timeout: STEP_TIMEOUTS.forumSearchFlow });

    await test.step("Enter a thread dynamically", async () => {
      const activePage = requirePage(page);
      const rows = await visibleForumRows(activePage);
      const targetIndex = rows.findIndex((row) => row.replies > 30);
      expect(targetIndex, "need a visible thread with more than 30 replies").toBeGreaterThanOrEqual(
        0,
      );
      await moveForumSelectionToIndex(activePage, targetIndex);
      selectedThread = await selectedForumRowSnapshot(activePage);
      expect(selectedThread, "selected forum row should be readable before Enter").toBeTruthy();
      await Promise.all([
        activePage.waitForURL(/showthread\.php/, { timeout: 60_000 }),
        activePage.keyboard.press("Enter"),
      ]);
      await waitForPremiumReady(activePage);
      await waitForThreadLoadIdle(activePage);
    }, { timeout: STEP_TIMEOUTS.enterThreadDynamically });

    await test.step("Thread layout", async () => {
      const activePage = requirePage(page);
      await expect(activePage.locator(".fc-premium-author-cell").first()).not.toBeVisible();
      await expect(activePage.locator(".fc-premium-message-cell").first()).toBeVisible();
    }, { timeout: STEP_TIMEOUTS.threadLayout });

    await test.step("Post keyboard navigation", async () => {
      const activePage = requirePage(page);
      const first = await selectedThreadPostId(activePage);
      await activePage.keyboard.press("ArrowDown");
      await expect.poll(() => selectedThreadPostId(activePage)).not.toBe(first);
      await activePage.keyboard.press("ArrowUp");
      await expect.poll(() => selectedThreadPostId(activePage)).toBe(first);
    }, { timeout: STEP_TIMEOUTS.postKeyboardNavigation });

    await test.step("Thread page pagination shortcuts", async () => {
      const activePage = requirePage(page);
      const totalPages = await getThreadPagerPageCount(activePage);
      if (totalPages <= 1) {
        testInfo.annotations.push({
          type: "skip-step",
          description: "chosen thread only has one page",
        });
        return;
      }
      const originalPage = currentThreadPage(activePage.url());
      await activePage.keyboard.press("ArrowRight");
      await expect.poll(() => currentThreadPage(activePage.url())).toBe(originalPage + 1);
      await activePage.keyboard.press("ArrowLeft");
      await expect.poll(() => currentThreadPage(activePage.url())).toBe(originalPage);
    }, { timeout: STEP_TIMEOUTS.threadPagePaginationShortcuts });

    await test.step("Breadcrumbs", async () => {
      const activePage = requirePage(page);
      await expect
        .poll(async () =>
          normalizeForLooseTextMatch(
            (await activePage.locator(".fc-premium-thread-header-breadcrumbs").textContent()) ||
              "",
          ),
        )
        .toContain(normalizeForLooseTextMatch(selectedThread!.title));
    }, { timeout: STEP_TIMEOUTS.breadcrumbs });

    await test.step("Shortcut help", async () => {
      const activePage = requirePage(page);
      const button = activePage.locator("#fc-premium-shortcut-help-button");
      await expect(button).toBeVisible();
      await button.click();
      await expect(activePage.locator("#fc-premium-shortcut-help-popover")).toBeVisible();
      await expect(activePage.locator(".fc-premium-shortcut-help-row").first()).toBeVisible();
      await button.click();
      await expect(activePage.locator("#fc-premium-shortcut-help-popover")).toBeHidden();
    }, { timeout: STEP_TIMEOUTS.shortcutHelp });

    await test.step("Quote and conversation flows", async () => {
      const activePage = requirePage(page);
      await validateQuoteFlows(activePage, generalUrl);
    }, { timeout: STEP_TIMEOUTS.quoteAndConversationFlows });

    await test.step("In-thread message search and author filters", async () => {
      const activePage = requirePage(page);
      await clearThreadFilters(activePage);
      const posts = await visibleThreadPosts(activePage);
      const searchCase = pickDistinctSearchCase(posts.map((post) => post.text));
      expect(searchCase, "need a distinct word in visible post text").toBeTruthy();

      const textInput = activePage.locator("#fc-premium-thread-search-text");
      await textInput.fill(searchCase!.word);
      await waitForThreadFilterSettle(activePage);
      const searchResults = await visibleThreadPosts(activePage);
      const firstResult = searchResults[0];
      expect(normalizeForLooseTextMatch(firstResult?.text || "")).toContain(
        normalizeForLooseTextMatch(searchCase!.word),
      );
      expect(searchResults.some((post) => post.text === searchCase!.targetText)).toBe(true);
      expect(firstResult?.author).toBeTruthy();

      const originalAuthor = firstResult!.author;
      await activePage.locator("#fc-premium-thread-search-author").fill(originalAuthor);
      await activePage.getByRole("button", { name: "Añadir" }).click();
      await waitForThreadFilterSettle(activePage);
      await expect(activePage.locator("#fc-premium-thread-search-selected-authors")).toContainText(
        originalAuthor,
      );

      await activePage
        .locator("#fc-premium-thread-search-selected-authors button")
        .filter({ hasText: /x|×|remove|quitar/i })
        .first()
        .click();
      await waitForThreadFilterSettle(activePage);

      const differentAuthor = (await visibleThreadPosts(activePage)).find(
        (post) => post.author && post.author !== originalAuthor,
      )?.author;
      if (differentAuthor) {
        await activePage.locator("#fc-premium-thread-search-author").fill(differentAuthor);
        await activePage.getByRole("button", { name: "Añadir" }).click();
        await waitForThreadFilterSettle(activePage);
        const visiblePosts = await visibleThreadPosts(activePage);
        if (visiblePosts.length === 0) {
          await expect(activePage.locator("#fc-premium-thread-search-empty")).toBeVisible();
        } else {
          expect(visiblePosts[0]!.author).not.toBe(originalAuthor);
        }
      }

      await activePage.getByRole("button", { name: "Limpiar" }).click();
      await waitForThreadFilterSettle(activePage);
      await expect(activePage.locator("#fc-premium-thread-search-text")).toHaveValue("");
      await expect(activePage.locator("#fc-premium-thread-search-selected-authors")).toBeEmpty();
    }, { timeout: STEP_TIMEOUTS.threadMessageSearchAndAuthorFilters });

    await test.step("User hover card", async () => {
      const activePage = requirePage(page);
      await clearThreadFilters(activePage);
      const username = activePage
        .locator(
          ".fc-premium-post-wrapper:not([data-fc-premium-filter-hidden]):not([data-fc-premium-page-hidden]) .fc-premium-header-author a",
        )
        .first();
      await expect(username).toBeVisible();
      const usernameText = ((await username.textContent()) || "").trim();
      await username.hover();
      const card = username
        .locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' fc-premium-header-author ')][1]")
        .locator(".fc-premium-author-hover-card");
      await expect(card).toBeVisible();
      await expect(card).toContainText(new RegExp(escapeRegExp(usernameText), "i"));
      await expect(card.locator("img").first()).toBeVisible();
    }, { timeout: STEP_TIMEOUTS.userHoverCard });
  } catch (error) {
    if (page) {
      await attachDiagnostics(testInfo, page, "failure");
    }
    throw error;
  } finally {
    const cleanupPage = page as Page | null;
    const cleanupContext = context as BrowserContext | null;
    if (cleanupPage) {
      await safeRestoreHiddenThread(cleanupPage, hiddenThreadToRestore);
      await closeOpenOverlays(cleanupPage);
      await cleanupPage.goto(GENERAL_URL, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    }
    await cleanupContext?.close();
  }
});

async function loadUserscriptMetadata(): Promise<UserscriptMetadata> {
  const header = await readFile(HEADER_PATH, "utf8");
  const matches = header
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*\/\/\s*@match\s+(.+?)\s*$/)?.[1])
    .filter((match): match is string => Boolean(match));

  if (matches.length === 0) {
    throw new Error("No @match directives found in userscript header");
  }

  return { matches };
}

async function installUserscriptInjection(
  context: BrowserContext,
  metadata: UserscriptMetadata,
  userscript: string,
): Promise<void> {
  await context.addInitScript({
    content: `
(() => {
  const matches = ${JSON.stringify(metadata.matches)};
  const source = ${JSON.stringify(userscript)};

  function escapeRegExp(value) {
    return value.replace(/[|\\\\{}()[\\]^$+?.*]/g, "\\\\$&");
  }

  function userscriptMatchToRegExp(pattern) {
    const match = pattern.match(/^(\\*|http|https|file):\\/\\/([^/]*)(\\/.*)$/);
    if (!match) {
      return null;
    }
    const [, scheme, host, pathname] = match;
    const schemePart = scheme === "*" ? "https?" : escapeRegExp(scheme);
    const hostPart = host === "*"
      ? "[^/]+"
      : host.startsWith("*.") 
        ? "(?:[^/]+\\\\.)?" + escapeRegExp(host.slice(2))
        : escapeRegExp(host).replace(/\\\\\\*/g, "[^/]*");
    const pathPart = escapeRegExp(pathname).replace(/\\\\\\*/g, ".*");
    return new RegExp("^" + schemePart + "://" + hostPart + pathPart + "$");
  }

  const href = location.href;
  if (!matches.some((pattern) => userscriptMatchToRegExp(pattern)?.test(href))) {
    return;
  }

  (0, eval)(source + "\\n//# sourceURL=forocoches-premium.user.js");
})();
`,
  });
}

async function gotoGeneral(page: Page): Promise<void> {
  await page.goto(GENERAL_URL, { waitUntil: "domcontentloaded" });
}

async function waitForPremiumReady(page: Page): Promise<void> {
  if (/showthread\.php/.test(page.url())) {
    await expect(page.locator(THREAD_SEARCH_PANEL)).toBeVisible({ timeout: 120_000 });
    return;
  }

  await expect(page.locator(FORUM_CONTROLS)).toBeVisible({ timeout: 120_000 });
}

async function waitForForumScrapeIdle(page: Page): Promise<void> {
  await expect(page.locator(FORUM_LOADING_STATUS)).toBeAttached({ timeout: 180_000 });
}

async function waitForThreadLoadIdle(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      normalizeText(
        (await page.locator("#fc-premium-thread-search-status").textContent().catch(() => "")) ||
          "",
      ),
    { timeout: 180_000 })
    .not.toMatch(/cargando|actualizando|loading/);
}

async function clearPremiumIndexedDb(page: Page, stores?: string[]): Promise<void> {
  await page.evaluate(
    async ({ requestedStores }) => {
      const databaseName = "fcPremiumThreadCache";
      const databases = "databases" in indexedDB
        ? await indexedDB.databases().catch(() => [])
        : [];
      if (
        databases.length > 0 &&
        !databases.some((database) => database.name === databaseName)
      ) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const storeNames = requestedStores?.length
            ? requestedStores.filter((name) => db.objectStoreNames.contains(name))
            : Array.from(db.objectStoreNames);

          if (storeNames.length === 0) {
            db.close();
            resolve();
            return;
          }

          const transaction = db.transaction(storeNames, "readwrite");
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };

          for (const storeName of storeNames) {
            transaction.objectStore(storeName).clear();
          }
        };
        request.onupgradeneeded = () => {
          request.transaction?.abort();
        };
      });
    },
    { requestedStores: stores },
  );
}

function collectRequests(page: Page, predicate: (request: Request) => boolean): RequestCollector {
  let captured: string[] = [];
  const listener = (request: Request) => {
    if (predicate(request)) {
      captured.push(request.url());
    }
  };
  page.on("request", listener);

  return {
    urls: () => [...captured],
    distinctForumPages: () => distinctPageNumbers(captured, "forumdisplay.php"),
    distinctThreadPages: () => distinctPageNumbers(captured, "showthread.php"),
    reset: () => {
      captured = [];
    },
    stop: () => {
      page.off("request", listener);
    },
  };
}

async function visibleForumRows(page: Page): Promise<ForumRowSnapshot[]> {
  return page.evaluate((threadTitleLink) => {
    function text(element: Element | null): string {
      return (element?.textContent || "").replace(/\s+/g, " ").trim();
    }

    function threadIdFromUrl(url: string): string {
      return new URL(url, location.href).searchParams.get("t") || "";
    }

    function parseReplyCount(row: HTMLTableRowElement): number {
      const cells = Array.from(row.cells).slice(-4);
      const candidates = cells
        .map((cell) => text(cell).match(/\d[\d.]*/)?.[0]?.replace(/\./g, ""))
        .filter((value): value is string => Boolean(value))
        .map(Number)
        .filter(Number.isFinite);
      return candidates[0] || 0;
    }

    function isVisible(element: Element): boolean {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }

    return Array.from(document.querySelectorAll("tr"))
      .filter((row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement)
      .map((row) => {
        const link = row.querySelector(threadTitleLink);
        if (!(link instanceof HTMLAnchorElement)) {
          return null;
        }
        if (!isVisible(row) || !isVisible(link) || row.hasAttribute("data-fc-premium-tag-hidden")) {
          return null;
        }
        return {
          id: link.id.match(/thread_title_(\d+)/)?.[1] || threadIdFromUrl(link.href),
          title: text(link),
          tags: Array.from(row.querySelectorAll("[data-fc-premium-tag]"))
            .map((tag) => tag.getAttribute("data-fc-premium-tag") || text(tag))
            .filter(Boolean),
          replies: parseReplyCount(row),
          url: link.href,
          selected: row.hasAttribute("data-fc-premium-selected"),
        };
      })
      .filter((row): row is ForumRowSnapshot => Boolean(row));
  }, THREAD_TITLE_LINK);
}

async function visibleThreadPosts(page: Page): Promise<ThreadPostSnapshot[]> {
  return page.evaluate(() => {
    function clean(value: string): string {
      return value.replace(/\s+/g, " ").trim();
    }

    return Array.from(document.querySelectorAll(".fc-premium-post-wrapper"))
      .filter((wrapper): wrapper is HTMLElement => wrapper instanceof HTMLElement)
      .filter((wrapper) => {
        const style = getComputedStyle(wrapper);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          !wrapper.hasAttribute("data-fc-premium-filter-hidden") &&
          !wrapper.hasAttribute("data-fc-premium-page-hidden")
        );
      })
      .map((wrapper) => {
        const post = wrapper.querySelector("table[id^='post']");
        const message = wrapper.querySelector("[id^='post_message_']");
        return {
          id: post?.id.match(/^post(\d+)$/)?.[1] || "",
          author: clean(wrapper.querySelector(".bigusername")?.textContent || ""),
          text: clean(message?.textContent || wrapper.textContent || ""),
          selected: wrapper.hasAttribute("data-fc-premium-selected"),
        };
      })
      .filter((post) => post.id && post.text);
  });
}

async function selectedForumNavigationIndex(page: Page): Promise<number> {
  return page.evaluate((threadTitleLink) => {
    function isVisible(element: Element): boolean {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }

    const rows = Array.from(document.querySelectorAll(threadTitleLink))
      .filter((link): link is HTMLAnchorElement => link instanceof HTMLAnchorElement)
      .filter(isVisible)
      .map((link) => link.closest("tr"))
      .filter((row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement);

    return rows.findIndex((row) => row.hasAttribute("data-fc-premium-selected"));
  }, THREAD_TITLE_LINK);
}

async function moveForumSelectionToIndex(page: Page, targetIndex: number): Promise<void> {
  let currentIndex = await selectedForumNavigationIndex(page);
  expect(currentIndex, "a forum row should be selected before moving").toBeGreaterThanOrEqual(0);

  while (currentIndex < targetIndex) {
    await page.keyboard.press("ArrowDown");
    currentIndex += 1;
  }

  while (currentIndex > targetIndex) {
    await page.keyboard.press("ArrowUp");
    currentIndex -= 1;
  }

  await expect.poll(() => selectedForumNavigationIndex(page)).toBe(targetIndex);
}

async function selectedForumRowSnapshot(page: Page): Promise<ForumRowSnapshot | null> {
  return page.evaluate((threadTitleLink) => {
    function text(element: Element | null): string {
      return (element?.textContent || "").replace(/\s+/g, " ").trim();
    }

    function threadIdFromUrl(url: string): string {
      return new URL(url, location.href).searchParams.get("t") || "";
    }

    function parseReplyCount(row: HTMLTableRowElement): number {
      const cells = Array.from(row.cells).slice(-4);
      const candidates = cells
        .map((cell) => text(cell).match(/\d[\d.]*/)?.[0]?.replace(/\./g, ""))
        .filter((value): value is string => Boolean(value))
        .map(Number)
        .filter(Number.isFinite);
      return candidates[0] || 0;
    }

    const row = document.querySelector("tr[data-fc-premium-selected]");
    if (!(row instanceof HTMLTableRowElement)) {
      return null;
    }

    const link = row.querySelector(threadTitleLink);
    if (!(link instanceof HTMLAnchorElement)) {
      return null;
    }

    return {
      id: link.id.match(/thread_title_(\d+)/)?.[1] || threadIdFromUrl(link.href),
      title: text(link),
      tags: Array.from(row.querySelectorAll("[data-fc-premium-tag]"))
        .map((tag) => tag.getAttribute("data-fc-premium-tag") || text(tag))
        .filter(Boolean),
      replies: parseReplyCount(row),
      url: link.href,
      selected: true,
    };
  }, THREAD_TITLE_LINK);
}

async function selectedThreadPostId(page: Page): Promise<string> {
  return page
    .locator(`.fc-premium-post-wrapper${SELECTED} table[id^='post']`)
    .first()
    .evaluate((element) => element.id.replace(/^post/, ""));
}

async function completeManualLogin(page: Page): Promise<void> {
  if (await isLoggedIn(page)) {
    console.log("\nForoCoches session already appears logged in; continuing.\n");
    return;
  }

  await openLoginScreen(page);
  console.log(
    "\nForoCoches login needed: use the headed browser window to log in manually.",
  );
  await waitForManualLoginConfirmation();
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);

  await expect
    .poll(() => isLoggedIn(page), {
      message: "manual login confirmation must leave an authenticated page",
      timeout: 120_000,
    })
    .toBe(true);
}

async function openLoginScreen(page: Page): Promise<void> {
  const loginLink = page
    .locator("a[href*='login.php'], input[type='submit'], button")
    .filter({ hasText: /entrar|identificar|login|acceder/i })
    .first();
  if (await loginLink.isVisible().catch(() => false)) {
    await loginLink.click();
    return;
  }
  await page.goto("https://forocoches.com/foro/login.php", { waitUntil: "domcontentloaded" });
}

async function waitForManualLoginConfirmation(): Promise<void> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await readline.question("Press Enter here after ForoCoches is logged in...");
  } finally {
    readline.close();
  }
}

async function isLoggedIn(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const bodyText = document.body?.textContent || "";
    const hasLoginPassword = Boolean(
      document.querySelector("input[name='vb_login_password'], input[type='password']"),
    );
    const hasProfileSignal = Array.from(document.querySelectorAll("a[href*='member.php?u=']")).some(
      (link) => /tu perfil/i.test(link.textContent || ""),
    );
    const hasLogoutSignal = /cerrar sesi[oó]n|logout|salir/i.test(bodyText);
    return (hasProfileSignal || hasLogoutSignal) && !hasLoginPassword;
  });
}

async function getForumPagerPageCount(page: Page): Promise<number> {
  return page.locator(".pagenav a[href*='forumdisplay.php']").evaluateAll((links) => {
    return Math.max(
      0,
      ...links.map((link) => Number((link.textContent || "").replace(/\D/g, "")) || 0),
    );
  });
}

async function getThreadPagerPageCount(page: Page): Promise<number> {
  const currentPage = currentThreadPage(page.url());
  return page.locator(".pagenav a[href*='showthread.php']").evaluateAll((links, pageNumber) => {
    return Math.max(
      pageNumber,
      ...links.map((link) => Number((link.textContent || "").replace(/\D/g, "")) || 0),
    );
  }, currentPage);
}

async function isForumSidebarHidden(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-fc-premium-layout-hidden='true']")).some(
      (element) => element instanceof HTMLTableCellElement && element.textContent?.trim(),
    ),
  );
}

async function waitForForumListChange(page: Page): Promise<void> {
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelectorAll("a[id^='thread_title_']").length > 0);
}

async function waitForThreadFilterSettle(page: Page): Promise<void> {
  await page.waitForTimeout(300);
  await waitForThreadLoadIdle(page);
}

async function clearThreadFilters(page: Page): Promise<void> {
  const clearButton = page.getByRole("button", { name: "Limpiar" });
  if (await clearButton.isVisible().catch(() => false)) {
    await clearButton.click();
    await waitForThreadFilterSettle(page);
  }
}

async function validateQuoteFlows(page: Page, generalUrl: string): Promise<void> {
  const found = await findQuoteCandidate(page, generalUrl);
  expect(found, "need a candidate thread/page with quote controls").toBe(true);

  const viewAll = page.getByRole("button", { name: "Ver todas" }).first();
  await expect(viewAll).toBeVisible();
  const rootPostId = await viewAll.evaluate((button) => {
    const wrapper = button.closest(".fc-premium-post-wrapper");
    return wrapper?.querySelector("table[id^='post']")?.id.replace(/^post/, "") || "";
  });
  await viewAll.click();
  await expect(page).toHaveURL(/fcp_graph=quoted-by/);
  const quotedByPosts = await visibleThreadPosts(page);
  expect(quotedByPosts[0]?.id).toBe(rootPostId);
  expect(quotedByPosts.length).toBeGreaterThanOrEqual(3);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitForPremiumReady(page);
  await waitForThreadLoadIdle(page);

  const quoteLink = page.locator(".fc-premium-reply-badge a[href*='showthread.php']").first();
  await expect(quoteLink).toBeVisible();
  const target = await quoteLink.evaluate((link) =>
    new URL((link as HTMLAnchorElement).href).hash.replace(/^#post/, ""),
  );
  await quoteLink.click();
  await expect
    .poll(() => page.url())
    .toMatch(new RegExp(`(?:#post${target}|[?&]p=${target})`));
}

async function findQuoteCandidate(page: Page, generalUrl: string): Promise<boolean> {
  for (let threadIndex = 0; threadIndex < 5; threadIndex += 1) {
    if (threadIndex > 0) {
      await page.goto(generalUrl, { waitUntil: "domcontentloaded" });
      await waitForPremiumReady(page);
      await waitForForumScrapeIdle(page);
      for (let index = 0; index < threadIndex; index += 1) {
        await page.keyboard.press("ArrowDown");
      }
      await Promise.all([
        page.waitForURL(/showthread\.php/, { timeout: 60_000 }),
        page.keyboard.press("Enter"),
      ]);
      await waitForPremiumReady(page);
      await waitForThreadLoadIdle(page);
    }

    for (let pageIndex = 0; pageIndex < 5; pageIndex += 1) {
      if (
        (await page.locator(".fc-premium-quote-actions button").count()) > 0 &&
        (await page.locator(".fc-premium-reply-badge a[href*='showthread.php']").count()) > 0 &&
        (await page.getByRole("button", { name: "Ver todas" }).count()) > 0 &&
        (await validateConversationCandidate(page))
      ) {
        return true;
      }

      const before = page.url();
      await page.keyboard.press("ArrowRight");
      await waitForThreadLoadIdle(page).catch(() => undefined);
      if (page.url() === before) {
        break;
      }
    }
  }

  return false;
}

async function validateConversationCandidate(page: Page): Promise<boolean> {
  const buttons = page.locator(".fc-premium-quote-actions button", {
    hasText: "Ver conversación",
  });
  const count = Math.min(await buttons.count(), 5);

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) {
      continue;
    }

    const sourcePostId = await button.evaluate((element) => {
      const wrapper = element.closest(".fc-premium-post-wrapper");
      return wrapper?.querySelector("table[id^='post']")?.id.replace(/^post/, "") || "";
    });
    const quotedPostId = await button.evaluate((element) => {
      const quote = element.closest("[data-fc-premium-quote-block]");
      return quote?.getAttribute("data-fc-premium-quote-block") || "";
    });

    if (!sourcePostId || !quotedPostId) {
      continue;
    }

    await button.click();
    await expect(page).toHaveURL(/fcp_graph=conversation/);
    const conversationPosts = await visibleThreadPosts(page);
    const isValid =
      conversationPosts.at(-1)?.id === sourcePostId &&
      conversationPosts.at(-2)?.id === quotedPostId;

    await page.goBack({ waitUntil: "domcontentloaded" });
    await waitForPremiumReady(page);
    await waitForThreadLoadIdle(page);

    if (isValid) {
      return true;
    }
  }

  return false;
}

async function safeRestoreHiddenThread(
  page: Page,
  hiddenThread: Pick<ForumRowSnapshot, "id" | "title"> | null,
): Promise<void> {
  if (!hiddenThread) {
    return;
  }

  await page.goto(GENERAL_URL, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await waitForPremiumReady(page).catch(() => undefined);
  const button = page.locator("#fc-premium-hidden-threads-button");
  if (!(await button.isVisible().catch(() => false))) {
    return;
  }
  await button.click().catch(() => undefined);
  const modalRow = page
    .locator("#fc-premium-hidden-threads-modal tr")
    .filter({ hasText: hiddenThread.title })
    .first();
  if (await modalRow.isVisible().catch(() => false)) {
    await modalRow.locator(".fc-premium-hidden-thread-restore").click().catch(() => undefined);
  }
}

async function closeOpenOverlays(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.evaluate(() => {
    document.getElementById("__fcPremiumManualLoginOverlay")?.remove();
    document
      .querySelectorAll<HTMLButtonElement>("#fc-premium-hidden-threads-modal button")
      .forEach((button) => {
        if (/cerrar/i.test(button.textContent || "")) {
          button.click();
        }
      });
  }).catch(() => undefined);
}

async function attachDiagnostics(
  testInfo: TestInfo,
  page: Page,
  prefix: string,
): Promise<void> {
  await testInfo.attach(`${prefix}-url`, {
    body: page.url(),
    contentType: "text/plain",
  });
  await testInfo.attach(`${prefix}-visible-forum-rows`, {
    body: JSON.stringify(await visibleForumRows(page).catch(() => []), null, 2),
    contentType: "application/json",
  });
  await testInfo.attach(`${prefix}-visible-thread-posts`, {
    body: JSON.stringify(await visibleThreadPosts(page).catch(() => []), null, 2),
    contentType: "application/json",
  });
  await testInfo.attach(`${prefix}-screenshot`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

function distinctPageNumbers(urls: string[], pathname: string): number[] {
  return Array.from(
    new Set(
      urls
        .map((url) => new URL(url))
        .filter((url) => url.pathname.endsWith(pathname))
        .map((url) => Number(url.searchParams.get("page") || "1"))
        .filter(Number.isFinite),
    ),
  ).sort((a, b) => a - b);
}

function isForumDisplayRequest(request: Request): boolean {
  return request.url().includes("/foro/forumdisplay.php");
}

function pickDistinctSearchCase(texts: string[]): { word: string; targetText: string } | null {
  const previousWords = new Set(tokenize(texts[0] || ""));
  for (const text of texts.slice(1, 8)) {
    const word = tokenize(text).find((candidate) => !previousWords.has(candidate));
    if (word) {
      return { word, targetText: text };
    }
    for (const token of tokenize(text)) {
      previousWords.add(token);
    }
  }
  return null;
}

function tokenize(value: string): string[] {
  const ignoredWords = new Set([
    "cita",
    "citas",
    "conversacion",
    "mensaje",
    "mensajes",
    "oculto",
    "usuario",
    "lista",
    "ignorados",
    "quitar",
    "porque",
    "para",
    "como",
    "este",
    "esta",
    "ver",
  ]);

  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((word) => word.length >= 4 && !ignoredWords.has(word));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("es");
}

function normalizeForLooseTextMatch(value: string): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function currentThreadPage(url: string): number {
  const parsed = new URL(url);
  return Number(parsed.searchParams.get("page") || parsed.searchParams.get("fcp_page") || "1");
}

function cssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requirePage(page: Page | null): Page {
  if (!page) {
    throw new Error("Playwright page was not initialized");
  }
  return page;
}
