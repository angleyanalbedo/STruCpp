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

function htmlForDocument(
  webview: vscode.Webview,
  document: OpenPlcDiagramCustomDocument,
): string {
  const scriptNonce = nonce();
  const model = document.model;
  const payload = jsonForScript({
    model,
    errors: document.errors,
    fileName: path.basename(document.uri.fsPath),
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${scriptNonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenPLC Diagram</title>
  <style>
    :root { color-scheme: light dark; --border: #8888; --panel: #0001; --node: #087ea44d; --accent: #3794ff; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font: 13px var(--vscode-font-family); overflow: auto; }
    header { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; padding: 8px 12px; background: var(--vscode-editorWidget-background); border-bottom: 1px solid var(--border); }
    header strong { font-size: 14px; }
    header span { opacity: .75; }
    #canvas { padding: 12px; }
    .error { margin: 8px 0; padding: 8px 10px; border-left: 3px solid #f14c4c; background: #f14c4c22; white-space: pre-wrap; }
    .rung { margin-bottom: 18px; border: 1px solid var(--border); background: var(--panel); overflow: auto; }
    .rung-title { padding: 6px 10px; border-bottom: 1px solid var(--border); opacity: .85; }
    svg { display: block; min-width: 500px; min-height: 180px; background-image: radial-gradient(#8885 1px, transparent 1px); background-size: 16px 16px; }
    .edge { stroke: var(--vscode-textLink-foreground); stroke-width: 2; fill: none; opacity: .85; }
    .node { fill: var(--node); stroke: var(--vscode-foreground); stroke-width: 1.5; cursor: pointer; }
    .node:hover { stroke-width: 3; }
    .node-label { fill: var(--vscode-foreground); font-size: 12px; pointer-events: none; text-anchor: middle; dominant-baseline: central; }
    .port-label { fill: var(--vscode-foreground); font-size: 10px; dominant-baseline: central; }
    .symbol { fill: none; stroke: var(--vscode-foreground); stroke-width: 2; }
    .symbol-text { fill: var(--vscode-foreground); font-size: 11px; text-anchor: middle; }
    .rail { stroke: var(--vscode-foreground); stroke-width: 4; }
    .contact, .coil { fill: none; stroke: var(--vscode-foreground); stroke-width: 2; }
    .empty { opacity: .7; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <header><strong id="title"></strong><span id="summary"></span></header>
  <main id="canvas"></main>
  <script nonce="${scriptNonce}">
    const payload = ${payload};
    const model = payload.model;
    const root = document.getElementById('canvas');
    document.getElementById('title').textContent = model ? model.name + ' (' + model.kind + ')' : payload.fileName;
    document.getElementById('summary').textContent = model ? model.rungs.length + ' rung(s) · ' + model.variables.length + ' variable(s)' : 'Parse failed';

    for (const error of payload.errors || []) {
      const item = document.createElement('div');
      item.className = 'error';
      item.textContent = error;
      root.appendChild(item);
    }

    function textValue(value) {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      return '';
    }

    function labelFor(node) {
      const data = node.data || {};
      const variant = data.variant || {};
      const variable = data.variable || {};
      return textValue(variant.name) || textValue(variable.name) || textValue(data.name) || node.type;
    }

    function variantObject(node) {
      return node.data && node.data.variant && typeof node.data.variant === 'object'
        ? node.data.variant : {};
    }

    function variableName(node) {
      const variable = node.data && node.data.variable;
      return typeof variable === 'string' ? variable : textValue(variable && variable.name);
    }

    function handlePoint(node, handleId, side) {
      const handles = (node.data && node.data.handles) || [];
      const handle = handles.find(h => h.id === handleId) || handles.find(h => h.position === side);
      const rel = handle && handle.relPosition;
      if (rel) return { x: (node.position?.x || 0) + (rel.x || 0), y: (node.position?.y || 0) + (rel.y || 0) };
      const x = node.position?.x || 0, y = node.position?.y || 0;
      const w = node.width || 80, h = node.height || 48;
      return { x: x + (side === 'left' ? 0 : w), y: y + h / 2 };
    }

    function appendText(parent, x, y, value, className) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x)); text.setAttribute('y', String(y));
      text.setAttribute('class', className || 'node-label'); text.textContent = value;
      parent.appendChild(text);
      return text;
    }

    function appendLine(parent, x1, y1, x2, y2, className) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1)); line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2));
      line.setAttribute('class', className || 'symbol'); parent.appendChild(line); return line;
    }

    function drawNode(group, node, w, h) {
      const type = node.type;
      const variant = variantObject(node);
      const variantName = textValue(variant.name) || textValue(node.data && node.data.variant);
      const name = variableName(node);
      if (type === 'powerRail') {
        appendLine(group, w / 2, 0, w / 2, h, 'rail');
        return;
      }
      if (type === 'contact') {
        appendLine(group, 8, 2, 8, h - 2, 'symbol');
        appendLine(group, w - 8, 2, w - 8, h - 2, 'symbol');
        if (variantName === 'negated') appendLine(group, 4, h - 2, w - 4, 2, 'symbol');
        if (variantName === 'risingEdge') appendText(group, w / 2, h / 2, '↑', 'node-label');
        if (variantName === 'fallingEdge') appendText(group, w / 2, h / 2, '↓', 'node-label');
        if (name) appendText(group, w / 2, -7, name, 'symbol-text');
        return;
      }
      if (type === 'coil') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 8 2 Q 1 ' + (h / 2) + ' 8 ' + (h - 2) + ' M ' + (w - 8) + ' 2 Q ' + (w - 1) + ' ' + (h / 2) + ' ' + (w - 8) + ' ' + (h - 2));
        path.setAttribute('class', 'symbol'); group.appendChild(path);
        if (variantName === 'negated') {
          appendLine(group, 4, h - 2, w - 4, 2, 'symbol');
        } else if (variantName === 'set' || variantName === 'reset') {
          appendText(group, w / 2, h / 2, variantName.toUpperCase(), 'node-label');
        }
        if (name) appendText(group, w / 2, -7, name, 'symbol-text');
        return;
      }
      if (type === 'variable' || type === 'input-variable' || type === 'output-variable' || type === 'inout-variable') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', String(w)); rect.setAttribute('height', String(h));
        rect.setAttribute('rx', '5'); rect.setAttribute('class', 'node'); group.appendChild(rect);
        appendText(group, w / 2, h / 2, name || labelFor(node), 'node-label');
        return;
      }
      if (type === 'block' || type === 'functionBlock' || type === 'function') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', String(w)); rect.setAttribute('height', String(h));
        rect.setAttribute('rx', '5'); rect.setAttribute('class', 'node'); group.appendChild(rect);
        appendText(group, w / 2, 14, variantName || type, 'node-label');
        const variables = Array.isArray(variant.variables) ? variant.variables : [];
        const inputs = variables.filter(v => v.class === 'input' || v.class === 'inOut');
        const outputs = variables.filter(v => v.class === 'output' || v.class === 'inOut');
        inputs.forEach((v, index) => appendText(group, 6, 34 + index * 18, textValue(v.name), 'port-label'));
        outputs.forEach((v, index) => {
          const label = appendText(group, w - 6, 34 + index * 18, textValue(v.name), 'port-label');
          label.setAttribute('text-anchor', 'end');
        });
        if (name && type === 'block') appendText(group, w / 2, -7, name, 'symbol-text');
        return;
      }
      if (type === 'parallel') {
        appendLine(group, w / 2, 0, w / 2, h, 'symbol');
        return;
      }
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', String(w)); rect.setAttribute('height', String(h));
      rect.setAttribute('rx', '4'); rect.setAttribute('class', 'node'); group.appendChild(rect);
      appendText(group, w / 2, h / 2, labelFor(node), 'node-label');
    }

    function renderRung(rung, index) {
      const wrapper = document.createElement('section');
      wrapper.className = 'rung';
      const heading = document.createElement('div');
      heading.className = 'rung-title';
      heading.textContent = (rung.comment ? rung.comment + ' · ' : '') + 'Rung ' + (index + 1);
      wrapper.appendChild(heading);

      const nodes = rung.nodes || [];
      const maxX = Math.max(500, ...nodes.map(n => (n.position?.x || 0) + (n.width || 80) + 60));
      const maxY = Math.max(160, ...nodes.map(n => (n.position?.y || 0) + (n.height || 48) + 60));
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 ' + maxX + ' ' + maxY);
      svg.setAttribute('width', String(maxX));
      svg.setAttribute('height', String(maxY));
      const centers = new Map();
      for (const node of nodes) {
        const x = node.position?.x || 0, y = node.position?.y || 0;
        const w = node.width || (node.type === 'powerRail' ? 4 : 84), h = node.height || 48;
        centers.set(node.id, { x: x + w / 2, y: y + h / 2 });
      }
      const nodeMap = new Map(nodes.map(node => [node.id, node]));
      for (const edge of rung.edges || []) {
        const sourceNode = nodeMap.get(edge.source), targetNode = nodeMap.get(edge.target);
        const source = sourceNode ? handlePoint(sourceNode, edge.sourceHandle, 'right') : centers.get(edge.source);
        const target = targetNode ? handlePoint(targetNode, edge.targetHandle, 'left') : centers.get(edge.target);
        if (!source || !target) continue;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', source.x); line.setAttribute('y1', source.y);
        line.setAttribute('x2', target.x); line.setAttribute('y2', target.y);
        line.setAttribute('class', 'edge');
        svg.appendChild(line);
      }
      for (const node of nodes) {
        const x = node.position?.x || 0, y = node.position?.y || 0;
        const w = node.width || (node.type === 'powerRail' ? 4 : 84), h = node.height || 48;
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('transform', 'translate(' + x + ',' + y + ')');
        drawNode(group, node, w, h);
        group.addEventListener('click', () => {
          document.getSelection()?.removeAllRanges();
          group.setAttribute('aria-label', node.id + ' · ' + labelFor(node));
        });
        svg.appendChild(group);
      }
      wrapper.appendChild(svg);
      return wrapper;
    }

    if (model) {
      for (const [index, rung] of model.rungs.entries()) root.appendChild(renderRung(rung, index));
      if (!model.rungs.length) root.innerHTML += '<div class="empty">No diagram rungs found.</div>';
    } else {
      root.innerHTML += '<div class="empty">Unable to render this diagram.</div>';
    }
  </script>
</body>
</html>`;
}

function reactHtmlForDocument(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  document: OpenPlcDiagramCustomDocument,
): string {
  const scriptNonce = nonce();
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "plcopen-webview.js"),
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
  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<OpenPlcDiagramCustomDocument>>();
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
        result.errors.map((error) => `${error.line ? `Line ${error.line}: ` : ""}${error.message}`),
      );
    });
  }

  resolveCustomEditor(
    document: OpenPlcDiagramCustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = reactHtmlForDocument(this.context, webviewPanel.webview, document);
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
    return fs.copyFile(document.uri.fsPath, context.destination.fsPath)
      .then(() => ({ id: context.destination.toString(), delete: () => fs.rm(context.destination.fsPath, { force: true }) }));
  }
}
