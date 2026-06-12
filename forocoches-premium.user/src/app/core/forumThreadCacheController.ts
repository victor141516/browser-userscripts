import {
  FORUM_THREAD_CACHE_RECENT_PAGES,
  PAGE_LOAD_DELAY_MS,
} from "../../config/constants";
import type { ForumThreadLoadState, ForumThreadRecord, NavigationItem } from "../../domain/types";
import {
  filterForumThreadRecords,
  getHiddenForumThreadRecords,
  getVisibleForumThreadRecords,
} from "../../domain/forumThreads";
import { sleep, getThreadId, getPageNumber, getForumId } from "../../shared/dom";
import {
  cleanupForumThreadCache,
  readForumThreadCacheRecords,
  writeForumThreadCacheRecords,
} from "../../services/threadCache";
import {
  fetchThreadDocument,
  parseHtml,
} from "../../adapters/forocoches/threadParser";
import { collectForumThreadRecords } from "../../adapters/forocoches/forumThreadParser";
import { clearForumStateQueryParams } from "../../services/queryState";
import { runCacheOperation } from "./cacheOperation";

export interface ForumThreadCacheControllerOptions {
  getActiveForumSearchQuery: () => string;
  setActiveForumSearchQuery: (query: string) => void;
  setActiveTagFilter: (tag: string | null) => void;
  setActiveForumTagPage: (page: number) => void;
  getForumThreadsPerPage: () => number;
  getForumThreadLoadState: () => ForumThreadLoadState;
  setForumThreadLoadState: (state: Partial<ForumThreadLoadState>) => void;
  setNativeForumThreadRows: (
    rowHtmlList: string[],
    pageSize: number,
    signatureKey: string,
  ) => boolean;
  applyHiddenForumThreadRows: () => void;
  refreshForumTagUi: () => void;
  renderTopTagBar: () => void;
  updateBrowserHistory: (url: URL, historyMode: "push" | "replace") => void;
  refreshNavigation: (options?: {
    reset?: boolean;
    scroll?: boolean;
    updateUrl?: boolean;
  }) => void;
  getSelectedNavigationItem: () => NavigationItem | null;
  getNavigationItems: () => NavigationItem[];
  getNavigationLength: () => number;
  selectNavigationIndex: (index: number, options?: { scroll?: boolean }) => void;
  isHiddenThreadsModalOpen: () => boolean;
  renderHiddenThreadsModalBody: () => void;
}

export interface ForumThreadCacheController {
  getCachedForumThreadsForCurrentForum(): ForumThreadRecord[];
  getVisibleCachedForumThreadsForCurrentForum(): ForumThreadRecord[];
  getHiddenForumThreadRecordsForCurrentForum(): ForumThreadRecord[];
  getForumThreadRecordsForTag(tag: string | null): ForumThreadRecord[];
  loadForumDisplayPageWithJavascript(url: URL): Promise<void>;
  initializeForumThreadCache(): Promise<void>;
  setForumThreadHiddenState(threadId: string, hidden: boolean): Promise<boolean>;
  hideSelectedForumThread(): Promise<boolean>;
}

