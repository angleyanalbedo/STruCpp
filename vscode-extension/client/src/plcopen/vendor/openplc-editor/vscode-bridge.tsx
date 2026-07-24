// SPDX-License-Identifier: GPL-3.0-or-later
// VS Code host adapters. This file is not part of the vendored upstream src.

import { registerScopedQueryApi } from "./src/frontend/services/st-lsp/scoped-query";
import { useOpenPLCStore, openPLCStoreBase } from "./src/frontend/store";
import { DividerActivityBar } from "./src/frontend/components/_atoms/workspace-activity-bar/divider";
import { FBDToolbox } from "./src/frontend/components/_organisms/workspace-activity-bar/fbd-toolbox";
import { LadderToolbox } from "./src/frontend/components/_organisms/workspace-activity-bar/ladder-toolbox";

/**
 * POU-only host for OpenPLC's original toolboxes. The complete upstream
 * WorkspaceActivityBar also starts build/runtime/debug polling; those controls
 * are intentionally omitted until their VS Code ports are implemented.
 */
export function VsCodePouActivityBar() {
  const language = useOpenPLCStore((state) =>
    state.editor.type === "plc-graphical" ? state.editor.meta.language : undefined,
  );
  return (
    <div className="sidebar-scroll my-5 flex min-h-0 w-full flex-1 flex-col items-center gap-5 overflow-y-auto">
      <DividerActivityBar />
      <div className="flex w-full flex-col items-center gap-5">
        {language === "ld" && <LadderToolbox />}
        {language === "fbd" && <FBDToolbox />}
      </div>
    </div>
  );
}

/**
 * Supply OpenPLC's ScopedQueryApi from the live POU model until requests are
 * forwarded to the extension-host STruC++ language server. OpenPLC retains
 * ownership of filtering, candidate rendering, selection and type validation.
 */
export function registerVsCodeScopedQueryAdapter(): void {
  registerScopedQueryApi({
    async completeInScope(pouName, prefix) {
      if (prefix.includes(".")) return [];
      const pou = openPLCStoreBase
        .getState()
        .project.data.pous.find((candidate) => candidate.name === pouName);
      return (pou?.interface?.variables ?? []).map((variable) => ({
        label: variable.name,
        insertText: variable.name,
        type: variable.type.value,
        kind: 6,
      }));
    },
  });
}
