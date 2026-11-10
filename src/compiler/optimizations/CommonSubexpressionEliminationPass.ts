import { TACInstruction, formatTACInstruction } from '../tacGenerator/TAC';
import { OptimizationPass, OptimizationResult } from './OptimizationPass';



export class CommonSubexpressionEliminationPass implements OptimizationPass {
  public readonly id = 'cse';
  public readonly name = 'Common Subexpression Elimination (CSE)';
  public readonly description = 'Detects redundant computations within basic blocks and reuses previously computed values when operands remain unchanged.';

  public run(instructions: TACInstruction[]): OptimizationResult {
    let transformed = false;
    const changes: string[] = [];
    const current = instructions.map(i => ({ ...i }));

    // Local CSE within basic blocks
    // Map expr key -> variable name holding the value
    let availableExprs = new Map<string, string>();
    let aliasMap = new Map<string, string>();

    const makeKey = (op: string, arg1: string, arg2: string): string => {
      // Commutative operations can normalize order
      if (['ADD', 'MUL', 'BITAND', 'BITOR', 'BITXOR', 'EQ', 'NEQ'].includes(op)) {
        if (arg1 > arg2) {
          return `${op}:${arg2}:${arg1}`;
        }
      }
      return `${op}:${arg1}:${arg2}`;
    };

    const invalidateVariable = (varName: string) => {
      // Invalidate any expression that depends on varName
      for (const [key] of Array.from(availableExprs.entries())) {
        const parts = key.split(':');
        if (parts[1] === varName || parts[2] === varName) {
          availableExprs.delete(key);
        }
      }
      // Also remove any entries where varName is the holding variable
      for (const [key, heldVar] of Array.from(availableExprs.entries())) {
        if (heldVar === varName) {
          availableExprs.delete(key);
        }
      }
      // Invalidate aliases
      aliasMap.delete(varName);
      for (const [k, v] of Array.from(aliasMap.entries())) {
        if (v === varName) {
          aliasMap.delete(k);
        }
      }
    };

    for (let i = 0; i < current.length; i++) {
      const inst = current[i];

      // End of basic block boundaries (labels or jumps) flush available expressions and aliases
      if (inst.op === 'LABEL' || inst.op === 'JUMP' || inst.op === 'IF_TRUE' || inst.op === 'IF_FALSE' || inst.op === 'RETURN') {
        availableExprs.clear();
        aliasMap.clear();
        continue;
      }

      // Substitute operands if aliased to an earlier common subexpression result
      if (inst.arg1 && aliasMap.has(inst.arg1)) {
        inst.arg1 = aliasMap.get(inst.arg1)!;
      }
      if (inst.arg2 && aliasMap.has(inst.arg2)) {
        inst.arg2 = aliasMap.get(inst.arg2)!;
      }

      if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'BITAND', 'BITOR', 'BITXOR', 'EQ', 'NEQ', 'LT', 'LE', 'GT', 'GE'].includes(inst.op)) {
        if (inst.arg1 && inst.arg2 && inst.result) {
          const key = makeKey(inst.op, inst.arg1, inst.arg2);

          if (availableExprs.has(key)) {
            const existingVar = availableExprs.get(key)!;
            const oldStr = formatTACInstruction(inst);
            // Replace with copy from existingVar
            inst.op = 'ASSIGN';
            inst.arg1 = existingVar;
            inst.arg2 = undefined;
            aliasMap.set(inst.result, existingVar);
            changes.push(`Eliminated common subexpression: "${oldStr}" replaced with "${formatTACInstruction(inst)}" (reusing ${existingVar})`);
            transformed = true;
          } else {
            // First time seeing this expression
            availableExprs.set(key, inst.result);
          }

          // If the result variable is reassigned, invalidate other expressions using this result variable
          // (except the one just recorded)
          for (const [k, heldVar] of Array.from(availableExprs.entries())) {
            if (k !== key && heldVar === inst.result) {
              availableExprs.delete(k);
            }
            const parts = k.split(':');
            if (k !== key && (parts[1] === inst.result || parts[2] === inst.result)) {
              availableExprs.delete(k);
            }
          }
          continue;
        }
      }

      // If instruction writes to result, invalidate expressions using result
      if (inst.result) {
        invalidateVariable(inst.result);
      }
    }

    return {
      instructions: current,
      transformed,
      explanation: transformed
        ? `Eliminated ${changes.length} redundant subexpressions across local basic blocks.`
        : 'No redundant common subexpressions found with identical un-invalidated operands.',
      changes
    };
  }
}
