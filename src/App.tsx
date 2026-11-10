import React, { useState } from 'react';
import { CompilerEngine, CompilerOutput } from './compiler/CompilerEngine';
import { SAMPLE_PROGRAMS } from './samples/samplePrograms';
import { CFGVisualizer } from './components/CFGVisualizer';
import { DAGVisualizer } from './components/DAGVisualizer';
import { ComparisonView } from './components/ComparisonView';
import {
  Play,
  RotateCcw,
  Cpu,
  Layers,
  History,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Share2,
  Code2,
  ChevronRight,
  ChevronLeft,
  FastForward
} from 'lucide-react';

const compiler = new CompilerEngine();

export const App: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState<string>(SAMPLE_PROGRAMS[0].id);
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_PROGRAMS[0].code);
  const [selectedPasses, setSelectedPasses] = useState<string[]>([
    'constant-folding',
    'strength-reduction',
    'cse',
    'licm',
    'dce'
  ]);
  const [output, setOutput] = useState<CompilerOutput | null>(() =>
    compiler.compileAndOptimize(SAMPLE_PROGRAMS[0].code, [
      'constant-folding',
      'strength-reduction',
      'cse',
      'licm',
      'dce'
    ])
  );
  const [activeTab, setActiveTab] = useState<'cfg' | 'dag' | 'history'>('cfg');
  const [selectedBlockForDAG, setSelectedBlockForDAG] = useState<string | undefined>(undefined);

  // Step-by-step state
  const [isStepMode, setIsStepMode] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const handleCompile = (
    codeToCompile = sourceCode,
    passes = selectedPasses,
    targetDAGBlock = selectedBlockForDAG,
    stepIdx?: number
  ) => {
    const result = compiler.compileAndOptimize(codeToCompile, passes, targetDAGBlock, stepIdx);
    setOutput(result);
    if (result.success) {
      setCurrentStepIndex(result.currentStepIndex);
    }
  };

  const handleSampleChange = (sampleId: string) => {
    setSelectedSample(sampleId);
    const sample = SAMPLE_PROGRAMS.find(s => s.id === sampleId);
    if (sample) {
      setSourceCode(sample.code);
      setIsStepMode(false);
      handleCompile(sample.code, selectedPasses, undefined, undefined);
    }
  };

  const togglePass = (passId: string) => {
    const updated = selectedPasses.includes(passId)
      ? selectedPasses.filter(p => p !== passId)
      : [...selectedPasses, passId];
    setSelectedPasses(updated);
    setIsStepMode(false);
    handleCompile(sourceCode, updated, selectedBlockForDAG, undefined);
  };

  const handleSelectBlockForDAG = (blockId: string) => {
    setSelectedBlockForDAG(blockId);
    setActiveTab('dag');
    handleCompile(sourceCode, selectedPasses, blockId, isStepMode ? currentStepIndex : undefined);
  };

  // Step Navigation Handlers
  const handleStepNext = () => {
    if (!output || currentStepIndex >= output.totalSteps) return;
    const nextIdx = currentStepIndex + 1;
    setIsStepMode(true);
    handleCompile(sourceCode, selectedPasses, selectedBlockForDAG, nextIdx);
  };

  const handleStepPrev = () => {
    if (!output || currentStepIndex <= 0) return;
    const prevIdx = currentStepIndex - 1;
    setIsStepMode(true);
    handleCompile(sourceCode, selectedPasses, selectedBlockForDAG, prevIdx);
  };

  const handleStepReset = () => {
    setIsStepMode(true);
    handleCompile(sourceCode, selectedPasses, selectedBlockForDAG, 0);
  };

  const handleRunAll = () => {
    setIsStepMode(false);
    handleCompile(sourceCode, selectedPasses, selectedBlockForDAG, undefined);
  };

  const handleJumpToStep = (stepIdx: number) => {
    setIsStepMode(true);
    handleCompile(sourceCode, selectedPasses, selectedBlockForDAG, stepIdx);
  };

  // Line numbers generator for code editor
  const lineCount = Math.max(sourceCode.split('\n').length, 12);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const availablePasses = compiler.getAvailablePasses();

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Cpu size={22} />
          </div>
          <div>
            <h1 className="brand-title">Compiler Optimization Playground</h1>
            <p className="brand-subtitle">
              BCSE307P Compiler Design Lab • Intermediate Representation & Multi-Pass Optimization Engine
            </p>
          </div>
        </div>

        <div className="header-badges">
          <span className="badge">
            <Code2 size={13} /> C-like Grammar
          </span>
          <span className="badge success">
            <CheckCircle2 size={13} /> 5 Verified Passes
          </span>
        </div>
      </header>

      {/* Control Toolbar */}
      <div className="controls-bar">
        {/* Sample selector */}
        <div className="sample-selector">
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>Sample Program:</span>
          <select
            className="select-input"
            value={selectedSample}
            onChange={(e) => handleSampleChange(e.target.value)}
          >
            {SAMPLE_PROGRAMS.map(s => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {/* Optimization Passes Pills */}
        <div className="passes-container">
          {availablePasses.map(pass => {
            const isActive = selectedPasses.includes(pass.id);
            return (
              <div
                key={pass.id}
                className={`pass-pill ${isActive ? 'active' : ''}`}
                onClick={() => togglePass(pass.id)}
                title={pass.description}
              >
                <span>{isActive ? '✓' : '+'}</span>
                <span>{pass.name.split('(')[0]}</span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSourceCode('');
              setSelectedSample('custom-code');
            }}
            title="Clear editor to enter fresh custom code"
          >
            Clear
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const sample = SAMPLE_PROGRAMS.find(s => s.id === selectedSample);
              if (sample) {
                setSourceCode(sample.code);
                setIsStepMode(false);
                handleCompile(sample.code, selectedPasses, undefined, undefined);
              }
            }}
            title="Reset code to original sample"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <button
            className={`btn ${isStepMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              if (!isStepMode) {
                setIsStepMode(true);
                handleCompile(sourceCode, selectedPasses, selectedBlockForDAG, 0);
              } else {
                setIsStepMode(false);
                handleCompile(sourceCode, selectedPasses, selectedBlockForDAG, undefined);
              }
            }}
            title="Toggle interactive step-by-step transformation mode"
          >
            <History size={14} /> {isStepMode ? 'Exit Step Mode' : 'Step-by-Step Mode'}
          </button>

          {/* Prominent Analyze & Optimize Button */}
          <button
            className="btn btn-analyze"
            onClick={handleRunAll}
            title="Run Lexer -> Parser -> TAC -> CFG -> Optimization Pipeline"
          >
            <Play size={15} fill="currentColor" /> Analyze & Optimize
          </button>
        </div>
      </div>

      {/* Step-by-Step Controls Bar (when in step mode) */}
      {isStepMode && output && output.success && (
        <div style={{ padding: '10px 24px 0 24px' }}>
          <div className="step-controls-bar">
            <div className="step-indicator">
              <span style={{ color: '#38BDF8' }}>Step-by-Step Pipeline Inspector:</span>
              <span className="badge" style={{ background: '#1E293B', color: '#F1F5F9' }}>
                {currentStepIndex === 0
                  ? 'Baseline (Unoptimized Raw TAC)'
                  : `Step ${currentStepIndex} of ${output.totalSteps}: ${output.optimizationSteps[currentStepIndex - 1]?.passName}`}
              </span>
              {currentStepIndex > 0 && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: output.optimizationSteps[currentStepIndex - 1]?.changed ? '#34D399' : '#94A3B8',
                    background: output.optimizationSteps[currentStepIndex - 1]?.changed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  {output.optimizationSteps[currentStepIndex - 1]?.changed ? '✓ Transformed TAC' : '• No Change'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleStepReset}
                disabled={currentStepIndex === 0}
                style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: currentStepIndex === 0 ? 0.5 : 1 }}
                title="Reset view to unoptimized TAC"
              >
                <RotateCcw size={12} /> Reset to Unoptimized
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleStepPrev}
                disabled={currentStepIndex <= 0}
                style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: currentStepIndex <= 0 ? 0.5 : 1 }}
                title="Go back to previous pass"
              >
                <ChevronLeft size={13} /> Previous Pass
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStepNext}
                disabled={currentStepIndex >= output.totalSteps}
                style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: currentStepIndex >= output.totalSteps ? 0.5 : 1 }}
                title="Advance to next pass"
              >
                Next Pass <ChevronRight size={13} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRunAll}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                title="Run remaining passes to completion"
              >
                <FastForward size={13} /> Finish All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {output && !output.success && (
        <div style={{ padding: '0 24px', marginTop: '16px' }}>
          <div className="error-banner">
            <AlertTriangle size={18} />
            <div style={{ flex: 1 }}>
              <strong>Compilation Error:</strong> {output.error}
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Grid */}
      <main className="main-grid">
        {/* Left Column: Code Editor & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Source Code Panel */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">
                <Code2 size={16} color="#3B82F6" /> C-like Source Code (Fully Editable)
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#60A5FA',
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                Type any custom code & click Analyze & Optimize
              </span>
            </div>

            <div className="panel-body">
              {/* Quick Snippet Inserts for Custom Coding */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Quick Snippets:</span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    const snippet = `int a = 15 * 4;\nint b = a + 8;\nint c = a + 8;\nprint(c);\n`;
                    setSourceCode(prev => prev ? prev + '\n' + snippet : snippet);
                    setSelectedSample('custom-code');
                  }}
                  title="Insert arithmetic expression snippet"
                >
                  + Expressions
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    const snippet = `if (x > 10) {\n    y = x * 2;\n} else {\n    y = x + 1;\n}\n`;
                    setSourceCode(prev => prev ? prev + '\n' + snippet : snippet);
                    setSelectedSample('custom-code');
                  }}
                  title="Insert branching conditional snippet"
                >
                  + If-Else
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    const snippet = `int i = 0;\nwhile (i < 5) {\n    int val = 20 * 2;\n    sum = sum + val + i;\n    i = i + 1;\n}\n`;
                    setSourceCode(prev => prev ? prev + '\n' + snippet : snippet);
                    setSelectedSample('custom-code');
                  }}
                  title="Insert while loop snippet"
                >
                  + While Loop
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    const snippet = `int sum = 0;\nfor (int i = 0; i < 10; i++) {\n    sum = sum + i;\n}\nprint(sum);\n`;
                    setSourceCode(prev => prev ? prev + '\n' + snippet : snippet);
                    setSelectedSample('custom-code');
                  }}
                  title="Insert for loop snippet"
                >
                  + For Loop
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  onClick={() => {
                    const template = `int main() {\n    int a = 12;\n    int b = 4;\n    int result = a * 8 + b;\n    print(result);\n    return result;\n}`;
                    setSourceCode(template);
                    setSelectedSample('custom-code');
                  }}
                  title="Insert main() function template"
                >
                  + main() Template
                </button>
              </div>

              {/* Editable Code Editor with Line Numbers Gutter */}
              <div className="editor-wrapper">
                <div className="editor-line-numbers">
                  {lineNumbers.map(n => (
                    <div key={n}>{n}</div>
                  ))}
                </div>
                <textarea
                  className="editor-textarea-with-gutter"
                  value={sourceCode}
                  onChange={(e) => {
                    setSourceCode(e.target.value);
                    if (selectedSample !== 'custom-code') {
                      setSelectedSample('custom-code');
                    }
                  }}
                  placeholder="Type or paste any custom C-like code here, e.g.:&#10;&#10;int main() {&#10;    int x = 10 * 2;&#10;    int y = x + 5;&#10;    print(y);&#10;    return y;&#10;}"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* Performance & Optimization Metrics Strip */}
          {output && output.success && (
            <div className="panel" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>
                  OPTIMIZATION SUMMARY & METRICS
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  {isStepMode ? `Inspecting Step ${currentStepIndex} of ${output.totalSteps}` : 'All Selected Passes Applied'}
                </span>
              </div>

              <div className="metrics-strip">
                <div className="metric-box">
                  <div className="metric-val">{output.instructionCountBefore}</div>
                  <div className="metric-label">Initial TAC Insts</div>
                </div>
                <div className="metric-box">
                  <div className="metric-val">{output.instructionCountAfter}</div>
                  <div className="metric-label">
                    {isStepMode ? 'Current TAC Insts' : 'Optimized TAC Insts'}
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-val highlight">
                    {output.reductionCount > 0 ? `-${output.reductionCount}` : '0'}
                  </div>
                  <div className="metric-label">Instructions Reduced</div>
                </div>
                <div className="metric-box">
                  <div className="metric-val highlight">{output.reductionPercentage}%</div>
                  <div className="metric-label">IR Simplification</div>
                </div>
              </div>

              {/* Semantic Equivalence Verification Badge */}
              {output.semanticVerification.executed && (
                <div
                  className={`semantic-badge ${output.semanticVerification.verified ? 'verified' : 'warning'}`}
                >
                  <CheckCircle2 size={15} color={output.semanticVerification.verified ? '#10B981' : '#F59E0B'} />
                  <div style={{ flex: 1 }}>
                    <strong>{output.semanticVerification.message}</strong>
                    <div style={{ fontSize: '0.72rem', marginTop: '2px', opacity: 0.9 }}>
                      Baseline Output: [
                      {output.semanticVerification.originalOutput.length > 0
                        ? output.semanticVerification.originalOutput.join(', ')
                        : 'None'}
                      ] • Optimized Output: [
                      {output.semanticVerification.optimizedOutput.length > 0
                        ? output.semanticVerification.optimizedOutput.join(', ')
                        : 'None'}
                      ]
                      {output.semanticVerification.originalReturn !== undefined &&
                        ` • Return Value: ${output.semanticVerification.originalReturn}`}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic', marginTop: '10px' }}>
                * Note: Instruction-count reduction is an intermediate-code metric for dead computation removal and constant folding; machine execution speed depends on target hardware architecture.
              </div>
            </div>
          )}

          {/* Side-by-Side Intermediate Representation Comparison */}
          {output && output.success && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <Layers size={16} color="#06B6D4" /> Three-Address Code (TAC) Comparison
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  {isStepMode ? `Original vs Step ${currentStepIndex}` : 'Original vs Optimized'}
                </span>
              </div>
              <div className="panel-body">
                <ComparisonView
                  rawTAC={output.rawTAC}
                  optimizedTAC={output.optimizedTAC}
                  steps={output.optimizationSteps}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: CFG, DAG, and Step-by-Step History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn ${activeTab === 'cfg' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => setActiveTab('cfg')}
                >
                  <GitBranch size={13} /> Control Flow Graph (CFG)
                </button>
                <button
                  className={`btn ${activeTab === 'dag' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => setActiveTab('dag')}
                >
                  <Share2 size={13} /> Expression DAG
                </button>
                <button
                  className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => setActiveTab('history')}
                >
                  <History size={13} /> Pass Trace ({output?.optimizationSteps.length || 0})
                </button>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Interactive Compiler Analysis
              </span>
            </div>

            <div className="panel-body">
              {output && output.success && (
                <>
                  {activeTab === 'cfg' && (
                    <CFGVisualizer
                      cfg={output.cfg}
                      selectedBlockId={selectedBlockForDAG}
                      onSelectBlock={handleSelectBlockForDAG}
                    />
                  )}

                  {activeTab === 'dag' && (
                    <DAGVisualizer dag={output.dag} />
                  )}

                  {activeTab === 'history' && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '10px' }}>
                        Click any pass below to inspect the intermediate code and graph state at that exact point in the pipeline:
                      </div>
                      {output.optimizationSteps.length === 0 ? (
                        <div style={{ color: '#64748B', fontSize: '0.85rem', textAlign: 'center', padding: '24px' }}>
                          No passes selected. Toggle passes above to inspect transformations.
                        </div>
                      ) : (
                        output.optimizationSteps.map(step => {
                          const isCurrentStep = isStepMode && currentStepIndex === step.stepIndex;
                          return (
                            <div
                              key={step.stepIndex}
                              className="step-item"
                              style={{
                                cursor: 'pointer',
                                borderColor: isCurrentStep ? '#3B82F6' : undefined,
                                background: isCurrentStep ? 'rgba(37, 99, 235, 0.1)' : undefined
                              }}
                              onClick={() => handleJumpToStep(step.stepIndex)}
                              title="Click to jump to this optimization step"
                            >
                              <div className="step-header">
                                <span className="step-title">
                                  Step {step.stepIndex}: {step.passName}
                                  {isCurrentStep && ' ★ (Active View)'}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    color: step.changed ? '#34D399' : '#94A3B8',
                                    background: step.changed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {step.changed
                                    ? `${step.changes.length} change${step.changes.length > 1 ? 's' : ''}`
                                    : 'No changes'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '6px' }}>
                                {step.explanation}
                              </div>
                              {step.changes.length > 0 && (
                                <ul className="step-changes">
                                  {step.changes.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          BCSE307P — Compiler Design Lab • Fall Semester 2026–2027
        </div>
        <div>
          Pipeline Architecture: Source Code → Lexer → Parser → TAC → Basic Blocks → CFG / DAG → Optimizations → Semantic Verification
        </div>
      </footer>
    </div>
  );
};

export default App;