export function createForumThreadCacheController(
  options: ForumThreadCacheControllerOptions,
): ForumThreadCacheController {
  let forumThreadScrapeStarted = false;
  let cachedForumThreads: ForumThreadRecord[] = [];

  function getCachedForumThreadsForCurrentForum(): ForumThreadRecord[] {
    const forumId = getForumId();

    return cachedForumThreads.filter((record) => record.forumId === forumId);
  }

  function getVisibleCachedForumThreadsForCurrentForum(): ForumThreadRecord[] {
    return getVisibleForumThreadRecords(getCachedForumThreadsForCurrentForum());
  }

  function getHiddenForumThreadRecordsForCurrentForum(): ForumThreadRecord[] {
    return getHiddenForumThreadRecords(getCachedForumThreadsForCurrentForum());
  }

  function getForumThreadRecordsForTag(
    tag: string | null,
  ): ForumThreadRecord[] {
    return filterForumThreadRecords(getCachedForumThreadsForCurrentForum(), {
      tag,
      searchQuery: options.getActiveForumSearchQuery(),
    });
  }

  function getCachedForumThreadIdsForCurrentForum(): Set<string> {
    return new Set(
      getCachedForumThreadsForCurrentForum().map((record) => record.id),
    );
  }

  function wereAllForumThreadRecordsAlreadyCached(
    records: ForumThreadRecord[],
    cachedThreadIds: Set<string>,
  ): boolean {
    return records.length > 0 &&
      records.every((record) => cachedThreadIds.has(record.id));
  }

  function mergeCachedForumThreadRecords(records: ForumThreadRecord[]) {
    if (records.length === 0) {
      return;
    }

    const byId = new Map(
      cachedForumThreads.map((record) => [record.id, record]),
    );

    for (const record of records) {
      const previous = byId.get(record.id);
      byId.set(record.id, {
        ...record,
        isHidden: Boolean(previous?.isHidden || record.isHidden),
        hiddenAt: previous?.hiddenAt || record.hiddenAt || 0,
      });
    }

    cachedForumThreads = Array.from(byId.values());
  }

  function collectCurrentForumThreadRecords(): ForumThreadRecord[] {
    const forumId = getForumId();

    if (!forumId) {
      return [];
    }

    return collectForumThreadRecords(
      document,
      location.href,
      forumId,
      getPageNumber(new URL(location.href)),
      options.getForumThreadsPerPage(),
      Date.now(),
    );
  }

  function getCurrentForumThreadRecord(
    threadId: string,
  ): ForumThreadRecord | null {
    return (
      collectCurrentForumThreadRecords().find(
        (record) => record.id === threadId,
      ) || null
    );
  }

  async function cacheCurrentForumThreadRows(): Promise<void> {
    const records = collectCurrentForumThreadRecords();

    if (records.length === 0) {
      return;
    }

    mergeCachedForumThreadRecords(records);
    await runCacheOperation(
      writeForumThreadCacheRecords(
        records
          .map((record) =>
            cachedForumThreads.find(
              (cachedRecord) => cachedRecord.id === record.id,
            ),
          )
          .filter((record) => record !== undefined),
      ),
      undefined,
      "guardar pagina actual",
    );
  }

  async function setForumThreadHiddenState(
    threadId: string,
    hidden: boolean,
  ): Promise<boolean> {
    if (!threadId) {
      return false;
    }

    const now = Date.now();
    let existing =
      cachedForumThreads.find((record) => record.id === threadId) ||
      getCurrentForumThreadRecord(threadId);

    if (hidden && getCachedForumThreadsForCurrentForum().length === 0) {
      await cacheCurrentForumThreadRows();
      existing =
        cachedForumThreads.find((record) => record.id === threadId) || existing;
    }

    if (!existing) {
      return false;
    }

    const record = {
      ...existing,
      isHidden: hidden,
      hiddenAt: hidden ? now : 0,
      updatedAt: now,
    };

    cachedForumThreads = cachedForumThreads
      .filter((cachedRecord) => cachedRecord.id !== threadId)
      .concat(record);

    await runCacheOperation(
      writeForumThreadCacheRecords([record]),
      undefined,
      "guardar hilo oculto",
    );
    options.refreshForumTagUi();

    if (options.isHiddenThreadsModalOpen()) {
      options.renderHiddenThreadsModalBody();
    }

    return true;
  }

  async function hideSelectedForumThread(): Promise<boolean> {
    const selected = options.getSelectedNavigationItem();
    const link = selected?.link;
    const threadId = link ? getThreadId(new URL(link.href)) : null;

    if (!threadId) {
      return false;
    }

    const previousIndex = Math.max(
      options.getNavigationItems().findIndex((item) => item === selected),
      0,
    );
    const hidden = await setForumThreadHiddenState(threadId, true);

    if (hidden && options.getNavigationLength() > 0) {
      options.selectNavigationIndex(
        Math.min(previousIndex, options.getNavigationLength() - 1),
      );
    }

    return hidden;
  }

  function getForumRecentPageUrl(pageNumber: number): URL {
    const url = new URL(location.href);
    clearForumStateQueryParams(url);
    url.hash = "";
    url.searchParams.delete("page");

    if (pageNumber > 1) {
      url.searchParams.set("page", String(pageNumber));
    }

    return url;
  }

  function replaceForumPagersFromDocument(doc: Document): void {
    const currentPagers = Array.from(document.querySelectorAll(".pagenav"));
    const nextPagers = Array.from(doc.querySelectorAll(".pagenav"));

    currentPagers.forEach((pager, index) => {
      const nextPager = nextPagers[index];

      if (pager instanceof HTMLElement && nextPager instanceof HTMLElement) {
        pager.innerHTML = nextPager.innerHTML;
      }
    });
  }

  async function loadForumDisplayPageWithJavascript(url: URL): Promise<void> {
    const forumId = getForumId(url);

    if (!forumId) {
      location.href = url.href;
      return;
    }

    options.setForumThreadLoadState({ isLoading: true });

    try {
      const pageNumber = getPageNumber(url);
      const doc =
        pageNumber === getPageNumber(new URL(location.href)) &&
        url.pathname === location.pathname
          ? parseHtml(document.documentElement.outerHTML)
          : await fetchThreadDocument(url.href);
      const records = collectForumThreadRecords(
        doc,
        url.href,
        forumId,
        pageNumber,
        options.getForumThreadsPerPage(),
        Date.now(),
      );

      if (records.length === 0) {
        location.href = url.href;
        return;
      }

      replaceForumPagersFromDocument(doc);
      options.setActiveTagFilter(null);
      options.setActiveForumSearchQuery("");
      options.setActiveForumTagPage(pageNumber);
      options.setNativeForumThreadRows(
        records.map((record) => record.html),
        records.length,
        `native-page-${pageNumber}`,
      );
      options.applyHiddenForumThreadRows();
      options.updateBrowserHistory(url, "push");
      mergeCachedForumThreadRecords(records);
      await runCacheOperation(
        writeForumThreadCacheRecords(
          records
            .map((record) =>
              cachedForumThreads.find(
                (cachedRecord) => cachedRecord.id === record.id,
              ),
            )
            .filter((record) => record !== undefined),
        ),
        undefined,
        "guardar pagina navegada",
      );
      options.renderTopTagBar();
      options.refreshNavigation({ reset: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo cargar la pagina del foro con JavaScript",
        error,
      );
      location.href = url.href;
    } finally {
      options.setForumThreadLoadState({ isLoading: false });
    }
  }

  async function scrapeForumThreadPage(
    pageNumber: number,
    scrapeStartedAt: number,
  ): Promise<ForumThreadRecord[]> {
    const forumId = getForumId();

    if (!forumId) {
      return [];
    }

    const url = getForumRecentPageUrl(pageNumber);
    const doc =
      pageNumber === 1 && getPageNumber(new URL(location.href)) === 1
        ? document
        : await fetchThreadDocument(url.href);

    return collectForumThreadRecords(
      doc,
      url.href,
      forumId,
      pageNumber,
      options.getForumThreadsPerPage(),
      scrapeStartedAt,
    );
  }

  async function saveScrapedForumThreadRecords(
    records: ForumThreadRecord[],
  ): Promise<void> {
    mergeCachedForumThreadRecords(records);
    await runCacheOperation(
      writeForumThreadCacheRecords(
        records
          .map((record) =>
            cachedForumThreads.find(
              (cachedRecord) => cachedRecord.id === record.id,
            ),
          )
          .filter((record) => record !== undefined),
      ),
      undefined,
      "guardar scrape",
    );
    options.refreshForumTagUi();
  }

  async function scrapeRecentForumThreadPages(
    startPage: number,
    scrapeStartedAt: number,
    cachedThreadIdsBeforeScrape: Set<string>,
  ): Promise<void> {
    if (forumThreadScrapeStarted) {
      return;
    }

    forumThreadScrapeStarted = true;
    options.setForumThreadLoadState({ isLoading: true });
    let lastScrapedPage = Math.max(startPage - 1, 0);

    for (
      let pageNumber = startPage;
      pageNumber <= FORUM_THREAD_CACHE_RECENT_PAGES;
      pageNumber += 1
    ) {
      try {
        const records = await scrapeForumThreadPage(
          pageNumber,
          scrapeStartedAt,
        );
        const pageWasAlreadyCached = wereAllForumThreadRecordsAlreadyCached(
          records,
          cachedThreadIdsBeforeScrape,
        );
        lastScrapedPage = pageNumber;
        options.setForumThreadLoadState({
          loadedPages: Math.max(
            options.getForumThreadLoadState().loadedPages,
            pageNumber,
          ),
        });
        await saveScrapedForumThreadRecords(records);

        if (pageWasAlreadyCached) {
          break;
        }
      } catch (error) {
        console.warn(
          `Forocoches Premium: no se pudo cachear la pagina ${pageNumber} del foro`,
          error,
        );
      } finally {
        options.setForumThreadLoadState({
          loadedPages: Math.max(
            options.getForumThreadLoadState().loadedPages,
            pageNumber,
          ),
        });
      }

      if (pageNumber < FORUM_THREAD_CACHE_RECENT_PAGES) {
        await sleep(PAGE_LOAD_DELAY_MS);
      }
    }

    try {
      await runCacheOperation(
        cleanupForumThreadCache(),
        undefined,
        "limpiar cache",
      );
      cachedForumThreads = await runCacheOperation(
        readForumThreadCacheRecords(),
        cachedForumThreads,
        "leer cache final",
      );
    } finally {
      const loadedPages = Math.max(
        options.getForumThreadLoadState().loadedPages,
        lastScrapedPage,
      );
      options.setForumThreadLoadState({
        loadedPages,
        isLoading: false,
      });
      options.refreshForumTagUi();
    }
  }

  async function initializeForumThreadCache(): Promise<void> {
    cachedForumThreads = await runCacheOperation(
      readForumThreadCacheRecords(),
      [],
      "leer cache inicial",
    );
    options.setForumThreadLoadState({
      loadedPages: 0,
      targetPages: FORUM_THREAD_CACHE_RECENT_PAGES,
      isLoading: false,
    });

    const scrapeStartedAt = Date.now();
    const cachedThreadIdsBeforeScrape = getCachedForumThreadIdsForCurrentForum();
    let firstPageWasAlreadyCached = false;

    try {
      const firstPageRecords = await scrapeForumThreadPage(1, scrapeStartedAt);
      firstPageWasAlreadyCached = wereAllForumThreadRecordsAlreadyCached(
        firstPageRecords,
        cachedThreadIdsBeforeScrape,
      );
      await saveScrapedForumThreadRecords(firstPageRecords);
    } catch (error) {
      console.warn(
        "Forocoches Premium: no se pudo cachear la primera pagina del foro",
        error,
      );
      options.refreshForumTagUi();
    } finally {
      options.setForumThreadLoadState({
        loadedPages: Math.max(options.getForumThreadLoadState().loadedPages, 1),
      });
    }

    if (firstPageWasAlreadyCached) {
      options.setForumThreadLoadState({ isLoading: false });
      return;
    }

    void scrapeRecentForumThreadPages(
      2,
      scrapeStartedAt,
      cachedThreadIdsBeforeScrape,
    );
  }

  return {
    getCachedForumThreadsForCurrentForum,
    getVisibleCachedForumThreadsForCurrentForum,
    getHiddenForumThreadRecordsForCurrentForum,
    getForumThreadRecordsForTag,
    loadForumDisplayPageWithJavascript,
    initializeForumThreadCache,
    setForumThreadHiddenState,
    hideSelectedForumThread,
  };
}
