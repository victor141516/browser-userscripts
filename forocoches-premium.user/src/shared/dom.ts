export function normalizeText(text: string | null | undefined): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

export function normalizeLayoutText(
  text: string | null | undefined,
): string {
  return normalizeText(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAuthorName(
  author: string | null | undefined,
): string {
  return normalizeText(author).toLowerCase();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function isVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

export function toUrl(href: string): URL | null {
  try {
    return new URL(href, location.href);
  } catch (_error) {
    return null;
  }
}

export function getThreadId(url: URL): string | null {
  return url.searchParams.get("t");
}

export function getPostQueryId(url: URL): string | null {
  return url.searchParams.get("p");
}

export function getPageNumber(url: URL): number {
  const page = Number(url.searchParams.get("page") || "1");
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getLocationPostHashId(
  url = new URL(location.href),
): string | null {
  const match = url.hash.match(/^#post(\d+)$/);
  return match?.[1] || null;
}

export function isThreadPage(): boolean {
  return (
    location.pathname.endsWith("/showthread.php") &&
    Boolean(
      getThreadId(new URL(location.href)) ||
        getPostQueryId(new URL(location.href)),
    )
  );
}

export function isForumDisplayPage(): boolean {
  return location.pathname.endsWith("/forumdisplay.php");
}

export function getForumId(url = new URL(location.href)): string {
  return url.searchParams.get("f") || "";
}
