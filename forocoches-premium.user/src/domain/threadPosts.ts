import type {
  ActiveGraphView,
  PostRecord,
  ThreadGraph,
} from "./types";

export function applyReplyCounts(posts: PostRecord[]): void {
  const repliesByPostId = new Map<string, Set<string>>();

  for (const post of posts) {
    for (const quotedPostId of post.quotedPostIds) {
      if (!repliesByPostId.has(quotedPostId)) {
        repliesByPostId.set(quotedPostId, new Set());
      }

      repliesByPostId.get(quotedPostId)!.add(post.id);
    }
  }

  for (const post of posts) {
    post.replyingPostIds = Array.from(repliesByPostId.get(post.id) || []);
    post.replyCount = post.replyingPostIds.length;
  }
}

export function createEmptyThreadGraph(): ThreadGraph {
  return {
    postById: new Map(),
    quotedByPostId: new Map(),
    quotingByPostId: new Map(),
    neighborsByPostId: new Map(),
    chronologicalNextByPostId: new Map(),
  };
}

export function sortPosts(posts: PostRecord[]): PostRecord[] {
  return posts.slice().sort((left, right) => {
    if (left.replyCount !== right.replyCount) {
      return right.replyCount - left.replyCount;
    }

    return left.originalIndex - right.originalIndex;
  });
}

export function sortPostsChronologically(posts: PostRecord[]): PostRecord[] {
  return posts
    .slice()
    .sort((left, right) => left.originalIndex - right.originalIndex);
}

export function applyOriginalPosterFlags(posts: PostRecord[]): void {
  const firstPost = sortPostsChronologically(posts)[0];
  const originalPoster = firstPost?.author.toLowerCase();

  if (!originalPoster) {
    return;
  }

  for (const post of posts) {
    post.isOriginalPoster = post.author.toLowerCase() === originalPoster;
  }
}

export function getPromotedCitedPosts(
  posts: PostRecord[],
  limit: number,
): PostRecord[] {
  const firstPost = sortPostsChronologically(posts)[0];

  return sortPosts(posts)
    .filter((post) => post.replyCount > 0)
    .slice(0, limit)
    .filter((post) => post.id !== firstPost?.id);
}

export function getFeaturedChronologicalPosts(
  posts: PostRecord[],
  options: { shouldPromoteCitedPosts: boolean },
): PostRecord[] {
  const chronologicalPosts = sortPostsChronologically(posts);

  if (!options.shouldPromoteCitedPosts) {
    return chronologicalPosts;
  }

  const firstPost = chronologicalPosts[0];
  const promotedPosts = getPromotedCitedPosts(posts, 3);

  if (!firstPost || promotedPosts.length === 0) {
    return chronologicalPosts;
  }

  const promotedPostIds = new Set(promotedPosts.map((post) => post.id));

  return [
    firstPost,
    ...promotedPosts,
    ...chronologicalPosts.filter(
      (post) => post.id !== firstPost.id && !promotedPostIds.has(post.id),
    ),
  ];
}

export function getReplyRankByPostId(
  posts: PostRecord[],
): Map<string, number> {
  const rankByPostId = new Map<string, number>();
  let rank = 0;

  for (const post of sortPosts(posts)) {
    if (post.replyCount <= 0) {
      continue;
    }

    rank += 1;
    rankByPostId.set(post.id, rank);
  }

  return rankByPostId;
}

export function buildThreadGraph(posts: PostRecord[]): ThreadGraph {
  const graph = createEmptyThreadGraph();
  const chronologicalPosts = sortPostsChronologically(posts);

  for (const post of chronologicalPosts) {
    graph.postById.set(post.id, post);
    ensureGraphSet(graph.quotedByPostId, post.id);
    ensureGraphSet(graph.quotingByPostId, post.id);
    ensureGraphSet(graph.neighborsByPostId, post.id);
  }

  for (let index = 0; index < chronologicalPosts.length; index += 1) {
    const post = chronologicalPosts[index];
    const nextPost = chronologicalPosts[index + 1] || null;
    if (post) {
      graph.chronologicalNextByPostId.set(post.id, nextPost?.id || null);
    }
  }

  for (const post of chronologicalPosts) {
    for (const quotedPostId of post.quotedPostIds) {
      if (!graph.postById.has(quotedPostId)) {
        continue;
      }

      ensureGraphSet(graph.quotedByPostId, quotedPostId).add(post.id);
      ensureGraphSet(graph.quotingByPostId, post.id).add(quotedPostId);
      ensureGraphSet(graph.neighborsByPostId, quotedPostId).add(post.id);
      ensureGraphSet(graph.neighborsByPostId, post.id).add(quotedPostId);
    }
  }

  return graph;
}

