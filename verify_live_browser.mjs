import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  console.log('Starting Vite server programmatically...');
  const server = await createServer({
    server: { port: 5174 }
  });
  await server.listen();
  const address = server.httpServer.address();
  const port = address.port;
  console.log(`Vite dev server running at http://localhost:${port}`);

  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots', { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'msedge'
    });
  } catch {
    try {
      browser = await chromium.launch({
        headless: true,
        channel: 'chrome'
      });
    } catch {
      browser = await chromium.launch({
        headless: true
      });
    }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log(`Navigating to http://localhost:${port}/ ...`);
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Capture initial Faculty Demo Benchmark view
    console.log('Capturing 1_faculty_demo_initial.png ...');
    await page.screenshot({ path: 'screenshots/1_faculty_demo_initial.png' });

    // 2. Switch to CFG Tab
    console.log('Testing CFG tab...');
    await page.click('button:has-text("Control Flow Graph")');
    await page.waitForTimeout(500);
    console.log('Capturing 2_cfg_tab.png ...');
    await page.screenshot({ path: 'screenshots/2_cfg_tab.png' });

    // 3. Switch to Expression DAG Tab
    console.log('Testing Expression DAG tab...');
    await page.click('button:has-text("Expression DAG")');
    await page.waitForTimeout(500);
    console.log('Capturing 3_dag_tab.png ...');
    await page.screenshot({ path: 'screenshots/3_dag_tab.png' });

    // 4. Test Step-by-Step Mode
    console.log('Testing Step-by-Step Mode...');
    await page.click('button:has-text("Step-by-Step Mode")');
    await page.waitForTimeout(500);
    // Click "Next Pass"
    await page.click('button:has-text("Next Pass")');
    await page.waitForTimeout(500);
    console.log('Capturing 4_step_by_step_mode.png ...');
    await page.screenshot({ path: 'screenshots/4_step_by_step_mode.png' });

    // 5. Test Custom User Input
    console.log('Entering Custom User Input...');
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(300);

    const customProgram = `int main() {
    int val = 12 * 4;
    int unused = 999;
    int shiftVal = val * 8;
    print(shiftVal);
    return shiftVal;
}`;
    await page.fill('.editor-textarea-with-gutter', customProgram);
    await page.waitForTimeout(300);

    // Click Analyze & Optimize
    console.log('Clicking Analyze & Optimize...');
    await page.click('button:has-text("Analyze & Optimize")');
    await page.waitForTimeout(800);
    console.log('Capturing 5_custom_code_optimized.png ...');
    await page.screenshot({ path: 'screenshots/5_custom_code_optimized.png' });

    // 6. Test Invalid Syntax Error Banner
    console.log('Entering Invalid Syntax...');
    await page.fill('.editor-textarea-with-gutter', 'int main() {\n  int invalid = * + 5;\n}');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Analyze & Optimize")');
    await page.waitForTimeout(500);
    console.log('Capturing 6_syntax_error_handled.png ...');
    await page.screenshot({ path: 'screenshots/6_syntax_error_handled.png' });

    console.log('SUCCESS: All 6 browser verification stages passed with screenshots saved!');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
