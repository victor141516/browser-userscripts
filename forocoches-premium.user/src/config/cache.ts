export const FORUM_SIDEBAR_STORAGE_KEY = "fcPremiumForumSidebarHidden";

// Cached thread messages older than this are considered stale.
export const THREAD_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

// Approximate maximum total size for cached thread records in IndexedDB.
export const THREAD_CACHE_MAX_BYTES = 500 * 1024 * 1024;

// IndexedDB database used for the heavier per-thread message cache.
export const THREAD_CACHE_DB_NAME = "fcPremiumThreadCache";

// Bump this when the IndexedDB object store schema changes.
export const THREAD_CACHE_DB_VERSION = 3;

// Object store containing one cached record per thread id.
export const THREAD_CACHE_STORE_NAME = "threads";

// Object store containing thread-list records keyed by thread id.
export const FORUM_THREAD_CACHE_STORE_NAME = "forumThreads";

// Bump this when the cached post/thread record shape changes.
export const THREAD_CACHE_RECORD_VERSION = 2;

// Bump this when the cached forum-list record shape changes.
export const FORUM_THREAD_CACHE_RECORD_VERSION = 1;

// Number of recent forum pages scraped in the background on every visit.
export const FORUM_THREAD_CACHE_RECENT_PAGES = 10;

// Maximum number of cached forum-list threads retained after each scrape.
export const FORUM_THREAD_CACHE_MAX_RECORDS = 1000;

// Fallback page size used until the native forum page reveals its own size.
export const FORUM_THREAD_FALLBACK_PAGE_SIZE = 40;

// Delay before applying the local IndexedDB thread search while typing.
export const FORUM_LIVE_SEARCH_DEBOUNCE_MS = 220;

// Old localStorage prefix kept only so legacy cache entries can be removed.
export const THREAD_CACHE_LEGACY_STORAGE_PREFIX = "fcPremiumThreadCache:";
