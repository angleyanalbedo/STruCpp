// SPDX-License-Identifier: GPL-3.0-or-later
// Platform adapter for the OpenPLC ladder editor algorithms.

import type { Edge, Node } from "@xyflow/react";

export type HandleBranch = {
  blockId: string;
  handleId: string;
  direction: "input" | "output";
  nodeIds: string[];
};

export type RungLadderState = {
  id: string;
  comment: string;
  nodes: Node[];
  edges: Edge[];
  selectedNodes: Node[];
  defaultBounds: [number, number];
  reactFlowViewport?: [number, number];
  handleBranches?: HandleBranch[];
};

export type PLCVariable = {
  id?: string;
  name: string;
  class?: string;
  type?: { definition: string; value: string };
};

export type PLCPou = {
  name: string;
  pouType: string;
  interface?: {
    variables?: PLCVariable[];
    returnType?: string;
  };
};

export const toast = (message: { title?: string; description?: string; variant?: string }) => {
  if (message.title || message.description) {
    console.warn([message.title, message.description].filter(Boolean).join(": "));
  }
};

export const newGraphicalEditorNodeID = (prefix = "NODE", separator = "_"): string =>
  `${prefix.toUpperCase()}${separator}${crypto.randomUUID()}`;

export const cn = (...values: Array<string | undefined | false>) => values.filter(Boolean).join(" ");

