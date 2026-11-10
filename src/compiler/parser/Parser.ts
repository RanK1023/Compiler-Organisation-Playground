import { Token } from '../lexer/Lexer';
import {
  ASTNode,
  ProgramNode,
  VarDeclNode,
  IfNode,
  WhileNode,
  ForNode,
  PrintNode,
  ReturnNode
} from './AST';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ProgramNode {
    const body: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const stmt = this.statement();
      if (Array.isArray(stmt)) {
        body.push(...stmt);
      } else {
        body.push(stmt);
      }
    }
    return { type: 'Program', body };
  }

  private statement(): ASTNode | ASTNode[] {
    if (this.matchKeyword('int')) {
      return this.varOrFunctionDeclaration();
    }
    if (this.matchKeyword('if')) {
      return this.ifStatement();
    }
    if (this.matchKeyword('while')) {
      return this.whileStatement();
    }
    if (this.matchKeyword('for')) {
      return this.forStatement();
    }
    if (this.matchKeyword('print') || this.matchKeyword('printf')) {
      return this.printStatement();
    }
    if (this.matchKeyword('return')) {
      return this.returnStatement();
    }

    // Otherwise assignment or expression statement
    return this.assignmentOrExprStatement();
  }

  private varOrFunctionDeclaration(): ASTNode | ASTNode[] {
    // 'int' was matched
    const idToken = this.consume('IDENTIFIER', "Expected identifier after type 'int'");

    // Check if function declaration: int main() { ... }
    if (this.matchDelimiter('(')) {
      const params: string[] = [];
      while (!this.checkDelimiter(')') && !this.isAtEnd()) {
        if (this.matchKeyword('int')) {
          const paramId = this.consume('IDENTIFIER', 'Expected parameter name');
          params.push(paramId.value);
        } else {
          const paramId = this.consume('IDENTIFIER', 'Expected parameter name');
          params.push(paramId.value);
        }
        if (!this.checkDelimiter(')')) {
          this.consumeDelimiter(',', "Expected ',' between parameters");
        }
      }
      this.consumeDelimiter(')', "Expected ')' after parameter list");

      // Function body
      const body = this.blockOrSingleStatement();
      return {
        type: 'FunctionDecl',
        returnType: 'int',
        name: idToken.value,
        params,
        body
      };
    }

    // Otherwise variable declaration(s): int x = ..., y = ...;
    const decls: VarDeclNode[] = [];
    let currentId = idToken.value;

    while (true) {
      let init: ASTNode | undefined = undefined;

      if (this.matchAssign('=')) {
        init = this.expression();
      }

      decls.push({
        type: 'VarDecl',
        varType: 'int',
        name: currentId,
        init
      });

      if (this.matchDelimiter(',')) {
        currentId = this.consume('IDENTIFIER', "Expected identifier after ',' in variable declaration").value;
      } else {
        break;
      }
    }

    this.consumeDelimiter(';', "Expected ';' after variable declaration");
    return decls.length === 1 ? decls[0] : decls;
  }

  private ifStatement(): IfNode {
    this.consumeDelimiter('(', "Expected '(' after 'if'");
    const condition = this.expression();
    this.consumeDelimiter(')', "Expected ')' after condition");

    const thenBranch = this.blockOrSingleStatement();
    let elseBranch: ASTNode[] | undefined = undefined;

    if (this.matchKeyword('else')) {
      elseBranch = this.blockOrSingleStatement();
    }

    return {
      type: 'If',
      condition,
      thenBranch,
      elseBranch
    };
  }

  private whileStatement(): WhileNode {
    this.consumeDelimiter('(', "Expected '(' after 'while'");
    const condition = this.expression();
    this.consumeDelimiter(')', "Expected ')' after condition");
    const body = this.blockOrSingleStatement();

    return {
      type: 'While',
      condition,
      body
    };
  }

  private forStatement(): ForNode {
    this.consumeDelimiter('(', "Expected '(' after 'for'");

    let init: ASTNode | undefined = undefined;
    if (!this.checkDelimiter(';')) {
      if (this.matchKeyword('int')) {
        const decl = this.varOrFunctionDeclaration();
        init = Array.isArray(decl) ? decl[0] : decl;
      } else {
        const idToken = this.consume('IDENTIFIER', 'Expected identifier in for init');
        this.consumeAssign('=', "Expected '=' in for loop init");
        const val = this.expression();
        init = { type: 'Assign', name: idToken.value, value: val };
        this.consumeDelimiter(';', "Expected ';' after for loop init");
      }
    } else {
      this.advance(); // consume ';'
    }

    let condition: ASTNode | undefined = undefined;
    if (!this.checkDelimiter(';')) {
      condition = this.expression();
    }
    this.consumeDelimiter(';', "Expected ';' after for condition");

    let update: ASTNode | undefined = undefined;
    if (!this.checkDelimiter(')')) {
      const idToken = this.consume('IDENTIFIER', 'Expected identifier in for update');
      const next = this.peek();

      if (next.type === 'OPERATOR' && (next.value === '++' || next.value === '--')) {
        const op = this.advance().value;
        update = {
          type: 'Assign',
          name: idToken.value,
          value: {
            type: 'BinaryOp',
            operator: op === '++' ? '+' : '-',
            left: { type: 'Identifier', name: idToken.value },
            right: { type: 'NumberLiteral', value: 1 }
          }
        };
      } else if (next.type === 'OPERATOR' && (next.value === '+=' || next.value === '-=')) {
        const op = this.advance().value;
        const val = this.expression();
        update = {
          type: 'Assign',
          name: idToken.value,
          value: {
            type: 'BinaryOp',
            operator: op === '+=' ? '+' : '-',
            left: { type: 'Identifier', name: idToken.value },
            right: val
          }
        };
      } else {
        this.consumeAssign('=', "Expected '=' or '++' in for loop update");
        const val = this.expression();
        update = { type: 'Assign', name: idToken.value, value: val };
      }
    }
    this.consumeDelimiter(')', "Expected ')' after for clauses");

    const body = this.blockOrSingleStatement();

    return {
      type: 'For',
      init,
      condition,
      update,
      body
    };
  }

  private printStatement(): PrintNode {
    this.consumeDelimiter('(', "Expected '(' after 'print'");
    const expr = this.expression();
    this.consumeDelimiter(')', "Expected ')' after expression in print");
    this.consumeDelimiter(';', "Expected ';' after print statement");
    return { type: 'Print', expression: expr };
  }

  private returnStatement(): ReturnNode {
    let expr: ASTNode | undefined = undefined;
    if (!this.checkDelimiter(';')) {
      expr = this.expression();
    }
    this.consumeDelimiter(';', "Expected ';' after return");
    return { type: 'Return', expression: expr };
  }

  private assignmentOrExprStatement(): ASTNode {
    if (this.peek().type === 'IDENTIFIER') {
      const next = this.peekNext();
      if (next?.type === 'ASSIGN' && next.value === '=') {
        const idToken = this.advance();
        this.advance(); // consume '='
        const val = this.expression();
        this.consumeDelimiter(';', "Expected ';' after assignment");
        return { type: 'Assign', name: idToken.value, value: val };
      }

      if (next?.type === 'OPERATOR') {
        if (next.value === '++' || next.value === '--') {
          const idToken = this.advance();
          const op = this.advance().value;
          this.consumeDelimiter(';', "Expected ';' after statement");
          return {
            type: 'Assign',
            name: idToken.value,
            value: {
              type: 'BinaryOp',
              operator: op === '++' ? '+' : '-',
              left: { type: 'Identifier', name: idToken.value },
              right: { type: 'NumberLiteral', value: 1 }
            }
          };
        }

        if (next.value === '+=' || next.value === '-=') {
          const idToken = this.advance();
          const op = this.advance().value;
          const val = this.expression();
          this.consumeDelimiter(';', "Expected ';' after assignment");
          return {
            type: 'Assign',
            name: idToken.value,
            value: {
              type: 'BinaryOp',
              operator: op === '+=' ? '+' : '-',
              left: { type: 'Identifier', name: idToken.value },
              right: val
            }
          };
        }
      }
    }

    const expr = this.expression();
    this.consumeDelimiter(';', "Expected ';' after expression statement");
    return expr;
  }

  private blockOrSingleStatement(): ASTNode[] {
    if (this.matchDelimiter('{')) {
      const stmts: ASTNode[] = [];
      while (!this.checkDelimiter('}') && !this.isAtEnd()) {
        const stmt = this.statement();
        if (Array.isArray(stmt)) {
          stmts.push(...stmt);
        } else {
          stmts.push(stmt);
        }
      }
      this.consumeDelimiter('}', "Expected '}' at end of block");
      return stmts;
    }
    const stmt = this.statement();
    return Array.isArray(stmt) ? stmt : [stmt];
  }

  // Precedence climbing for expressions
  // Logical OR ||
  private expression(): ASTNode {
    return this.logicalOr();
  }

  private logicalOr(): ASTNode {
    let expr = this.logicalAnd();
    while (this.matchOperator('||')) {
      const op = this.previous().value;
      const right = this.logicalAnd();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private logicalAnd(): ASTNode {
    let expr = this.bitwiseOr();
    while (this.matchOperator('&&')) {
      const op = this.previous().value;
      const right = this.bitwiseOr();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private bitwiseOr(): ASTNode {
    let expr = this.bitwiseXor();
    while (this.matchOperator('|')) {
      const op = this.previous().value;
      const right = this.bitwiseXor();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private bitwiseXor(): ASTNode {
    let expr = this.bitwiseAnd();
    while (this.matchOperator('^')) {
      const op = this.previous().value;
      const right = this.bitwiseAnd();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private bitwiseAnd(): ASTNode {
    let expr = this.equality();
    while (this.matchOperator('&')) {
      const op = this.previous().value;
      const right = this.equality();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private equality(): ASTNode {
    let expr = this.relational();
    while (this.matchOperator('==') || this.matchOperator('!=')) {
      const op = this.previous().value;
      const right = this.relational();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private relational(): ASTNode {
    let expr = this.shift();
    while (
      this.matchOperator('<') ||
      this.matchOperator('<=') ||
      this.matchOperator('>') ||
      this.matchOperator('>=')
    ) {
      const op = this.previous().value;
      const right = this.shift();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private shift(): ASTNode {
    let expr = this.additive();
    while (this.matchOperator('<<') || this.matchOperator('>>')) {
      const op = this.previous().value;
      const right = this.additive();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private additive(): ASTNode {
    let expr = this.multiplicative();
    while (this.matchOperator('+') || this.matchOperator('-')) {
      const op = this.previous().value;
      const right = this.multiplicative();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private multiplicative(): ASTNode {
    let expr = this.unary();
    while (this.matchOperator('*') || this.matchOperator('/') || this.matchOperator('%')) {
      const op = this.previous().value;
      const right = this.unary();
      expr = { type: 'BinaryOp', operator: op, left: expr, right };
    }
    return expr;
  }

  private unary(): ASTNode {
    if (this.matchOperator('-') || this.matchOperator('+')) {
      const op = this.previous().value;
      const operand = this.unary();
      return { type: 'UnaryOp', operator: op, operand };
    }
    return this.primary();
  }

  private primary(): ASTNode {
    if (this.peek().type === 'NUMBER') {
      const val = parseInt(this.advance().value, 10);
      return { type: 'NumberLiteral', value: val };
    }

    if (this.peek().type === 'STRING') {
      const val = this.advance().value;
      return { type: 'StringLiteral', value: val };
    }

    if (this.peek().type === 'IDENTIFIER') {
      const name = this.advance().value;
      return { type: 'Identifier', name };
    }

    if (this.matchDelimiter('(')) {
      const expr = this.expression();
      this.consumeDelimiter(')', "Expected ')' after parenthesized expression");
      return expr;
    }

    const t = this.peek();
    throw new Error(`Parse Error at Line ${t.line}, Col ${t.column}: Unexpected token '${t.value || t.type}'`);
  }

  // Helpers
  private matchKeyword(kw: string): boolean {
    if (this.peek().type === 'KEYWORD' && this.peek().value === kw) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchOperator(op: string): boolean {
    if (this.peek().type === 'OPERATOR' && this.peek().value === op) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchDelimiter(delim: string): boolean {
    if (this.peek().type === 'DELIMITER' && this.peek().value === delim) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchAssign(op: string): boolean {
    if (this.peek().type === 'ASSIGN' && this.peek().value === op) {
      this.advance();
      return true;
    }
    return false;
  }

  private checkDelimiter(delim: string): boolean {
    return this.peek().type === 'DELIMITER' && this.peek().value === delim;
  }

  private consume(type: string, message: string): Token {
    if (this.peek().type === type) return this.advance();
    const t = this.peek();
    throw new Error(`Parse Error at Line ${t.line}, Col ${t.column}: ${message} (got '${t.value || t.type}')`);
  }

  private consumeDelimiter(val: string, message: string): Token {
    if (this.peek().type === 'DELIMITER' && this.peek().value === val) return this.advance();
    const t = this.peek();
    throw new Error(`Parse Error at Line ${t.line}, Col ${t.column}: ${message} (got '${t.value || t.type}')`);
  }

  private consumeAssign(val: string, message: string): Token {
    if (this.peek().type === 'ASSIGN' && this.peek().value === val) return this.advance();
    const t = this.peek();
    throw new Error(`Parse Error at Line ${t.line}, Col ${t.column}: ${message} (got '${t.value || t.type}')`);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private peekNext(): Token | undefined {
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }
}
