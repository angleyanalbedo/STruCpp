// SPDX-License-Identifier: GPL-3.0-or-later
// POU editor port based on Autonomy Logic's OpenPLC Editor.

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type {
  DiagramNode,
  DiagramRung,
  DiagramVariable,
  OpenPlcDiagramDocument,
} from "../openplc-diagram-types.js";
import { BlockVisual, CoilVisual, ContactVisual, VariableVisual } from "./openplc-visuals.js";

declare global {
  interface Window {
    __OPENPLC_MODEL__?: { model?: OpenPlcDiagramDocument; errors?: string[]; fileName?: string };
  }
}

type Language = "LD" | "FBD";

const css = `
:root{color-scheme:light dark;--brand:#0464fb;--line:#5b6573}
*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}
body{overflow:hidden;color:var(--vscode-foreground);background:var(--vscode-editor-background);font:13px var(--vscode-font-family)}
button,input,select{font:inherit;color:inherit}.app{display:flex;height:100%;flex-direction:column}
.topbar{display:flex;height:42px;flex:none;align-items:center;gap:12px;padding:0 12px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background)}
.topbar strong{font-size:13px}.tabs{display:flex;gap:2px;margin-left:auto}.tabs button,.tool-button{border:0;border-radius:5px;padding:5px 10px;background:transparent;cursor:pointer}
.tabs button.active,.tool-button:hover{color:white;background:var(--brand)}.editor-panels{min-height:0;flex:1}
.panel{height:100%;padding:10px;overflow:auto}.resize-handle{position:relative;height:5px;background:var(--vscode-panel-border);cursor:row-resize}
.resize-handle:after{content:"";position:absolute;inset:-3px 0}.variables-editor{display:flex;height:100%;min-height:0;flex-direction:column;gap:8px}
.variables-actions{display:flex;height:32px;align-items:center;gap:8px}.variables-actions label{font-size:12px}.variables-actions input,.variables-actions select{height:28px;border:1px solid var(--vscode-input-border,var(--vscode-panel-border));border-radius:5px;background:var(--vscode-input-background);padding:3px 7px}
.variables-actions input{min-width:180px;flex:1}.spacer{flex:1}.icon-button{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border:0;border-radius:4px;background:transparent;color:var(--brand);font-size:18px;cursor:pointer}.icon-button:hover{background:var(--vscode-toolbar-hoverBackground)}
.variables-table-wrap{min-height:0;overflow:auto;border:1px solid var(--vscode-panel-border);border-radius:6px}
table{width:100%;border-collapse:collapse}th,td{height:30px;border-right:1px solid var(--vscode-panel-border);border-bottom:1px solid var(--vscode-panel-border);padding:0 8px;text-align:left}th{position:sticky;top:0;z-index:2;background:var(--vscode-sideBar-background);font-size:11px;font-weight:600}td input,td select{width:100%;height:100%;border:0;outline:0;background:transparent}.selected td{background:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground)}
.graphical{height:100%;overflow:auto;padding:10px}.graph-toolbar{position:sticky;top:-10px;z-index:20;display:flex;align-items:center;gap:6px;margin:-10px -10px 10px;padding:7px 10px;border-bottom:1px solid var(--vscode-panel-border);background:var(--vscode-editor-background)}
.rung-list{display:flex;flex-direction:column}.rung{width:100%;overflow:hidden}.rung-header{display:flex;min-height:36px;align-items:center;padding:4px;background:var(--vscode-sideBar-background);border:1px solid transparent}
.rung:first-child .rung-header{border-radius:8px 8px 0 0}.rung:last-child .rung-header.closed{border-radius:0 0 8px 8px}.drag{display:flex;width:30px;align-items:center;justify-content:center;color:var(--brand);font-size:20px;cursor:grab}
.rung-comment{min-width:0;flex:1;border:1px solid transparent;border-radius:5px;background:transparent;padding:5px 7px;outline:0}.rung-comment:focus{border-color:var(--vscode-focusBorder)}
.rung-actions{display:flex;gap:1px}.rung-body{height:260px;border:1px solid var(--vscode-panel-border);background:var(--vscode-editor-background)}
.rung:last-child .rung-body{border-radius:0 0 8px 8px}.create-rung{display:flex;height:34px;align-items:center;justify-content:center;border:1px dashed var(--vscode-panel-border);border-radius:0 0 8px 8px;color:var(--brand);cursor:pointer;background:transparent}
.fbd{height:calc(100% - 46px);min-height:320px;border:1px solid var(--vscode-panel-border);border-radius:7px;overflow:hidden}.react-flow{background:var(--vscode-editor-background)}
.react-flow__edge-path{stroke:var(--line);stroke-width:2}.react-flow__handle{width:7px;height:7px;border:1px solid var(--vscode-editor-background);background:var(--brand)}
.node-name{position:absolute;bottom:calc(100% + 3px);left:50%;width:120px;transform:translateX(-50%);overflow:hidden;text-align:center;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
.contact-node,.coil-node{position:relative}.contact-node svg,.coil-node svg{display:block;overflow:visible;stroke:currentColor;stroke-width:1.8;fill:none}.coil-node text{stroke:none;fill:currentColor;font-size:10px;font-weight:600}
.block-node-shell{position:relative}.openplc-block{position:relative;border:1px solid var(--line);border-radius:6px;background:var(--vscode-editorWidget-background);color:var(--vscode-foreground)}
.openplc-instance{position:absolute;bottom:calc(100% + 2px);width:100%;text-align:center;font-size:11px}.openplc-block-name{position:absolute;top:7px;width:100%;text-align:center;font-size:11px}.openplc-block-row{position:absolute;left:6px;right:6px;display:flex;justify-content:space-between;font-size:10px;line-height:18px}
.openplc-variable{display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--line);border-radius:6px;background:var(--vscode-editorWidget-background);font-size:11px}.openplc-variable span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.power-rail{width:4px;height:70px;background:currentColor}.empty{display:grid;height:100%;place-items:center;color:var(--vscode-descriptionForeground)}.error{padding:6px 10px;color:var(--vscode-errorForeground)}
`;

