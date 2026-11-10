export type ASTNode =
  | ProgramNode
  | FunctionDeclNode
  | VarDeclNode
  | AssignNode
  | IfNode
  | WhileNode
  | ForNode
  | PrintNode
  | ReturnNode
  | BinaryOpNode
  | UnaryOpNode
  | IdentifierNode
  | NumberLiteralNode
  | StringLiteralNode;

export interface ProgramNode {
  type: 'Program';
  body: ASTNode[];
}

export interface FunctionDeclNode {
  type: 'FunctionDecl';
  returnType: string;
  name: string;
  params: string[];
  body: ASTNode[];
}

export interface VarDeclNode {
  type: 'VarDecl';
  varType: string;
  name: string;
  init?: ASTNode;
}

export interface AssignNode {
  type: 'Assign';
  name: string;
  value: ASTNode;
}

export interface IfNode {
  type: 'If';
  condition: ASTNode;
  thenBranch: ASTNode[];
  elseBranch?: ASTNode[];
}

export interface WhileNode {
  type: 'While';
  condition: ASTNode;
  body: ASTNode[];
}

export interface ForNode {
  type: 'For';
  init?: ASTNode;
  condition?: ASTNode;
  update?: ASTNode;
  body: ASTNode[];
}

export interface PrintNode {
  type: 'Print';
  expression: ASTNode;
}

export interface ReturnNode {
  type: 'Return';
  expression?: ASTNode;
}

export interface BinaryOpNode {
  type: 'BinaryOp';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpNode {
  type: 'UnaryOp';
  operator: string;
  operand: ASTNode;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface NumberLiteralNode {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteralNode {
  type: 'StringLiteral';
  value: string;
}
