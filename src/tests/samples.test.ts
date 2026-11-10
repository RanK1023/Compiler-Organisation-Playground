import { describe, it, expect } from 'vitest';
import { CompilerEngine } from '../compiler/CompilerEngine';
import { SAMPLE_PROGRAMS } from '../samples/samplePrograms';

describe('Sample Programs Evaluation', () => {
  it('should compile and optimize all 6 sample programs without error', () => {
    const engine = new CompilerEngine();
    for (const sample of SAMPLE_PROGRAMS) {
      const res = engine.compileAndOptimize(sample.code);
      if (!res.success) {
        console.error(`Failed on ${sample.title}:`, res.error);
      }
      expect(res.success).toBe(true);
      expect(res.rawTAC.length).toBeGreaterThan(0);
    }
  });
});
