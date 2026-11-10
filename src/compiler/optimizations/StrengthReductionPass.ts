import { TACInstruction, formatTACInstruction } from '../tacGenerator/TAC';
import { OptimizationPass, OptimizationResult } from './OptimizationPass';

export class StrengthReductionPass implements OptimizationPass {
  public readonly id = 'strength-reduction';
  public readonly name = 'Strength Reduction';
  public readonly description = 'Replaces computationally expensive operations (e.g. integer multiplication or division by power of two) with cheaper bitwise shifts or additions.';

  public run(instructions: TACInstruction[]): OptimizationResult {
    let transformed = false;
    const changes: string[] = [];
    const current = instructions.map(i => ({ ...i }));

    const isPowerOfTwo = (n: number): boolean => {
      return n > 0 && (n & (n - 1)) === 0;
    };

    const log2Exact = (n: number): number => {
      return Math.round(Math.log2(n));
    };

    for (let i = 0; i < current.length; i++) {
      const inst = current[i];

      if (inst.op === 'MUL' && inst.arg1 && inst.arg2 && inst.result) {
        const num1 = !isNaN(Number(inst.arg1)) ? Number(inst.arg1) : null;
        const num2 = !isNaN(Number(inst.arg2)) ? Number(inst.arg2) : null;

        // Multiply by 0: x * 0 = 0
        if (num2 === 0 || num1 === 0) {
          const oldStr = formatTACInstruction(inst);
          inst.op = 'ASSIGN';
          inst.arg1 = '0';
          inst.arg2 = undefined;
          changes.push(`Strength reduced multiplication by 0: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }

        // Multiply by 1: x * 1 = x
        if (num2 === 1) {
          const oldStr = formatTACInstruction(inst);
          inst.op = 'ASSIGN';
          inst.arg2 = undefined;
          changes.push(`Strength reduced identity multiplication: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }
        if (num1 === 1) {
          const oldStr = formatTACInstruction(inst);
          inst.op = 'ASSIGN';
          inst.arg1 = inst.arg2;
          inst.arg2 = undefined;
          changes.push(`Strength reduced identity multiplication: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }

        // Multiply by power of 2: x * 2^k -> x << k
        if (num2 !== null && isPowerOfTwo(num2)) {
          const k = log2Exact(num2);
          const oldStr = formatTACInstruction(inst);
          inst.op = 'SHL';
          inst.arg2 = k.toString();
          changes.push(`Strength reduced power-of-two multiplication: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }

        if (num1 !== null && isPowerOfTwo(num1)) {
          const k = log2Exact(num1);
          const oldStr = formatTACInstruction(inst);
          inst.op = 'SHL';
          inst.arg1 = inst.arg2; // operand is variable
          inst.arg2 = k.toString();
          changes.push(`Strength reduced power-of-two multiplication: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }
      }

      // Division by 1 or power of 2: x / 2^k -> x >> k (for positive integers)
      if (inst.op === 'DIV' && inst.arg1 && inst.arg2 && inst.result) {
        const num2 = !isNaN(Number(inst.arg2)) ? Number(inst.arg2) : null;
        if (num2 === 1) {
          const oldStr = formatTACInstruction(inst);
          inst.op = 'ASSIGN';
          inst.arg2 = undefined;
          changes.push(`Strength reduced division by 1: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }
        if (num2 !== null && isPowerOfTwo(num2)) {
          const k = log2Exact(num2);
          const oldStr = formatTACInstruction(inst);
          inst.op = 'SHR';
          inst.arg2 = k.toString();
          changes.push(`Strength reduced power-of-two division: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }
      }

      // Additive identity: x + 0 = x, 0 + x = x
      if (inst.op === 'ADD' && inst.arg1 && inst.arg2 && inst.result) {
        if (inst.arg2 === '0') {
          const oldStr = formatTACInstruction(inst);
          inst.op = 'ASSIGN';
          inst.arg2 = undefined;
          changes.push(`Strength reduced additive identity: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }
        if (inst.arg1 === '0') {
          const oldStr = formatTACInstruction(inst);
          inst.op = 'ASSIGN';
          inst.arg1 = inst.arg2;
          inst.arg2 = undefined;
          changes.push(`Strength reduced additive identity: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }
      }

      // Subtractive identity: x - 0 = x
      if (inst.op === 'SUB' && inst.arg1 && inst.arg2 && inst.result) {
        if (inst.arg2 === '0') {
          const oldStr = formatTACInstruction(inst);
          inst.op = 'ASSIGN';
          inst.arg2 = undefined;
          changes.push(`Strength reduced subtractive identity: "${oldStr}" -> "${formatTACInstruction(inst)}"`);
          transformed = true;
          continue;
        }
      }
    }

    return {
      instructions: current,
      transformed,
      explanation: transformed
        ? `Applied ${changes.length} strength reduction transformations (multiplication/division replaced by shift/copy).`
        : 'No suitable algebraic simplifications or power-of-two multipliers found for safe strength reduction.',
      changes
    };
  }
}
