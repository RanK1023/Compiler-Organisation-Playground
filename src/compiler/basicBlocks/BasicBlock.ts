import { TACInstruction } from '../tacGenerator/TAC';

export interface BasicBlock {
  id: string; // e.g. "B1", "B2"
  index: number;
  instructions: TACInstruction[];
  predecessors: string[];
  successors: string[];
}

export class BasicBlockBuilder {
  public static build(instructions: TACInstruction[]): BasicBlock[] {
    if (instructions.length === 0) return [];

    // Step 1: Identify leaders
    // Rules:
    // 1. First instruction is a leader.
    // 2. Any target of a jump / branch is a leader (instruction with LABEL or instruction immediately after label).
    // 3. Any instruction immediately following a jump / branch (JUMP, IF_TRUE, IF_FALSE, RETURN) is a leader.
    const isLeader = new Array<boolean>(instructions.length).fill(false);
    isLeader[0] = true;

    // Map labels to instruction indices
    const labelIndices = new Map<string, number>();
    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.op === 'LABEL' && inst.label) {
        labelIndices.set(inst.label, i);
      }
    }

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];

      if (inst.op === 'LABEL') {
        isLeader[i] = true;
      }

      if (['JUMP', 'IF_TRUE', 'IF_FALSE', 'RETURN'].includes(inst.op)) {
        // Target of jump is leader
        if (inst.label && labelIndices.has(inst.label)) {
          const targetIdx = labelIndices.get(inst.label)!;
          isLeader[targetIdx] = true;
        }
        // Next instruction is leader
        if (i + 1 < instructions.length) {
          isLeader[i + 1] = true;
        }
      }
    }

    // Step 2: Partition into basic blocks
    const blocks: BasicBlock[] = [];
    let currentInstructions: TACInstruction[] = [];
    let blockCount = 1;

    for (let i = 0; i < instructions.length; i++) {
      if (isLeader[i] && currentInstructions.length > 0) {
        blocks.push({
          id: `B${blockCount}`,
          index: blockCount,
          instructions: currentInstructions,
          predecessors: [],
          successors: []
        });
        blockCount++;
        currentInstructions = [];
      }
      currentInstructions.push(instructions[i]);
    }

    if (currentInstructions.length > 0) {
      blocks.push({
        id: `B${blockCount}`,
        index: blockCount,
        instructions: currentInstructions,
        predecessors: [],
        successors: []
      });
    }

    return blocks;
  }
}
