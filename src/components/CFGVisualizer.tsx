import React, { useState } from 'react';
import { CFGGraph } from '../compiler/cfg/CFG';
import { formatTACInstruction } from '../compiler/tacGenerator/TAC';
import { GitBranch, ArrowRight, CornerDownRight } from 'lucide-react';

interface CFGVisualizerProps {
  cfg: CFGGraph;
  selectedBlockId?: string;
  onSelectBlock?: (blockId: string) => void;
}

export const CFGVisualizer: React.FC<CFGVisualizerProps> = ({
  cfg,
  selectedBlockId,
  onSelectBlock
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'flow'>('cards');

  if (!cfg.blocks || cfg.blocks.length === 0) {
    return (
      <div style={{ color: '#64748B', fontSize: '0.85rem', textAlign: 'center', padding: '36px' }}>
        No Control Flow Graph available. Run compilation on valid source code.
      </div>
    );
  }

  // Count back-edges (loops) and conditional branches
  const backEdgesCount = cfg.edges.filter(e => e.isBackEdge).length;
  const conditionalBranchesCount = cfg.edges.filter(e => e.label === 'True' || e.label === 'False').length;

  return (
    <div className="graph-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: 600 }}>
            Control Flow Graph:
          </span>
          <span className="badge" style={{ fontSize: '0.7rem' }}>
            {cfg.blocks.length} Blocks
          </span>
          <span className="badge" style={{ fontSize: '0.7rem' }}>
            {cfg.edges.length} Transitions
          </span>
          {backEdgesCount > 0 && (
            <span className="badge" style={{ fontSize: '0.7rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#FBBF24', background: 'rgba(245, 158, 11, 0.1)' }}>
              ↻ {backEdgesCount} Loop Back-Edge{backEdgesCount > 1 ? 's' : ''}
            </span>
          )}
          {conditionalBranchesCount > 0 && (
            <span className="badge" style={{ fontSize: '0.7rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)' }}>
              🔀 {conditionalBranchesCount / 2} Branching Junctions
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            onClick={() => setViewMode('cards')}
          >
            Block Cards
          </button>
          <button
            className={`btn ${viewMode === 'flow' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            onClick={() => setViewMode('flow')}
          >
            Transition Flow
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px' }}>
        💡 Click any block card to inspect its local Expression DAG and common subexpression sharing.
      </div>

      {viewMode === 'cards' ? (
        /* Render Basic Block Cards Grid */
        <div className="cfg-blocks-grid">
          {cfg.blocks.map(block => {
            const isSelected = selectedBlockId === block.id;
            const leader = block.instructions[0];
            const outgoingEdges = cfg.edges.filter(e => e.from === block.id);

            return (
              <div
                key={block.id}
                className="cfg-block-card"
                style={{
                  borderColor: isSelected ? '#3B82F6' : '#1F293D',
                  boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.4)' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => onSelectBlock && onSelectBlock(block.id)}
              >
                <div
                  className="cfg-block-header"
                  style={{
                    backgroundColor: isSelected ? '#1E3A8A' : '#1E293B',
                    color: isSelected ? '#93C5FD' : '#38BDF8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    {block.id} {isSelected && '★ (Active DAG)'}
                  </span>
                  <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                    Leader: Inst #{leader?.id || 1}
                  </span>
                </div>

                <div className="cfg-block-body">
                  {block.instructions.map(inst => (
                    <div
                      key={inst.id}
                      style={{
                        color: inst.op === 'LABEL' ? '#38BDF8' : inst.op === 'JUMP' || inst.op === 'IF_TRUE' || inst.op === 'IF_FALSE' ? '#F59E0B' : '#CBD5E1',
                        fontWeight: inst.op === 'LABEL' ? 600 : 400
                      }}
                    >
                      {formatTACInstruction(inst)}
                    </div>
                  ))}
                </div>

                {/* Outgoing Branch Badges Footer */}
                {outgoingEdges.length > 0 && (
                  <div style={{ padding: '6px 10px', background: '#0D1322', borderTop: '1px solid #1F293D', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {outgoingEdges.map(e => {
                      let badgeColor = '#38BDF8';
                      if (e.label === 'True') badgeColor = '#34D399';
                      if (e.label === 'False') badgeColor = '#F43F5E';
                      if (e.isBackEdge) badgeColor = '#FBBF24';

                      return (
                        <span key={e.id} style={{ fontSize: '0.65rem', color: badgeColor, background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '3px' }}>
                          → {e.to} ({e.label})
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Render Flow Timeline View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
          {cfg.blocks.map(block => {
            const outgoing = cfg.edges.filter(e => e.from === block.id);
            const isSelected = selectedBlockId === block.id;

            return (
              <div
                key={block.id}
                style={{
                  background: isSelected ? 'rgba(30, 58, 138, 0.25)' : '#0F172A',
                  border: `1px solid ${isSelected ? '#3B82F6' : '#1F293D'}`,
                  borderRadius: '6px',
                  padding: '10px 14px',
                  cursor: 'pointer'
                }}
                onClick={() => onSelectBlock && onSelectBlock(block.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: '0.85rem' }}>
                    Block {block.id} ({block.instructions.length} insts)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                    Predecessors: {block.predecessors.length > 0 ? block.predecessors.join(', ') : 'None (Entry)'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <CornerDownRight size={14} color="#64748B" />
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Next Transitions:</span>
                  {outgoing.length === 0 ? (
                    <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>End of Execution (Exit)</span>
                  ) : (
                    outgoing.map(e => {
                      let badgeClass = 'edge-fall';
                      if (e.label === 'True') badgeClass = 'edge-true';
                      if (e.label === 'False') badgeClass = 'edge-false';
                      if (e.isBackEdge) badgeClass = 'edge-back';

                      return (
                        <span key={e.id} className={`edge-badge ${badgeClass}`} style={{ fontSize: '0.72rem' }}>
                          {block.id} → {e.to} ({e.label})
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Control Flow Transitions Registry */}
      <div className="cfg-edges-list" style={{ marginTop: '14px' }}>
        <div style={{ fontWeight: 600, marginBottom: '6px', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GitBranch size={14} color="#38BDF8" /> Control Flow Transition Map:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
          {cfg.edges.map(edge => {
            let badgeClass = 'edge-fall';
            if (edge.label === 'True') badgeClass = 'edge-true';
            if (edge.label === 'False') badgeClass = 'edge-false';
            if (edge.isBackEdge) badgeClass = 'edge-back';

            return (
              <div key={edge.id} className="edge-item">
                <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{edge.from}</span>
                <ArrowRight size={12} color="#64748B" />
                <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{edge.to}</span>
                <span className={`edge-badge ${badgeClass}`}>
                  {edge.isBackEdge ? '↻ Loop Back' : edge.label || 'Flow'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
