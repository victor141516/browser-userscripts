import { createForumPageController } from "./forumPageController";
import { createThreadPageController } from "./threadPageController";
import {
  INSTANCE_KEY,
  SCRIPT_INSTANCE_VERSION,
} from "../../config/constants";
import {
  isForumDisplayPage,
  isThreadPage,
} from "../../shared/dom";

type ScriptWindow = Window & {
  [INSTANCE_KEY]?: string;
};

declare global {
  interface Window {
    mq_click?: (postId: string) => void;
  }
}

function createDocumentReadyPromise(): Promise<void> {
  if (document.readyState === "loading") {
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  return Promise.resolve();
}

export async function runForocochesPremium() {
  const scriptWindow = window as ScriptWindow;

  if (scriptWindow[INSTANCE_KEY] === SCRIPT_INSTANCE_VERSION) {
    return;
  }

  scriptWindow[INSTANCE_KEY] = SCRIPT_INSTANCE_VERSION;

  await createDocumentReadyPromise();

  const forumController = createForumPageController();
  const threadController = createThreadPageController();

  await Promise.all([
    forumController.init(),
    threadController.init(),
  ]);

  if (!isForumDisplayPage() && !isThreadPage()) {
    return;
  }

  if (isForumDisplayPage()) {
    forumController.renderForumControlsRow();
    forumController.refreshNavigation({ reset: true });
  }

  if (isThreadPage()) {
    threadController.refreshNavigation({ reset: true });
    threadController.updateSummaryMenu();
  }
}