function valueOf(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function nodeName(node: DiagramNode): string {
  return valueOf((node.data.variable as Record<string, unknown> | undefined)?.name);
}

function PortHandles({ node }: { node: DiagramNode }) {
  const inputs = Array.isArray(node.data.inputHandles) ? node.data.inputHandles as Array<Record<string, unknown>> : [];
  const outputs = Array.isArray(node.data.outputHandles) ? node.data.outputHandles as Array<Record<string, unknown>> : [];
  return <>
    {inputs.map((port, index) => <Handle key={`i${index}`} id={valueOf(port.id) || `input-${index}`} type="target" position={Position.Left} style={{ top: Number((port.relPosition as Record<string, unknown> | undefined)?.y ?? port.style && (port.style as Record<string, unknown>).top ?? 20) }} />)}
    {outputs.map((port, index) => <Handle key={`o${index}`} id={valueOf(port.id) || `output-${index}`} type="source" position={Position.Right} style={{ top: Number((port.relPosition as Record<string, unknown> | undefined)?.y ?? port.style && (port.style as Record<string, unknown>).top ?? 20) }} />)}
  </>;
}

function ContactNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  return <div className="contact-node" style={{ width: node.width || 48, height: node.height || 32 }}><PortHandles node={node}/><ContactVisual variant={valueOf(node.data.variant)} width={node.width || 48} height={node.height || 32}/><div className="node-name">{nodeName(node) || "contact"}</div></div>;
}
function CoilNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  return <div className="coil-node" style={{ width: node.width || 48, height: node.height || 32 }}><PortHandles node={node}/><CoilVisual variant={valueOf(node.data.variant)} width={node.width || 48} height={node.height || 32}/><div className="node-name">{nodeName(node) || "coil"}</div></div>;
}
function BlockNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  const variant = (node.data.variant ?? {}) as Record<string, unknown>;
  const variables = Array.isArray(variant.variables) ? variant.variables as Array<Record<string, unknown>> : [];
  return <div className="block-node-shell" style={{ width: node.width || 150, height: node.height || 90 }}><PortHandles node={node}/><BlockVisual name={valueOf(variant.name) || "TON"} instance={nodeName(node)} inputs={variables.filter(v => v.class === "input").map(v => valueOf(v.name))} outputs={variables.filter(v => v.class === "output").map(v => valueOf(v.name))} width={node.width || 150} height={node.height || 90}/></div>;
}
function VariableNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  return <div style={{ width: node.width || 90, height: node.height || 34 }}><PortHandles node={node}/><VariableVisual name={nodeName(node) || "variable"} width={node.width || 90} height={node.height || 34}/></div>;
}
function RailNode({ data }: NodeProps) {
  const node = data as unknown as DiagramNode;
  return <div className="power-rail" style={{ height: node.height || 70 }}><PortHandles node={node}/></div>;
}

const nodeTypes = { contact: ContactNode, coil: CoilNode, block: BlockNode, functionBlock: BlockNode, variable: VariableNode, "input-variable": VariableNode, "output-variable": VariableNode, "inout-variable": VariableNode, powerRail: RailNode };

