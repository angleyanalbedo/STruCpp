// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project

import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { DiagramNode, DiagramRung, OpenPlcDiagramDocument } from "../openplc-diagram-types.js";

declare global {
  interface Window {
    __OPENPLC_MODEL__?: { model?: OpenPlcDiagramDocument; errors?: string[]; fileName?: string };
  }
}

const css = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font: 13px var(--vscode-font-family); }
.app { min-height: 100vh; padding: 10px; }
.toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; padding: 8px 10px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); border-radius: 6px; }
.toolbar strong { font-size: 14px; }
.toolbar span { opacity: .7; }
.toolbar button, .rung-header button { color: inherit; background: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-border, transparent); padding: 3px 8px; border-radius: 4px; cursor: pointer; }
.toolbar button:hover, .rung-header button:hover { background: var(--vscode-button-secondaryHoverBackground); }
.variables { margin-bottom: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: hidden; }
.variables-header, .rung-header { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; background: var(--vscode-sideBar-background); cursor: pointer; }
.variables table { width: 100%; border-collapse: collapse; }
.variables th, .variables td { text-align: left; padding: 5px 8px; border-top: 1px solid var(--vscode-panel-border); }
.variables th { opacity: .75; font-weight: 500; }
.rung { margin-bottom: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 7px; overflow: hidden; }
.rung-header { font-weight: 600; }
.rung-comment { flex: 1; margin-left: 12px; font-weight: 400; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.flow-wrap { height: 420px; background: var(--vscode-editor-background); }
.react-flow { direction: ltr; width: 100%; height: 100%; position: relative; overflow: hidden; z-index: 0; background-image: radial-gradient(#8885 1px, transparent 1px); background-size: 16px 16px; }
.react-flow__renderer { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
.react-flow__pane { z-index: 1; cursor: grab; }
.react-flow__edges, .react-flow__connectionline { position: absolute; width: 100%; height: 100%; top: 0; left: 0; overflow: visible; pointer-events: none; }
.react-flow__edge-path { stroke: var(--vscode-textLink-foreground); stroke-width: 1.5; fill: none; }
.react-flow__nodes { pointer-events: none; transform-origin: 0 0; }
.react-flow__node { position: absolute; user-select: none; pointer-events: all; transform-origin: 0 0; }
.react-flow__handle { position: absolute; width: 6px; height: 6px; border: 1px solid var(--vscode-editor-background); border-radius: 50%; background: var(--vscode-textLink-foreground); z-index: 5; }
.react-flow__handle-left { left: -3px; }
.react-flow__handle-right { right: -3px; }
.react-flow__controls { position: absolute; bottom: 10px; left: 10px; z-index: 5; display: flex; flex-direction: column; box-shadow: 0 1px 4px #0005; }
.react-flow__controls-button { width: 24px; height: 24px; padding: 3px; color: var(--vscode-foreground); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); cursor: pointer; }
.diagram-node { position: relative; color: var(--vscode-foreground); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); box-shadow: 0 1px 3px #0003; }
.diagram-node:hover { border-color: var(--vscode-focusBorder); }
.contact-node, .coil-node { width: 28px; height: 24px; border: 0; background: transparent; box-shadow: none; }
.contact-node::before, .contact-node::after { content: ''; position: absolute; top: 1px; bottom: 1px; width: 2px; background: currentColor; }
.contact-node::before { left: 6px; } .contact-node::after { right: 6px; }
.contact-node.negated::after { transform: rotate(55deg); transform-origin: center; }
.coil-node { width: 32px; height: 24px; border: 0; background: transparent; box-shadow: none; }
.coil-node::before, .coil-node::after { content: ''; position: absolute; top: 1px; bottom: 1px; width: 12px; border: 2px solid currentColor; }
.coil-node::before { left: 1px; border-right: 0; border-radius: 12px 0 0 12px; } .coil-node::after { right: 1px; border-left: 0; border-radius: 0 12px 12px 0; }
.coil-node.negated { text-decoration: line-through; }
.node-name { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 3px); width: 110px; text-align: center; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.block-node { min-width: 120px; min-height: 86px; padding: 23px 8px 8px; border-radius: 5px; }
.block-title { position: absolute; top: 5px; left: 0; width: 100%; text-align: center; font-weight: 600; }
.block-port { display: flex; justify-content: space-between; gap: 18px; line-height: 18px; font-size: 11px; }
.variable-node { min-width: 80px; min-height: 32px; padding: 8px 10px; border-radius: 5px; text-align: center; }
.power-rail { width: 4px; height: 42px; border: 0; border-radius: 0; background: currentColor; box-shadow: none; }
.parallel-node { width: 4px; height: 42px; border: 0; background: currentColor; box-shadow: none; }
.error { margin-bottom: 8px; padding: 8px; border-left: 3px solid #f14c4c; background: #f14c4c22; }
`;

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function nodeName(node: DiagramNode): string {
  const variable = node.data.variable as Record<string, unknown> | undefined;
  return text(variable?.name);
}

function handles(node: DiagramNode, side: "input" | "output") {
  const value = node.data[side === "input" ? "inputHandles" : "outputHandles"];
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function NodeHandles({ node }: { node: DiagramNode }) {
  return <>
    {handles(node, "input").map((handle, index) => (
      <Handle key={`in-${String(handle.id ?? index)}`} type="target" position={Position.Left} id={text(handle.id) || `input-${index}`} style={{ top: Number((handle.relPosition as Record<string, unknown> | undefined)?.y ?? 50) }} />
    ))}
    {handles(node, "output").map((handle, index) => (
      <Handle key={`out-${String(handle.id ?? index)}`} type="source" position={Position.Right} id={text(handle.id) || `output-${index}`} style={{ top: Number((handle.relPosition as Record<string, unknown> | undefined)?.y ?? 50) }} />
    ))}
  </>;
}

function ContactNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const variant = text(node.data.variant);
  return <div className={`contact-node ${variant}`}><NodeHandles node={node} /><div className="node-name">{nodeName(node)}</div></div>;
}

function CoilNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const variant = text(node.data.variant);
  return <div className={`coil-node ${variant}`}><NodeHandles node={node} /><div className="node-name">{nodeName(node)}</div></div>;
}

function BlockNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const variant = (node.data.variant ?? {}) as Record<string, unknown>;
  const variables = Array.isArray(variant.variables) ? variant.variables as Array<Record<string, unknown>> : [];
  const inputs = variables.filter((item) => item.class === "input" || item.class === "inOut");
  const outputs = variables.filter((item) => item.class === "output" || item.class === "inOut");
  const rows = Math.max(inputs.length, outputs.length, 1);
  return <div className="diagram-node block-node">
    <NodeHandles node={node} />
    <div className="block-title">{text(variant.name) || node.type}</div>
    {Array.from({ length: rows }, (_, index) => <div className="block-port" key={index}><span>{text(inputs[index]?.name)}</span><span>{text(outputs[index]?.name)}</span></div>)}
    {nodeName(node) && <div className="node-name">{nodeName(node)}</div>}
  </div>;
}

function VariableNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  return <div className="diagram-node variable-node"><NodeHandles node={node} />{nodeName(node) || text(node.data.variant) || "..."}</div>;
}

function SimpleNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const className = node.type === "powerRail" ? "power-rail" : node.type === "parallel" ? "parallel-node" : "diagram-node variable-node";
  return <div className={className}><NodeHandles node={node} />{node.type !== "powerRail" && node.type !== "parallel" ? node.type : null}</div>;
}

const nodeTypes = {
  contact: ContactNode,
  coil: CoilNode,
  block: BlockNode,
  functionBlock: BlockNode,
  function: BlockNode,
  variable: VariableNode,
  "input-variable": VariableNode,
  "output-variable": VariableNode,
  "inout-variable": VariableNode,
  powerRail: SimpleNode,
  parallel: SimpleNode,
};

function rungNodes(rung: DiagramRung): Node[] {
  return rung.nodes.map((node) => ({
    id: node.id,
    type: node.type in nodeTypes ? node.type : "variable",
    position: node.position,
    width: node.width,
    height: node.height,
    data: node as unknown as Record<string, unknown>,
    draggable: false,
    selectable: true,
  }));
}

function RungView({ rung, index }: { rung: DiagramRung; index: number }) {
  const [open, setOpen] = useState(true);
  const nodes = useMemo(() => rungNodes(rung), [rung]);
  const edges = useMemo(() => rung.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: "smoothstep",
    selectable: false,
  })), [rung]);
  return <section className="rung">
    <div className="rung-header" onClick={() => setOpen((value) => !value)}>
      <span>{open ? "▾" : "▸"} Rung {index + 1}</span><span className="rung-comment">{rung.comment}</span><button type="button">{open ? "Collapse" : "Expand"}</button>
    </div>
    {open && <div className="flow-wrap">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable defaultEdgeOptions={{ type: "smoothstep" }}>
        <Background gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>}
  </section>;
}

function Variables({ model }: { model: OpenPlcDiagramDocument }) {
  const [open, setOpen] = useState(true);
  return <section className="variables">
    <div className="variables-header" onClick={() => setOpen((value) => !value)}><strong>Variables ({model.variables.length})</strong><button type="button">{open ? "Collapse" : "Expand"}</button></div>
    {open && <table><thead><tr><th>Name</th><th>Type</th><th>Address</th><th>Initial value</th></tr></thead><tbody>{model.variables.map((variable) => <tr key={variable.name}><td>{variable.name}</td><td>{variable.type}</td><td>{variable.address || ""}</td><td>{variable.initializer || ""}</td></tr>)}</tbody></table>}
  </section>;
}

function App() {
  const payload = window.__OPENPLC_MODEL__;
  const model = payload?.model;
  return <ReactFlowProvider><main className="app">
    <style>{css}</style>
    <header className="toolbar"><strong>{model?.name || payload?.fileName || "OpenPLC Diagram"}</strong><span>{model?.kind || ""} · {model?.rungs.length || 0} rung(s)</span></header>
    {(payload?.errors || []).map((error) => <div className="error" key={error}>{error}</div>)}
    {model && <><Variables model={model} />{model.rungs.map((rung, index) => <RungView key={rung.id} rung={rung} index={index} />)}</>}
  </main></ReactFlowProvider>;
}

createRoot(document.getElementById("root")!).render(<App />);
