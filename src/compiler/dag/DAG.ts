import { TACInstruction } from '../tacGenerator/TAC';

export interface DAGNode {
  id: string;
  label: string;
  type: 'OPERATOR' | 'OPERAND' | 'ASSIGNMENT';
  operands: string[]; // child node IDs
  variables: string[]; // identifiers currently attached to this node
}

export interface DAGEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DAGGraph {
  nodes: DAGNode[];
  edges: DAGEdge[];
  blockId?: string;
}

export class DAGBuilder {
  public static buildForBlock(instructions: TACInstruction[], blockId?: string): DAGGraph {
    const nodes: DAGNode[] = [];
    const edges: DAGEdge[] = [];
    const nodeMap = new Map<string, DAGNode>();

    // Maps variable name or literal constant to the DAGNode ID that holds its current value
    const varToNode = new Map<string, string>();

    let nextNodeId = 1;

    const getNodeOrAddLeaf = (val: string): string => {
      if (varToNode.has(val)) {
        return varToNode.get(val)!;
      }
      // Create leaf node for constant or initial variable value
      const id = `node_${nextNodeId++}`;
      const node: DAGNode = {
        id,
        label: val,
        type: 'OPERAND',
        operands: [],
        variables: isNaN(Number(val)) ? [val] : []
      };
      nodes.push(node);
      nodeMap.set(id, node);
      varToNode.set(val, id);
      return id;
    };

    for (const inst of instructions) {
      if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'BITAND', 'BITOR', 'BITXOR', 'EQ', 'NEQ', 'LT', 'LE', 'GT', 'GE'].includes(inst.op)) {
        if (!inst.arg1 || !inst.arg2 || !inst.result) continue;

        const leftId = getNodeOrAddLeaf(inst.arg1);
        const rightId = getNodeOrAddLeaf(inst.arg2);
        const opSym = getOpSymbol(inst.op);

        // Check if matching DAG node already exists (Common Subexpression Elimination within DAG)
        const isCommutative = ['+', '*', '&', '|', '^', '==', '!='].includes(opSym);
        let foundNode: DAGNode | undefined = nodes.find(
          n => n.type === 'OPERATOR' && n.label === opSym && n.operands.length === 2 && (
            (n.operands[0] === leftId && n.operands[1] === rightId) ||
            (isCommutative && n.operands[0] === rightId && n.operands[1] === leftId)
          )
        );

        if (!foundNode) {
          const id = `node_${nextNodeId++}`;
          foundNode = {
            id,
            label: opSym,
            type: 'OPERATOR',
            operands: [leftId, rightId],
            variables: []
          };
          nodes.push(foundNode);
          nodeMap.set(id, foundNode);
          edges.push({ from: id, to: leftId, label: 'L' });
          edges.push({ from: id, to: rightId, label: 'R' });
        }

        // Attach result variable to foundNode
        // First remove result variable from old node if it was attached
        for (const n of nodes) {
          n.variables = n.variables.filter(v => v !== inst.result);
        }
        foundNode.variables.push(inst.result);
        varToNode.set(inst.result, foundNode.id);
      } else if (inst.op === 'ASSIGN') {
        if (!inst.arg1 || !inst.result) continue;
        const sourceId = getNodeOrAddLeaf(inst.arg1);
        const sourceNode = nodeMap.get(sourceId);
        if (sourceNode) {
          for (const n of nodes) {
            n.variables = n.variables.filter(v => v !== inst.result);
          }
          sourceNode.variables.push(inst.result);
          varToNode.set(inst.result, sourceNode.id);
        }
      } else if (inst.op === 'NEG') {
        if (!inst.arg1 || !inst.result) continue;
        const argId = getNodeOrAddLeaf(inst.arg1);
        let foundNode = nodes.find(n => n.type === 'OPERATOR' && n.label === '-' && n.operands.length === 1 && n.operands[0] === argId);
        if (!foundNode) {
          const id = `node_${nextNodeId++}`;
          foundNode = {
            id,
            label: '-',
            type: 'OPERATOR',
            operands: [argId],
            variables: []
          };
          nodes.push(foundNode);
          nodeMap.set(id, foundNode);
          edges.push({ from: id, to: argId, label: 'arg' });
        }
        for (const n of nodes) {
          n.variables = n.variables.filter(v => v !== inst.result);
        }
        foundNode.variables.push(inst.result);
        varToNode.set(inst.result, foundNode.id);
      }
    }

    return { nodes, edges, blockId };
  }
}

function getOpSymbol(op: string): string {
  switch (op) {
    case 'ADD': return '+';
    case 'SUB': return '-';
    case 'MUL': return '*';
    case 'DIV': return '/';
    case 'MOD': return '%';
    case 'SHL': return '<<';
    case 'SHR': return '>>';
    case 'BITAND': return '&';
    case 'BITOR': return '|';
    case 'BITXOR': return '^';
    case 'EQ': return '==';
    case 'NEQ': return '!=';
    case 'LT': return '<';
    case 'LE': return '<=';
    case 'GT': return '>';
    case 'GE': return '>=';
    default: return op;
  }
}
