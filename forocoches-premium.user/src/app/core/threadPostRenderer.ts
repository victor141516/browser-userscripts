import type {
  ActiveGraphView,
  NavigationItem,
  PostRecord,
} from "../../domain/types";
import { getReplyRankByPostId } from "../../domain/threadPosts";
import { getPostIdFromNavigationElement } from "../../ui/navigationDom";
import { enhanceQuoteLinks as enhanceQuoteLinksInDom } from "../../ui/postQuoteDom";
import {
  relocatePostFooterControls,
  removeTrailingPostLayoutArtifacts,
} from "../../ui/postNativeDom";
import { enhanceNativePostHeader } from "../../ui/postHeaderDom";
import { updatePostCompactLayout } from "../../ui/postCompactLayoutDom";
import { appendReplyBadge } from "../../ui/postReplyBadgeDom";
import { getQuotedPostId } from "../../adapters/forocoches/threadParser";
import { isVisible } from "../../shared/dom";

export interface ThreadPostRendererOptions {
  compactModeEnabled: boolean;
  getPostsElement: () => HTMLElement | null;
  getActiveGraphView: () => ActiveGraphView | null;
  getPendingInitialHashPostId: () => string | null;
  clearPendingInitialHashPostId: () => void;
  getSelectedNavigationItem: () => NavigationItem | null;
  getThreadViewPosts: (posts: PostRecord[]) => PostRecord[];
  getReplyIndentDepth: (post: PostRecord, index: number) => number;
  applyThreadPostFilters: () => { total: number; visible: number };
  applyPageFilter: () => { total: number; visible: number };
  updateOriginalThreadPageMenus: () => void;
  renderThreadSearchPanel: (
    counts?: { total: number; visible: number },
  ) => void;
  refreshNavigation: (options?: { reset?: boolean }) => void;
  selectNavigationElement: (
    element: HTMLElement,
    options?: { scroll?: boolean; updateUrl?: boolean },
  ) => void;
  enhanceAuthorFilterButton: (wrapper: HTMLElement, author: string) => void;
  setActiveGraphView: (
    type: "quoted-by" | "conversation",
    rootPostId: string,
    relatedPostId?: string | null,
    options?: {
      history?: "push" | "replace";
      scrollToFirstPost?: boolean;
      scrollToFirstReply?: boolean;
    },
  ) => void;
  jumpToLoadedPost: (postId: string) => void;
}

export interface ThreadPostRenderer {
  renderThreadPosts(posts: PostRecord[]): void;
  selectPostById(
    postId: string,
    options?: { scroll?: boolean; updateUrl?: boolean },
  ): void;
}

export function createThreadPostRenderer(
  options: ThreadPostRendererOptions,
): ThreadPostRenderer {
  function selectPostById(
    postId: string,
    selectOptions: { scroll?: boolean; updateUrl?: boolean } = {},
  ) {
    const table = document.getElementById(`post${postId}`);
    const wrapper = table?.closest(".fc-premium-post-wrapper");

    if (!(wrapper instanceof HTMLElement)) {
      return;
    }

    options.selectNavigationElement(wrapper, selectOptions);
  }

  function enhanceQuoteLinks(wrapper: HTMLElement) {
    enhanceQuoteLinksInDom({
      wrapper,
      sourcePostId: getPostIdFromNavigationElement(wrapper),
      getQuotedPostId,
      onOpenQuotedPost: options.jumpToLoadedPost,
      onReadConversation: (sourcePostId, quotedPostId) => {
        options.setActiveGraphView("conversation", sourcePostId, quotedPostId, {
          scrollToFirstPost: true,
        });
      },
    });
  }

  function renderPost(
    post: PostRecord,
    rank: number,
    postById: Map<string, PostRecord>,
    replyIndentDepth: number,
  ): HTMLElement {
    const template = document.createElement("template");
    template.innerHTML = post.html;

    const wrapper = template.content.firstElementChild;

    if (!(wrapper instanceof HTMLElement)) {
      return document.createElement("div");
    }

    wrapper.classList.add("fc-premium-post-wrapper");
    wrapper.dataset.fcPremiumOriginalPage = String(post.pageNumber);

    if (replyIndentDepth > 0) {
      wrapper.dataset.fcPremiumReplyIndent = String(replyIndentDepth);
    }

    enhanceQuoteLinks(wrapper);
    options.enhanceAuthorFilterButton(wrapper, post.author);
    const header = enhanceNativePostHeader(wrapper, post);
    removeTrailingPostLayoutArtifacts(wrapper);
    relocatePostFooterControls(wrapper);

    if (post.isOriginalPoster) {
      wrapper.dataset.fcPremiumOriginalPoster = "true";
    }

    appendReplyBadge({
      container: header.dateCell || header.numberCell,
      post,
      rank,
      postById,
      onJumpToPost: options.jumpToLoadedPost,
      onShowQuotedBy: (postId) => {
        options.setActiveGraphView("quoted-by", postId, null, {
          scrollToFirstReply: true,
        });
      },
    });

    updatePostCompactLayout(wrapper, options.compactModeEnabled);
    return wrapper;
  }

  function renderThreadPosts(posts: PostRecord[]) {
    const postsElement = options.getPostsElement();

    if (!postsElement) {
      return;
    }

    const pendingInitialHashPostId = options.getPendingInitialHashPostId();
    const selectedPostId =
      pendingInitialHashPostId ||
      getPostIdFromNavigationElement(
        options.getSelectedNavigationItem()?.element || undefined,
      );
    postsElement.textContent = "";
    postsElement.dataset.fcPremiumGraphView =
      options.getActiveGraphView()?.type || "";

    const fragment = document.createDocumentFragment();
    const postById = new Map(posts.map((post) => [post.id, post]));
    const rankByPostId = getReplyRankByPostId(posts);
    const viewPosts = options.getThreadViewPosts(posts);

    for (const [index, post] of viewPosts.entries()) {
      fragment.append(
        renderPost(
          post,
          rankByPostId.get(post.id) || 0,
          postById,
          options.getReplyIndentDepth(post, index),
        ),
      );
    }

    postsElement.append(fragment);
    const filterCounts = options.applyThreadPostFilters();
    options.applyPageFilter();
    options.updateOriginalThreadPageMenus();
    options.renderThreadSearchPanel(filterCounts);
    options.refreshNavigation({ reset: true });

    if (selectedPostId) {
      const selectedTable = document.getElementById(`post${selectedPostId}`);
      const selectedWrapper = selectedTable?.closest(
        ".fc-premium-post-wrapper",
      );

      if (
        selectedWrapper instanceof HTMLElement &&
        isVisible(selectedWrapper)
      ) {
        selectPostById(selectedPostId, {
          scroll: selectedPostId === pendingInitialHashPostId,
          updateUrl: false,
        });

        if (selectedPostId === pendingInitialHashPostId) {
          options.clearPendingInitialHashPostId();
        }
      }
    }
  }

  return {
    renderThreadPosts,
    selectPostById,
  };
}
