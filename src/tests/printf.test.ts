import { describe, it, expect } from 'vitest';
import { CompilerEngine } from '../compiler/CompilerEngine';

describe('Printf and String Literal Support', () => {
  it('should compile and optimize code with printf and string literals without error', () => {
    const code = `
      int main() {
          printf("hello world");
          return 0;
      }
    `;
    const engine = new CompilerEngine();
    const res = engine.compileAndOptimize(code);

    expect(res.success).toBe(true);
    expect(res.rawTAC.some(i => i.op === 'PRINT' && i.arg1 === '"hello world"')).toBe(true);
    expect(res.rawTAC.some(i => i.op === 'RETURN' && i.arg1 === '0')).toBe(true);
  });
});