function toFlowNodes(nodes: DiagramNode[], draggable = true): Node[] {
  return nodes.map(node => ({ id: node.id, type: node.type in nodeTypes ? node.type : "variable", position: node.position, data: node as unknown as Record<string, unknown>, draggable, selectable: true }));
}
function toFlowEdges(edges: DiagramRung["edges"]): Edge[] {
  return edges.map(edge => ({ ...edge, type: "smoothstep" }));
}

function VariablesEditor({ variables, onChange }: { variables: DiagramVariable[]; onChange: (next: DiagramVariable[]) => void }) {
  const [selected, setSelected] = useState(-1);
  const [filter, setFilter] = useState("All");
  const update = (index: number, field: keyof DiagramVariable, value: string) => onChange(variables.map((item, i) => i === index ? { ...item, [field]: value } : item));
  const move = (offset: number) => {
    const target = selected + offset;
    if (selected < 0 || target < 0 || target >= variables.length) return;
    onChange(arrayMove(variables, selected, target)); setSelected(target);
  };
  return <div className="variables-editor">
    <div className="variables-actions">
      <label>Description :</label><input defaultValue="In-memory POU editor"/>
      <label>Class Filter :</label><select value={filter} onChange={event => setFilter(event.target.value)}><option>All</option><option>Local</option><option>Input</option><option>Output</option><option>InOut</option></select>
      <span className="spacer"/>
      <button className="icon-button" title="Add variable" onClick={() => onChange([...variables, { name: `variable${variables.length + 1}`, type: "BOOL", class: "local", address: "", initializer: "", declaration: "" }])}>＋</button>
      <button className="icon-button" title="Remove variable" disabled={selected < 0} onClick={() => { onChange(variables.filter((_, i) => i !== selected)); setSelected(-1); }}>−</button>
      <button className="icon-button" title="Move up" onClick={() => move(-1)}>↑</button>
      <button className="icon-button" title="Move down" onClick={() => move(1)}>↓</button>
    </div>
    <div className="variables-table-wrap"><table><thead><tr><th>Name</th><th>Class</th><th>Type</th><th>Location</th><th>Initial Value</th></tr></thead>
      <tbody>{variables.map((variable, index) => (filter === "All" || valueOf(variable.class).toLowerCase() === filter.toLowerCase()) && <tr key={index} className={selected === index ? "selected" : ""} onClick={() => setSelected(index)}>
        <td><input value={variable.name} onChange={e => update(index, "name", e.target.value)}/></td>
        <td><select value={valueOf(variable.class) || "local"} onChange={e => update(index, "class", e.target.value)}><option value="local">Local</option><option value="input">Input</option><option value="output">Output</option><option value="inOut">InOut</option></select></td>
        <td><input value={variable.type} onChange={e => update(index, "type", e.target.value)}/></td>
        <td><input value={variable.address || ""} onChange={e => update(index, "address", e.target.value)}/></td>
        <td><input value={variable.initializer || ""} onChange={e => update(index, "initializer", e.target.value)}/></td>
      </tr>)}</tbody></table></div>
  </div>;
}

function RungBody({ rung, onChange }: { rung: DiagramRung; onChange: (rung: DiagramRung) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(rung.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(rung.edges));
  const connect = useCallback((connection: Connection) => setEdges(current => addEdge({ ...connection, type: "smoothstep" }, current)), [setEdges]);
  React.useEffect(() => {
    onChange({ ...rung, nodes: nodes.map(node => ({ ...(node.data as unknown as DiagramNode), position: node.position })), edges: edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, sourceHandle: edge.sourceHandle || undefined, targetHandle: edge.targetHandle || undefined, raw: {} })) });
  }, [nodes, edges]);
  return <div className="rung-body"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} fitView snapToGrid snapGrid={[16,16]} defaultEdgeOptions={{ type: "smoothstep" }}><Background gap={16} size={1}/><Controls/></ReactFlow></div>;
}

function SortableRung({ rung, index, count, update, duplicate, remove }: { rung: DiagramRung; index: number; count: number; update: (r: DiagramRung) => void; duplicate: () => void; remove: () => void }) {
  const [open, setOpen] = useState(true);
  const sortable = useSortable({ id: rung.id });
  return <section ref={sortable.setNodeRef} className="rung" style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}>
    <div className={`rung-header ${open ? "" : "closed"}`}>
      <span className="drag" {...sortable.attributes} {...sortable.listeners}>⠿</span>
      <input className="rung-comment" value={rung.comment || ""} placeholder={`Rung ${index + 1} — Start typing to add a comment`} onChange={event => update({ ...rung, comment: event.target.value })}/>
      <span className="rung-actions"><button className="icon-button" onClick={duplicate} title="Duplicate">⧉</button><button className="icon-button" onClick={remove} title="Delete">×</button><button className="icon-button" onClick={() => setOpen(value => !value)} title="Collapse">{open ? "⌃" : "⌄"}</button></span>
    </div>
    {open && <RungBody rung={rung} onChange={update}/>}
  </section>;
}

