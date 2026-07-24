// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Autonomy / OpenPLC Project
/**
 * PLCopen XML (TC6 v0201) schema types for LD/FBD diagram support.
 */

export type DiagramType = "LD" | "FBD" | "SFC" | "IL" | "ST";

export type PouType = "program" | "functionBlock" | "function";

export interface PlcopenProject {
  pou: PlcopenPou[];
  configuration?: PlcopenConfiguration[];
}

export interface PlcopenPou {
  name: string;
  pouType: PouType;
  body: PlcopenBody;
}

export interface PlcopenBody {
  ld?: PlcopenLd;
  fbd?: PlcopenFbd;
  st?: string;
  il?: string;
}

export interface PlcopenLd {
  rung: PlcopenRung[];
}

export interface PlcopenFbd {
  block: PlcopenBlock[];
  wire: PlcopenWire[];
  comment?: PlcopenComment[];
}

export interface PlcopenRung {
  contact?: PlcopenContact[];
  coil?: PlcopenCoil[];
  functionBlock?: PlcopenFunctionBlock[];
  leftPowerRail?: PlcopenPowerRail;
  rightPowerRail?: PlcopenPowerRail;
}

export interface PlcopenContact {
  negated?: boolean;
  name: string;
  location?: string;
}

export interface PlcopenCoil {
  negated?: boolean;
  set?: boolean;
  reset?: boolean;
  name: string;
  location?: string;
}

export interface PlcopenFunctionBlock {
  name: string;
  instanceName?: string;
  inputVariables?: PlcopenVariables;
  outputVariables?: PlcopenVariables;
  inOutVariables?: PlcopenVariables;
}

export interface PlcopenVariables {
  variable: PlcopenVariable[];
}

export interface PlcopenVariable {
  name: string;
  formalParameter?: string;
  expression?: string;
  location?: string;
}

export interface PlcopenBlock {
  name: string;
  instanceName?: string;
  inputVariables?: PlcopenVariables;
  outputVariables?: PlcopenVariables;
  inOutVariables?: PlcopenVariables;
}

export interface PlcopenWire {
  source: PlcopenConnectionPoint;
  target: PlcopenConnectionPoint;
}

export interface PlcopenConnectionPoint {
  refLocalId?: string;
  connectionPointIn?: PlcopenConnectionPointIn;
  connectionPointOut?: PlcopenConnectionPointOut;
}

export interface PlcopenConnectionPointIn {
  relX?: number;
  relY?: number;
}

export interface PlcopenConnectionPointOut {
  relX?: number;
  relY?: number;
}

export interface PlcopenComment {
  content: string;
  height?: number;
  width?: number;
}

export interface PlcopenPowerRail {
  localId: string;
  orientation?: "left" | "right";
}

export interface PlcopenConfiguration {
  name: string;
  resource?: PlcopenResource[];
}

export interface PlcopenResource {
  name: string;
  task?: PlcopenTask[];
  program?: PlcopenProgramInstance[];
}

export interface PlcopenTask {
  name: string;
  interval?: string;
  priority?: number;
}

export interface PlcopenProgramInstance {
  name: string;
  typeReference: string;
  taskName?: string;
}
