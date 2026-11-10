import { TACInstruction } from '../tacGenerator/TAC';

export interface OptimizationResult {
  instructions: TACInstruction[];
  transformed: boolean;
  explanation: string;
  changes: string[];
}

export interface OptimizationPass {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  run(instructions: TACInstruction[]): OptimizationResult;
}
