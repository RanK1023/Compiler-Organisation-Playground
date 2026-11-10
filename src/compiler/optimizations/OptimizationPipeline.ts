import { TACInstruction } from '../tacGenerator/TAC';
import { OptimizationPass, OptimizationResult } from './OptimizationPass';
import { ConstantFoldingPass } from './ConstantFoldingPass';
import { CommonSubexpressionEliminationPass } from './CommonSubexpressionEliminationPass';
import { DeadCodeEliminationPass } from './DeadCodeEliminationPass';
import { StrengthReductionPass } from './StrengthReductionPass';
import { LoopInvariantCodeMotionPass } from './LoopInvariantCodeMotionPass';

export interface OptimizationStep {
  stepIndex: number;
  passId: string;
  passName: string;
  beforeInstructions: TACInstruction[];
  afterInstructions: TACInstruction[];
  changes: string[];
  explanation: string;
  changed: boolean;
}

export class OptimizationPipeline {
  private passes: Map<string, OptimizationPass> = new Map();

  constructor() {
    this.registerPass(new ConstantFoldingPass());
    this.registerPass(new StrengthReductionPass());
    this.registerPass(new CommonSubexpressionEliminationPass());
    this.registerPass(new LoopInvariantCodeMotionPass());
    this.registerPass(new DeadCodeEliminationPass());
  }

  public registerPass(pass: OptimizationPass) {
    this.passes.set(pass.id, pass);
  }

  public getAvailablePasses(): OptimizationPass[] {
    return Array.from(this.passes.values());
  }

  public runSinglePass(passId: string, instructions: TACInstruction[]): OptimizationResult {
    const pass = this.passes.get(passId);
    if (!pass) {
      throw new Error(`Unknown optimization pass: ${passId}`);
    }
    return pass.run(instructions);
  }

  public runPipeline(
    selectedPassIds: string[],
    initialInstructions: TACInstruction[]
  ): {
    finalInstructions: TACInstruction[];
    steps: OptimizationStep[];
  } {
    let current = initialInstructions.map(i => ({ ...i }));
    const steps: OptimizationStep[] = [];
    let stepCount = 1;

    for (const id of selectedPassIds) {
      const pass = this.passes.get(id);
      if (!pass) continue;

      const before = current.map(i => ({ ...i }));
      const result = pass.run(current);

      steps.push({
        stepIndex: stepCount++,
        passId: pass.id,
        passName: pass.name,
        beforeInstructions: before,
        afterInstructions: result.instructions.map(i => ({ ...i })),
        changes: result.changes,
        explanation: result.explanation,
        changed: result.transformed
      });

      if (result.transformed) {
        current = result.instructions;
      }
    }

    return {
      finalInstructions: current,
      steps
    };
  }
}
