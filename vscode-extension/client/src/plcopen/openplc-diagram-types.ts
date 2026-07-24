// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project

export type OpenPlcDiagramKind = "LD" | "FBD";

export interface DiagramPosition {
  x: number;
  y: number;
}

export interface DiagramVariable {
  name: string;
  type: string;
  class?: string;
  initializer?: string;
  address?: string;
  declaration: string;
}

export interface DiagramNode {
  id: string;
  type: string;
  position: DiagramPosition;
  width?: number;
  height?: number;
  data: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  raw: Record<string, unknown>;
}

export interface DiagramRung {
  id: string;
  comment: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  raw: Record<string, unknown>;
}

export interface OpenPlcDiagramDocument {
  kind: OpenPlcDiagramKind;
  name: string;
  variables: DiagramVariable[];
  rungs: DiagramRung[];
  metadata: Record<string, unknown>;
  rawJson: Record<string, unknown>;
}

export interface DiagramParseError {
  message: string;
  line?: number;
}
