// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project

import type {
  DiagramEdge,
  DiagramNode,
  DiagramParseError,
  DiagramRung,
  DiagramVariable,
  OpenPlcDiagramDocument,
  OpenPlcDiagramKind,
} from "./openplc-diagram-types.js";

export interface ParseResult {
  document?: OpenPlcDiagramDocument;
  errors: DiagramParseError[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function lineOf(text: string, offset: number): number {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function parseVariables(header: string): DiagramVariable[] {
  const variables: DiagramVariable[] = [];
  const varMatch = header.match(/\bVAR\b([\s\S]*?)\bEND_VAR\b/i);
  if (!varMatch) return variables;

  for (const rawLine of varMatch[1].split(/\r?\n/)) {
    const declaration = rawLine.trim();
    if (!declaration || declaration.startsWith("//") || declaration.startsWith("(*")) continue;

    const match = declaration.match(
      /^([A-Za-z_]\w*)\s*:\s*([^;]+?)(?:\s*;|\s*$)/,
    );
    if (!match) continue;

    const name = match[1];
    let remainder = match[2].trim();
    const addressMatch = remainder.match(/\s+AT\s+(%\S+)/i);
    const address = addressMatch?.[1];
    if (addressMatch) remainder = remainder.slice(0, addressMatch.index).trim();
    const initializerMatch = remainder.match(/\s*:=\s*([\s\S]+)$/);
    const initializer = initializerMatch?.[1]?.trim();
    const type = initializerMatch
      ? remainder.slice(0, initializerMatch.index).trim()
      : remainder;

    variables.push({ name, type, initializer, address, declaration });
  }
  return variables;
}

function parseNode(value: unknown, index: number): DiagramNode {
  const raw = asRecord(value);
  const position = asRecord(raw.position);
  return {
    id: typeof raw.id === "string" ? raw.id : `node-${index}`,
    type: typeof raw.type === "string" ? raw.type : "unknown",
    position: { x: asNumber(position.x), y: asNumber(position.y) },
    width: asNumber(raw.width, 0) || undefined,
    height: asNumber(raw.height, 0) || undefined,
    data: asRecord(raw.data),
    raw,
  };
}

function parseEdge(value: unknown, index: number): DiagramEdge {
  const raw = asRecord(value);
  return {
    id: typeof raw.id === "string" ? raw.id : `edge-${index}`,
    source: typeof raw.source === "string" ? raw.source : "",
    target: typeof raw.target === "string" ? raw.target : "",
    sourceHandle: typeof raw.sourceHandle === "string" ? raw.sourceHandle : undefined,
    targetHandle: typeof raw.targetHandle === "string" ? raw.targetHandle : undefined,
    raw,
  };
}

function parseRung(value: unknown, index: number): DiagramRung {
  const raw = asRecord(value);
  const nodes = Array.isArray(raw.nodes) ? raw.nodes.map(parseNode) : [];
  const edges = Array.isArray(raw.edges) ? raw.edges.map(parseEdge) : [];
  return {
    id: typeof raw.id === "string" ? raw.id : `rung-${index}`,
    comment: typeof raw.comment === "string" ? raw.comment : "",
    nodes,
    edges,
    raw,
  };
}

export function parseOpenPlcDiagram(
  text: string,
  kind: OpenPlcDiagramKind,
): ParseResult {
  const errors: DiagramParseError[] = [];
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    return { errors: [{ message: "No embedded OpenPLC diagram JSON was found." }] };
  }

  let rawJson: Record<string, unknown>;
  try {
    rawJson = asRecord(JSON.parse(text.slice(jsonStart, jsonEnd + 1)));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      errors: [{
        message: `Invalid embedded diagram JSON: ${detail}`,
        line: lineOf(text, jsonStart),
      }],
    };
  }

  const nameMatch = text.match(/\b(?:PROGRAM|FUNCTION_BLOCK|FUNCTION)\s+([A-Za-z_]\w*)/i);
  const name = typeof rawJson.name === "string"
    ? rawJson.name
    : nameMatch?.[1] ?? "Untitled";
  const rawRungs = Array.isArray(rawJson.rungs)
    ? rawJson.rungs
    : rawJson.rung !== undefined
      ? [rawJson.rung]
      : [];

  if (rawRungs.length === 0) {
    errors.push({ message: "The diagram contains no rung data.", line: lineOf(text, jsonStart) });
  }

  const document: OpenPlcDiagramDocument = {
    kind,
    name,
    variables: parseVariables(text.slice(0, jsonStart)),
    rungs: rawRungs.map(parseRung),
    metadata: {
      programDeclaration: text.slice(0, jsonStart).trim(),
      sourceFormat: kind === "LD" ? "openplc-ld" : "openplc-fbd",
    },
    rawJson,
  };
  return { document, errors };
}
