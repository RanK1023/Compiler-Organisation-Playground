# Project Objectives

## Primary Objective
To design, implement, and validate a fully functional, browser-based educational compiler platform (**The Compiler Optimization Playground**) that translates a documented subset of C-like source code into Three-Address Code (TAC), visualizes program structure through Control Flow Graphs (CFGs) and Expression Directed Acyclic Graphs (DAGs), and dynamically demonstrates five classic compiler optimization passes with real intermediate transformations, transformation traces, and verifiable instruction-reduction metrics.

---

## Specific Measurable Objectives

### Objective 1: Implement a Robust Lexical, Parsing, and Intermediate Representation Pipeline
- Develop a modular Lexer and Recursive-Descent Parser supporting integer variables, multi-tier arithmetic precedence, conditional statements (`if-else`), iterative constructs (`while`, `for`), output statements (`print`), and termination clauses (`return`).
- Synthesize standard, linear Three-Address Code (TAC) with deterministic temporary variable numbering (`t1, t2, ...`) and jump target labels (`L1, L2, ...`).
- Validate syntactic and grammatical accuracy through automated unit test cases, ensuring informative error reporting upon syntax violations.

### Objective 2: Formulate Basic Block Partitioning and Topological Visualizations
- Implement the formal leader-identification algorithm to partition raw TAC instructions into discrete, numbered basic blocks ($B_1, B_2, \dots, B_k$).
- Construct a responsive Control Flow Graph (CFG) accurately depicting conditional branching edges (`True`, `False`), unconditional jumps, fallthrough paths, and loop back-edges.
- Build local Directed Acyclic Graph (DAG) structures for basic block expression regions to demonstrate common subexpression sharing and operand dependency hierarchies.

### Objective 3: Engineer Five Modular Optimization Passes with Transparent Orchestration
- Implement five independent, selectable optimization modules operating directly on the TAC intermediate representation:
  1. **Constant Folding & Propagation:** Compile-time evaluation of constant arithmetic and forward propagation.
  2. **Common Subexpression Elimination (CSE):** Detection of identical subexpressions within basic blocks, properly invalidated upon variable reassignment.
  3. **Dead Code Elimination (DCE):** Backward liveness analysis removing unread assignments while strictly preserving side-effecting operations (`print`, `return`, jumps).
  4. **Strength Reduction:** Safe replacement of expensive multiplication/division with cheaper bitwise shifts.
  5. **Loop-Invariant Code Motion (LICM):** Identification and hoisting of loop-static computations into loop preheaders.
- Provide step-by-step transformation logging, before-and-after side-by-side instruction comparisons, and quantitative instruction reduction metrics.
