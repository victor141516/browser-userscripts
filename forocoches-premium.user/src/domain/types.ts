export interface PostRecord {
  id: string;
  html: string;
  author: string;
  postNumber: string;
  pageNumber: number;
  pageIndex: number;
  originalIndex: number;
  quotedPostIds: string[];
  replyingPostIds: string[];
  isOriginalPoster: boolean;
  replyCount: number;
}

export interface NavigationItem {
  element: HTMLElement;
  link: HTMLAnchorElement | null;
}

export interface ShortcutHelpItem {
  keys: string[];
  description: string;
}

export interface ThreadPage {
  pageNumber: number;
  url: string;
}

export interface ThreadLoadState {
  loadedPages: number;
  targetPages: number;
  totalPages: number;
  loadedPosts: number;
  isLoading: boolean;
}

export interface ForumThreadLoadState {
  loadedPages: number;
  targetPages: number;
  isLoading: boolean;
}

export interface ThreadCacheRecord {
  version: number;
  threadId: string;
  totalPages: number;
  cachedPageNumbers: number[];
  savedAt: number;
  byteSize: number;
  posts: PostRecord[];
}

export interface ForumThreadRecord {
  version: number;
  id: string;
  forumId: string;
  url: string;
  title: string;
  tags: string[];
  html: string;
  preview: string;
  author: string;
  lastPostText: string;
  statsText: string;
  rowText: string;
  sourcePage: number;
  sourceIndex: number;
  recentIndex: number;
  lastSeen: number;
  updatedAt: number;
  isHidden: boolean;
  hiddenAt: number;
}

export interface ThreadGraph {
  postById: Map<string, PostRecord>;
  quotedByPostId: Map<string, Set<string>>;
  quotingByPostId: Map<string, Set<string>>;
  neighborsByPostId: Map<string, Set<string>>;
  chronologicalNextByPostId: Map<string, string | null>;
}

export type GraphViewType = "quoted-sources" | "quoted-by" | "conversation";

export interface ThreadQueryState {
  graphView: ActiveGraphView | null;
  pageFilter: number | null;
  authorFilters: string[];
  searchQuery: string;
}

export interface ActiveGraphView {
  type: GraphViewType;
  rootPostId: string;
  relatedPostId: string | null;
}

export interface ForumQueryState {
  tag: string | null;
  page: number;
}

export interface ThreadAuthorOption {
  key: string;
  name: string;
  count: number;
  isOriginalPoster: boolean;
  isCurrentUser: boolean;
}
