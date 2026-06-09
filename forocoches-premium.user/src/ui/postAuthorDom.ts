import type { PostRecord } from "../domain/types";
import { normalizeText } from "../shared/dom";
import {
  getPostReportLink,
  getPostStatusImage,
} from "./postNativeDom";

export function createHeaderAuthorMeta(
  post: PostRecord,
  authorCell: HTMLElement | null,
  wrapper: HTMLElement,
): HTMLElement {
  const meta = document.createElement("span");
  meta.className = "fc-premium-header-author";

  const authorLink = authorCell?.querySelector(".bigusername");

  if (authorLink instanceof HTMLAnchorElement) {
    const link = document.createElement("a");
    link.href = authorLink.href;
    link.textContent = post.author || normalizeText(authorLink.textContent);
    meta.append(link);
  } else {
    meta.textContent = post.author;
  }

  if (authorCell instanceof HTMLElement) {
    const card = document.createElement("span");
    card.className = "fc-premium-author-hover-card";
    const avatar = getAuthorProfileImage(authorCell);

    if (avatar) {
      card.append(avatar);
    }

    const title = document.createElement("strong");
    title.textContent = post.author || "Usuario";
    card.append(title);

    for (const line of getAuthorHoverLines(authorCell)) {
      const detail = document.createElement("span");
      detail.textContent = line;
      card.append(detail);
    }

    appendAuthorFooterControls(card, wrapper);
    meta.append(card);
  }

  return meta;
}

function getAuthorHoverLines(authorCell: HTMLElement): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const addLine = (text: string | null | undefined): void => {
    const line = normalizeText(text).replace(/\s+filtrar$/, "");

    if (!line || seen.has(line)) {
      return;
    }

    seen.add(line);
    lines.push(line);
  };

  for (const block of authorCell.querySelectorAll(".smallfont")) {
    const childDivs = Array.from(block.children).filter(
      (child) => child instanceof HTMLDivElement,
    );

    if (childDivs.length === 0) {
      addLine(block.textContent);
      continue;
    }

    for (const child of childDivs) {
      addLine(child.textContent);
    }
  }

  return lines.slice(0, 8);
}

function getAuthorProfileImage(
  authorCell: HTMLElement,
): HTMLImageElement | null {
  const images = Array.from(authorCell.querySelectorAll("img")).filter(
    (image) => {
      if (!(image instanceof HTMLImageElement)) {
        return false;
      }

      const src = image.getAttribute("src") || "";
      return (
        Boolean(src) && !/statusicon|clear\.gif|spacer|button/i.test(src)
      );
    },
  );

  const avatar =
    images.find((image) =>
      /customavatar|avatar|profilepic|album/i.test(
        image.getAttribute("src") || "",
      ),
    ) ||
    images.find((image) => {
      const width = Number(image.getAttribute("width") || image.width || 0);
      const height = Number(
        image.getAttribute("height") || image.height || 0,
      );
      return width >= 40 || height >= 40;
    });

  if (!avatar) {
    return null;
  }

  const clone = document.createElement("img");
  clone.className = "fc-premium-author-avatar";
  clone.src = avatar.src;
  clone.alt = avatar.alt || "";
  clone.loading = "lazy";
  return clone;
}

function appendAuthorFooterControls(
  card: HTMLElement,
  wrapper: HTMLElement,
): void {
  const statusImage = getPostStatusImage(wrapper);
  const reportLink = getPostReportLink(wrapper);

  if (!statusImage && !reportLink) {
    return;
  }

  const actions = document.createElement("span");
  actions.className = "fc-premium-author-card-actions";

  if (statusImage) {
    const status = document.createElement("span");
    status.className = "fc-premium-author-status";

    const icon = statusImage.cloneNode(true);
    const label = document.createElement("span");
    label.textContent = statusImage.title || statusImage.alt || "Estado";

    status.append(icon, label);
    actions.append(status);
  }

  if (reportLink) {
    const report = document.createElement("a");
    const reportImage = reportLink.querySelector("img");
    report.className = "fc-premium-author-report-link";
    report.href = reportLink.href;
    report.rel = reportLink.rel;
    report.title =
      reportLink.title ||
      reportImage?.title ||
      reportImage?.alt ||
      "Reportar mensaje";

    if (reportImage instanceof HTMLImageElement) {
      report.append(reportImage.cloneNode(true));
    }

    const label = document.createElement("span");
    label.textContent = "Reportar";
    report.append(label);
    actions.append(report);
  }

  card.append(actions);
}
