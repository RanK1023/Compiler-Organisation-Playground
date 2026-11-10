# System Architecture & Technical Specification

## 1. Pipeline Architecture Overview
The Compiler Optimization Playground is structured as a multi-stage compilation and optimization pipeline executing entirely client-side within the browser:

```
[ C-like Source Code ]
          │
          ▼
     [ Lexer ]  ──(Token Stream)──>  [ Parser ]
                                         │
                                         ▼
                                   [ AST Tree ]
                                         │
                                         ▼
                                 [ TAC Generator ]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
         [ Basic Block Builder ]                      [ Optimization Pipeline ]
                   │                                  ├── Constant Folding
                   ▼                                  ├── Strength Reduction
         [ CFG & DAG Builders ]                       ├── CSE
                   │                                  ├── LICM
                   ▼                                  └── DCE
        [ Topological Visualizer ]                             │
                   │                                           ▼
                   └───────────────────┬───────────────────────┘
                                       ▼
                       [ Comparison & Metrics Engine ]
                                       │
                                       ▼
                          [ Reactive React/TS UI ]
```

---

## 2. Module Breakdown

### 2.1 Lexical Analyzer (`Lexer.ts`)
- Scans input source character-by-character.
- Identifies `KEYWORD` (`int`, `if`, `else`, `while`, `for`, `print`, `return`), `IDENTIFIER`, `NUMBER`, `OPERATOR` (`+`, `-`, `*`, `/`, `%`, `<<`, `>>`, `&`, `|`, `^`, `==`, `!=`, `<`, `<=`, `>`, `>=`), `ASSIGN` (`=`), and `DELIMITER` (`(`, `)`, `{`, `}`, `;`).
- Discards single-line (`//`) and multi-line (`/* ... */`) comments while tracking line numbers and column offsets for precise error messages.

### 2.2 Recursive-Descent Parser (`Parser.ts` & `AST.ts`)
- Enforces context-free grammar with standard operator precedence climbing:
  - Logical OR (`||`) $\to$ Logical AND (`&&`) $\to$ Bitwise OR/XOR/AND $\to$ Equality (`==`, `!=`) $\to$ Relational (`<`, `<=`, `>`, `>=`) $\to$ Bitwise Shift (`<<`, `>>`) $\to$ Additive (`+`, `-`) $\to$ Multiplicative (`*`, `/`, `%`) $\to$ Unary (`-`, `+`) $\to$ Primary (`NUMBER`, `IDENTIFIER`, `( expr )`).
- Produces a strictly typed Abstract Syntax Tree (AST).

### 2.3 Three-Address Code Generator (`TACGenerator.ts`)
- Flattens nested expressions into linear sequences of instructions of the form $x = y \text{ op } z$ or $x = \text{op } y$.
- Synthesizes synthetic temporaries (`t1, t2, ...`) and branch labels (`L_then1, L_else1, L_endif1, L_while_start1, ...`).
- Emits explicit conditional branches (`IF_TRUE`, `IF_FALSE`) and unconditional jumps (`JUMP`).

### 2.4 Basic Block Partitioning (`BasicBlock.ts`)
- Identifies leaders following standard compiler theory rules:
  1. The first instruction of the TAC stream is a leader.
  2. Any instruction targeted by a conditional or unconditional branch/jump is a leader.
  3. Any instruction immediately following a jump or conditional jump is a leader.
- Groups instructions from each leader up to (but excluding) the next leader into discrete basic blocks ($B_1, B_2, \dots$).

### 2.5 Control Flow Graph (`CFG.ts`)
- Computes directed edges connecting blocks based on jump targets and fallthrough paths.
- Tags edges with meaningful labels: `True`, `False`, `Jump`, `Fallthrough`, and `BackEdge` (loop closures).

### 2.6 Expression Directed Acyclic Graph (`DAG.ts`)
- Constructs local DAG representations within chosen basic blocks.
- Demonstrates common subexpression sharing by mapping identical operator nodes with identical operand leaves to existing node IDs.
- Tracks variable attachments to visually show value propagation and variable reassignment.

### 2.7 Modular Optimization Passes (`src/compiler/optimizations/`)
1. **`ConstantFoldingPass.ts`**: Evaluates compile-time numeric arithmetic and forward-propagates known constants across sequential instructions.
2. **`CommonSubexpressionEliminationPass.ts`**: Replaces duplicate evaluations of available expressions with simple copies, properly invalidating entries upon operand mutation.
3. **`DeadCodeEliminationPass.ts`**: Conducts backward iterative liveness analysis. Eliminates assignments whose target variable is not read downstream, while strictly preserving side effects (`print`, `return`, jumps).
4. **`StrengthReductionPass.ts`**: Identifies multiplication and division by powers of two ($2^k$) and converts them into bitwise shifts (`SHL`, `SHR`), handling identity multiplication ($x \times 1 = x$) and zero multiplication ($x \times 0 = 0$).
5. **`LoopInvariantCodeMotionPass.ts`**: Identifies loop boundaries via back-edges, detects statements inside the loop body whose operands are unmodified within the loop, and hoists them to a loop preheader.

---

## 3. Technical Constraints & Design Decisions
- **Zero External Dependencies at Runtime:** The compiler runs 100% client-side in the browser, avoiding any requirement for backend compilation servers.
- **Type Safety:** Implemented entirely in TypeScript with strict null checks and verifiable interfaces.
- **Deterministic Metrics:** Reductions are quantified as absolute instruction count delta ($\Delta N = N_{\text{before}} - N_{\text{after}}$) and percentage reduction ($\frac{\Delta N}{N_{\text{before}}} \times 100\%$).
