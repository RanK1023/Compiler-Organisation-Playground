import { describe, it, expect } from 'vitest';
import { CompilerEngine } from '../compiler/CompilerEngine';

describe('Specification Section 8: Custom Input & Full Verification Suite', () => {
  const engine = new CompilerEngine();

  // 1. Enter a new arithmetic program and verify the TAC reflects its variables and values
  it('1. should generate TAC reflecting custom variables and values', () => {
    const customCode = `
      int main() {
        int customVarA = 77;
        int customVarB = 33;
        int sumCustom = customVarA + customVarB;
        print(sumCustom);
        return sumCustom;
      }
    `;
    const res = engine.compileAndOptimize(customCode, []);
    expect(res.success).toBe(true);
    expect(res.rawTAC.some(i => i.op === 'ASSIGN' && i.result === 'customVarA' && i.arg1 === '77')).toBe(true);
    expect(res.rawTAC.some(i => i.op === 'ASSIGN' && i.result === 'customVarB' && i.arg1 === '33')).toBe(true);
    expect(res.rawTAC.some(i => i.op === 'ADD' && i.arg1 === 'customVarA' && i.arg2 === 'customVarB')).toBe(true);
    expect(res.rawTAC.some(i => i.op === 'PRINT')).toBe(true);
  });

  // 2. Change the program and verify the results change
  it('2. should dynamically update TAC and metrics when program changes', () => {
    const prog1 = 'int main() { int alpha = 100; return alpha; }';
    const prog2 = 'int main() { int beta = 200; return beta; }';

    const res1 = engine.compileAndOptimize(prog1, []);
    const res2 = engine.compileAndOptimize(prog2, []);

    expect(res1.rawTAC.some(i => i.result === 'alpha')).toBe(true);
    expect(res1.rawTAC.some(i => i.result === 'beta')).toBe(false);

    expect(res2.rawTAC.some(i => i.result === 'beta')).toBe(true);
    expect(res2.rawTAC.some(i => i.result === 'alpha')).toBe(false);
  });

  // 3. Run constant folding on one input and verify the actual transformed representation
  it('3. should perform constant folding and propagation on arithmetic expressions', () => {
    const code = `
      int main() {
        int a = 10 * 2 + 5;
        int b = a * 2;
        return b;
      }
    `;
    const res = engine.compileAndOptimize(code, ['constant-folding']);
    expect(res.success).toBe(true);
    // 10 * 2 + 5 -> 25, then 25 * 2 -> 50
    const bAssign = res.optimizedTAC.find(i => i.result === 'b');
    expect(bAssign).toBeDefined();
    expect(bAssign?.op).toBe('ASSIGN');
    expect(bAssign?.arg1).toBe('50');
  });

  // 4. Disable constant folding and verify that pass is not applied
  it('4. should not fold constant expressions when constant folding is disabled', () => {
    const code = 'int main() { int a = 10 * 2; return a; }';
    const res = engine.compileAndOptimize(code, []); // empty passes
    expect(res.success).toBe(true);
    const mulInst = res.optimizedTAC.find(i => i.op === 'MUL');
    expect(mulInst).toBeDefined();
    expect(mulInst?.arg1).toBe('10');
    expect(mulInst?.arg2).toBe('2');
  });

  // 5. Apply CSE to repeated expressions
  it('5. should eliminate common subexpressions with identical operands', () => {
    const code = `
      int main() {
        int a = 8;
        int b = 3;
        int val1 = a * b;
        int val2 = a * b;
        int x = val1 + val2;
        return x;
      }
    `;
    const res = engine.compileAndOptimize(code, ['cse']);
    expect(res.success).toBe(true);
    const cseStep = res.optimizationSteps.find(s => s.passId === 'cse');
    expect(cseStep).toBeDefined();
    expect(cseStep?.changed).toBe(true);
    expect(cseStep?.changes.some(c => c.includes('Eliminated common subexpression'))).toBe(true);
  });

  // 6. Change an operand between expressions and ensure invalid CSE is not performed
  it('6. should not perform CSE when an operand is mutated between expressions', () => {
    const code = `
      int main() {
        int a = 5;
        int b = 6;
        int x = a * b;
        a = 10;
        int y = a * b;
        return x + y;
      }
    `;
    const res = engine.compileAndOptimize(code, ['cse']);
    expect(res.success).toBe(true);
    // Both multiplications must remain because 'a' was modified
    const mulInsts = res.optimizedTAC.filter(i => i.op === 'MUL');
    expect(mulInsts.length).toBe(2);
  });

  // 7. Remove a genuinely dead assignment without removing observable operations
  it('7. should remove dead assignments while preserving print and return', () => {
    const code = `
      int main() {
        int deadVar = 999;
        int liveVar = 42;
        print(liveVar);
        return liveVar;
      }
    `;
    const res = engine.compileAndOptimize(code, ['dce']);
    expect(res.success).toBe(true);
    expect(res.optimizedTAC.some(i => i.result === 'deadVar')).toBe(false);
    expect(res.optimizedTAC.some(i => i.result === 'liveVar')).toBe(true);
    expect(res.optimizedTAC.some(i => i.op === 'PRINT')).toBe(true);
    expect(res.optimizedTAC.some(i => i.op === 'RETURN')).toBe(true);
  });

  // 8. Apply a supported strength-reduction case
  it('8. should reduce power-of-two multiplication to shift operations', () => {
    const code = `
      int main() {
        int n = 12;
        int y = n * 8;
        return y;
      }
    `;
    const res = engine.compileAndOptimize(code, ['strength-reduction']);
    expect(res.success).toBe(true);
    const shlInst = res.optimizedTAC.find(i => i.op === 'SHL');
    expect(shlInst).toBeDefined();
    expect(shlInst?.arg2).toBe('3'); // 2^3 = 8
  });

  // 9. Demonstrate LICM on a valid loop
  it('9. should hoist loop-invariant computation out of loop into preheader', () => {
    const code = `
      int main() {
        int i = 0;
        int base = 10;
        int rate = 5;
        int sum = 0;
        while (i < 5) {
          int invariantVal = base * rate;
          sum = sum + invariantVal + i;
          i = i + 1;
        }
        return sum;
      }
    `;
    const res = engine.compileAndOptimize(code, ['licm']);
    expect(res.success).toBe(true);
    const licmStep = res.optimizationSteps.find(s => s.passId === 'licm');
    expect(licmStep).toBeDefined();
    expect(licmStep?.changed).toBe(true);
    expect(licmStep?.changes.some(c => c.includes('Hoisted loop-invariant instruction'))).toBe(true);
  });

  // 10. Reject or safely handle unsupported syntax
  it('10. should safely reject unsupported lexical syntax', () => {
    const badCode = 'int main() { int $var = @10; }';
    const res = engine.compileAndOptimize(badCode);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error).toContain('Lexical Error');
  });

  // 11. Show a helpful error for malformed source
  it('11. should display helpful parse error with line and column information', () => {
    const malformed = 'int main() {\n  int x = + * 5;\n}';
    const res = engine.compileAndOptimize(malformed);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Parse Error at Line 2');
  });

  // 12. Verify conditional CFG edges
  it('12. should construct True and False conditional edges for if/else statement', () => {
    const code = `
      int main() {
        int x = 10;
        if (x > 5) {
          print(1);
        } else {
          print(0);
        }
      }
    `;
    const res = engine.compileAndOptimize(code, []);
    expect(res.success).toBe(true);
    expect(res.cfg.edges.some(e => e.label === 'True')).toBe(true);
    expect(res.cfg.edges.some(e => e.label === 'False')).toBe(true);
  });

  // 13. Verify loop back edges
  it('13. should detect CFG loop back edges for while and for loops', () => {
    const code = `
      int main() {
        int i = 0;
        while (i < 10) {
          i = i + 1;
        }
        return i;
      }
    `;
    const res = engine.compileAndOptimize(code, []);
    expect(res.success).toBe(true);
    const backEdge = res.cfg.edges.find(e => e.isBackEdge === true);
    expect(backEdge).toBeDefined();
  });

  // 14. Verify dynamic instruction counts
  it('14. should calculate dynamic instruction counts before and after optimization', () => {
    const code = `
      int main() {
        int a = 10 * 2;
        int b = a + 5;
        int unused = 777;
        print(b);
      }
    `;
    const res = engine.compileAndOptimize(code, ['constant-folding', 'dce']);
    expect(res.success).toBe(true);
    expect(res.instructionCountBefore).toBeGreaterThan(res.instructionCountAfter);
    expect(res.reductionCount).toBe(res.instructionCountBefore - res.instructionCountAfter);
    expect(res.reductionPercentage).toBeGreaterThan(0);
  });

  // 15. Confirm that resetting restores the original representation
  it('15. should restore original unoptimized TAC representation when targetStepIndex is 0', () => {
    const code = `
      int main() {
        int x = 10 * 2;
        return x;
      }
    `;
    const fullOptimized = engine.compileAndOptimize(code, ['constant-folding', 'dce']);
    expect(fullOptimized.instructionCountAfter).toBeLessThan(fullOptimized.instructionCountBefore);
    const resetToRaw = engine.compileAndOptimize(code, ['constant-folding', 'dce'], undefined, 0);

    expect(resetToRaw.currentStepIndex).toBe(0);
    expect(resetToRaw.optimizedTAC.length).toBe(resetToRaw.rawTAC.length);
    expect(resetToRaw.instructionCountAfter).toBe(resetToRaw.instructionCountBefore);
    expect(resetToRaw.reductionCount).toBe(0);
  });

  // 16. Confirm that changing programs does not retain stale graphs, errors, counts, or optimization history
  it('16. should completely recompute state without retaining stale data across program runs', () => {
    const errorProg = 'int x = +;';
    const validProg = 'int main() { int valid = 5; return valid; }';

    const errRes = engine.compileAndOptimize(errorProg);
    expect(errRes.success).toBe(false);
    expect(errRes.rawTAC.length).toBe(0);

    const validRes = engine.compileAndOptimize(validProg);
    expect(validRes.success).toBe(true);
    expect(validRes.error).toBeUndefined();
    expect(validRes.rawTAC.length).toBeGreaterThan(0);
    expect(validRes.basicBlocks.length).toBeGreaterThan(0);
  });

  // 17. Semantic verification using TAC Interpreter
  it('17. should verify semantic equivalence of outputs before and after optimization', () => {
    const code = `
      int main() {
        int a = 10;
        int b = 20;
        int x = 10 * 2 + 5;
        int y = x + x;
        print(y);
        return y;
      }
    `;
    const res = engine.compileAndOptimize(code, ['constant-folding', 'cse', 'dce']);
    expect(res.success).toBe(true);
    expect(res.semanticVerification.executed).toBe(true);
    expect(res.semanticVerification.verified).toBe(true);
    expect(res.semanticVerification.originalOutput).toEqual(['50']);
    expect(res.semanticVerification.optimizedOutput).toEqual(['50']);
    expect(res.semanticVerification.originalReturn).toBe(50);
    expect(res.semanticVerification.optimizedReturn).toBe(50);
  });
});
