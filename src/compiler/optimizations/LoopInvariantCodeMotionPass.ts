import { TACInstruction, formatTACInstruction } from '../tacGenerator/TAC';
import { OptimizationPass, OptimizationResult } from './OptimizationPass';

interface LoopRegion {
  headerLabel: string;
  headerIndex: number;
  backEdgeJumpIndex: number;
  exitLabel: string;
}

export class LoopInvariantCodeMotionPass implements OptimizationPass {
  public readonly id = 'licm';
  public readonly name = 'Loop-Invariant Code Motion (LICM)';
  public readonly description = 'Identifies loop-invariant computations inside loops whose operands are not modified within the loop body and hoists them to a loop preheader.';

  public run(instructions: TACInstruction[]): OptimizationResult {
    let transformed = false;
    const changes: string[] = [];
    let current = instructions.map(i => ({ ...i }));

    let outerChanged = true;
    let iterationCount = 0;
    while (outerChanged && iterationCount++ < 10) {
      outerChanged = false;

      // Find loop regions: pattern LABEL -> ... -> JUMP back to LABEL
      const loops: LoopRegion[] = [];
      for (let i = 0; i < current.length; i++) {
        const inst = current[i];
        if (inst.op === 'JUMP' && inst.label) {
          // Look back for corresponding LABEL
          for (let j = 0; j < i; j++) {
            if (current[j].op === 'LABEL' && current[j].label === inst.label) {
              let exitLabel = '';
              for (let k = j; k < i; k++) {
                if (current[k].op === 'IF_FALSE' && current[k].label) {
                  exitLabel = current[k].label!;
                  break;
                }
              }
              loops.push({
                headerLabel: inst.label,
                headerIndex: j,
                backEdgeJumpIndex: i,
                exitLabel
              });
              break;
            }
          }
        }
      }

      // Process loops
      for (const loop of loops) {
        const loopStart = loop.headerIndex;
        const loopEnd = loop.backEdgeJumpIndex;

        // Collect all variables defined (assigned/modified) inside the loop
        const definedInLoop = new Set<string>();
        for (let k = loopStart; k <= loopEnd; k++) {
          const inst = current[k];
          if (inst.result) {
            definedInLoop.add(inst.result);
          }
        }

        const invariantIndices: number[] = [];
        const hoistedDefs = new Set<string>();

        for (let k = loopStart + 1; k < loopEnd; k++) {
          const inst = current[k];

          // Skip labels and branches
          if (['LABEL', 'JUMP', 'IF_TRUE', 'IF_FALSE', 'PRINT', 'RETURN'].includes(inst.op)) {
            continue;
          }

          if (inst.result && inst.arg1) {
            const isArg1Invariant = isNaN(Number(inst.arg1))
              ? (!definedInLoop.has(inst.arg1) || hoistedDefs.has(inst.arg1))
              : true;

            const isArg2Invariant = inst.arg2
              ? (isNaN(Number(inst.arg2))
                  ? (!definedInLoop.has(inst.arg2) || hoistedDefs.has(inst.arg2))
                  : true)
              : true;

            if (isArg1Invariant && isArg2Invariant) {
              let assignCount = 0;
              for (let m = loopStart; m <= loopEnd; m++) {
                if (current[m].result === inst.result) assignCount++;
              }

              if (assignCount === 1) {
                invariantIndices.push(k);
                hoistedDefs.add(inst.result);
                definedInLoop.delete(inst.result);
              }
            }
          }
        }

        if (invariantIndices.length > 0) {
          const hoistedInsts: TACInstruction[] = [];
          const toRemove = new Set<number>(invariantIndices);

          for (const idx of invariantIndices) {
            hoistedInsts.push(current[idx]);
            changes.push(`Hoisted loop-invariant instruction "${formatTACInstruction(current[idx])}" out of loop ${loop.headerLabel}`);
          }

          const newInsts: TACInstruction[] = [];
          for (let idx = 0; idx < loopStart; idx++) {
            newInsts.push(current[idx]);
          }
          for (const h of hoistedInsts) {
            newInsts.push(h);
          }
          for (let idx = loopStart; idx < current.length; idx++) {
            if (!toRemove.has(idx)) {
              newInsts.push(current[idx]);
            }
          }

          current = newInsts;
          transformed = true;
          outerChanged = true;
          break; // Recompute loop boundaries
        }
      }
    }

    return {
      instructions: current,
      transformed,
      explanation: transformed
        ? `Hoisted ${changes.length} loop-invariant expressions into the loop preheader.`
        : 'No loop-invariant computations found whose dependencies are guaranteed static throughout loop iterations.',
      changes
    };
  }
}
