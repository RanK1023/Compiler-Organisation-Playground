import { Lexer } from './lexer/Lexer';
import { Parser } from './parser/Parser';
import { TACGenerator } from './tacGenerator/TACGenerator';
import { TACInstruction, formatTACInstruction } from './tacGenerator/TAC';
import { BasicBlockBuilder, BasicBlock } from './basicBlocks/BasicBlock';
import { CFGBuilder, CFGGraph } from './cfg/CFG';
import { DAGBuilder, DAGGraph } from './dag/DAG';
import { OptimizationPipeline, OptimizationStep } from './optimizations/OptimizationPipeline';
import { TACInterpreter } from './interpreter/TACInterpreter';

export interface SemanticVerification {
  executed: boolean;
  verified: boolean;
  originalOutput: string[];
  optimizedOutput: string[];
  originalReturn?: number | string;
  optimizedReturn?: number | string;
  message: string;
}

export interface CompilerOutput {
  success: boolean;
  error?: string;
  ast?: any;
  rawTAC: TACInstruction[];
  rawTACFormatted: string[];
  basicBlocks: BasicBlock[];
  cfg: CFGGraph;
  dag: DAGGraph;
  optimizedTAC: TACInstruction[];
  optimizedTACFormatted: string[];
  optimizationSteps: OptimizationStep[];
  instructionCountBefore: number;
  instructionCountAfter: number;
  reductionCount: number;
  reductionPercentage: number;
  semanticVerification: SemanticVerification;
  currentStepIndex: number;
  totalSteps: number;
}

export class CompilerEngine {
  private pipeline = new OptimizationPipeline();

