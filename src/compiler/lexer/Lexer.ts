export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'OPERATOR'
  | 'ASSIGN'
  | 'DELIMITER'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS = new Set(['int', 'if', 'else', 'while', 'for', 'return', 'print', 'printf']);

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];

      // Skip whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }

      if (ch === '\n') {
        this.line++;
        this.col = 1;
        this.pos++;
        continue;
      }

      // Skip single-line comments //
      if (ch === '/' && this.input[this.pos + 1] === '/') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.advance();
        }
        continue;
      }

      // Skip block comments /* ... */
      if (ch === '/' && this.input[this.pos + 1] === '*') {
        this.advance();
        this.advance();
        while (this.pos < this.input.length && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
          if (this.input[this.pos] === '\n') {
            this.line++;
            this.col = 1;
            this.pos++;
          } else {
            this.advance();
          }
        }
        if (this.pos < this.input.length) {
          this.advance(); // *
          this.advance(); // /
        }
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch)) {
        tokens.push(this.readNumber());
        continue;
      }

      // Strings (e.g. "hello world")
      if (ch === '"' || ch === "'") {
        tokens.push(this.readString(ch));
        continue;
      }

      // Identifiers / Keywords
      if (/[a-zA-Z_]/.test(ch)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      // Multi-character or single-character operators
      const startCol = this.col;
      const startLine = this.line;

      // Two-character comparisons / operators
      const twoChar = this.input.slice(this.pos, this.pos + 2);
      if (['==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '++', '--', '+=', '-='].includes(twoChar)) {
        tokens.push({ type: 'OPERATOR', value: twoChar, line: startLine, column: startCol });
        this.advance();
        this.advance();
        continue;
      }

      if (ch === '=') {
        tokens.push({ type: 'ASSIGN', value: '=', line: startLine, column: startCol });
        this.advance();
        continue;
      }

      if (['+', '-', '*', '/', '%', '<', '>', '&', '|', '^'].includes(ch)) {
        tokens.push({ type: 'OPERATOR', value: ch, line: startLine, column: startCol });
        this.advance();
        continue;
      }

      if (['(', ')', '{', '}', ';', ',', '[', ']'].includes(ch)) {
        tokens.push({ type: 'DELIMITER', value: ch, line: startLine, column: startCol });
        this.advance();
        continue;
      }

      throw new Error(`Lexical Error at Line ${this.line}, Col ${this.col}: Unexpected character '${ch}'`);
    }

    tokens.push({ type: 'EOF', value: '', line: this.line, column: this.col });
    return tokens;
  }

  private advance(): string {
    const ch = this.input[this.pos];
    this.pos++;
    this.col++;
    return ch;
  }

  private readNumber(): Token {
    const startCol = this.col;
    const startLine = this.line;
    let numStr = '';
    while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
      numStr += this.advance();
    }
    return { type: 'NUMBER', value: numStr, line: startLine, column: startCol };
  }

  private readIdentifier(): Token {
    const startCol = this.col;
    const startLine = this.line;
    let idStr = '';
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      idStr += this.advance();
    }
    const type: TokenType = KEYWORDS.has(idStr) ? 'KEYWORD' : 'IDENTIFIER';
    return { type, value: idStr, line: startLine, column: startCol };
  }

  private readString(quote: string): Token {
    const startCol = this.col;
    const startLine = this.line;
    this.advance(); // consume opening quote
    let str = '';
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\' && this.pos + 1 < this.input.length) {
        this.advance();
        const esc = this.advance();
        if (esc === 'n') str += '\n';
        else if (esc === 't') str += '\t';
        else str += esc;
      } else {
        if (this.input[this.pos] === '\n') {
          this.line++;
          this.col = 1;
        }
        str += this.advance();
      }
    }
    if (this.pos >= this.input.length) {
      throw new Error(`Lexical Error at Line ${this.line}, Col ${this.col}: Unterminated string literal`);
    }
    this.advance(); // consume closing quote
    return { type: 'STRING', value: str, line: startLine, column: startCol };
  }
}
