import {
  STYLE_ID,
  FORUM_LAYOUT_HIDDEN_ATTRIBUTE,
  THREAD_SEARCH_HEADER_SLOT_ID,
} from "../../config/constants";
import { hideTopShortcutBarsBefore } from "../../adapters/forocoches/forumLayout";
import {
  getNavbarSearchLink,
  getThreadBreadcrumbContentTable,
  getThreadBreadcrumbOuterTable,
  getThreadTitleTable,
  hideForumHeaderSearchForm,
  hideNativeThreadSearchMenu,
} from "../../adapters/forocoches/threadHeader";
import { renderShortcutHelpButton as renderShortcutHelpButtonInDom } from "../../ui/shortcutHelpDom";
import {
  formatShortcutHelpKey,
  getShortcutHelpItems,
} from "../../ui/shortcutHelpItems";

declare const __FC_PREMIUM_CSS__: string;

export interface ThreadPageHeaderController {
  prepareThreadPage(): void;
  renderShortcutHelpButton(): void;
}

export function createThreadPageHeaderController(): ThreadPageHeaderController {
  function ensureStyle() {
    const existing = document.getElementById(STYLE_ID);
    const style = existing instanceof HTMLStyleElement
      ? existing
      : document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = __FC_PREMIUM_CSS__;

    if (!existing) {
      document.head.appendChild(style);
    }
  }

  function enhanceThreadHeader() {
    const titleTable = getThreadTitleTable();

    if (
      !(titleTable instanceof HTMLTableElement) ||
      titleTable.dataset.fcPremiumThreadHeaderEnhanced === "true"
    ) {
      return;
    }

    const breadcrumbs = getThreadBreadcrumbContentTable();
    const searchLink = getNavbarSearchLink();

    if (!breadcrumbs && !searchLink) {
      return;
    }

    titleTable.dataset.fcPremiumThreadHeaderEnhanced = "true";

    const searchParentCell = searchLink?.closest("td.vbmenu_control");
    const breadcrumbOuterTable = getThreadBreadcrumbOuterTable();
    const body = titleTable.tBodies[0] || titleTable.createTBody();
    body.textContent = "";

    const row = body.insertRow();
    const cell = row.insertCell();
    cell.className = "thead fc-premium-thread-header-cell";
    cell.colSpan = 3;

    const layout = document.createElement("div");
    layout.className = "fc-premium-thread-header-layout";

    const breadcrumbSlot = document.createElement("div");
    breadcrumbSlot.className = "fc-premium-thread-header-breadcrumbs";

    if (breadcrumbs) {
      breadcrumbSlot.append(breadcrumbs);
    }

    layout.append(breadcrumbSlot);

    const searchSlot = document.createElement("div");
    searchSlot.id = THREAD_SEARCH_HEADER_SLOT_ID;
    searchSlot.className = "fc-premium-thread-header-message-search";
    layout.append(searchSlot);

    cell.append(layout);
    hideForumHeaderSearchForm();

    if (searchParentCell instanceof HTMLElement) {
      searchParentCell.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    }

    if (breadcrumbOuterTable instanceof HTMLElement) {
      breadcrumbOuterTable.setAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE, "true");
    }
  }

  function prepareThreadPage() {
    ensureStyle();
    hideTopShortcutBarsBefore(getThreadTitleTable());
    hideNativeThreadSearchMenu();
    enhanceThreadHeader();
    hideNativeThreadSearchMenu();
  }

  function renderShortcutHelpButton() {
    renderShortcutHelpButtonInDom({
      items: getShortcutHelpItems(),
      formatKey: formatShortcutHelpKey,
    });
  }

  return {
    prepareThreadPage,
    renderShortcutHelpButton,
  };
}
