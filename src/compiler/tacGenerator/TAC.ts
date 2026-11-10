export type TACOp =
  | 'ASSIGN' // result = arg1
  | 'ADD'    // result = arg1 + arg2
  | 'SUB'    // result = arg1 - arg2
  | 'MUL'    // result = arg1 * arg2
  | 'DIV'    // result = arg1 / arg2
  | 'MOD'    // result = arg1 % arg2
  | 'SHL'    // result = arg1 << arg2
  | 'SHR'    // result = arg1 >> arg2
  | 'BITAND' // result = arg1 & arg2
  | 'BITOR'  // result = arg1 | arg2
  | 'BITXOR' // result = arg1 ^ arg2
  | 'NEG'    // result = -arg1
  | 'LABEL'  // label:
  | 'JUMP'   // goto label
  | 'IF_TRUE'// if arg1 goto label
  | 'IF_FALSE'// ifFalse arg1 goto label
  | 'EQ'     // result = arg1 == arg2
  | 'NEQ'    // result = arg1 != arg2
  | 'LT'     // result = arg1 < arg2
  | 'LE'     // result = arg1 <= arg2
  | 'GT'     // result = arg1 > arg2
  | 'GE'     // result = arg1 >= arg2
  | 'PRINT'  // print arg1
  | 'RETURN';// return arg1

export interface TACInstruction {
  id: number;
  op: TACOp;
  result?: string;
  arg1?: string;
  arg2?: string;
  label?: string; // used for LABEL op or jump target
}

export function formatTACInstruction(inst: TACInstruction): string {
  switch (inst.op) {
    case 'LABEL':
      return `${inst.label}:`;
    case 'ASSIGN':
      return `${inst.result} = ${inst.arg1}`;
    case 'ADD':
      return `${inst.result} = ${inst.arg1} + ${inst.arg2}`;
    case 'SUB':
      return `${inst.result} = ${inst.arg1} - ${inst.arg2}`;
    case 'MUL':
      return `${inst.result} = ${inst.arg1} * ${inst.arg2}`;
    case 'DIV':
      return `${inst.result} = ${inst.arg1} / ${inst.arg2}`;
    case 'MOD':
      return `${inst.result} = ${inst.arg1} % ${inst.arg2}`;
    case 'SHL':
      return `${inst.result} = ${inst.arg1} << ${inst.arg2}`;
    case 'SHR':
      return `${inst.result} = ${inst.arg1} >> ${inst.arg2}`;
    case 'BITAND':
      return `${inst.result} = ${inst.arg1} & ${inst.arg2}`;
    case 'BITOR':
      return `${inst.result} = ${inst.arg1} | ${inst.arg2}`;
    case 'BITXOR':
      return `${inst.result} = ${inst.arg1} ^ ${inst.arg2}`;
    case 'NEG':
      return `${inst.result} = -${inst.arg1}`;
    case 'EQ':
      return `${inst.result} = ${inst.arg1} == ${inst.arg2}`;
    case 'NEQ':
      return `${inst.result} = ${inst.arg1} != ${inst.arg2}`;
    case 'LT':
      return `${inst.result} = ${inst.arg1} < ${inst.arg2}`;
    case 'LE':
      return `${inst.result} = ${inst.arg1} <= ${inst.arg2}`;
    case 'GT':
      return `${inst.result} = ${inst.arg1} > ${inst.arg2}`;
    case 'GE':
      return `${inst.result} = ${inst.arg1} >= ${inst.arg2}`;
    case 'JUMP':
      return `goto ${inst.label}`;
    case 'IF_TRUE':
      return `if ${inst.arg1} goto ${inst.label}`;
    case 'IF_FALSE':
      return `ifFalse ${inst.arg1} goto ${inst.label}`;
    case 'PRINT':
      return `print ${inst.arg1}`;
    case 'RETURN':
      return inst.arg1 ? `return ${inst.arg1}` : `return`;
    default:
      return `${inst.op} ${inst.result ?? ''} ${inst.arg1 ?? ''} ${inst.arg2 ?? ''}`;
  }
}
