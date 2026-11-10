import { TACInstruction, formatTACInstruction } from '../tacGenerator/TAC';
import { OptimizationPass, OptimizationResult } from './OptimizationPass';

export class ConstantFoldingPass implements OptimizationPass {
  public readonly id = 'constant-folding';
  public readonly name = 'Constant Folding & Propagation';
  public readonly description = 'Evaluates compile-time constant arithmetic expressions and propagates constant values to subsequent instructions.';

  public run(instructions: TACInstruction[]): OptimizationResult {
    let transformed = false;
    const changes: string[] = [];

    // Copy instructions
    let current = instructions.map(i => ({ ...i }));
    const constMap = new Map<string, number>();

    const evaluateBinary = (op: string, a: number, b: number): number | null => {
      switch (op) {
        case 'ADD': return a + b;
        case 'SUB': return a - b;
        case 'MUL': return a * b;
        case 'DIV': return b !== 0 ? Math.trunc(a / b) : null;
        case 'MOD': return b !== 0 ? a % b : null;
        case 'SHL': return a << b;
        case 'SHR': return a >> b;
        case 'BITAND': return a & b;
        case 'BITOR': return a | b;
        case 'BITXOR': return a ^ b;
        case 'EQ': return a === b ? 1 : 0;
        case 'NEQ': return a !== b ? 1 : 0;
        case 'LT': return a < b ? 1 : 0;
        case 'LE': return a <= b ? 1 : 0;
        case 'GT': return a > b ? 1 : 0;
        case 'GE': return a >= b ? 1 : 0;
        default: return null;
      }
    };

    const isNumeric = (str?: string): boolean => {
      if (!str) return false;
      return /^-?\d+$/.test(str.trim());
    };

    for (let i = 0; i < current.length; i++) {
      const inst = current[i];

      // If control flow label, clear constant map as control flow merges may invalidate values across blocks
      if (inst.op === 'LABEL' || inst.op === 'JUMP' || inst.op === 'IF_TRUE' || inst.op === 'IF_FALSE') {
        constMap.clear();
        continue;
      }

      // Propagate known constants to arg1 / arg2
      if (inst.arg1 && constMap.has(inst.arg1)) {
        const foldedVal = constMap.get(inst.arg1)!.toString();
        changes.push(`Propagated constant ${inst.arg1} = ${foldedVal} in "${formatTACInstruction(inst)}"`);
        inst.arg1 = foldedVal;
        transformed = true;
      }
      if (inst.arg2 && constMap.has(inst.arg2)) {
        const foldedVal = constMap.get(inst.arg2)!.toString();
        changes.push(`Propagated constant ${inst.arg2} = ${foldedVal} in "${formatTACInstruction(inst)}"`);
        inst.arg2 = foldedVal;
        transformed = true;
      }

      // Check if binary operation can be folded
      if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'BITAND', 'BITOR', 'BITXOR', 'EQ', 'NEQ', 'LT', 'LE', 'GT', 'GE'].includes(inst.op)) {
        if (isNumeric(inst.arg1) && isNumeric(inst.arg2) && inst.result) {
          const val1 = parseInt(inst.arg1!, 10);
          const val2 = parseInt(inst.arg2!, 10);
          const folded = evaluateBinary(inst.op, val1, val2);

          if (folded !== null) {
            const oldStr = formatTACInstruction(inst);
            inst.op = 'ASSIGN';
            inst.arg1 = folded.toString();
            inst.arg2 = undefined;
            constMap.set(inst.result, folded);
            changes.push(`Folded "${oldStr}" -> "${formatTACInstruction(inst)}"`);
            transformed = true;
            continue;
          }
        }
      }

      // Unary negation folding
      if (inst.op === 'NEG' && isNumeric(inst.arg1) && inst.result) {
        const val = parseInt(inst.arg1!, 10);
        const folded = -val;
        const oldStr = formatTACInstruction(inst);
        inst.op = 'ASSIGN';
        inst.arg1 = folded.toString();
        constMap.set(inst.result, folded);
        changes.push(`Folded "${oldStr}" -> "${formatTACInstruction(inst)}"`);
        transformed = true;
        continue;
      }

      // Constant assignment tracking
      if (inst.op === 'ASSIGN' && inst.result) {
        if (isNumeric(inst.arg1)) {
          constMap.set(inst.result, parseInt(inst.arg1!, 10));
        } else {
          constMap.delete(inst.result);
        }
      } else if (inst.result) {
        constMap.delete(inst.result);
      }
    }

    return {
      instructions: current,
      transformed,
      explanation: transformed
        ? `Successfully folded ${changes.length} constant expressions and propagations.`
        : 'No constant sub-expressions available for compile-time folding.',
      changes
    };
  }
}