  public compileAndOptimize(
    sourceCode: string,
    selectedPasses: string[] = ['constant-folding', 'strength-reduction', 'cse', 'licm', 'dce'],
    selectedBlockForDAG?: string,
    targetStepIndex?: number
  ): CompilerOutput {
    const emptyVerification: SemanticVerification = {
      executed: false,
      verified: false,
      originalOutput: [],
      optimizedOutput: [],
      message: 'No execution performed.'
    };

    try {
      if (!sourceCode.trim()) {
        return {
          success: false,
          error: 'Source code is empty. Please enter or select a C-like program.',
          rawTAC: [],
          rawTACFormatted: [],
          basicBlocks: [],
          cfg: { blocks: [], edges: [] },
          dag: { nodes: [], edges: [] },
          optimizedTAC: [],
          optimizedTACFormatted: [],
          optimizationSteps: [],
          instructionCountBefore: 0,
          instructionCountAfter: 0,
          reductionCount: 0,
          reductionPercentage: 0,
          semanticVerification: emptyVerification,
          currentStepIndex: 0,
          totalSteps: 0
        };
      }

      // Phase 1: Lexing
      const lexer = new Lexer(sourceCode);
      const tokens = lexer.tokenize();

      // Phase 2: Parsing
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Phase 3: TAC Generation
      const tacGen = new TACGenerator();
      const rawTAC = tacGen.generate(ast);
      const rawTACFormatted = rawTAC.map(i => formatTACInstruction(i));

      // Phase 4: Optimization Pipeline
      const { finalInstructions, steps } = this.pipeline.runPipeline(selectedPasses, rawTAC);

      // Determine active instructions based on targetStepIndex
      const totalSteps = steps.length;
      let currentStepIndex = totalSteps;
      let activeInstructions = finalInstructions;

      if (targetStepIndex !== undefined) {
        if (targetStepIndex <= 0) {
          currentStepIndex = 0;
          activeInstructions = rawTAC;
        } else if (targetStepIndex <= totalSteps) {
          currentStepIndex = targetStepIndex;
          activeInstructions = steps[targetStepIndex - 1].afterInstructions;
        } else {
          currentStepIndex = totalSteps;
          activeInstructions = finalInstructions;
        }
      }

      const optimizedTAC = activeInstructions;
      const optimizedTACFormatted = optimizedTAC.map(i => formatTACInstruction(i));

      // Phase 5: Basic Blocks & CFG for the active representation
      const activeBlocks = BasicBlockBuilder.build(optimizedTAC);
      const activeCFG = CFGBuilder.build(activeBlocks);

      // Phase 6: DAG (from selected block or first block with instructions)
      const initialBlocks = BasicBlockBuilder.build(rawTAC);
      const targetBlockId = selectedBlockForDAG || (activeBlocks.length > 0 ? activeBlocks[0].id : undefined);
      const targetBlock = activeBlocks.find(b => b.id === targetBlockId) || activeBlocks[0];
      let dag = targetBlock ? DAGBuilder.buildForBlock(targetBlock.instructions, targetBlock.id) : { nodes: [], edges: [] };

      // If active block has no operator nodes (e.g., constant folding + DCE folded it to a single return),
      // fallback to initial block so students can visualize the expression DAG & common subexpression sharing
      if (dag.nodes.length === 0 && initialBlocks.length > 0) {
        const initTarget = initialBlocks.find(b => b.id === targetBlockId) || initialBlocks.find(b => b.instructions.some(i => ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR'].includes(i.op))) || initialBlocks[0];
        if (initTarget) {
          const fallbackDag = DAGBuilder.buildForBlock(initTarget.instructions, `${initTarget.id} (Initial Expression DAG)`);
          if (fallbackDag.nodes.length > 0) {
            dag = fallbackDag;
          }
        }
      }

      // Phase 7: Dynamic Metrics calculation
      const beforeCount = rawTAC.length;
      const afterCount = optimizedTAC.length;
      const reduction = beforeCount - afterCount;
      const percentage = beforeCount > 0 ? parseFloat(((reduction / beforeCount) * 100).toFixed(2)) : 0;

      // Phase 8: Semantic Validation via TAC Interpreter
      let semanticVerification = emptyVerification;
      try {
        const rawExec = TACInterpreter.execute(rawTAC);
        const optExec = TACInterpreter.execute(finalInstructions);

        if (rawExec.success && optExec.success) {
          const outputsMatch = JSON.stringify(rawExec.output) === JSON.stringify(optExec.output);
          const returnsMatch = rawExec.returnValue === optExec.returnValue;
          const verified = outputsMatch && returnsMatch;

          semanticVerification = {
            executed: true,
            verified,
            originalOutput: rawExec.output,
            optimizedOutput: optExec.output,
            originalReturn: rawExec.returnValue,
            optimizedReturn: optExec.returnValue,
            message: verified
              ? 'Semantic Equivalence Verified: Identical output and return value across optimizations.'
              : 'Semantic Equivalence Warning: Observable output or return value differed.'
          };
        } else {
          semanticVerification = {
            executed: true,
            verified: false,
            originalOutput: rawExec.output,
            optimizedOutput: optExec.output,
            originalReturn: rawExec.returnValue,
            optimizedReturn: optExec.returnValue,
            message: rawExec.error || optExec.error || 'Execution halted due to runtime exception.'
          };
        }
      } catch (e: any) {
        semanticVerification = {
          executed: false,
          verified: false,
          originalOutput: [],
          optimizedOutput: [],
          message: `Interpreter skipped: ${e.message}`
        };
      }

      return {
        success: true,
        ast,
        rawTAC,
        rawTACFormatted,
        basicBlocks: activeBlocks,
        cfg: activeCFG,
        dag,
        optimizedTAC,
        optimizedTACFormatted,
        optimizationSteps: steps,
        instructionCountBefore: beforeCount,
        instructionCountAfter: afterCount,
        reductionCount: reduction,
        reductionPercentage: percentage,
        semanticVerification,
        currentStepIndex,
        totalSteps
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'An unknown compilation error occurred.',
        rawTAC: [],
        rawTACFormatted: [],
        basicBlocks: [],
        cfg: { blocks: [], edges: [] },
        dag: { nodes: [], edges: [] },
        optimizedTAC: [],
        optimizedTACFormatted: [],
        optimizationSteps: [],
        instructionCountBefore: 0,
        instructionCountAfter: 0,
        reductionCount: 0,
        reductionPercentage: 0,
        semanticVerification: emptyVerification,
        currentStepIndex: 0,
        totalSteps: 0
      };
    }
  }

  public getAvailablePasses() {
    return this.pipeline.getAvailablePasses();
  }
}
