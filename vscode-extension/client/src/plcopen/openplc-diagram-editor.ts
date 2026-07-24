// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { parseOpenPlcDiagram } from "./openplc-diagram-parser.js";
import type { OpenPlcDiagramDocument } from "./openplc-diagram-types.js";

class OpenPlcDiagramCustomDocument implements vscode.CustomDocument {
  constructor(
    public readonly uri: vscode.Uri,
    public readonly source: string,
    public readonly model: OpenPlcDiagramDocument | undefined,
    public readonly errors: string[],
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
    model: document.model,
    errors: document.errors,
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
      const kind = path.extname(uri.fsPath).toLowerCase() === ".fbd" ? "FBD" : "LD";
      const result = parseOpenPlcDiagram(source, kind);
      return new OpenPlcDiagramCustomDocument(
        uri,
        source,
        result.document,
        result.errors.map(
          (error) => `${error.line ? `Line ${error.line}: ` : ""}${error.message}`,
        ),
      );
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
  }

  saveCustomDocument(
    _document: OpenPlcDiagramCustomDocument,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.resolve();
  }

  saveCustomDocumentAs(
    _document: OpenPlcDiagramCustomDocument,
    _destination: vscode.Uri,
    _cancellation: vscode.CancellationToken,
  ): Thenable<void> {
    return Promise.reject(new Error("OpenPLC diagram editing is read-only in this MVP."));
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
    return fs.copyFile(document.uri.fsPath, context.destination.fsPath).then(() => ({
      id: context.destination.toString(),
      delete: () => fs.rm(context.destination.fsPath, { force: true }),
    }));
  }
}