export function getPostsForGraphView(
  view: ActiveGraphView,
  graph: ThreadGraph,
  posts: PostRecord[],
): PostRecord[] {
  const root = graph.postById.get(view.rootPostId);

  if (!root) {
    return [];
  }

  if (view.type === "quoted-sources") {
    return getChronologicalGraphPosts([...root.quotedPostIds, root.id], posts);
  }

  if (view.type === "quoted-by") {
    const replyPosts = getChronologicalGraphPosts(
      Array.from(graph.quotedByPostId.get(root.id) || []),
      posts,
    ).filter((post) => post.id !== root.id);

    return [root, ...replyPosts];
  }

  return getConversationChainPosts(view, graph);
}

export function getValidGraphView(
  view: ActiveGraphView | null,
  graph: ThreadGraph,
): ActiveGraphView | null {
  if (view && graph.postById.has(view.rootPostId)) {
    return view;
  }

  return null;
}

export function getThreadViewPosts(options: {
  posts: PostRecord[];
  activeGraphView: ActiveGraphView | null;
  graph: ThreadGraph;
  shouldPromoteCitedPosts: boolean;
}): PostRecord[] {
  if (options.activeGraphView) {
    return getPostsForGraphView(
      options.activeGraphView,
      options.graph,
      options.posts,
    );
  }

  return getFeaturedChronologicalPosts(options.posts, {
    shouldPromoteCitedPosts: options.shouldPromoteCitedPosts,
  });
}

export function getReplyIndentDepth(options: {
  post: PostRecord;
  index: number;
  activeGraphView: ActiveGraphView | null;
}): number {
  if (!options.activeGraphView) {
    return 0;
  }

  if (options.activeGraphView.type === "quoted-by") {
    return options.post.id === options.activeGraphView.rootPostId ? 0 : 1;
  }

  if (options.activeGraphView.type === "conversation") {
    return options.index === 0 ? 0 : 1;
  }

  if (options.activeGraphView.type === "quoted-sources") {
    return options.post.id === options.activeGraphView.rootPostId ? 1 : 0;
  }

  return 0;
}

export function getGraphViewLabel(
  view: ActiveGraphView,
  graph: ThreadGraph,
): string {
  const root = graph.postById.get(view.rootPostId);
  const rootLabel = root ? `#${root.postNumber}` : `#${view.rootPostId}`;

  if (view.type === "quoted-sources") {
    return `citas usadas por ${rootLabel}`;
  }

  if (view.type === "quoted-by") {
    return `${rootLabel} y sus citadores`;
  }

  return `conversacion de ${rootLabel}`;
}

function ensureGraphSet(
  map: Map<string, Set<string>>,
  key: string,
): Set<string> {
  if (!map.has(key)) {
    map.set(key, new Set());
  }

  return map.get(key)!;
}

function getChronologicalGraphPosts(
  postIds: string[],
  posts: PostRecord[],
): PostRecord[] {
  const ids = new Set(postIds);

  return sortPostsChronologically(posts).filter((post) => ids.has(post.id));
}

function getConversationParentPostId(
  post: PostRecord,
  preferredPostId: string | null,
  graph: ThreadGraph,
): string | null {
  if (
    preferredPostId &&
    post.quotedPostIds.includes(preferredPostId) &&
    graph.postById.has(preferredPostId)
  ) {
    return preferredPostId;
  }

  return post.quotedPostIds.find((postId) => graph.postById.has(postId)) || null;
}

function getConversationChainPosts(
  view: ActiveGraphView,
  graph: ThreadGraph,
): PostRecord[] {
  const chain: PostRecord[] = [];
  const seen = new Set<string>();
  let currentPost = graph.postById.get(view.rootPostId) || null;
  let preferredParentPostId = view.relatedPostId;

  while (currentPost && !seen.has(currentPost.id)) {
    chain.push(currentPost);
    seen.add(currentPost.id);

    const parentPostId = getConversationParentPostId(
      currentPost,
      preferredParentPostId,
      graph,
    );

    preferredParentPostId = null;
    currentPost = parentPostId ? graph.postById.get(parentPostId) || null : null;
  }

  return chain.reverse();
}
