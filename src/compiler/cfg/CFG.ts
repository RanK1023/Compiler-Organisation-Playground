import { BasicBlock } from '../basicBlocks/BasicBlock';

export interface CFGEdge {
  id: string;
  from: string;
  to: string;
  label?: 'True' | 'False' | 'Fallthrough' | 'Jump' | 'BackEdge';
  isBackEdge?: boolean;
}

export interface CFGGraph {
  blocks: BasicBlock[];
  edges: CFGEdge[];
}

export class CFGBuilder {
  public static build(blocks: BasicBlock[]): CFGGraph {
    if (blocks.length === 0) {
      return { blocks: [], edges: [] };
    }

    // Clone blocks to compute predecessors and successors cleanly
    const blockMap = new Map<string, BasicBlock>();
    const labelToBlock = new Map<string, string>();

    for (const b of blocks) {
      const copy: BasicBlock = {
        ...b,
        instructions: [...b.instructions],
        predecessors: [],
        successors: []
      };
      blockMap.set(b.id, copy);

      // Check if block starts with a label or contains labels
      for (const inst of b.instructions) {
        if (inst.op === 'LABEL' && inst.label) {
          labelToBlock.set(inst.label, b.id);
        }
      }
    }

    const edges: CFGEdge[] = [];
    const blockList = Array.from(blockMap.values());

    for (let i = 0; i < blockList.length; i++) {
      const curr = blockList[i];
      const lastInst = curr.instructions[curr.instructions.length - 1];

      if (!lastInst) continue;

      if (lastInst.op === 'RETURN') {
        // No successors
        continue;
      }

      if (lastInst.op === 'JUMP') {
        if (lastInst.label && labelToBlock.has(lastInst.label)) {
          const targetBlockId = labelToBlock.get(lastInst.label)!;
          const isBackEdge = blockMap.get(targetBlockId)!.index <= curr.index;
          edges.push({
            id: `e_${curr.id}_${targetBlockId}`,
            from: curr.id,
            to: targetBlockId,
            label: isBackEdge ? 'BackEdge' : 'Jump',
            isBackEdge
          });
          curr.successors.push(targetBlockId);
          blockMap.get(targetBlockId)!.predecessors.push(curr.id);
        }
        continue;
      }

      if (lastInst.op === 'IF_TRUE' || lastInst.op === 'IF_FALSE') {
        // Target branch
        if (lastInst.label && labelToBlock.has(lastInst.label)) {
          const targetBlockId = labelToBlock.get(lastInst.label)!;
          const isBackEdge = blockMap.get(targetBlockId)!.index <= curr.index;
          const branchLabel = lastInst.op === 'IF_TRUE' ? 'True' : 'False';
          edges.push({
            id: `e_${curr.id}_${targetBlockId}_cond`,
            from: curr.id,
            to: targetBlockId,
            label: branchLabel,
            isBackEdge
          });
          curr.successors.push(targetBlockId);
          blockMap.get(targetBlockId)!.predecessors.push(curr.id);
        }

        // Fallthrough branch to next block (i + 1)
        if (i + 1 < blockList.length) {
          const nextBlock = blockList[i + 1];
          const fallthroughLabel = lastInst.op === 'IF_TRUE' ? 'False' : 'True';
          edges.push({
            id: `e_${curr.id}_${nextBlock.id}_fall`,
            from: curr.id,
            to: nextBlock.id,
            label: fallthroughLabel,
            isBackEdge: false
          });
          curr.successors.push(nextBlock.id);
          nextBlock.predecessors.push(curr.id);
        }
        continue;
      }

      // Default: Fallthrough to next block
      if (i + 1 < blockList.length) {
        const nextBlock = blockList[i + 1];
        edges.push({
          id: `e_${curr.id}_${nextBlock.id}`,
          from: curr.id,
          to: nextBlock.id,
          label: 'Fallthrough',
          isBackEdge: false
        });
        curr.successors.push(nextBlock.id);
        nextBlock.predecessors.push(curr.id);
      }
    }

    return { blocks: blockList, edges };
  }
}
