import { TACInstruction } from '../tacGenerator/TAC';

export interface ExecutionResult {
  success: boolean;
  output: string[];
  returnValue?: number | string;
  error?: string;
  stepCount: number;
}

export class TACInterpreter {
  private static MAX_STEPS = 50000;

  public static execute(instructions: TACInstruction[]): ExecutionResult {
    if (instructions.length === 0) {
      return {
        success: true,
        output: [],
        stepCount: 0
      };
    }

    // Map labels to instruction indices
    const labelMap = new Map<string, number>();
    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.op === 'LABEL' && inst.label) {
        labelMap.set(inst.label, i);
      }
    }

    const env = new Map<string, number | string>();
    const output: string[] = [];
    let pc = 0;
    let steps = 0;
    let returnValue: number | string | undefined = undefined;

    const resolveVal = (val?: string): number | string => {
      if (val === undefined) return 0;
      const trimmed = val.trim();
      // String literal
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
      }
      // Integer literal
      if (/^-?\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
      // Variable from env
      if (env.has(trimmed)) {
        return env.get(trimmed)!;
      }
      // Uninitialized integer defaults to 0
      return 0;
    };

    const resolveInt = (val?: string): number => {
      const v = resolveVal(val);
      if (typeof v === 'number') return v;
      const parsed = parseInt(v, 10);
      return isNaN(parsed) ? 0 : parsed;
    };

    while (pc < instructions.length) {
      if (steps++ > TACInterpreter.MAX_STEPS) {
        return {
          success: false,
          output,
          error: 'Execution limit exceeded (50,000 steps). Potential infinite loop detected in source code.',
          stepCount: steps
        };
      }

      const inst = instructions[pc];

      switch (inst.op) {
        case 'LABEL':
          pc++;
          break;

        case 'ASSIGN':
          if (inst.result) {
            env.set(inst.result, resolveVal(inst.arg1));
          }
          pc++;
          break;

        case 'ADD':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) + resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'SUB':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) - resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'MUL':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) * resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'DIV':
          if (inst.result) {
            const divisor = resolveInt(inst.arg2);
            if (divisor === 0) {
              return {
                success: false,
                output,
                error: 'Runtime Error: Division by zero',
                stepCount: steps
              };
            }
            env.set(inst.result, Math.trunc(resolveInt(inst.arg1) / divisor));
          }
          pc++;
          break;

        case 'MOD':
          if (inst.result) {
            const divisor = resolveInt(inst.arg2);
            if (divisor === 0) {
              return {
                success: false,
                output,
                error: 'Runtime Error: Modulo by zero',
                stepCount: steps
              };
            }
            env.set(inst.result, resolveInt(inst.arg1) % divisor);
          }
          pc++;
          break;

        case 'SHL':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) << resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'SHR':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) >> resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'BITAND':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) & resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'BITOR':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) | resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'BITXOR':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) ^ resolveInt(inst.arg2));
          }
          pc++;
          break;

        case 'NEG':
          if (inst.result) {
            env.set(inst.result, -resolveInt(inst.arg1));
          }
          pc++;
          break;

        case 'EQ':
          if (inst.result) {
            env.set(inst.result, resolveVal(inst.arg1) === resolveVal(inst.arg2) ? 1 : 0);
          }
          pc++;
          break;

        case 'NEQ':
          if (inst.result) {
            env.set(inst.result, resolveVal(inst.arg1) !== resolveVal(inst.arg2) ? 1 : 0);
          }
          pc++;
          break;

        case 'LT':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) < resolveInt(inst.arg2) ? 1 : 0);
          }
          pc++;
          break;

        case 'LE':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) <= resolveInt(inst.arg2) ? 1 : 0);
          }
          pc++;
          break;

        case 'GT':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) > resolveInt(inst.arg2) ? 1 : 0);
          }
          pc++;
          break;

        case 'GE':
          if (inst.result) {
            env.set(inst.result, resolveInt(inst.arg1) >= resolveInt(inst.arg2) ? 1 : 0);
          }
          pc++;
          break;

        case 'JUMP':
          if (inst.label && labelMap.has(inst.label)) {
            pc = labelMap.get(inst.label)! + 1;
          } else {
            pc++;
          }
          break;

        case 'IF_TRUE':
          if (inst.label && labelMap.has(inst.label)) {
            const cond = resolveInt(inst.arg1);
            if (cond !== 0) {
              pc = labelMap.get(inst.label)! + 1;
            } else {
              pc++;
            }
          } else {
            pc++;
          }
          break;

        case 'IF_FALSE':
          if (inst.label && labelMap.has(inst.label)) {
            const cond = resolveInt(inst.arg1);
            if (cond === 0) {
              pc = labelMap.get(inst.label)! + 1;
            } else {
              pc++;
            }
          } else {
            pc++;
          }
          break;

        case 'PRINT': {
          const val = resolveVal(inst.arg1);
          output.push(val.toString());
          pc++;
          break;
        }

        case 'RETURN':
          if (inst.arg1 !== undefined) {
            returnValue = resolveVal(inst.arg1);
          }
          return {
            success: true,
            output,
            returnValue,
            stepCount: steps
          };

        default:
          pc++;
          break;
      }
    }

    return {
      success: true,
      output,
      returnValue,
      stepCount: steps
    };
  }
}
