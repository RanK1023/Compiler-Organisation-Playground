import React from 'react';
import { TACInstruction, formatTACInstruction } from '../compiler/tacGenerator/TAC';
import { OptimizationStep } from '../compiler/optimizations/OptimizationPipeline';
import { CheckCircle2, Info, Sparkles } from 'lucide-react';

interface ComparisonViewProps {
  rawTAC: TACInstruction[];
  optimizedTAC: TACInstruction[];
  steps?: OptimizationStep[];
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  rawTAC,
  optimizedTAC,
  steps = []
}) => {
  const rawFormatted = rawTAC.map(formatTACInstruction);
  const optFormatted = optimizedTAC.map(formatTACInstruction);

  const isIdentical =
    rawFormatted.length === optFormatted.length &&
    rawFormatted.every((line, idx) => line === optFormatted[idx]);

  return (
    <div>
      {/* If code is unchanged under selected passes, show message */}
      {isIdentical && (
        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#93C5FD', fontSize: '0.78rem' }}>
          <Info size={16} color="#3B82F6" />
          <span>
            <strong>Intermediate Code Unchanged:</strong> The TAC remained identical because no selected optimization pass was applicable to this program structure.
          </span>
        </div>
      )}

      {/* Side-by-side TAC Comparison Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Raw TAC */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>
              Original Unoptimized TAC ({rawTAC.length} insts)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
              Baseline IR
            </span>
          </div>
          <div className="ir-code-view">
            {rawFormatted.map((line, idx) => (
              <div key={idx} className="ir-line">
                <span className="ir-line-num">{idx + 1}</span>
                <span className="ir-line-text">{line}</span>
              </div>
            ))}
            {rawFormatted.length === 0 && (
              <div style={{ color: '#64748B', padding: '12px', fontSize: '0.8rem' }}>
                No instructions generated yet.
              </div>
            )}
          </div>
        </div>

        {/* Optimized TAC */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isIdentical ? '#94A3B8' : '#34D399' }}>
              Optimized TAC ({optimizedTAC.length} insts)
            </span>
            <span style={{ fontSize: '0.68rem', color: isIdentical ? '#64748B' : '#10B981' }}>
              {isIdentical ? 'Identical' : `${rawTAC.length - optimizedTAC.length} removed`}
            </span>
          </div>
          <div className="ir-code-view">
            {optFormatted.map((line, idx) => {
              const isChanged = !rawFormatted.includes(line);
              return (
                <div key={idx} className={`ir-line ${isChanged ? 'changed' : ''}`}>
                  <span className="ir-line-num">{idx + 1}</span>
                  <span className="ir-line-text">{line}</span>
                </div>
              );
            })}
            {optFormatted.length === 0 && (
              <div style={{ color: '#64748B', padding: '12px', fontSize: '0.8rem' }}>
                No optimized instructions available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Applied Passes Brief Explanations List */}
      {steps.length > 0 && (
        <div style={{ marginTop: '12px', background: '#0D1322', borderRadius: '6px', padding: '10px 12px', border: '1px solid #1F293D' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="#F59E0B" /> Applied Transformations Summary:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {steps.filter(s => s.changed).map(step => (
              <div key={step.stepIndex} style={{ fontSize: '0.72rem', color: '#CBD5E1', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <CheckCircle2 size={12} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong style={{ color: '#38BDF8' }}>{step.passName}:</strong> {step.explanation}
                </span>
              </div>
            ))}
            {steps.every(s => !s.changed) && (
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                All selected passes ran successfully; no instructions met criteria for transformation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
