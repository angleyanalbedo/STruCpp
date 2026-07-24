// SPDX-License-Identifier: GPL-3.0-or-later
// VS Code host adapters. This file is not part of the vendored upstream src.

import { useEffect } from "react";

import { registerScopedQueryApi } from "./src/frontend/services/st-lsp/scoped-query";
import { useOpenPLCStore, openPLCStoreBase } from "./src/frontend/store";
import { generateIecVariablesToString } from "./src/frontend/utils/generate-iec-variables-to-string";
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
 * Forward Webview DOM events that are swallowed before xyflow/Radix receives
 * them to the same OpenPLC store actions used by the upstream handlers.
 * Rendering and edit behavior remain in OpenPLC's original components.
 */
export function VsCodePouInteractionBridge() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest('[aria-label="Variables code visualization"]')) return;

      const state = openPLCStoreBase.getState();
      const editor = state.editor;
      if (editor.type !== "plc-graphical" && editor.type !== "plc-textual") return;
      const pou = state.project.data.pous.find((candidate) => candidate.name === editor.meta.name);
      const code = generateIecVariablesToString(pou?.interface?.variables ?? []);
      state.editorActions.updateModelVariablesForName(editor.meta.name, {
        display: "code",
        code,
      });
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const nodeElement = target?.closest<HTMLElement>(
        ".react-flow__node-contact, .react-flow__node-coil, .react-flow__node-block",
      );
      const nodeId = nodeElement?.dataset.id;
      if (!nodeId) return;

      const state = openPLCStoreBase.getState();
      const editor = state.editor;
      if (editor.type !== "plc-graphical") return;

      if (editor.meta.language === "ld") {
        const node = state.ladderFlows
          .find((flow) => flow.name === editor.meta.name)
          ?.rungs.flatMap((rung) => rung.nodes)
          .find((candidate) => candidate.id === nodeId);
        if (!node) return;
        if (node.type === "contact") state.modalActions.openModal("contact-ladder-element", node);
        if (node.type === "coil") state.modalActions.openModal("coil-ladder-element", node);
        if (node.type === "block") state.modalActions.openModal("block-ladder-element", node);
        return;
      }

      const node = state.fbdFlows
        .find((flow) => flow.name === editor.meta.name)
        ?.rung.nodes.find((candidate) => candidate.id === nodeId);
      if (node?.type === "block") state.modalActions.openModal("block-fbd-element", node);
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("dblclick", handleDoubleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("dblclick", handleDoubleClick, true);
    };
  }, []);

  return null;
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
