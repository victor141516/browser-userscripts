import type { PostRecord } from "../domain/types";

export function appendReplyBadge(options: {
  container: HTMLElement | null;
  post: PostRecord;
  rank: number;
  postById: Map<string, PostRecord>;
  onJumpToPost: (postId: string) => void;
  onShowQuotedBy: (postId: string) => void;
}): void {
  if (options.post.replyCount <= 0 || !options.container) {
    return;
  }

  const post = options.post;
  const wrapper = options.container.closest(".fc-premium-post-wrapper");

  if (wrapper instanceof HTMLElement) {
    wrapper.dataset.fcPremiumReplyCount = String(post.replyCount);
    wrapper.dataset.fcPremiumRank = String(options.rank);
  }

  const badge = document.createElement("span");
  badge.className = "fc-premium-reply-badge";
  badge.textContent =
    post.replyCount === 1 ? "1 cita" : `${post.replyCount} citas`;
  appendReplyLinks({
    badge,
    post,
    postById: options.postById,
    onJumpToPost: options.onJumpToPost,
    onShowQuotedBy: options.onShowQuotedBy,
  });
  options.container.append(badge);
}

function appendReplyLinks(options: {
  badge: HTMLElement;
  post: PostRecord;
  postById: Map<string, PostRecord>;
  onJumpToPost: (postId: string) => void;
  onShowQuotedBy: (postId: string) => void;
}): void {
  const maxLinks = 3;
  const visibleReplyIds = options.post.replyingPostIds.slice(0, maxLinks);

  if (visibleReplyIds.length === 0) {
    return;
  }

  const label = document.createElement("span");
  label.className = "fc-premium-original-position";
  label.textContent = "·";
  options.badge.append(label);

  for (const replyingPostId of visibleReplyIds) {
    const reply = options.postById.get(replyingPostId);
    const link = document.createElement("a");

    link.href = new URL(
      `showthread.php?p=${replyingPostId}#post${replyingPostId}`,
      location.href,
    ).href;
    link.textContent = `#${reply?.postNumber || replyingPostId}`;
    link.addEventListener("click", (event) => {
      if (!document.getElementById(`post${replyingPostId}`)) {
        return;
      }

      event.preventDefault();
      options.onJumpToPost(replyingPostId);
    });
    options.badge.append(link);
    options.badge.append(document.createTextNode(" "));
  }

  if (options.post.replyingPostIds.length > visibleReplyIds.length) {
    const remaining = document.createElement("span");
    remaining.className = "fc-premium-original-position";
    remaining.textContent = ` +${
      options.post.replyingPostIds.length - visibleReplyIds.length
    }`;
    options.badge.append(remaining);
  }

  if (options.post.replyingPostIds.length > 1) {
    const quotedByButton = document.createElement("button");
    quotedByButton.type = "button";
    quotedByButton.textContent = "Ver todas";
    quotedByButton.title = "Ver citadores";
    quotedByButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      options.onShowQuotedBy(options.post.id);
    });
    options.badge.append(quotedByButton);
  }
}