function newRung(_index: number): DiagramRung {
  return { id: crypto.randomUUID(), comment: "", nodes: [], edges: [], raw: {} };
}

function LadderEditor({ rungs, onChange }: { rungs: DiagramRung[]; onChange: (r: DiagramRung[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = rungs.findIndex(r => r.id === active.id), to = rungs.findIndex(r => r.id === over.id);
    onChange(arrayMove(rungs, from, to));
  };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={dragEnd}><SortableContext items={rungs.map(r => r.id)} strategy={verticalListSortingStrategy}><div className="rung-list">
    {rungs.map((rung, index) => <SortableRung key={rung.id} rung={rung} index={index} count={rungs.length} update={next => onChange(rungs.map(r => r.id === rung.id ? next : r))} duplicate={() => onChange([...rungs.slice(0,index+1), { ...rung, id: crypto.randomUUID(), nodes: rung.nodes.map(n => ({...n,id:crypto.randomUUID()})) }, ...rungs.slice(index+1)])} remove={() => onChange(rungs.filter(r => r.id !== rung.id))}/>)}
    <button className="create-rung" onClick={() => onChange([...rungs, newRung(rungs.length)])}>＋ Add rung</button>
  </div></SortableContext></DndContext>;
}

function createNode(type: "variable" | "block"): Node {
  const id = crypto.randomUUID();
  const data: DiagramNode = { id, type, position: { x: 80, y: 80 }, width: type === "block" ? 150 : 90, height: type === "block" ? 90 : 34, raw: {}, data: type === "block" ? { variant: { name: "TON", variables: [{ name: "IN", class: "input" }, { name: "Q", class: "output" }] }, inputHandles: [{ id: "IN", relPosition: { y: 50 } }], outputHandles: [{ id: "Q", relPosition: { y: 50 } }] } : { variable: { name: "variable" }, inputHandles: [{ id: "in", relPosition: { y: 17 } }], outputHandles: [{ id: "out", relPosition: { y: 17 } }] } };
  return { id, type, position: data.position, data: data as unknown as Record<string, unknown> };
}

function FbdEditor({ initial }: { initial: DiagramRung }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(initial.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(initial.edges));
  return <><div className="graph-toolbar"><button className="tool-button" onClick={() => setNodes(items => [...items, createNode("variable")])}>＋ Variable</button><button className="tool-button" onClick={() => setNodes(items => [...items, createNode("block")])}>＋ Block</button><span className="spacer"/><span>Drag nodes and connect ports</span></div><div className="fbd"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connection => setEdges(items => addEdge({ ...connection, type: "smoothstep" }, items))} fitView snapToGrid snapGrid={[16,16]}><Background gap={16} size={1}/><Controls/></ReactFlow></div></>;
}

function App() {
  const payload = window.__OPENPLC_MODEL__;
  const source = payload?.model;
  const [language, setLanguage] = useState<Language>(source?.kind || "LD");
  const [variables, setVariables] = useState<DiagramVariable[]>(source?.variables || []);
  const [rungs, setRungs] = useState<DiagramRung[]>(source?.rungs.length ? source.rungs : [newRung(0)]);
  const fbdRung = useMemo(() => source?.rungs[0] || newRung(0), []);
  return <ReactFlowProvider><div className="app"><style>{css}</style>
    <header className="topbar"><strong>{source?.name || payload?.fileName || "MemoryPOU"}</strong><span>POU · {language}</span><div className="tabs"><button className={language === "LD" ? "active" : ""} onClick={() => setLanguage("LD")}>LD</button><button className={language === "FBD" ? "active" : ""} onClick={() => setLanguage("FBD")}>FBD</button></div></header>
    {(payload?.errors || []).map(error => <div className="error" key={error}>{error}</div>)}
    <PanelGroup direction="vertical" className="editor-panels">
      <Panel defaultSize={27} minSize={15} collapsible collapsedSize={0}><div className="panel"><VariablesEditor variables={variables} onChange={setVariables}/></div></Panel>
      <PanelResizeHandle className="resize-handle"/>
      <Panel defaultSize={73} minSize={25}><div className="graphical">{language === "LD" ? <LadderEditor rungs={rungs} onChange={setRungs}/> : <FbdEditor initial={fbdRung}/>}</div></Panel>
    </PanelGroup>
  </div></ReactFlowProvider>;
}

createRoot(document.getElementById("root")!).render(<App/>);
