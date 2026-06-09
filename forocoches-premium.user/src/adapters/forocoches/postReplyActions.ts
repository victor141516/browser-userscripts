type PostReplyAction = "quote" | "multiquote";

export function clickPostQuoteAction(wrapper: HTMLElement): boolean {
  const link = getPostReplyActionLink(wrapper, "quote");

  if (!link) {
    return false;
  }

  link.click();
  return true;
}

export function togglePostMultiquote(
  wrapper: HTMLElement,
  postId: string | null,
): boolean {
  const link = getPostReplyActionLink(wrapper, "multiquote");
  const target = link?.querySelector("img[id^='mq_']");
  const multiquotePostId =
    target?.id.replace(/^mq_/, "") || postId;

  if (multiquotePostId && typeof window.mq_click === "function") {
    window.mq_click(multiquotePostId);
    return true;
  }

  if (target instanceof HTMLElement) {
    target.click();
    return true;
  }

  if (!link) {
    return false;
  }

  link.click();
  return true;
}

export function openThreadReplyWithoutQuote(
  threadId: string | null,
): boolean {
  const link = getThreadReplyWithoutQuoteLink();

  if (link) {
    link.click();
    return true;
  }

  if (!threadId) {
    return false;
  }

  location.href = new URL(
    `newreply.php?do=newreply&t=${threadId}`,
    location.href,
  ).href;
  return true;
}

export function isQuickReplyLink(link: HTMLAnchorElement): boolean {
  const image = link.querySelector("img");
  const label = `${link.id} ${image?.alt || ""} ${image?.title || ""} ${
    image?.getAttribute("src") || ""
  }`;

  return /quickreply|respuesta rapida|qr_\d+/i.test(label);
}

export function isQuoteReplyLink(link: HTMLAnchorElement): boolean {
  const image = link.querySelector("img");
  const label = `${image?.alt || ""} ${image?.title || ""} ${
    image?.getAttribute("src") || ""
  }`;

  return /quote\.gif|multiquote|multi-cita|responder con cita/i.test(label);
}

function getPostReplyActionLink(
  wrapper: HTMLElement,
  action: PostReplyAction,
): HTMLAnchorElement | null {
  const links = Array.from(
    wrapper.querySelectorAll(
      ".fc-premium-post-reply-actions a[href*='newreply.php?do=newreply']",
    ),
  ).filter((link) => link instanceof HTMLAnchorElement);

  return (
    links.find((link) =>
      action === "quote"
        ? isSingleQuoteReplyLink(link)
        : isMultiQuoteReplyLink(link),
    ) || null
  );
}

function isMultiQuoteReplyLink(link: HTMLAnchorElement): boolean {
  const image = link.querySelector("img");
  const label = `${image?.id || ""} ${image?.alt || ""} ${
    image?.title || ""
  } ${image?.getAttribute("src") || ""}`;

  return /mq_\d+|multiquote|multi-cita/i.test(label);
}

function isSingleQuoteReplyLink(link: HTMLAnchorElement): boolean {
  return isQuoteReplyLink(link) && !isMultiQuoteReplyLink(link);
}

function isThreadReplyWithoutQuoteLink(link: HTMLAnchorElement): boolean {
  const image = link.querySelector("img");
  const label = `${image?.alt || ""} ${image?.title || ""} ${
    image?.getAttribute("src") || ""
  }`;

  return (
    link.href.includes("newreply.php") &&
    link.href.includes("do=newreply") &&
    link.href.includes("noquote=1") &&
    /reply\.gif|respuesta/i.test(label)
  );
}

function getThreadReplyWithoutQuoteLink(): HTMLAnchorElement | null {
  return (
    Array.from(
      document.querySelectorAll("a[href*='newreply.php'][href*='noquote=1']"),
    )
      .filter((link) => link instanceof HTMLAnchorElement)
      .find(isThreadReplyWithoutQuoteLink) || null
  );
}
