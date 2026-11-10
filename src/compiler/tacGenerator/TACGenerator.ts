import { ASTNode, ProgramNode } from '../parser/AST';
import { TACInstruction, TACOp } from './TAC';

export class TACGenerator {
  private instructions: TACInstruction[] = [];
  private tempCounter: number = 1;
  private labelCounter: number = 1;
  private instructionId: number = 1;
  private userVars: Set<string> = new Set();

  public generate(ast: ProgramNode): TACInstruction[] {
    this.instructions = [];
    this.tempCounter = 1;
    this.labelCounter = 1;
    this.instructionId = 1;
    this.userVars = new Set();
    this.collectIdentifiers(ast);

    for (const node of ast.body) {
      this.generateNode(node);
    }

    return this.instructions;
  }

  private collectIdentifiers(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier' && typeof node.name === 'string') {
      this.userVars.add(node.name);
    }
    if (node.type === 'VarDecl' && typeof node.name === 'string') {
      this.userVars.add(node.name);
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) this.collectIdentifiers(item);
      } else if (typeof child === 'object') {
        this.collectIdentifiers(child);
      }
    }
  }

  private newTemp(): string {
    let name = `t${this.tempCounter++}`;
    while (this.userVars.has(name)) {
      name = `t${this.tempCounter++}`;
    }
    return name;
  }

  private newLabel(prefix: string = 'L'): string {
    return `${prefix}${this.labelCounter++}`;
  }

  private emit(op: TACOp, result?: string, arg1?: string, arg2?: string, label?: string): TACInstruction {
    const inst: TACInstruction = {
      id: this.instructionId++,
      op,
      result,
      arg1,
      arg2,
      label
    };
    this.instructions.push(inst);
    return inst;
  }

  private generateNode(node: ASTNode): string | undefined {
    switch (node.type) {
      case 'FunctionDecl': {
        for (const stmt of node.body) {
          this.generateNode(stmt);
        }
        return undefined;
      }

      case 'VarDecl': {
        if (node.init) {
          const val = this.generateExpr(node.init);
          this.emit('ASSIGN', node.name, val);
        }
        return undefined;
      }

      case 'Assign': {
        const val = this.generateExpr(node.value);
        this.emit('ASSIGN', node.name, val);
        return undefined;
      }

      case 'Print': {
        const val = this.generateExpr(node.expression);
        this.emit('PRINT', undefined, val);
        return undefined;
      }

      case 'Return': {
        const val = node.expression ? this.generateExpr(node.expression) : undefined;
        this.emit('RETURN', undefined, val);
        return undefined;
      }

      case 'If': {
        const lElse = this.newLabel('L_else');
        const lEnd = this.newLabel('L_endif');

        const condVal = this.generateExpr(node.condition);

        if (node.elseBranch && node.elseBranch.length > 0) {
          this.emit('IF_FALSE', undefined, condVal, undefined, lElse);
          // Then block
          for (const stmt of node.thenBranch) {
            this.generateNode(stmt);
          }
          this.emit('JUMP', undefined, undefined, undefined, lEnd);
          this.emit('LABEL', undefined, undefined, undefined, lElse);
          for (const stmt of node.elseBranch) {
            this.generateNode(stmt);
          }
          this.emit('LABEL', undefined, undefined, undefined, lEnd);
        } else {
          this.emit('IF_FALSE', undefined, condVal, undefined, lEnd);
          for (const stmt of node.thenBranch) {
            this.generateNode(stmt);
          }
          this.emit('LABEL', undefined, undefined, undefined, lEnd);
        }
        return undefined;
      }

      case 'While': {
        const lStart = this.newLabel('L_while_start');
        const lBody = this.newLabel('L_while_body');
        const lEnd = this.newLabel('L_while_end');

        this.emit('LABEL', undefined, undefined, undefined, lStart);
        const condVal = this.generateExpr(node.condition);
        this.emit('IF_FALSE', undefined, condVal, undefined, lEnd);

        this.emit('LABEL', undefined, undefined, undefined, lBody);
        for (const stmt of node.body) {
          this.generateNode(stmt);
        }
        this.emit('JUMP', undefined, undefined, undefined, lStart);
        this.emit('LABEL', undefined, undefined, undefined, lEnd);
        return undefined;
      }

      case 'For': {
        const lStart = this.newLabel('L_for_start');
        const lBody = this.newLabel('L_for_body');
        const lEnd = this.newLabel('L_for_end');

        if (node.init) {
          this.generateNode(node.init);
        }

        this.emit('LABEL', undefined, undefined, undefined, lStart);

        if (node.condition) {
          const condVal = this.generateExpr(node.condition);
          this.emit('IF_FALSE', undefined, condVal, undefined, lEnd);
        }

        this.emit('LABEL', undefined, undefined, undefined, lBody);
        for (const stmt of node.body) {
          this.generateNode(stmt);
        }

        if (node.update) {
          this.generateNode(node.update);
        }

        this.emit('JUMP', undefined, undefined, undefined, lStart);
        this.emit('LABEL', undefined, undefined, undefined, lEnd);
        return undefined;
      }

      default:
        return this.generateExpr(node);
    }
  }

  private generateExpr(node: ASTNode): string {
    switch (node.type) {
      case 'NumberLiteral':
        return node.value.toString();

      case 'StringLiteral':
        return `"${node.value}"`;

      case 'Identifier':
        return node.name;

      case 'UnaryOp': {
        const arg = this.generateExpr(node.operand);
        if (node.operator === '-') {
          const t = this.newTemp();
          this.emit('NEG', t, arg);
          return t;
        }
        if (node.operator === '+') {
          return arg;
        }
        throw new Error(`Unsupported unary operator: ${node.operator}`);
      }

      case 'BinaryOp': {
        const left = this.generateExpr(node.left);
        const right = this.generateExpr(node.right);
        const t = this.newTemp();
        const op = this.mapBinaryOp(node.operator);
        this.emit(op, t, left, right);
        return t;
      }

      default:
        throw new Error(`Unexpected expression node type: ${(node as any).type}`);
    }
  }

  private mapBinaryOp(op: string): TACOp {
    switch (op) {
      case '+': return 'ADD';
      case '-': return 'SUB';
      case '*': return 'MUL';
      case '/': return 'DIV';
      case '%': return 'MOD';
      case '<<': return 'SHL';
      case '>>': return 'SHR';
      case '&': return 'BITAND';
      case '|': return 'BITOR';
      case '^': return 'BITXOR';
      case '==': return 'EQ';
      case '!=': return 'NEQ';
      case '<': return 'LT';
      case '<=': return 'LE';
      case '>': return 'GT';
      case '>=': return 'GE';
      default:
        throw new Error(`Unsupported binary operator: ${op}`);
    }
  }
}
