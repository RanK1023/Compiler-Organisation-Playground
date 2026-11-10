import React, { useMemo } from 'react';
import { DAGGraph, DAGNode } from '../compiler/dag/DAG';
import { Share2, Info, Layers } from 'lucide-react';

interface DAGVisualizerProps {
  dag: DAGGraph;
}

export const DAGVisualizer: React.FC<DAGVisualizerProps> = ({ dag }) => {
  // Calculate layout coordinates for SVG visualization (called unconditionally)
  const { nodePositions, width, height } = useMemo(() => {
    if (!dag.nodes || dag.nodes.length === 0) {
      return { nodePositions: new Map<string, { x: number; y: number }>(), width: 500, height: 260 };
    }

    const nodes = dag.nodes;
    const nodeMap = new Map<string, DAGNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    // Calculate node depths (leaves at bottom level 0, operators above)
    const depths = new Map<string, number>();

    const getDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (depths.has(nodeId)) return depths.get(nodeId)!;
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node || node.operands.length === 0) {
        depths.set(nodeId, 0);
        return 0;
      }

      let maxChildDepth = 0;
      for (const childId of node.operands) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(childId, visited) + 1);
      }
      depths.set(nodeId, maxChildDepth);
      return maxChildDepth;
    };

    nodes.forEach(n => getDepth(n.id));

    // Group nodes by depth
    const levels = new Map<number, DAGNode[]>();
    nodes.forEach(n => {
      const d = depths.get(n.id) || 0;
      if (!levels.has(d)) levels.set(d, []);
      levels.get(d)!.push(n);
    });

    const maxDepth = Math.max(...Array.from(depths.values()), 0);
    const svgWidth = Math.max(500, Math.max(...Array.from(levels.values()).map(arr => arr.length)) * 120 + 80);
    const svgHeight = Math.max(260, (maxDepth + 1) * 90 + 60);

    const positions = new Map<string, { x: number; y: number }>();

    levels.forEach((nodesAtLevel, depth) => {
      // Invert Y so depth 0 (operands) is at bottom, maxDepth (root operators) at top
      const y = svgHeight - 50 - depth * 85;
      const spacing = svgWidth / (nodesAtLevel.length + 1);
      nodesAtLevel.forEach((node, idx) => {
        const x = spacing * (idx + 1);
        positions.set(node.id, { x, y });
      });
    });

    return { nodePositions: positions, width: svgWidth, height: svgHeight };
  }, [dag]);

  if (!dag.nodes || dag.nodes.length === 0) {
    return (
      <div style={{ color: '#64748B', fontSize: '0.85rem', textAlign: 'center', padding: '36px' }}>
        No DAG constructed. Select a basic block containing arithmetic expressions.
      </div>
    );
  }

  return (
    <div className="graph-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Share2 size={15} color="#06B6D4" /> Expression DAG for {dag.blockId || 'Selected Block'}
          <span style={{ fontSize: '0.72rem', color: '#38BDF8', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
            {dag.nodes.length} Nodes • {dag.edges.length} Dependencies
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Info size={12} /> Common subexpressions share operator nodes
        </div>
      </div>

      {/* SVG Interactive Visual Graph */}
      <div style={{ width: '100%', overflowX: 'auto', background: '#090D16', borderRadius: '8px', border: '1px solid #1F293D', padding: '12px 0' }}>
        <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <marker
              id="dag-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748B" />
            </marker>
          </defs>

          {/* Directed Edges */}
          {dag.edges.map((edge, idx) => {
            const from = nodePositions.get(edge.from);
            const to = nodePositions.get(edge.to);
            if (!from || !to) return null;

            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            return (
              <g key={idx}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#334155"
                  strokeWidth="2"
                  markerEnd="url(#dag-arrow)"
                />
                {edge.label && (
                  <text
                    x={midX + 6}
                    y={midY}
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {dag.nodes.map(node => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const isOp = node.type === 'OPERATOR';
            const nodeWidth = isOp ? 54 : 44;
            const nodeHeight = isOp ? 36 : 30;

            return (
              <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                {/* Node Box */}
                <rect
                  x={-nodeWidth / 2}
                  y={-nodeHeight / 2}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={isOp ? 8 : 6}
                  fill={isOp ? '#1E293B' : '#0F172A'}
                  stroke={isOp ? '#06B6D4' : '#475569'}
                  strokeWidth={isOp ? '2' : '1.5'}
                />

                {/* Node Label (Operator or Operand) */}
                <text
                  x="0"
                  y={isOp ? '4' : '3'}
                  textAnchor="middle"
                  fill={isOp ? '#38BDF8' : '#F1F5F9'}
                  fontSize={isOp ? '15' : '12'}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {node.label}
                </text>

                {/* Attached Variables Pill */}
                {node.variables && node.variables.length > 0 && (
                  <g transform={`translate(${nodeWidth / 2 + 6}, -8)`}>
                    <rect
                      x="0"
                      y="0"
                      width={node.variables.join(', ').length * 7 + 12}
                      height="18"
                      rx="4"
                      fill="#064E3B"
                      stroke="#10B981"
                      strokeWidth="1"
                    />
                    <text
                      x="6"
                      y="12"
                      fill="#34D399"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      ={node.variables.join(', ')}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Structured Nodes Summary List */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={13} color="#06B6D4" /> Node Registry & Subexpression Sharing:
        </div>
        <div className="dag-nodes-view">
          {dag.nodes.map(node => (
            <div key={node.id} className="dag-node-chip">
              <span style={{ color: '#64748B', fontSize: '0.65rem' }}>{node.id}</span>
              <span className="dag-node-op">{node.label}</span>
              {node.variables && node.variables.length > 0 ? (
                <span className="dag-node-vars">
                  = {node.variables.join(', ')}
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                  ({node.type === 'OPERATOR' ? 'intermediate' : 'operand'})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
