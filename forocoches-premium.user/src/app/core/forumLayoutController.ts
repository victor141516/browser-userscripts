import {
  FORUM_CONTROLS_ROW_ID,
  FORUM_LAYOUT_HIDDEN_ATTRIBUTE,
  FORUM_LOADING_STATUS_ID,
  FORUM_SEARCH_SLOT_ID,
  FORUM_SIDEBAR_HIDDEN_CLASS,
  FORUM_SIDEBAR_STORAGE_KEY,
  FORUM_SIDEBAR_TOGGLE_BAR_ID,
  FORUM_SIDEBAR_TOGGLE_ID,
} from "../../config/constants";
import type { ForumThreadLoadState, ForumThreadRecord } from "../../domain/types";
import {
  ForumLoadingStatus,
  ForumSidebarToggleButton,
} from "../../ui/components/ForumControls";
import {
  closeHiddenThreadsModal as closeHiddenThreadsModalInDom,
  ensureHiddenThreadsModal as ensureHiddenThreadsModalInDom,
  isHiddenThreadsModalOpen as isHiddenThreadsModalOpenInDom,
  openHiddenThreadsModal as openHiddenThreadsModalInDom,
  renderHiddenThreadsModalBody as renderHiddenThreadsModalBodyInDom,
  renderHiddenThreadsToolbarButton as renderHiddenThreadsToolbarButtonInDom,
} from "../../ui/hiddenThreadsModalDom";
import {
  getForumMainCell,
  getForumSidebarCell,
  getForumSidebarSpacerCell,
  getForumThreadListHeaderTable,
  getForumThreadsTable,
  getRelatedForumsPanel,
  hideTopShortcutBarsBefore,
  removeForumTitleTables,
  setForumLayoutElementHidden,
  setForumMainCellExpanded,
} from "../../adapters/forocoches/forumLayout";
import {
  getThreadTitleTable,
  moveForumHeaderSearchForm,
} from "../../adapters/forocoches/threadHeader";
import { isForumDisplayPage, isThreadPage } from "../../shared/dom";

export interface ForumLayoutControllerOptions {
  ensureStyle: () => void;
  getPostsElement: () => HTMLElement | null;
  getForumThreadLoadState: () => ForumThreadLoadState;
  scheduleForumLiveSearch: (query: string) => void;
  getHiddenForumThreadRecordsForCurrentForum: () => ForumThreadRecord[];
  setForumThreadHiddenState: (
    threadId: string,
    hidden: boolean,
  ) => Promise<boolean>;
}

export interface ForumLayoutController {
  renderForumControlsRow(): HTMLTableElement | null;
  renderForumLoadingStatus(): void;
  enhanceForumDisplayPage(): void;
  renderHiddenThreadsToolbarButton(): void;
  isHiddenThreadsModalOpen(): boolean;
  closeHiddenThreadsModal(): void;
  renderHiddenThreadsModalBody(): void;
  openHiddenThreadsModal(): void;
}

