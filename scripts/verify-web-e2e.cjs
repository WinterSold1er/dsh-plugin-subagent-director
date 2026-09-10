/**
 * Playwright E2E Verification Script for DSH Subagent Director Web UI
 *
 * Scenarios verified:
 * 1. Settings navigation: branch icon (IconBranchOutline16) check.
 * 2. Settings page: independent intercept options card check.
 * 3. Settings page: master/secondary switch cascade logic & state persistence.
 * 4. Chat conversation page: "Use Subagents" button presence, icon, text.
 * 5. Chat conversation page: button toggle execution (/orchestrate on/off) and active/inactive styling.
 * 6. Stress/Edge: rapid click re-entrancy resilience.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Resolve Playwright
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const pnpmPlaywright = '/home/csy/Code/installer/deepseek-harness-official/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright';
  ({ chromium } = require(pnpmPlaywright));
}

// 2. Discover active DSH Web token
function getActiveAuthUrl() {
  if (process.env.DSH_AUTH_URL) return process.env.DSH_AUTH_URL;
  if (process.env.DSH_TOKEN) return `http://127.0.0.1:3081/?token=${process.env.DSH_TOKEN}`;
  try {
    const journalOut = execSync('journalctl --user -u deepseek-harness-official -b --grep "dsh web:" --no-pager | tail -n 1', { encoding: 'utf8' });
    const match = journalOut.match(/token=([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      return `http://127.0.0.1:3081/?token=${match[1]}`;
    }
  } catch (err) {
    console.warn('[WARN] Failed to read journalctl for token:', err.message);
  }
  return 'http://127.0.0.1:3081/';
}

const SCREENSHOT_DIR = path.resolve(__dirname, '../e2e-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  const authUrl = getActiveAuthUrl();
  console.log(`[E2E] Connecting to target URL: ${authUrl}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('pageerror', err => console.error('[BROWSER ERROR]', err.message));

  console.log('[E2E] Step 0: Loading Web GUI...');
  await page.goto(authUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const results = {
    settingsIconBranch: false,
    interceptCardIndependent: false,
    cascadeHideSecondary: false,
    cascadeRestoreSecondary: false,
    secondaryToggleWorks: false,
    settingsPersists: false,
    chatButtonExists: false,
    chatButtonTogglesOn: false,
    chatButtonTogglesOff: false,
    rapidClickResilient: false,
  };

  // --- Scenario 1: Open Settings and Verify Branch Icon ---
  console.log('[E2E] Step 1: Verifying Settings navigation tab and branch icon...');
  const settingsBtn = page.locator('button:has-text("Settings"), div[role="button"]:has-text("Settings")').last();
  await settingsBtn.click();
  await page.waitForTimeout(1500);

  const dialog = page.locator('div[role="dialog"]');
  const subagentNav = dialog.locator('nav button:has-text("Subagent Director"), nav button:has-text("子代理")');
  const navSvg = subagentNav.locator('svg');
  const navSvgHtml = await navSvg.innerHTML();

  // Branch icon path starts with M13.0762
  if (navSvgHtml.includes('M13.0762')) {
    results.settingsIconBranch = true;
    console.log('  [PASS] Subagent Director nav tab uses IconBranchOutline16');
  } else {
    console.error('  [FAIL] Subagent Director nav tab does NOT have IconBranchOutline16 path! SVG:', navSvgHtml);
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-settings-nav-branch-icon.png') });

  // --- Scenario 2: Verify Standalone Intercept Options Card ---
  console.log('[E2E] Step 2: Clicking Subagent Director tab and verifying independent card...');
  await subagentNav.click();
  await page.waitForTimeout(1500);

  const interceptHeading = dialog.locator('strong:has-text("Orchestration Tool Intercept"), strong:has-text("编排工具拦截")');
  const headingVisible = await interceptHeading.isVisible();
  if (headingVisible) {
    results.interceptCardIndependent = true;
    console.log('  [PASS] Independent Orchestration Tool Intercept card found');
  } else {
    console.error('  [FAIL] Independent card heading not found');
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-settings-independent-intercept-card.png') });

  // --- Scenario 3: Verify Master-Secondary Switch Cascading ---
  console.log('[E2E] Step 3: Verifying switch cascade logic...');
  const hasSecondary = async () => {
    return (await dialog.locator('text=/Per-turn orchestration|按轮编排拦截工具调用/').count()) > 0;
  };

  const initialSecondaryVisible = await hasSecondary();
  console.log(`  Initial secondary switch visible: ${initialSecondaryVisible}`);

  // Click Master Switch 'No'
  console.log('  Toggling Master switch to "No"...');
  const masterNoBtn = dialog.locator('button:has-text("No"), button:has-text("否")').first();
  await masterNoBtn.click();
  await page.waitForTimeout(1500);

  const afterMasterNoVisible = await hasSecondary();
  if (!afterMasterNoVisible) {
    results.cascadeHideSecondary = true;
    console.log('  [PASS] Master switch = No successfully cascades and hides secondary option');
  } else {
    console.error('  [FAIL] Secondary option still visible after Master switch set to No');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-settings-master-switch-off-cascade-hidden.png') });

  // Click Master Switch 'Yes'
  console.log('  Toggling Master switch back to "Yes"...');
  const masterYesBtn = dialog.locator('button:has-text("Yes"), button:has-text("是")').first();
  await masterYesBtn.click();
  await page.waitForTimeout(1500);

  const afterMasterYesVisible = await hasSecondary();
  if (afterMasterYesVisible) {
    results.cascadeRestoreSecondary = true;
    console.log('  [PASS] Master switch = Yes successfully cascades and restores secondary option');
  } else {
    console.error('  [FAIL] Secondary option did NOT reappear when Master switch set to Yes');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-settings-master-switch-on-cascade-shown.png') });

  // Toggle Secondary Switch to 'No'
  console.log('  Toggling Secondary switch to "No"...');
  const secondaryNoBtn = dialog.locator('button:has-text("No"), button:has-text("否")').nth(1);
  await secondaryNoBtn.click();
  await page.waitForTimeout(1500);

  const secondaryNoSelected = await page.evaluate(() => {
    const dialogEl = document.querySelector('div[role="dialog"]');
    const btns = Array.from(dialogEl.querySelectorAll('button')).filter(b => ['Yes', 'No', '是', '否'].includes(b.innerText.trim()));
    // Buttons: [0: Master Yes, 1: Master No, 2: Secondary Yes, 3: Secondary No]
    if (btns.length >= 4) {
      const bg = window.getComputedStyle(btns[3]).backgroundColor;
      return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    }
    return false;
  });

  if (secondaryNoSelected) {
    results.secondaryToggleWorks = true;
    console.log('  [PASS] Secondary switch independently toggles to "No"');
  } else {
    console.error('  [FAIL] Secondary switch failed to toggle to "No"');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-settings-secondary-switch-off.png') });

  // Restore Secondary Switch to 'Yes'
  console.log('  Restoring Secondary switch to "Yes"...');
  const secondaryYesBtn = dialog.locator('button:has-text("Yes"), button:has-text("是")').nth(1);
  await secondaryYesBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-settings-secondary-switch-on-restored.png') });

  // Close and re-open dialog to check persistence
  console.log('  Closing and re-opening settings dialog to verify persistence...');
  const closeBtn = dialog.locator('button[aria-label="Close"], button:has-text("Done"), button:has-text("完成")').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1000);

  await settingsBtn.click();
  await page.waitForTimeout(1500);
  await subagentNav.click();
  await page.waitForTimeout(1500);

  const persistedSecondaryVisible = await hasSecondary();
  if (persistedSecondaryVisible) {
    results.settingsPersists = true;
    console.log('  [PASS] Configuration persisted across dialog re-open');
  } else {
    console.error('  [FAIL] Configuration did not persist properly');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-settings-reopen-persistence.png') });

  // Close Settings dialog
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // --- Scenario 4: Verify "Use Subagents" Button on Chat Page ---
  console.log('[E2E] Step 4: Verifying Chat Page "Use Subagents" button...');
  const useSubagentsBtn = page.locator('button:has-text("Use Subagents"), button:has-text("使用子代理")').first();
  const btnExists = await useSubagentsBtn.isVisible();

  if (btnExists) {
    results.chatButtonExists = true;
    const initialPressed = await useSubagentsBtn.getAttribute('aria-pressed');
    const initialTitle = await useSubagentsBtn.getAttribute('title');
    console.log(`  [PASS] "Use Subagents" button exists. Initial aria-pressed: ${initialPressed}`);
    console.log(`  Initial title: ${initialTitle}`);
  } else {
    console.error('  [FAIL] "Use Subagents" button not found in chat input area');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-chat-button-initial-inactive.png') });

  // --- Scenario 5: Verify Toggle On & Off ---
  console.log('[E2E] Step 5: Toggling "Use Subagents" button...');
  await useSubagentsBtn.click();
  await page.waitForTimeout(2000);

  const pressedAfterFirst = await useSubagentsBtn.getAttribute('aria-pressed');
  const titleAfterFirst = await useSubagentsBtn.getAttribute('title');
  console.log(`  After 1st click aria-pressed: ${pressedAfterFirst}`);
  console.log(`  After 1st click title: ${titleAfterFirst}`);

  if (pressedAfterFirst === 'true' && !titleAfterFirst.includes('error') && !titleAfterFirst.includes('failed')) {
    results.chatButtonTogglesOn = true;
    console.log('  [PASS] Successfully toggled ON (/orchestrate on)');
  } else {
    console.error('  [FAIL] Button failed to toggle ON');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-chat-button-toggled-active.png') });

  // Toggle Off
  console.log('  Toggling "Use Subagents" button OFF...');
  await useSubagentsBtn.click();
  await page.waitForTimeout(2000);

  const pressedAfterSecond = await useSubagentsBtn.getAttribute('aria-pressed');
  const titleAfterSecond = await useSubagentsBtn.getAttribute('title');
  console.log(`  After 2nd click aria-pressed: ${pressedAfterSecond}`);
  console.log(`  After 2nd click title: ${titleAfterSecond}`);

  if (pressedAfterSecond === 'false' && !titleAfterSecond.includes('error') && !titleAfterSecond.includes('failed')) {
    results.chatButtonTogglesOff = true;
    console.log('  [PASS] Successfully toggled OFF (/orchestrate off)');
  } else {
    console.error('  [FAIL] Button failed to toggle OFF');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-chat-button-toggled-inactive.png') });

  // --- Scenario 6: Stress & Double Click Re-entrancy Guard ---
  console.log('[E2E] Step 6: Testing rapid click re-entrancy resilience...');
  // Click twice rapidly
  const p1 = useSubagentsBtn.click();
  const p2 = useSubagentsBtn.click();
  await Promise.allSettled([p1, p2]);
  await page.waitForTimeout(2500);

  const stateAfterRapid = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Use Subagents') || b.innerText.includes('使用子代理'));
    return {
      disabled: btn ? btn.disabled : true,
      title: btn ? btn.getAttribute('title') : '',
      ariaPressed: btn ? btn.getAttribute('aria-pressed') : ''
    };
  });
  console.log('  State after rapid double-click:', stateAfterRapid);

  if (!stateAfterRapid.disabled && !stateAfterRapid.title.includes('error')) {
    results.rapidClickResilient = true;
    console.log('  [PASS] Re-entrancy guard handled rapid clicks cleanly without getting stuck');
  } else {
    console.error('  [FAIL] Button got stuck or errored after rapid clicks');
  }

  // Ensure button returned to off
  if (stateAfterRapid.ariaPressed === 'true') {
    await useSubagentsBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-chat-button-rapid-click-resilience.png') });

  await browser.close();

  console.log('\n================== E2E VERIFICATION SUMMARY ==================');
  console.table(results);

  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    console.log('\n>>> ALL 10 E2E CHECKS PASSED SUCCESSFULLY <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> SOME E2E CHECKS FAILED <<<\n');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
