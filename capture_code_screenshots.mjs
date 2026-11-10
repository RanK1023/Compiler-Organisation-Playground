import { chromium } from 'playwright';

async function captureCode() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  // Function to render code in high-contrast editor aesthetic
  const renderCode = async (title, filename, codeSnippet, outputPath) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            background: #0B0F19;
            color: #E2E8F0;
            font-family: 'Fira Code', monospace, Consolas, sans-serif;
            padding: 32px;
            box-sizing: border-box;
          }
          .card {
            background: #111827;
            border: 1px solid #1F293D;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1F293D;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .title {
            color: #38BDF8;
            font-size: 1.15rem;
            font-weight: bold;
          }
          .badge {
            background: #1E293B;
            color: #94A3B8;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.85rem;
            border: 1px solid #334155;
          }
          pre {
            margin: 0;
            font-size: 0.95rem;
            line-height: 1.6;
            color: #CBD5E1;
            overflow: hidden;
          }
          .kw { color: #F43F5E; font-weight: bold; }
          .str { color: #34D399; }
          .comment { color: #64748B; font-style: italic; }
          .fn { color: #60A5FA; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="title">${title}</span>
            <span class="badge">${filename}</span>
          </div>
          <pre><code>${codeSnippet}</code></pre>
        </div>
      </body>
      </html>
    `;
    await page.setContent(html);
    await page.screenshot({ path: outputPath });
  };

  // 1. Basic Block Leader Partitioning Code Screenshot
  await renderCode(
    "Leader-Based Basic Block Partitioning Algorithm",
    "src/compiler/basicBlocks/BasicBlock.ts",
    `// Step 1: Identify leaders following formal compiler theory rules
const isLeader = new Array&lt;boolean&gt;(instructions.length).fill(false);
isLeader[0] = true; // Rule 1: First instruction is a leader

for (let i = 0; i &lt; instructions.length; i++) {
  const inst = instructions[i];

  if (inst.op === 'LABEL') {
    isLeader[i] = true;
  }

  if (['JUMP', 'IF_TRUE', 'IF_FALSE', 'RETURN'].includes(inst.op)) {
    // Target of jump is a leader (Rule 2)
    if (inst.label && labelIndices.has(inst.label)) {
      const targetIdx = labelIndices.get(inst.label)!;
      isLeader[targetIdx] = true;
    }
    // Instruction immediately following a jump/branch is a leader (Rule 3)
    if (i + 1 &lt; instructions.length) {
      isLeader[i + 1] = true;
    }
  }
}

// Step 2: Group instructions from leader up to next leader into basic blocks
for (let i = 0; i &lt; instructions.length; i++) {
  if (isLeader[i] && currentInstructions.length &gt; 0) {
    blocks.push({ id: \`B\${blockCount}\`, index: blockCount, instructions: currentInstructions });
    blockCount++;
    currentInstructions = [];
  }
  currentInstructions.push(instructions[i]);
}`,
    "screenshots/code_screenshot_basic_blocks.png"
  );

  // 2. Optimization Passes Implementation Screenshot
  await renderCode(
    "Common Subexpression Elimination & DCE Invalidation",
    "src/compiler/optimizations/CommonSubexpressionEliminationPass.ts",
    `// Local CSE within basic blocks
if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR'].includes(inst.op)) {
  if (inst.arg1 && inst.arg2 && inst.result) {
    const key = makeKey(inst.op, inst.arg1, inst.arg2);

    if (availableExprs.has(key)) {
      const existingVar = availableExprs.get(key)!;
      const oldStr = formatTACInstruction(inst);
      
      // Replace redundant calculation with copy from existing variable
      inst.op = 'ASSIGN';
      inst.arg1 = existingVar;
      inst.arg2 = undefined;
      changes.push(\`Eliminated CSE: "\${oldStr}" replaced with "\${formatTACInstruction(inst)}"\`);
      transformed = true;
    } else {
      // First time recording expression
      availableExprs.set(key, inst.result);
    }

    // Invalidate dependent expressions when variable is reassigned
    if (inst.result) {
      invalidateVariable(inst.result);
    }
  }
}`,
    "screenshots/code_screenshot_optimizations.png"
  );

  // 3. CFG Edge Classification & Topology Screenshot
  await renderCode(
    "Control Flow Graph Edge Classification & Back-Edge Detection",
    "src/compiler/cfg/CFG.ts",
    `// Classify branch edges and detect loop back-edges
if (lastInst.op === 'IF_TRUE' || lastInst.op === 'IF_FALSE') {
  // Target conditional branch edge
  if (lastInst.label && labelToBlock.has(lastInst.label)) {
    const targetBlockId = labelToBlock.get(lastInst.label)!;
    const isBackEdge = blockMap.get(targetBlockId)!.index &lt;= curr.index;
    const branchLabel = lastInst.op === 'IF_TRUE' ? 'True' : 'False';
    
    edges.push({
      id: \`e_\${curr.id}_\${targetBlockId}_cond\`,
      from: curr.id,
      to: targetBlockId,
      label: branchLabel,
      isBackEdge
    });
    curr.successors.push(targetBlockId);
    blockMap.get(targetBlockId)!.predecessors.push(curr.id);
  }

  // Fallthrough branch edge to adjacent block
  if (i + 1 &lt; blockList.length) {
    const nextBlock = blockList[i + 1];
    edges.push({
      id: \`e_\${curr.id}_\${nextBlock.id}_fall\`,
      from: curr.id,
      to: nextBlock.id,
      label: lastInst.op === 'IF_TRUE' ? 'False' : 'True',
      isBackEdge: false
    });
  }
}`,
    "screenshots/code_screenshot_cfg_dag.png"
  );

  await browser.close();
  console.log("All three code screenshots generated successfully!");
}

captureCode().catch(err => {
  console.error("Error capturing code screenshots:", err);
  process.exit(1);
});
