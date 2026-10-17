// Hierarchical layout generator for React Flow nodes
// Semantic graph direction:
// A -[DEPENDS_ON]-> B:
// A is upstream (depends on B), B is downstream (dependency provider).
// Upstream callers are placed towards the left, downstream services towards the right.

export function calculateGraphLayout(rawNodes, rawEdges) {
  if (!rawNodes || rawNodes.length === 0) {
    return [];
  }

  const nodeMap = new Map();
  rawNodes.forEach((node) => {
    nodeMap.set(String(node.id), {
      ...node,
      outEdges: [], // nodes this node depends on
      inEdges: [],  // nodes that depend on this node
      layer: 0,
    });
  });

  rawEdges.forEach((edge) => {
    const sourceId = String(edge.source);
    const targetId = String(edge.target);

    if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
      nodeMap.get(sourceId).outEdges.push(targetId);
      nodeMap.get(targetId).inEdges.push(sourceId);
    }
  });

  // Assign layers using topological longest path from ingress roots
  // Roots: nodes that have inEdges.length === 0 (no other service depends on them, e.g. edge gateways)
  const roots = [];
  nodeMap.forEach((node) => {
    if (node.inEdges.length === 0) {
      roots.push(node);
    }
  });

  // If there are no strictly root nodes (e.g. all connected in cycle), take lowest in-degree
  const startingNodes = roots.length > 0 ? roots : Array.from(nodeMap.values()).slice(0, 1);

  const visited = new Set();
  const queue = startingNodes.map((n) => ({ id: String(n.id), layer: 0 }));

  queue.forEach((item) => {
    visited.add(item.id);
  });

  while (queue.length > 0) {
    const { id, layer } = queue.shift();
    const currentNode = nodeMap.get(id);
    if (!currentNode) continue;

    currentNode.layer = Math.max(currentNode.layer, layer);

    currentNode.outEdges.forEach((depTargetId) => {
      const depNode = nodeMap.get(depTargetId);
      if (depNode) {
        depNode.layer = Math.max(depNode.layer, layer + 1);
        if (!visited.has(depTargetId)) {
          visited.add(depTargetId);
          queue.push({ id: depTargetId, layer: layer + 1 });
        }
      }
    });
  }

  // Handle any disconnected or unvisited components
  let unvisitedLayer = 0;
  nodeMap.forEach((node) => {
    if (!visited.has(String(node.id))) {
      node.layer = unvisitedLayer;
      unvisitedLayer = (unvisitedLayer + 1) % 3;
    }
  });

  // Group nodes by layer
  const layers = new Map();
  nodeMap.forEach((node) => {
    const layer = node.layer;
    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer).push(node);
  });

  // Sort layers
  const sortedLayerKeys = Array.from(layers.keys()).sort((a, b) => a - b);

  const LAYER_SPACING_X = 360;
  const NODE_SPACING_Y = 170;
  const START_X = 80;
  const BASE_Y = 180;

  // Find max layer height to center vertically
  let maxNodesInLayer = 0;
  sortedLayerKeys.forEach((k) => {
    maxNodesInLayer = Math.max(maxNodesInLayer, layers.get(k).length);
  });

  const centerY = BASE_Y + (maxNodesInLayer * NODE_SPACING_Y) / 2;

  const layoutedNodes = [];

  sortedLayerKeys.forEach((layerKey, colIndex) => {
    const nodesInCol = layers.get(layerKey);
    // Sort nodes in column alphabetically by name for deterministic rendering
    nodesInCol.sort((a, b) => {
      const nameA = a.properties?.name || a.id;
      const nameB = b.properties?.name || b.id;
      return String(nameA).localeCompare(String(nameB));
    });

    const colHeight = (nodesInCol.length - 1) * NODE_SPACING_Y;
    const startY = centerY - colHeight / 2;

    nodesInCol.forEach((node, rowIndex) => {
      layoutedNodes.push({
        id: String(node.id),
        type: 'serviceNode',
        position: {
          x: START_X + colIndex * LAYER_SPACING_X,
          y: Math.max(50, startY + rowIndex * NODE_SPACING_Y),
        },
        data: {
          ...node,
          rawLabels: node.labels || [],
          rawProperties: node.properties || {},
          incomingCount: node.inEdges.length,
          outgoingCount: node.outEdges.length,
        },
      });
    });
  });

  return layoutedNodes;
}
