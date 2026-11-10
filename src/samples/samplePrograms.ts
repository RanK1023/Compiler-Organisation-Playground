export interface SampleProgram {
  id: string;
  title: string;
  category: string;
  description: string;
  code: string;
  targetPass: string;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'faculty-demo',
    title: '⭐ Faculty Demo: Section 7 Benchmark',
    category: 'Benchmark',
    targetPass: 'constant-folding',
    description: 'The standard faculty benchmark: int a=10; b=20; x=10*2+5; y=x+x; return y; Demonstrates constant folding on arithmetic while safely preserving non-CSE expressions.',
    code: `int main() {
    int a = 10;
    int b = 20;
    int x = 10 * 2 + 5;
    int y = x + x;
    return y;
}`
  },
  {
    id: 'custom-code',
    title: '✍️ Custom Code (Write Your Own)',
    category: 'Custom Input',
    targetPass: 'all',
    description: 'Empty starter canvas. Write any custom C-like code to inspect its TAC, CFG, DAG, and optimizations.',
    code: `int main() {
    // Write your custom C-like code here!
    // Try variable declarations, arithmetic expressions,
    // if/else branches, while/for loops, and print().
    int x = 10 * 4;
    int y = x + 5;
    int z = x + 5;
    print(z);
    return z;
}`
  },
  {
    id: 'constant-folding-demo',
    title: '1. Constant Folding & Propagation',
    category: 'Constant Folding',
    targetPass: 'constant-folding',
    description: 'Demonstrates compile-time evaluation of constant arithmetic operations and forward propagation.',
    code: `int main() {
    int a = 10 * 2;
    int b = a + 5;
    int c = 40 / 2;
    int result = b + c;
    print(result);
    return result;
}`
  },
  {
    id: 'cse-demo',
    title: '2. Common Subexpression Elimination',
    category: 'CSE',
    targetPass: 'cse',
    description: 'Detects duplicate evaluations of (a * b) and reuses previously computed values across the block.',
    code: `int main() {
    int a = 7;
    int b = 9;
    int x = a * b + 4;
    int y = a * b + 10;
    int z = x + y;
    print(z);
    return z;
}`
  },
  {
    id: 'dce-demo',
    title: '3. Dead Code Elimination',
    category: 'DCE',
    targetPass: 'dce',
    description: 'Eliminates redundant variable assignments that are immediately overwritten or never read downstream.',
    code: `int main() {
    int unused = 100 * 5;
    int x = 10;
    x = 20;
    int y = 30;
    int z = x + 5;
    print(z);
    return z;
}`
  },
  {
    id: 'strength-reduction-demo',
    title: '4. Strength Reduction',
    category: 'Strength Reduction',
    targetPass: 'strength-reduction',
    description: 'Replaces costly multiplication and division by powers of 2 with fast bitwise left and right shift operations.',
    code: `int main() {
    int n = 15;
    int a = n * 8;
    int b = n * 16;
    int c = n / 4;
    int d = n * 1;
    print(a);
    print(b);
    print(c);
    return a + b;
}`
  },
  {
    id: 'licm-demo',
    title: '5. Loop-Invariant Code Motion',
    category: 'LICM',
    targetPass: 'licm',
    description: 'Hoists loop-invariant expression (base * rate) out of the while loop body into the loop preheader.',
    code: `int main() {
    int i = 0;
    int sum = 0;
    int base = 12;
    int rate = 5;
    while (i < 10) {
        int factor = base * rate;
        sum = sum + factor + i;
        i = i + 1;
    }
    print(sum);
    return sum;
}`
  },
  {
    id: 'cfg-control-flow-demo',
    title: '6. Branching & Control Flow (CFG Demo)',
    category: 'Control Flow Graph',
    targetPass: 'all',
    description: 'Generates multi-branch control flow graph with distinct True, False, and Fallthrough edges.',
    code: `int main() {
    int score = 85;
    int grade = 0;
    if (score >= 90) {
        grade = 1;
    } else {
        if (score >= 75) {
            grade = 2;
        } else {
            grade = 3;
        }
    }
    print(grade);
    return grade;
}`
  }
];
