import { TOP_TAGS_ID, THREAD_TITLE_SELECTOR } from "../../config/constants";
import type { ForumThreadRecord } from "../../domain/types";
import { findTagsInText, splitTextByTags } from "../../domain/tags";
import { sortForumThreadRecords } from "../../domain/forumThreads";
import { normalizeText, isForumDisplayPage } from "../../shared/dom";
import { getTitleTags } from "../../adapters/forocoches/forumThreadParser";
import { getForumThreadsTable } from "../../adapters/forocoches/forumLayout";
import {
  TagChip,
  TopTagBar,
  type TopTagSummary,
} from "../../ui/components/Tags";
import { renderVisibleForumThreadTitleTags as renderVisibleForumThreadTitleTagsInDom } from "../../adapters/forocoches/forumThreadListDom";

export interface ForumTagsControllerOptions {
  ensureStyle: () => void;
  getActiveTagFilter: () => string | null;
  setActiveTagFilter: (tag: string | null) => void;
  setActiveForumTagPage: (page: number) => void;
  syncForumTagUrl: (options?: { history?: "push" | "replace" }) => void;
  refreshForumTagUi: () => void;
  getVisibleCachedForumThreadsForCurrentForum: () => ForumThreadRecord[];
}

export interface ForumTagsController {
  renderTaggedTitle(title: HTMLAnchorElement): void;
  enhanceThreadTitleTags(): void;
  renderVisibleForumThreadTitleTags(root?: HTMLElement | Document): void;
  toggleTagFilter(tag: string): void;
  clearTagFilter(): void;
  renderTopTagBar(): void;
}

export function createForumTagsController(
  options: ForumTagsControllerOptions,
): ForumTagsController {
  function createTagChip(tag: string): HTMLElement {
    return TagChip({
      tag,
      onToggle: toggleTagFilter,
    });
  }

  function renderTaggedTitle(title: HTMLAnchorElement) {
    if (title.dataset.fcPremiumTagsRendered === "true") {
      return;
    }

    const originalTitle = normalizeText(title.textContent);

    if (findTagsInText(originalTitle).length === 0) {
      return;
    }

    title.dataset.fcPremiumTagsRendered = "true";
    title.title = originalTitle;
    title.textContent = "";

    for (const part of splitTextByTags(originalTitle)) {
      if (part.type === "text") {
        title.append(document.createTextNode(part.text));
      } else if (part.tag) {
        title.append(createTagChip(part.tag));
      }
    }
  }

  function enhanceThreadTitleTags() {
    options.ensureStyle();

    for (const title of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (title instanceof HTMLAnchorElement) {
        renderTaggedTitle(title);
      }
    }

    if (isForumDisplayPage()) {
      renderTopTagBar();
    }
  }

  function renderVisibleForumThreadTitleTags(
    root: HTMLElement | Document = document,
  ) {
    renderVisibleForumThreadTitleTagsInDom(root, renderTaggedTitle);
  }

  function toggleTagFilter(tag: string) {
    if (!isForumDisplayPage()) {
      return;
    }

    options.setActiveTagFilter(
      options.getActiveTagFilter() === tag ? null : tag,
    );
    options.setActiveForumTagPage(1);
    options.syncForumTagUrl({ history: "push" });
    options.refreshForumTagUi();
  }

  function clearTagFilter() {
    if (!options.getActiveTagFilter()) {
      return;
    }

    options.setActiveTagFilter(null);
    options.setActiveForumTagPage(1);
    options.syncForumTagUrl({ history: "push" });
    options.refreshForumTagUi();
  }

  function getTopTitleTags(): TopTagSummary[] {
    const tagsByName = new Map<string, TopTagSummary>();
    let titleIndex = 0;
    const forumRecords = options.getVisibleCachedForumThreadsForCurrentForum();

    if (forumRecords.length > 0) {
      for (const record of sortForumThreadRecords(forumRecords)) {
        for (const tag of record.tags) {
          const summary = tagsByName.get(tag);

          if (summary) {
            summary.count += 1;
          } else {
            tagsByName.set(tag, {
              tag,
              count: 1,
              firstIndex: titleIndex,
            });
          }
        }

        titleIndex += 1;
      }

      return Array.from(tagsByName.values())
        .sort(compareTopTagSummary)
        .slice(0, 12);
    }

    for (const title of document.querySelectorAll(THREAD_TITLE_SELECTOR)) {
      if (!(title instanceof HTMLAnchorElement)) {
        continue;
      }

      for (const tag of getTitleTags(title)) {
        const summary = tagsByName.get(tag);

        if (summary) {
          summary.count += 1;
        } else {
          tagsByName.set(tag, { tag, count: 1, firstIndex: titleIndex });
        }
      }

      titleIndex += 1;
    }

    return Array.from(tagsByName.values())
      .sort(compareTopTagSummary)
      .slice(0, 12);
  }

  function compareTopTagSummary(
    left: TopTagSummary,
    right: TopTagSummary,
  ): number {
    if (left.count !== right.count) {
      return right.count - left.count;
    }

    return left.firstIndex - right.firstIndex;
  }

  function renderTopTagBar() {
    document.getElementById(TOP_TAGS_ID)?.remove();

    if (!isForumDisplayPage()) {
      return;
    }

    const topTags = getTopTitleTags();

    if (topTags.length === 0) {
      return;
    }

    const table = getForumThreadsTable();

    if (!table?.parentElement) {
      return;
    }

    table.before(
      TopTagBar({
        tags: topTags,
        activeTag: options.getActiveTagFilter(),
        onToggle: toggleTagFilter,
      }),
    );
  }

  return {
    renderTaggedTitle,
    enhanceThreadTitleTags,
    renderVisibleForumThreadTitleTags,
    toggleTagFilter,
    clearTagFilter,
    renderTopTagBar,
  };
}
