// SPDX-License-Identifier: GPL-3.0-or-later
// Numeric constants from OpenPLC Editor's ladder node definitions.

export const DEFAULT_BLOCK_WIDTH = 216;
export const DEFAULT_BLOCK_HEIGHT = 128;
export const DEFAULT_BLOCK_CONNECTOR_Y = 36;
export const DEFAULT_BLOCK_CONNECTOR_Y_OFFSET = 40;
export const DEFAULT_BLOCK_TYPE = {
  name: "???",
  type: "generic",
  variables: [
    { name: "???", class: "input", type: { definition: "base-type", value: "BOOL" } },
    { name: "???", class: "output", type: { definition: "base-type", value: "BOOL" } },
  ],
  documentation: "",
  extensible: false,
};
export const DEFAULT_COIL_BLOCK_WIDTH = 28;
export const DEFAULT_COIL_BLOCK_HEIGHT = 24;
export const DEFAULT_COIL_CONNECTOR_X = DEFAULT_COIL_BLOCK_WIDTH;
export const DEFAULT_COIL_CONNECTOR_Y = DEFAULT_COIL_BLOCK_HEIGHT / 2;
export const DEFAULT_CONTACT_BLOCK_WIDTH = 24;
export const DEFAULT_CONTACT_BLOCK_HEIGHT = 24;
export const DEFAULT_CONTACT_CONNECTOR_X = DEFAULT_CONTACT_BLOCK_WIDTH;
export const DEFAULT_CONTACT_CONNECTOR_Y = DEFAULT_CONTACT_BLOCK_HEIGHT / 2;
export const DEFAULT_PARALLEL_WIDTH = 4;
export const DEFAULT_PARALLEL_HEIGHT = 2;
export const DEFAULT_PARALLEL_CONNECTOR_Y = DEFAULT_PARALLEL_HEIGHT / 2;
export const DEFAULT_PLACEHOLDER_WIDTH = 10;
export const DEFAULT_PLACEHOLDER_HEIGHT = 10;
export const DEFAULT_PLACEHOLDER_CONNECTOR_Y = DEFAULT_PLACEHOLDER_HEIGHT / 2;
export const DEFAULT_PLACEHOLDER_GAP = 15;
export const DEFAULT_POWER_RAIL_WIDTH = 3;
export const DEFAULT_POWER_RAIL_HEIGHT = 40;
export const DEFAULT_POWER_RAIL_CONNECTOR_X = DEFAULT_POWER_RAIL_WIDTH;
export const DEFAULT_POWER_RAIL_CONNECTOR_Y = DEFAULT_POWER_RAIL_HEIGHT / 2;
export const DEFAULT_VARIABLE_WIDTH = 80;
export const DEFAULT_VARIABLE_HEIGHT = 32;
export const DEFAULT_VARIABLE_CONNECTOR_X = DEFAULT_VARIABLE_WIDTH;
export const DEFAULT_VARIABLE_CONNECTOR_Y = DEFAULT_VARIABLE_HEIGHT / 2;
export const GAP = 45;

