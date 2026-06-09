export function enhanceQuoteLinks(options: {
  wrapper: HTMLElement;
  sourcePostId: string | null;
  getQuotedPostId: (href: string) => string | null;
  onOpenQuotedPost: (quotedPostId: string) => void;
  onReadConversation: (sourcePostId: string, quotedPostId: string) => void;
}): void {
  for (const link of options.wrapper.querySelectorAll(
    "a[href*='showthread.php?p='][href*='#post']",
  )) {
    if (!(link instanceof HTMLAnchorElement)) {
      continue;
    }

    const quotedPostId = options.getQuotedPostId(
      link.getAttribute("href") || link.href,
    );

    if (!quotedPostId) {
      continue;
    }

    link.dataset.fcPremiumQuoteTarget = quotedPostId;
    link.title = "Ir al mensaje citado";
    markQuoteBlock({
      link,
      quotedPostId,
      sourcePostId: options.sourcePostId,
      onReadConversation: options.onReadConversation,
    });
    link.addEventListener("click", (event) => {
      const target = document.getElementById(`post${quotedPostId}`);

      if (!target) {
        return;
      }

      event.preventDefault();
      options.onOpenQuotedPost(quotedPostId);
    });
  }
}

function markQuoteBlock(options: {
  link: HTMLAnchorElement;
  quotedPostId: string;
  sourcePostId: string | null;
  onReadConversation: (sourcePostId: string, quotedPostId: string) => void;
}): void {
  const quoteTable = options.link.closest("table");
  const quoteWrapper = quoteTable?.parentElement;

  if (!(quoteWrapper instanceof HTMLElement)) {
    return;
  }

  if (!(quoteTable instanceof HTMLTableElement)) {
    return;
  }

  quoteWrapper.dataset.fcPremiumQuoteBlock = options.quotedPostId;
  renderQuoteBlockActions({
    quoteWrapper,
    quoteLink: options.link,
    sourcePostId: options.sourcePostId,
    quotedPostId: options.quotedPostId,
    onReadConversation: options.onReadConversation,
  });

  const quoteCell = quoteTable.querySelector("td");
  const body = Array.from(quoteCell?.children || []).find(
    (child) =>
      child instanceof HTMLElement &&
      child !== options.link.parentElement &&
      child.textContent.trim().length > 0,
  );

  if (body instanceof HTMLElement) {
    body.dataset.fcPremiumQuoteBody = "true";
  }
}

function renderQuoteBlockActions(options: {
  quoteWrapper: HTMLElement;
  quoteLink: HTMLAnchorElement;
  sourcePostId: string | null;
  quotedPostId: string;
  onReadConversation: (sourcePostId: string, quotedPostId: string) => void;
}): void {
  if (!options.sourcePostId) {
    return;
  }

  options.quoteWrapper.querySelector(".fc-premium-quote-actions")?.remove();

  const targetContainer =
    options.quoteLink.parentElement || options.quoteWrapper;
  const actions = document.createElement("div");
  actions.className = "fc-premium-quote-actions";

  const conversationButton = document.createElement("button");
  conversationButton.type = "button";
  conversationButton.textContent = "Ver conversación";
  conversationButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    options.onReadConversation(options.sourcePostId!, options.quotedPostId);
  });
  actions.append(conversationButton);
  targetContainer.append(actions);
}
