import {
  FORUM_STATE_QUERY_PARAMS,
  GRAPH_VIEW_TYPES,
  LEGACY_THREAD_STATE_QUERY_PARAMS,
  THREAD_STATE_QUERY_PARAMS,
} from "../config/constants";
import type {
  ForumQueryState,
  GraphViewType,
  ThreadQueryState,
} from "../domain/types";
import {
  getThreadId,
  normalizeAuthorName,
  normalizeText,
} from "../shared/dom";

export function readForumQueryState(
  url = new URL(location.href),
): ForumQueryState {
  const tag = normalizeAuthorName(
    url.searchParams.get(FORUM_STATE_QUERY_PARAMS.tag),
  );
  const page = Number(url.searchParams.get("page") || "1");

  return {
    tag: tag || null,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

export function clearForumStateQueryParams(url: URL): void {
  for (const param of Object.values(FORUM_STATE_QUERY_PARAMS)) {
    url.searchParams.delete(param);
  }
}

export function isGraphViewType(type: string | null): type is GraphViewType {
  return GRAPH_VIEW_TYPES.includes(type || "");
}

export function isThreadUrl(url: URL): boolean {
  return (
    url.pathname.endsWith("/showthread.php") && Boolean(getThreadId(url))
  );
}

export function clearThreadStateQueryParams(url: URL): void {
  for (const param of Object.values(THREAD_STATE_QUERY_PARAMS)) {
    url.searchParams.delete(param);
  }

  for (const param of LEGACY_THREAD_STATE_QUERY_PARAMS) {
    url.searchParams.delete(param);
  }
}

export function readThreadQueryState(
  url = new URL(location.href),
): ThreadQueryState {
  const emptyState: ThreadQueryState = {
    graphView: null,
    pageFilter: null,
    authorFilters: [],
    searchQuery: "",
  };

  if (!isThreadUrl(url)) {
    return emptyState;
  }

  const graphType = url.searchParams.get(THREAD_STATE_QUERY_PARAMS.graphType);
  const graphRoot = url.searchParams.get(THREAD_STATE_QUERY_PARAMS.graphRoot);
  const graphRelated = url.searchParams.get(
    THREAD_STATE_QUERY_PARAMS.graphRelated,
  );
  const pageFilter = Number(
    url.searchParams.get(THREAD_STATE_QUERY_PARAMS.pageFilter) || "",
  );
  const authorFilters = Array.from(
    new Set(
      url.searchParams
        .getAll(THREAD_STATE_QUERY_PARAMS.authorFilter)
        .map((author) => normalizeAuthorName(author))
        .filter(Boolean),
    ),
  );
  const searchQuery = normalizeText(
    url.searchParams.get(THREAD_STATE_QUERY_PARAMS.searchQuery),
  );

  const graphView =
    isGraphViewType(graphType) && graphRoot
      ? {
          type: graphType,
          rootPostId: graphRoot,
          relatedPostId: graphRelated || null,
        }
      : null;

  return {
    graphView,
    pageFilter:
      !graphView &&
      authorFilters.length === 0 &&
      !searchQuery &&
      Number.isFinite(pageFilter) &&
      pageFilter > 0
        ? pageFilter
        : null,
    authorFilters,
    searchQuery,
  };
}
