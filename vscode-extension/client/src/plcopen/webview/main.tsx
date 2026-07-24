// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project

import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
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
import { BlockVisual, CoilVisual, ContactVisual, VariableVisual } from "./openplc-visuals.js";

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
.rung-drag { width: 28px; color: #0464fb; font-size: 20px; letter-spacing: -4px; cursor: grab; }
.rung-comment { flex: 1; margin-left: 12px; font-weight: 400; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rung-actions { display: flex; gap: 3px; }
.rung-actions button { display: inline-flex; width: 27px; height: 27px; align-items: center; justify-content: center; padding: 0; color: #0464fb; font-size: 16px; background: transparent; }
.flow-wrap { height: 420px; background: var(--vscode-editor-background); }
.react-flow { direction: ltr; width: 100%; height: 100%; position: relative; overflow: hidden; z-index: 0; background-image: radial-gradient(#8885 1px, transparent 1px); background-size: 16px 16px; }
.react-flow__renderer { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
.react-flow__pane { z-index: 1; cursor: grab; }
.react-flow__edges, .react-flow__connectionline { position: absolute; width: 100%; height: 100%; top: 0; left: 0; overflow: visible; pointer-events: none; }
.react-flow__edge-path { stroke: var(--vscode-textLink-foreground); stroke-width: 1.5; fill: none; }
.react-flow__nodes { pointer-events: none; transform-origin: 0 0; }
.react-flow__node { position: absolute; user-select: none; pointer-events: all; transform-origin: 0 0; }
.react-flow__handle { opacity: 0; width: 6px; height: 6px; border: 0; z-index: 5; }
.react-flow__handle-left { left: -3px; }
.react-flow__handle-right { right: -3px; }
.react-flow__controls { position: absolute; bottom: 10px; left: 10px; z-index: 5; display: flex; flex-direction: column; box-shadow: 0 1px 4px #0005; }
.react-flow__controls-button { width: 24px; height: 24px; padding: 3px; color: var(--vscode-foreground); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); cursor: pointer; }
.diagram-node { position: relative; color: var(--vscode-foreground); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); box-shadow: 0 1px 3px #0003; }
.diagram-node:hover { border-color: var(--vscode-focusBorder); }
.contact-node, .coil-node { border: 0; background: transparent; box-shadow: none; }
.contact-node svg, .coil-node svg { display: block; overflow: visible; stroke: currentColor; stroke-width: 1.8; fill: none; }
.coil-node text { stroke: none; fill: currentColor; font-size: 10px; font-weight: 600; }
.node-name { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 3px); width: 110px; text-align: center; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.block-node { min-width: 120px; min-height: 86px; padding: 23px 8px 8px; border-radius: 5px; }
.block-title { position: absolute; top: 5px; left: 0; width: 100%; text-align: center; font-weight: 600; }
.block-port { display: flex; justify-content: space-between; gap: 18px; line-height: 18px; font-size: 11px; }
.variable-node { min-width: 80px; min-height: 32px; padding: 8px 10px; border-radius: 5px; text-align: center; }
.power-rail { width: 4px; height: 42px; border: 0; border-radius: 0; background: currentColor; box-shadow: none; }
.parallel-node { width: 4px; height: 42px; border: 0; background: currentColor; box-shadow: none; }
.block-node-shell { position: relative; }
.openplc-block { position: relative; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-editorWidget-background); color: var(--vscode-foreground); }
.openplc-block:hover { border-color: transparent; box-shadow: 0 0 0 2px var(--vscode-focusBorder); }
.openplc-instance { position: absolute; left: 0; bottom: calc(100% + 2px); width: 100%; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.openplc-block-name { position: absolute; top: 7px; left: 0; width: 100%; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.openplc-block-row { position: absolute; left: 6px; right: 6px; display: flex; justify-content: space-between; font-size: 10px; line-height: 18px; }
.openplc-variable { display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 4px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-editorWidget-background); color: var(--vscode-foreground); font-size: 11px; }
.openplc-variable:hover { border-color: transparent; box-shadow: 0 0 0 2px var(--vscode-focusBorder); }
.openplc-variable span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    {handles(node, "input").map((handle, index) => {
      const savedStyle = (handle.style ?? {}) as React.CSSProperties;
      const relative = handle.relPosition as Record<string, unknown> | undefined;
      return <Handle key={`in-${String(handle.id ?? index)}`} type="target" position={Position.Left} id={text(handle.id) || `input-${index}`} style={{ ...savedStyle, top: Number(relative?.y ?? savedStyle.top ?? 50), transform: "translateY(-50%)" }} />;
    })}
    {handles(node, "output").map((handle, index) => {
      const savedStyle = (handle.style ?? {}) as React.CSSProperties;
      const relative = handle.relPosition as Record<string, unknown> | undefined;
      return <Handle key={`out-${String(handle.id ?? index)}`} type="source" position={Position.Right} id={text(handle.id) || `output-${index}`} style={{ ...savedStyle, top: Number(relative?.y ?? savedStyle.top ?? 50), transform: "translateY(-50%)" }} />;
    })}
  </>;
}

function ContactNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const variant = text(node.data.variant);
  return <div className={`contact-node ${variant}`} style={{ width: node.width || 24, height: node.height || 24 }}>
    <NodeHandles node={node} />
    <ContactVisual variant={variant} width={node.width || 24} height={node.height || 24} />
    <div className="node-name">{nodeName(node)}</div>
  </div>;
}

function CoilNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const variant = text(node.data.variant);
  return <div className={`coil-node ${variant}`} style={{ width: node.width || 28, height: node.height || 24 }}>
    <NodeHandles node={node} />
    <CoilVisual variant={variant} width={node.width || 28} height={node.height || 24} />
    <div className="node-name">{nodeName(node)}</div>
  </div>;
}

function BlockNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const variant = (node.data.variant ?? {}) as Record<string, unknown>;
  const variables = Array.isArray(variant.variables) ? variant.variables as Array<Record<string, unknown>> : [];
  const inputs = variables.filter((item) => item.class === "input" || item.class === "inOut");
  const outputs = variables.filter((item) => item.class === "output" || item.class === "inOut");
  return <div className="block-node-shell" style={{ width: node.width || 216, height: node.height || 128 }}>
    <NodeHandles node={node} />
    <BlockVisual
      name={text(variant.name) || node.type}
      instance={nodeName(node)}
      inputs={inputs.map((item) => text(item.name))}
      outputs={outputs.map((item) => text(item.name))}
      width={node.width || 216}
      height={node.height || 128}
    />
  </div>;
}

function VariableNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  return <div className="variable-node" style={{ width: node.width || 80, height: node.height || 32 }}>
    <NodeHandles node={node} />
    <VariableVisual name={nodeName(node) || text(node.data.variant)} width={node.width || 80} height={node.height || 32} />
  </div>;
}

function SimpleNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const className = node.type === "powerRail" ? "power-rail" : node.type === "parallel" ? "parallel-node" : "diagram-node variable-node";
  return <div className={className} style={{ width: node.width || 4, height: node.height || 42 }}><NodeHandles node={node} />{node.type !== "powerRail" && node.type !== "parallel" ? node.type : null}</div>;
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
  const canvasHeight = useMemo(
    () => Math.max(120, ...rung.nodes.map((node) => node.position.y + (node.height || 40) + 24)),
    [rung],
  );
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
      <span className="rung-drag" title="Rung drag handle">⠿</span>
      <span>Rung {index + 1}</span>
      <span className="rung-comment">{rung.comment || "Start typing to add a comment to this rung"}</span>
      <span className="rung-actions">
        <button type="button" title="Duplicate rung" onClick={(event) => event.stopPropagation()}>⧉</button>
        <button type="button" title="Delete rung" onClick={(event) => event.stopPropagation()}>×</button>
        <button type="button" title={open ? "Collapse rung" : "Expand rung"}>{open ? "⌃" : "⌄"}</button>
      </span>
    </div>
    {open && <div className="flow-wrap" style={{ height: canvasHeight }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultViewport={{ x: 8, y: 8, zoom: 1 }} minZoom={0.25} maxZoom={2} nodesDraggable={false} nodesConnectable={false} elementsSelectable defaultEdgeOptions={{ type: "smoothstep" }}>
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
