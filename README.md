# Compiler Optimization Playground: Visualizing How Compilers Make Code More Efficient

**Course:** BCSE307P — Compiler Design Lab  
**Academic Semester:** Fall Semester 2026–2027  
**Technology Stack:** React 19, TypeScript, Vite, Vitest, Lucide Icons  

---

## 🚀 Overview

The **Compiler Optimization Playground** is an interactive, browser-based educational compiler platform that demystifies compiler back-ends. Users input C-like source code and observe how the compiler translates it into Three-Address Code (TAC), partitions instructions into basic blocks, renders Control Flow Graphs (CFGs) and local Expression Directed Acyclic Graphs (DAGs), and applies five independent compiler optimization passes with live instruction-reduction metrics.

---

## 🌟 Key Features

1. **C-like Language Subset:**
   - Integer variable declarations (`int a = 10;`)
   - Arithmetic expressions with standard operator precedence (`+`, `-`, `*`, `/`, `%`, `<<`, `>>`, `&`, `|`, `^`)
   - Control flow constructs: `if-else` branches, `while` loops, and `for` loops
   - Terminal & output statements: `print(expr);`, `return expr;`
2. **Intermediate Representation (Three-Address Code):**
   - Deterministic compiler temporaries (`t1, t2, ...`) guaranteed never to collide with user identifiers.
   - Explicit jump/conditional-jump labels (`L1, L2, ...`).
3. **Basic Block & CFG Analysis:**
   - Formal leader-identification rules partition instructions into discrete blocks ($B_1, B_2, \dots$).
   - Dynamic CFG topology displaying `True`, `False`, `Fallthrough`, and `BackEdge` (loop) transitions.
   - Interactive card-view and edge transition map.
4. **Local Expression DAG Visualization:**
   - SVG-rendered node-link graph of arithmetic and logical expressions.
   - Visualizes subexpression sharing, commutative matching (`a + b == b + a`), and variable attachments.
   - Fallback to initial expression graph when constant folding reduces entire blocks to trivial returns.
5. **Five Modular Optimization Passes:**
   - **Constant Folding & Propagation:** Evaluates compile-time constants (with div/mod-by-zero protection) and propagates values forward.
   - **Common Subexpression Elimination (CSE):** Eliminates redundant computations with operand canonicalization, intra-block copy propagation, and mutation invalidation.
   - **Dead Code Elimination (DCE):** Backward liveness analysis removing unread assignments while strictly preserving side effects (`print`, `return`, jumps).
   - **Strength Reduction:** Replaces multiplication/division by powers of 2 with fast bitwise shifts (`SHL`, `SHR`) and simplifies identities (`*0`, `*1`, `/1`, `+0`, `-0`).
   - **Loop-Invariant Code Motion (LICM):** Iterative fixed-point hoisting of loop-static computations out of `while` and `for` bodies into dedicated preheaders.
6. **Virtual Machine & Semantic Verification:**
   - Embedded TAC Interpreter executing instructions up to a 50,000-step execution cutoff.
   - Verifies mathematical output and return value equivalence between unoptimized and optimized code.
7. **Step-by-Step Pipeline Inspector:**
   - Allows users to step through individual passes (`Next Pass`, `Previous Pass`, `Reset to Unoptimized`, `Finish All`).
   - Inspect intermediate TAC, CFG, and DAG states at each stage of the compilation pipeline.
8. **Side-by-Side Comparison & Metrics:**
   - Accurate line-by-line diff between original and optimized TAC.
   - Instruction-count reduction ($\Delta N$) and IR simplification percentage metrics.
   - Explicit academic disclaimer clarifying intermediate-code instruction reduction vs. physical hardware timing.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
npm install
```

### Running the Application Locally
Launch the Vite development server:
```bash
npm run dev
```
Open your browser at [http://localhost:5173/](http://localhost:5173/) to interact with the playground.

### Running Automated Tests
Run the comprehensive Vitest test suite (34 tests across 4 test suites):
```bash
npm test
# or:
npx vitest run
```

### Type Checking & Linting
```bash
npm run lint
npm run build
```

---

## 📊 Test Suite Summary

All **34 automated test cases** pass with a 100% success rate:
- **`src/tests/compiler.test.ts` (15 unit tests):**
  - ✅ Lexing & operator precedence climbing (`2 + 3 * 4`)
  - ✅ Three-Address Code generation with synthetic temporaries
  - ✅ Constant Folding & Forward Propagation
  - ✅ Common Subexpression Elimination within basic blocks
  - ✅ CSE invalidation upon operand reassignment
  - ✅ Dead Code Elimination via backward liveness analysis
  - ✅ Preservation of side effects (`print`, `return`, jumps)
  - ✅ Strength Reduction ($x \times 2^k \to x \ll k$)
  - ✅ Loop-Invariant Code Motion hoisting
  - ✅ Basic Block leader identification
  - ✅ CFG edge classification (`True`, `False`, `Fallthrough`, `BackEdge`)
  - ✅ Expression DAG node sharing
  - ✅ Parse error detection & helpful error reporting
  - ✅ Empty input handling
  - ✅ Optimization count and percentage metrics calculation
- **`src/tests/custom_input.test.ts` (17 integration tests):**
  - ✅ Section 7 Faculty Demo Benchmark (`int a=10; b=20; x=10*2+5; y=x+x; return y;`)
  - ✅ Comma-separated variable declarations (`int a, b = 2;`)
  - ✅ Uninitialized variable declarations (`int a; a = 5;`)
  - ✅ Complex arithmetic precedence & unary minus
  - ✅ Division by zero compile-time safety
  - ✅ Modulo operations and modulo-by-zero safety
  - ✅ Variable name collision avoidance with compiler temporaries (`t1`, `t2`)
  - ✅ Relational comparisons (`<`, `<=`, `>`, `>=`, `==`, `!=`)
  - ✅ `if-else` branches with nested control flow
  - ✅ `while` loops with loop conditions and updates
  - ✅ `for` loops with initializer, condition, and update expressions
  - ✅ Nested loops with multi-level break/continue semantics
  - ✅ Dead Code Elimination preserving `print()` and `return`
  - ✅ Strength reduction on multiplications and divisions by powers of 2
  - ✅ Algebraic identity simplifications (`* 0`, `* 1`, `/ 1`, `+ 0`, `- 0`)
  - ✅ Step-by-step pipeline execution and state restoration
  - ✅ TAC Interpreter semantic verification validating identical outputs
- **`src/tests/visualizers.test.tsx` (1 test):**
  - ✅ CFGVisualizer and DAGVisualizer DOM rendering
- **`src/tests/App.test.tsx` (1 test):**
  - ✅ End-to-end full application UI integration test
