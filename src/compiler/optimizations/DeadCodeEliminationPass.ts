import { TACInstruction, formatTACInstruction } from '../tacGenerator/TAC';
import { OptimizationPass, OptimizationResult } from './OptimizationPass';

export class DeadCodeEliminationPass implements OptimizationPass {
  public readonly id = 'dce';
  public readonly name = 'Dead Code Elimination (DCE)';
  public readonly description = 'Eliminates assignments to variables or temporaries that are never read/used subsequently and produce no observable side effects.';

  public run(instructions: TACInstruction[]): OptimizationResult {
    let transformed = false;
    const changes: string[] = [];
    let current = instructions.map(i => ({ ...i }));

    // Run iterative backward liveness analysis to eliminate chains of dead code (e.g. t1 = 5; t2 = t1 + 2; unused)
    let iterate = true;
    while (iterate) {
      iterate = false;

      // Collect all variables used in instructions
      const usedVars = new Set<string>();

      // Side-effecting operations unconditionally mark their operands as live
      for (const inst of current) {
        if (inst.op === 'PRINT') {
          if (inst.arg1 && isNaN(Number(inst.arg1))) usedVars.add(inst.arg1);
        } else if (inst.op === 'RETURN') {
          if (inst.arg1 && isNaN(Number(inst.arg1))) usedVars.add(inst.arg1);
        } else if (inst.op === 'IF_TRUE' || inst.op === 'IF_FALSE') {
          if (inst.arg1 && isNaN(Number(inst.arg1))) usedVars.add(inst.arg1);
        }
      }

      // Backward scan for usage
      // Any variable read in an instruction that is KEPT becomes used
      const neededInstructions: boolean[] = new Array(current.length).fill(true);

      // We determine which instructions are critical or whose results are read downstream
      const liveAtCurrent = new Set<string>(usedVars);

      for (let i = current.length - 1; i >= 0; i--) {
        const inst = current[i];

        // Critical instructions cannot be eliminated: PRINT, RETURN, JUMP, IF_TRUE, IF_FALSE, LABEL
        if (['PRINT', 'RETURN', 'JUMP', 'IF_TRUE', 'IF_FALSE', 'LABEL'].includes(inst.op)) {
          neededInstructions[i] = true;
          if (inst.arg1 && isNaN(Number(inst.arg1))) liveAtCurrent.add(inst.arg1);
          if (inst.arg2 && isNaN(Number(inst.arg2))) liveAtCurrent.add(inst.arg2);
          continue;
        }

        // Assignment or computation
        if (inst.result) {
          // If result is NOT in live set, it is dead
          if (!liveAtCurrent.has(inst.result)) {
            neededInstructions[i] = false;
            changes.push(`Removed dead instruction: "${formatTACInstruction(inst)}" (result '${inst.result}' is never read)`);
            transformed = true;
            iterate = true;
            continue;
          }

          // If it IS needed, the result is defined here, so remove it from liveAtCurrent (def kills liveness before this point)
          liveAtCurrent.delete(inst.result);

          // And add operands to liveAtCurrent (uses generate liveness)
          if (inst.arg1 && isNaN(Number(inst.arg1))) liveAtCurrent.add(inst.arg1);
          if (inst.arg2 && isNaN(Number(inst.arg2))) liveAtCurrent.add(inst.arg2);
        }
      }

      current = current.filter((_, idx) => neededInstructions[idx]);
    }

    return {
      instructions: current,
      transformed,
      explanation: transformed
        ? `Eliminated ${changes.length} dead or unreachable instructions.`
        : 'No dead code or unused assignments detected; all computations contribute to observable outputs or live state.',
      changes
    };
  }
}
