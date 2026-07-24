import { describe, expect, it } from "vitest";

import { nodesBuilder } from "../client/src/plcopen/webview/openplc-ladder/atoms/node-builders";
import { buildEdge } from "../client/src/plcopen/webview/openplc-ladder/ladder-utils/edges";
import {
  addNewElement,
  removeElements,
} from "../client/src/plcopen/webview/openplc-ladder/ladder-utils/elements";
import {
  removePlaceholderElements,
  renderPlaceholderElements,
} from "../client/src/plcopen/webview/openplc-ladder/ladder-utils/elements/placeholder";
import type { RungLadderState } from "../client/src/plcopen/webview/openplc-ladder/support";

function emptyRung(): RungLadderState {
  const left = nodesBuilder.powerRail({
    id: "left-rail-test",
    posX: 0,
    posY: 80,
    connector: "right",
    handleX: 3,
    handleY: 100,
  });
  const right = nodesBuilder.powerRail({
    id: "right-rail-test",
    posX: 800,
    posY: 80,
    connector: "left",
    handleX: 800,
    handleY: 100,
  });
  return {
    id: "rung-test",
    comment: "",
    nodes: [left, right],
    edges: [buildEdge(left.id, right.id, {
      sourceHandle: left.data.outputConnector?.id,
      targetHandle: right.data.inputConnector?.id,
    })],
    selectedNodes: [],
    defaultBounds: [1530, 200],
    reactFlowViewport: [1530, 200],
    handleBranches: [],
  };
}

function selectPlaceholder(rung: RungLadderState, predicate: (node: RungLadderState["nodes"][number]) => boolean) {
  const withPlaceholders = renderPlaceholderElements(rung);
  const selected = withPlaceholders.find(node =>
    (node.type === "placeholder" || node.type === "parallelPlaceholder") && predicate(node),
  );
  expect(selected).toBeDefined();
  return {
    ...rung,
    nodes: withPlaceholders.map(node => ({ ...node, selected: node.id === selected?.id })),
  };
}

describe("ported OpenPLC ladder topology", () => {
  it("inserts contacts and coils into the rail edge instead of storing free positions", () => {
    let rung = emptyRung();
    rung = selectPlaceholder(rung, node => node.data.relatedNode?.id === "left-rail-test");

    const contact = addNewElement(rung, { elementType: "contact" });
    rung = { ...rung, nodes: contact.nodes, edges: contact.edges };

    expect(removePlaceholderElements(rung.nodes).map(node => node.type)).toEqual([
      "powerRail",
      "contact",
      "powerRail",
    ]);
    expect(rung.edges).toHaveLength(2);

    const contactNode = rung.nodes.find(node => node.type === "contact");
    rung = selectPlaceholder(rung, node =>
      node.type === "placeholder" &&
      node.data.relatedNode?.id === contactNode?.id &&
      node.data.position === "right",
    );

    const coil = addNewElement(rung, { elementType: "coil" });
    rung = { ...rung, nodes: coil.nodes, edges: coil.edges };

    expect(removePlaceholderElements(rung.nodes).map(node => node.type)).toEqual([
      "powerRail",
      "contact",
      "coil",
      "powerRail",
    ]);
    expect(rung.edges).toHaveLength(3);
    expect(rung.edges.some(edge => edge.source === contactNode?.id && edge.target === coil.newNode?.id)).toBe(true);
  });

  it("creates an OPEN/CLOSE junction pair for a parallel insertion", () => {
    let rung = emptyRung();
    rung = selectPlaceholder(rung, node => node.data.relatedNode?.id === "left-rail-test");
    const first = addNewElement(rung, { elementType: "contact" });
    rung = { ...rung, nodes: first.nodes, edges: first.edges };

    const firstContact = rung.nodes.find(node => node.type === "contact");
    rung = selectPlaceholder(rung, node =>
      node.type === "parallelPlaceholder" &&
      node.data.relatedNode?.id === firstContact?.id,
    );
    const parallel = addNewElement(rung, { elementType: "contact" });

    const types = removePlaceholderElements(parallel.nodes).map(node => node.type);
    expect(types.filter(type => type === "parallel")).toHaveLength(2);
    expect(types.filter(type => type === "contact")).toHaveLength(2);
    expect(parallel.edges.length).toBeGreaterThanOrEqual(5);
  });

  it("reconnects the surrounding edge when an element is deleted", () => {
    let rung = emptyRung();
    rung = selectPlaceholder(rung, node => node.data.relatedNode?.id === "left-rail-test");
    const inserted = addNewElement(rung, { elementType: "contact" });
    rung = { ...rung, nodes: inserted.nodes, edges: inserted.edges };

    const contact = rung.nodes.find(node => node.type === "contact");
    expect(contact).toBeDefined();
    const removed = removeElements(rung, [contact!]);

    expect(removePlaceholderElements(removed.nodes).map(node => node.type)).toEqual([
      "powerRail",
      "powerRail",
    ]);
    expect(removed.edges).toHaveLength(1);
    expect(removed.edges[0]).toMatchObject({
      source: "left-rail-test",
      target: "right-rail-test",
    });
  });
});
