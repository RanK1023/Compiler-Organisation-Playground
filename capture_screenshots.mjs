import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  // Capture before/after comparison view (default loaded view)
  console.log('Capturing output_screenshot_comparison.png ...');
  await page.screenshot({ path: 'screenshots/output_screenshot_comparison.png' });

  // Select Control Flow Graph tab if not already selected
  console.log('Switching to CFG tab...');
  const cfgBtn = await page.$('button:has-text("Control Flow Graph")');
  if (cfgBtn) {
    await cfgBtn.click();
    await page.waitForTimeout(1000);
  }

  // Capture CFG & DAG View
  console.log('Capturing output_screenshot_cfg.png ...');
  await page.screenshot({ path: 'screenshots/output_screenshot_cfg.png' });

  await browser.close();
  console.log('All output screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
