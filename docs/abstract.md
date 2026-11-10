# Abstract

**Course:** BCSE307P — Compiler Design Lab  
**Academic Semester:** Fall Semester 2026–2027  
**Project Title:** Compiler Optimization Playground: Visualizing How Compilers Make Code More Efficient  

---

Modern compiler infrastructures, such as LLVM and GCC, execute intricate sequences of analytical passes and intermediate code transformations that substantially improve runtime execution speed and eliminate computational redundancies. However, for undergraduate computer science students, the multi-phase transition from high-level imperative syntax into intermediate representations (IR) and the subsequent application of data-flow optimizations remain opaque, often obscured by abstract mathematical formalisms and dense industrial command-line compilers. 

To address this pedagogical challenge, this project develops the **Compiler Optimization Playground**, an interactive, browser-based educational compiler platform built with React, TypeScript, and Vite. The system features a complete, standalone compiler front-end and optimization pipeline designed for a representative subset of C-like syntax, encompassing variable declarations, multi-tier arithmetic precedence, conditional branches, and iterative loops. The platform lexes and parses input source code into structured Abstract Syntax Trees (AST) and generates Three-Address Code (TAC) intermediate representations. 

The playground performs leader-driven basic block partitioning and generates responsive Control Flow Graphs (CFG) alongside basic-block-level expression Directed Acyclic Graphs (DAGs). Furthermore, the application implements five modular optimization passes: Constant Folding with forward propagation, Common Subexpression Elimination (CSE), Dead Code Elimination (DCE) via backward liveness analysis, algebraic Strength Reduction, and Loop-Invariant Code Motion (LICM). By rendering side-by-side intermediate code diffs, step-by-step transformation logs, and quantitative instruction-count metrics, the platform bridges the gap between compiler theory and practical code optimization, providing students and educators with an open, accessible visual testbed.
