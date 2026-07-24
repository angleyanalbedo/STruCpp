// SPDX-License-Identifier: GPL-3.0-or-later
// VS Code composition root for the vendored OpenPLC POU editor.

import React from "react";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import "./src/frontend/components/_atoms/react-flow/style.css";
import "./src/backend/shared/styles/globals.css";
import "../../openplc-pou-overrides.css";

import { PlatformProvider } from "./src/middleware/shared/providers";
import { GraphicalEditor } from "./src/frontend/components/_features/[workspace]/editor/graphical";
import { VariablesEditor } from "./src/frontend/components/_organisms/variables-editor";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./src/frontend/components/_organisms/panel";
import { LadderToolbox } from "./src/frontend/components/_organisms/workspace-activity-bar/ladder-toolbox";
import { FBDToolbox } from "./src/frontend/components/_organisms/workspace-activity-bar/fbd-toolbox";
import { openPLCStoreBase } from "./src/frontend/store";
import { CreatePLCGraphicalObject } from "./src/frontend/store/slices/tabs/utils";
import { parseGraphicalPouFromString } from "./src/frontend/utils/PLC/pou-text-parser";
import { serializeGraphicalPouToString } from "./src/frontend/utils/PLC/pou-text-serializer";
import type { PLCPou } from "./src/middleware/shared/ports/types";

declare global {
  interface Window {
    __OPENPLC_MODEL__?: {
      source?: string;
      kind?: "LD" | "FBD";
      fileName?: string;
    };
  }
  function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
  };
}

const noOpPort = new Proxy({}, {
  get: () => async () => ({ success: false, error: "Unavailable in VS Code POU editor" }),
});

const platformPorts = {
  compiler: noOpPort,
  runtime: noOpPort,
  debugger: noOpPort,
  simulator: noOpPort,
  project: noOpPort,
  device: noOpPort,
  orchestrator: noOpPort,
  system: noOpPort,
  window: noOpPort,
  accelerator: noOpPort,
  theme: noOpPort,
  versionControl: noOpPort,
  navigation: noOpPort,
  library: noOpPort,
  capabilities: {
    isNativeApplication: false,
    hasStLSP: false,
    hasPython: false,
    hasCpp: false,
  },
} as never;

function initializeOpenPLC(pou: PLCPou) {
  const language = pou.body.language as "ld" | "fbd";
  const editor = CreatePLCGraphicalObject(pou.name, language, pou.pouType);
  const state = openPLCStoreBase.getState();
  state.projectActions.setPous([pou] as never);
  state.editorActions.addModel(editor);
  state.editorActions.setEditor(editor);
  if (language === "ld") {
    state.ladderFlowActions.addLadderFlow(pou.body.value as never);
  } else {
    state.fbdFlowActions.addFBDFlow(pou.body.value as never);
  }

  const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;
  openPLCStoreBase.subscribe(
    current => current.project.data.pous.find(item => item.name === pou.name),
    currentPou => {
      if (!vscode || !currentPou) return;
      vscode.postMessage({
        type: "update",
        source: serializeGraphicalPouToString(currentPou),
      });
    },
  );
}

function OpenPlcPouEditor({ pou }: { pou: PLCPou }) {
  const language = pou.body.language as "ld" | "fbd";
  return (
    <PlatformProvider ports={platformPorts}>
      <main className="flex h-screen w-screen overflow-hidden bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
        <aside className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-neutral-200 bg-neutral-50 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          {language === "ld" ? <LadderToolbox /> : <FBDToolbox />}
        </aside>
        <ResizablePanelGroup direction="vertical" className="min-w-0 flex-1">
          <ResizablePanel id="variableTablePanel" defaultSize={25} minSize={20} collapsible>
            <div className="h-full p-4">
              <VariablesEditor name={pou.name} isActive />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="graphicalEditorPanel" defaultSize={75} minSize={25}>
            <GraphicalEditor name={pou.name} language={language} isActive />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </PlatformProvider>
  );
}

const payload = window.__OPENPLC_MODEL__;
if (!payload?.source || !payload.kind) {
  createRoot(document.getElementById("root")!).render(
    <div>Unable to initialize OpenPLC POU editor.</div>,
  );
} else {
  const language = payload.kind.toLowerCase();
  const declaration = payload.source.match(/^\s*(PROGRAM|FUNCTION_BLOCK|FUNCTION)\b/i)?.[1]?.toUpperCase();
  const pouType = declaration === "FUNCTION_BLOCK"
    ? "function-block"
    : declaration === "FUNCTION"
      ? "function"
      : "program";
  try {
    const pou = parseGraphicalPouFromString(payload.source, language, pouType);
    initializeOpenPLC(pou);
    createRoot(document.getElementById("root")!).render(
      <OpenPlcPouEditor pou={pou} />,
    );
  } catch (error) {
    createRoot(document.getElementById("root")!).render(
      <pre>{error instanceof Error ? error.message : String(error)}</pre>,
    );
  }
}
