import {
  THREAD_CONTROLS_ID,
  THREAD_PROGRESS_ID,
  THREAD_SUMMARY_ID,
} from "../config/constants";
import type { ThreadLoadState } from "../domain/types";

export function ensureThreadSummary(
  posts: HTMLElement | null,
): HTMLElement | null {
  if (!posts) {
    return null;
  }

  const existing = document.getElementById(THREAD_SUMMARY_ID);

  if (existing instanceof HTMLElement) {
    installStickySummaryShadow(existing);
    return existing;
  }

  const summary = document.createElement("div");
  summary.id = THREAD_SUMMARY_ID;
  posts.before(summary);
  installStickySummaryShadow(summary);
  return summary;
}

export function setThreadSummaryMessage(
  summary: HTMLElement | null,
  message: string,
): void {
  if (!summary) {
    return;
  }

  summary.innerHTML = message;
}

export function renderThreadSummaryMenu(options: {
  summary: HTMLElement | null;
  state: ThreadLoadState;
  onRefreshCache: () => void | Promise<void>;
}): void {
  const summary = options.summary;

  if (!(summary instanceof HTMLElement)) {
    return;
  }

  summary.textContent = "";
  summary.hidden = true;
  const controlsTarget = renderThreadControls({
    summary,
    state: options.state,
    onRefreshCache: options.onRefreshCache,
  });

  if (controlsTarget === summary) {
    summary.hidden = !options.state.isLoading;
    renderThreadProgress(summary, options.state);
  }
}

function renderThreadControls(options: {
  summary: HTMLElement | null;
  state: ThreadLoadState;
  onRefreshCache: () => void | Promise<void>;
}): HTMLElement | null {
  document.getElementById(THREAD_CONTROLS_ID)?.remove();

  const threadToolsCell = document.getElementById("threadtools");
  const toolbarRow = threadToolsCell?.parentElement;

  if (!options.summary && !(toolbarRow instanceof HTMLTableRowElement)) {
    return null;
  }

  const controls =
    toolbarRow instanceof HTMLTableRowElement
      ? document.createElement("td")
      : document.createElement("div");
  controls.id = THREAD_CONTROLS_ID;

  if (controls instanceof HTMLTableCellElement) {
    controls.className = "vbmenu_control fc-premium-thread-toolbar-controls";
    controls.noWrap = true;
  }

  const cacheButton = document.createElement("button");
  cacheButton.type = "button";
  cacheButton.textContent = "Actualizar cache";
  cacheButton.title =
    "Borrar la cache de este hilo y volver a cargar paginas";
  cacheButton.addEventListener("click", () => {
    void options.onRefreshCache();
  });
  controls.append(cacheButton);
  renderThreadProgress(controls, options.state);

  if (
    toolbarRow instanceof HTMLTableRowElement &&
    threadToolsCell instanceof HTMLTableCellElement
  ) {
    toolbarRow.insertBefore(controls, threadToolsCell);
    return controls;
  }

  options.summary?.append(controls);
  return options.summary || null;
}

function renderThreadProgress(
  summary: HTMLElement | null,
  state: ThreadLoadState,
): void {
  document.getElementById(THREAD_PROGRESS_ID)?.remove();

  if (!(summary instanceof HTMLElement) || !state.isLoading) {
    return;
  }

  const progress = document.createElement("span");
  progress.id = THREAD_PROGRESS_ID;

  const spinner = document.createElement("span");
  spinner.className = "fc-premium-spinner";
  spinner.setAttribute("aria-hidden", "true");
  progress.append(spinner);

  const text = document.createElement("span");
  const pageLabel = `${state.loadedPages}/${state.targetPages}`;
  text.textContent = `paginas ${pageLabel}`;
  progress.append(text);
  summary.append(progress);
}

function installStickySummaryShadow(summary: HTMLElement | null): void {
  if (!summary || summary.dataset.fcPremiumStickyInstalled === "true") {
    return;
  }

  summary.dataset.fcPremiumStickyInstalled = "true";

  const updateShadow = () => {
    summary.classList.toggle(
      "fc-premium-summary-stuck",
      summary.getBoundingClientRect().top <= 0,
    );
  };

  window.addEventListener("scroll", updateShadow, { passive: true });
  window.addEventListener("resize", updateShadow);
  updateShadow();
}
