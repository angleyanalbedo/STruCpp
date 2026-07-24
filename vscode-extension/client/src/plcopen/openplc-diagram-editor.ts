// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

class OpenPlcDiagramCustomDocument implements vscode.CustomDocument {
  constructor(
    public readonly uri: vscode.Uri,
    public source: string,
  ) {}

  dispose(): void {}
}

function nonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let i = 0; i < 32; i++) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function htmlForReactDocument(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  document: OpenPlcDiagramCustomDocument,
): string {
  const scriptNonce = nonce();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "plcopen-webview.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "plcopen-webview.css"),
  );
  const payload = jsonForScript({
    source: document.source,
    kind: path.extname(document.uri.fsPath).toLowerCase() === ".fbd" ? "FBD" : "LD",
    fileName: path.basename(document.uri.fsPath),
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${scriptNonce}' ${webview.cspSource};">
  <title>OpenPLC Diagram</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="root"></div>
  <script nonce="${scriptNonce}">window.__OPENPLC_MODEL__ = ${payload};</script>
  <script nonce="${scriptNonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

export class OpenPlcDiagramEditorProvider
  implements vscode.CustomEditorProvider<OpenPlcDiagramCustomDocument> {
  static readonly viewType = "strucpp.openplcDiagram";
  private readonly changeEmitter =
    new vscode.EventEmitter<vscode.CustomDocumentEditEvent<OpenPlcDiagramCustomDocument>>();
  readonly onDidChangeCustomDocument = this.changeEmitter.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Thenable<OpenPlcDiagramCustomDocument> {
    return fs.readFile(uri.fsPath, "utf8").then((source) => {
      return new OpenPlcDiagramCustomDocument(uri, source);
    });
  }

  resolveCustomEditor(
    document: OpenPlcDiagramCustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = htmlForReactDocument(
      this.context,
      webviewPanel.webview,
      document,
    );
    webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
      if (
        !message ||
        typeof message !== "object" ||
        (message as { type?: unknown }).type !== "update" ||
        typeof (message as { source?: unknown }).source !== "string"
      ) {
        return;
      }
      const nextSource = (message as { source: string }).source;
      if (nextSource === document.source) return;
      const previousSource = document.source;
      const applySource = (source: string) => {
        document.source = source;
      };
      applySource(nextSource);
      this.changeEmitter.fire({
        document,
        label: "Edit OpenPLC POU",
        undo: () => {
          applySource(previousSource);
          return Promise.resolve();
        },
        redo: () => {
          applySource(nextSource);
          return Promise.resolve();
        },
      });
    });
  }

  saveCustomDocument(
    document: OpenPlcDiagramCustomDocument,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return fs.writeFile(document.uri.fsPath, document.source, "utf8");
  }

  saveCustomDocumentAs(
    document: OpenPlcDiagramCustomDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return fs.writeFile(destination.fsPath, document.source, "utf8");
  }

  revertCustomDocument(
    _document: OpenPlcDiagramCustomDocument,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }

  backupCustomDocument(
    document: OpenPlcDiagramCustomDocument,
    context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken,
  ): Thenable<vscode.CustomDocumentBackup> {
    return fs.writeFile(context.destination.fsPath, document.source, "utf8").then(() => ({
      id: context.destination.toString(),
      delete: () => fs.rm(context.destination.fsPath, { force: true }),
    }));
  }
}