export function createForumLayoutController(
  options: ForumLayoutControllerOptions,
): ForumLayoutController {
  let forumSidebarHidden = getSavedForumSidebarHidden();

  function getSavedForumSidebarHidden(): boolean {
    const saved = localStorage.getItem(FORUM_SIDEBAR_STORAGE_KEY);

    return saved === null ? true : saved === "true";
  }

  function setSavedForumSidebarHidden(hidden: boolean) {
    forumSidebarHidden = hidden;
    localStorage.setItem(FORUM_SIDEBAR_STORAGE_KEY, String(hidden));
    applyForumSidebarVisibility();
  }

  function getMainContentAnchor(): HTMLElement | null {
    return getForumThreadsTable() || options.getPostsElement() || getThreadTitleTable();
  }

  function hideUnusedTopNavigationBars() {
    if (!isForumDisplayPage() && !isThreadPage()) {
      return;
    }

    hideTopShortcutBarsBefore(getMainContentAnchor());
  }

  function getOrCreateForumSidebarToggleButton(): HTMLButtonElement {
    const existing = document.getElementById(FORUM_SIDEBAR_TOGGLE_ID);
    const button = ForumSidebarToggleButton({
      hidden: forumSidebarHidden,
      onToggle: () => {
        setSavedForumSidebarHidden(!forumSidebarHidden);
      },
    });

    if (existing instanceof HTMLButtonElement) {
      existing.replaceWith(button);
    }

    return button;
  }

  function getForumToolbarRow(): HTMLTableRowElement | null {
    const toolsCell = document.getElementById("forumtools");
    const row = toolsCell?.parentElement;

    return row instanceof HTMLTableRowElement ? row : null;
  }

  function renderHiddenThreadsToolbarButton() {
    if (!isForumDisplayPage()) {
      return;
    }

    renderHiddenThreadsToolbarButtonInDom({
      toolbarRow: getForumToolbarRow(),
      toolsCell: document.getElementById("forumtools"),
      onOpen: openHiddenThreadsModal,
    });
  }

  function ensureHiddenThreadsModal(): HTMLElement {
    return ensureHiddenThreadsModalInDom({
      records: options.getHiddenForumThreadRecordsForCurrentForum(),
      onClose: closeHiddenThreadsModal,
      onRestore: (threadId) => {
        void options.setForumThreadHiddenState(threadId, false);
      },
    });
  }

  function isHiddenThreadsModalOpen(): boolean {
    return isHiddenThreadsModalOpenInDom();
  }

  function closeHiddenThreadsModal() {
    closeHiddenThreadsModalInDom();
  }

  function renderHiddenThreadsModalBody() {
    renderHiddenThreadsModalBodyInDom({
      modal: ensureHiddenThreadsModal(),
      records: options.getHiddenForumThreadRecordsForCurrentForum(),
      onRestore: (threadId) => {
        void options.setForumThreadHiddenState(threadId, false);
      },
    });
  }

  function openHiddenThreadsModal() {
    openHiddenThreadsModalInDom({
      modal: ensureHiddenThreadsModal(),
      records: options.getHiddenForumThreadRecordsForCurrentForum(),
      onRestore: (threadId) => {
        void options.setForumThreadHiddenState(threadId, false);
      },
    });
  }

  function isNativeForumControlsTable(table: HTMLTableElement): boolean {
    return Boolean(
      table.querySelector("a[href*='newthread.php'][href*='do=newthread']") &&
        table.querySelector(".pagenav"),
    );
  }

  function getNativeForumControlsTable(): HTMLTableElement | null {
    const existing = document.getElementById(FORUM_CONTROLS_ROW_ID);

    if (existing instanceof HTMLTableElement) {
      return existing;
    }

    const threadsTable = getForumThreadsTable();
    const candidates = Array.from(document.querySelectorAll("table")).filter(
      (table) => {
        if (!(table instanceof HTMLTableElement)) {
          return false;
        }

        if (!isNativeForumControlsTable(table)) {
          return false;
        }

        return (
          !threadsTable ||
          Boolean(
            table.compareDocumentPosition(threadsTable) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          )
        );
      },
    );

    return candidates[candidates.length - 1] || null;
  }

  function createForumLoadingStatus(): HTMLElement {
    return ForumLoadingStatus();
  }

  function renderForumLoadingStatus() {
    const status = document.getElementById(FORUM_LOADING_STATUS_ID);

    if (!(status instanceof HTMLElement)) {
      return;
    }

    const loadState = options.getForumThreadLoadState();
    const visible = loadState.isLoading;
    const loadedPages = Math.min(loadState.loadedPages, loadState.targetPages);
    const text = status.querySelector("[data-fc-premium-loading-text]");

    status.dataset.fcPremiumLoading = String(visible);
    status.setAttribute("aria-hidden", String(!visible));
    status.title = visible ? "Cargando paginas del foro" : "";

    if (text instanceof HTMLElement) {
      text.textContent = `Cargando paginas ${loadedPages}/${loadState.targetPages}`;
    }
  }

  function installForumLiveSearch(root: HTMLFormElement | HTMLElement | null) {
    const input = root?.querySelector("input[name='query']");

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    if (input.dataset.fcPremiumLiveSearchInstalled === "true") {
      return;
    }

    input.dataset.fcPremiumLiveSearchInstalled = "true";
    input.addEventListener("input", () => {
      options.scheduleForumLiveSearch(input.value);
    });
  }

  function detachMovedForumSearchForm(
    controlsTable: HTMLTableElement,
  ): HTMLFormElement | null {
    const form = document.querySelector(
      "form[name='busca'][action*='forocoches_search']",
    );

    if (form instanceof HTMLFormElement && controlsTable.contains(form)) {
      form.remove();
      return form;
    }

    return null;
  }

  function refreshExistingForumControlsRow(table: HTMLTableElement) {
    table.classList.add("fc-premium-forum-controls-table");
    table.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);

    const toggleCell = table.querySelector(
      ".fc-premium-forum-sidebar-toggle-cell",
    );

    if (toggleCell instanceof HTMLTableCellElement) {
      const button = getOrCreateForumSidebarToggleButton();

      if (!toggleCell.contains(button)) {
        toggleCell.textContent = "";
        toggleCell.append(button);
      }
    }

    installForumLiveSearch(table);

    if (!document.getElementById(FORUM_LOADING_STATUS_ID)) {
      const searchCell = table.querySelector(`#${FORUM_SEARCH_SLOT_ID}`);

      if (searchCell instanceof HTMLElement) {
        searchCell.append(createForumLoadingStatus());
      }
    }

    renderForumLoadingStatus();
  }

  function renderForumControlsRow(): HTMLTableElement | null {
    const existing = document.getElementById(FORUM_CONTROLS_ROW_ID);

    if (existing instanceof HTMLTableElement) {
      refreshExistingForumControlsRow(existing);
      return existing;
    }

    const table = getNativeForumControlsTable();

    if (!(table instanceof HTMLTableElement)) {
      renderForumLoadingStatus();
      return null;
    }

    const newThreadLink = table.querySelector(
      "a[href*='newthread.php'][href*='do=newthread']",
    );
    const pager = table.querySelector(".pagenav");
    const searchForm = detachMovedForumSearchForm(table);
    const button = getOrCreateForumSidebarToggleButton();

    newThreadLink?.remove();
    pager?.remove();
    button.remove();
    table.id = FORUM_CONTROLS_ROW_ID;
    table.classList.add("fc-premium-forum-controls-table");
    table.removeAttribute(FORUM_LAYOUT_HIDDEN_ATTRIBUTE);

    const body = table.tBodies[0] || table.createTBody();
    body.textContent = "";

    const row = body.insertRow();

    const toggleCell = row.insertCell();
    toggleCell.className = "smallfont fc-premium-forum-sidebar-toggle-cell";
    toggleCell.append(button);

    const newThreadCell = row.insertCell();
    newThreadCell.className = "smallfont fc-premium-forum-new-thread-cell";

    if (newThreadLink) {
      newThreadCell.append(newThreadLink);
    }

    const searchCell = row.insertCell();
    searchCell.id = FORUM_SEARCH_SLOT_ID;
    searchCell.className = "smallfont fc-premium-forum-search-cell";

    if (searchForm) {
      searchCell.append(searchForm);
    } else {
      moveForumHeaderSearchForm(searchCell);
    }

    installForumLiveSearch(searchCell);
    searchCell.append(createForumLoadingStatus());

    const pagerCell = row.insertCell();
    pagerCell.className = "smallfont fc-premium-forum-pager-cell";
    pagerCell.align = "right";

    if (pager) {
      pagerCell.append(pager);
    }

    renderForumLoadingStatus();
    return table;
  }

  function renderForumSidebarToggle(mainCell: HTMLTableCellElement) {
    if (renderForumControlsRow()) {
      document.getElementById(FORUM_SIDEBAR_TOGGLE_BAR_ID)?.remove();
      return;
    }

    let bar = document.getElementById(FORUM_SIDEBAR_TOGGLE_BAR_ID);

    if (!(bar instanceof HTMLElement)) {
      bar = document.createElement("div");
      bar.id = FORUM_SIDEBAR_TOGGLE_BAR_ID;
    }

    bar.textContent = "";
    bar.append(getOrCreateForumSidebarToggleButton());

    const anchor = getForumThreadListHeaderTable() || getForumThreadsTable();

    if (anchor?.parentElement === mainCell) {
      mainCell.insertBefore(bar, anchor);
    } else if (bar.parentElement !== mainCell) {
      mainCell.prepend(bar);
    }
  }

  function applyForumSidebarVisibility() {
    const panel = getRelatedForumsPanel();

    if (!panel) {
      return;
    }

    const sidebarCell = getForumSidebarCell(panel);

    if (!sidebarCell) {
      return;
    }

    const mainCell = getForumMainCell(sidebarCell);

    if (!mainCell) {
      return;
    }

    document.body.classList.toggle(
      FORUM_SIDEBAR_HIDDEN_CLASS,
      forumSidebarHidden,
    );
    setForumLayoutElementHidden(sidebarCell, forumSidebarHidden);

    const spacerCell = getForumSidebarSpacerCell(sidebarCell);

    if (spacerCell) {
      setForumLayoutElementHidden(spacerCell, forumSidebarHidden);
    }

    setForumMainCellExpanded(mainCell, forumSidebarHidden);
    renderForumSidebarToggle(mainCell);
  }

  function enhanceForumDisplayPage() {
    options.ensureStyle();
    hideUnusedTopNavigationBars();
    removeForumTitleTables();
    applyForumSidebarVisibility();
    renderForumControlsRow();
    renderHiddenThreadsToolbarButton();
    hideUnusedTopNavigationBars();
  }

  return {
    renderForumControlsRow,
    renderForumLoadingStatus,
    enhanceForumDisplayPage,
    renderHiddenThreadsToolbarButton,
    isHiddenThreadsModalOpen,
    closeHiddenThreadsModal,
    renderHiddenThreadsModalBody,
    openHiddenThreadsModal,
  };
}
