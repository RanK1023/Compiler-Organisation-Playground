import { describe, it, expect } from 'vitest';
import { Lexer } from '../compiler/lexer/Lexer';
import { Parser } from '../compiler/parser/Parser';
import { TACGenerator } from '../compiler/tacGenerator/TACGenerator';
import { CompilerEngine } from '../compiler/CompilerEngine';

describe('Compiler Engine Test Suite', () => {
  // Test 1: Lexing and operator precedence in Parser
  it('1. should correctly parse arithmetic expressions with operator precedence', () => {
    const code = 'int x = 2 + 3 * 4;';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    expect(tokens.length).toBeGreaterThan(0);

    const parser = new Parser(tokens);
    const ast = parser.parse();
    expect(ast.body.length).toBe(1);

    const decl = ast.body[0] as any;
    expect(decl.type).toBe('VarDecl');
    expect(decl.init.type).toBe('BinaryOp');
    expect(decl.init.operator).toBe('+');
    expect(decl.init.right.operator).toBe('*'); // Multiplication has higher precedence
  });

  // Test 2: TAC Generation
  it('2. should generate correct Three-Address Code with temporaries', () => {
    const code = 'int x = a * b + c;';
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());
    const tacGen = new TACGenerator();
    const tac = tacGen.generate(parser.parse());

    expect(tac.length).toBe(3);
    expect(tac[0].op).toBe('MUL');
    expect(tac[1].op).toBe('ADD');
    expect(tac[2].op).toBe('ASSIGN');
    expect(tac[2].result).toBe('x');
  });

  // Test 3: Constant Folding
  it('3. should perform compile-time constant folding and forward propagation', () => {
    const code = 'int a = 10 * 2; int b = a + 5;';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, ['constant-folding']);

    expect(result.success).toBe(true);
    // 10 * 2 should fold to 20, then b = 20 + 5 should fold to 25
    const bAssign = result.optimizedTAC.find(i => i.result === 'b');
    expect(bAssign).toBeDefined();
    expect(bAssign?.op).toBe('ASSIGN');
    expect(bAssign?.arg1).toBe('25');
  });

  // Test 4: Common Subexpression Elimination
  it('4. should eliminate common subexpressions with identical unmutated operands', () => {
    const code = 'int x = a * b; int y = a * b;';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, ['cse']);

    expect(result.success).toBe(true);
    const passResult = result.optimizationSteps.find(s => s.passId === 'cse');
    expect(passResult).toBeDefined();
    expect(passResult?.changes.length).toBeGreaterThan(0);
  });

  // Test 5: CSE Invalidated by variable reassignment
  it('5. should invalidate common subexpressions when an operand is reassigned', () => {
    const code = 'int x = a * b; a = 10; int y = a * b;';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, ['cse']);

    expect(result.success).toBe(true);
    // The second a * b must NOT be eliminated because a was modified
    const mulInsts = result.optimizedTAC.filter(i => i.op === 'MUL');
    expect(mulInsts.length).toBe(2);
  });

  // Test 6: Dead Code Elimination
  it('6. should eliminate unused variable assignments', () => {
    const code = 'int unused = 42; int used = 10; print(used);';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, ['dce']);

    expect(result.success).toBe(true);
    const unusedFound = result.optimizedTAC.some(i => i.result === 'unused');
    expect(unusedFound).toBe(false);
    const usedFound = result.optimizedTAC.some(i => i.result === 'used');
    expect(usedFound).toBe(true);
  });

  // Test 7: Side-effect preservation in DCE
  it('7. should preserve print statements and return statements during DCE', () => {
    const code = 'int x = 5; print(x); return x;';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, ['dce']);

    expect(result.success).toBe(true);
    expect(result.optimizedTAC.some(i => i.op === 'PRINT')).toBe(true);
    expect(result.optimizedTAC.some(i => i.op === 'RETURN')).toBe(true);
  });

  // Test 8: Strength Reduction
  it('8. should convert multiplication by power of two into left shift', () => {
    const code = 'int a = n * 8;';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, ['strength-reduction']);

    expect(result.success).toBe(true);
    const shlInst = result.optimizedTAC.find(i => i.op === 'SHL');
    expect(shlInst).toBeDefined();
    expect(shlInst?.arg2).toBe('3'); // 2^3 = 8
  });

  // Test 9: Loop Invariant Code Motion
  it('9. should hoist loop-invariant computations out of while loop', () => {
    const code = `
      int i = 0;
      int base = 10;
      int rate = 2;
      while (i < 5) {
          int k = base * rate;
          i = i + 1;
      }
    `;
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, ['licm']);

    expect(result.success).toBe(true);
    const licmStep = result.optimizationSteps.find(s => s.passId === 'licm');
    expect(licmStep).toBeDefined();
    expect(licmStep?.changes.length).toBeGreaterThan(0);
  });

  // Test 10: Basic Block Leader Identification
  it('10. should correctly partition TAC instructions into Basic Blocks', () => {
    const code = `
      int x = 5;
      if (x > 0) {
          x = x + 1;
      } else {
          x = x - 1;
      }
    `;
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, []);

    expect(result.success).toBe(true);
    expect(result.basicBlocks.length).toBeGreaterThan(1);
    expect(result.cfg.edges.length).toBeGreaterThan(0);
  });

  // Test 11: Control Flow Graph Edges
  it('11. should detect True and False conditional edges and back-edges in CFG', () => {
    const code = `
      int i = 0;
      while (i < 3) {
          i = i + 1;
      }
    `;
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, []);

    expect(result.success).toBe(true);
    const backEdge = result.cfg.edges.find(e => e.isBackEdge === true);
    expect(backEdge).toBeDefined();
  });

  // Test 12: DAG construction
  it('12. should construct DAG with expression sharing for repeated subexpressions', () => {
    const code = 'int x = a * b + a * b;';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code, []);

    expect(result.success).toBe(true);
    expect(result.dag.nodes.length).toBeGreaterThan(0);
    // Check that operator node for * exists
    const mulNode = result.dag.nodes.find(n => n.label === '*');
    expect(mulNode).toBeDefined();
  });

  // Test 13: Error handling for invalid syntax
  it('13. should handle syntax errors gracefully with meaningful error messages', () => {
    const code = 'int x = + * 5;';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Parse Error');
  });

  // Test 14: Empty code handling
  it('14. should handle empty code without crashing', () => {
    const code = '   ';
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Source code is empty');
  });

  // Test 15: Full optimization pipeline reduction metric
  it('15. should calculate instruction reduction count and percentage', () => {
    const code = `
      int a = 10 * 2;
      int b = a + 5;
      int unused = 999;
      print(b);
    `;
    const engine = new CompilerEngine();
    const result = engine.compileAndOptimize(code);

    expect(result.success).toBe(true);
    expect(result.instructionCountBefore).toBeGreaterThan(result.instructionCountAfter);
    expect(result.reductionCount).toBeGreaterThan(0);
    expect(result.reductionPercentage).toBeGreaterThan(0);
  });
});
