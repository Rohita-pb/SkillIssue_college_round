import { test, expect } from '@playwright/test';
import type { Store, Trace } from '../shared/types';

test('public landing page explains AgentBreak and reaches the real workbench', async ({ page }) => {
  await page.goto('/landing');
  await expect(page.getByRole('dialog', { name: 'AgentBreak cinematic introduction' })).toBeVisible();
  await expect(page.getByText('Conceptual animation · not a live attack or verified result.')).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('src', '/agentbreak-veo-intro.mp4');
  expect(await page.locator('video').evaluate((element: HTMLVideoElement) => element.muted && !element.controls)).toBe(true);
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'AgentBreak cinematic introduction' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Your AI agent can take action/ })).toBeVisible();
  await expect(page.getByText('VISUAL REFERENCE')).not.toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.locator('.al-component')).toHaveCount(4);
  await page.locator('.al-hero').getByRole('link', { name: 'Start Security Testing' }).click();
  await expect(page).toHaveURL(/\/\?start=test$/);
  await expect(page.getByRole('heading', { name: 'Launch a new campaign' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible();
});

test('landing page skips the intro for reduced motion and navigates to architecture', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/landing');
  await expect(page.getByRole('dialog', { name: 'AgentBreak cinematic introduction' })).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Your AI agent can take action/ })).toBeVisible();
  await page.getByRole('link', { name: 'Explore architecture' }).click();
  await expect(page).toHaveURL(/#connected-nodes$/);
  await expect(page.getByRole('heading', { name: /Test behavior across every tool/ })).toBeVisible();
});

test('landing intro completes automatically on mobile and keeps keyboard focus contained', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/landing');
  const intro = page.getByRole('dialog', { name: 'AgentBreak cinematic introduction' });
  await expect(intro).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Skip intro' })).toBeFocused();
  await expect(intro).toHaveCount(0, { timeout: 16000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('.al-hero').getByRole('link', { name: 'Start Security Testing' })).toBeVisible();
  await page.reload();
  await expect(intro).toHaveCount(0);
});

test('Veo frames drive the four headline overlays and end at the real hero', async ({ page }) => {
  await page.goto('/landing');
  await expect(page.locator('.veo-caption')).toContainText('AI agents are powerful.');
  await expect(page.locator('.veo-caption')).toContainText('They can access tools,', { timeout: 5000 });
  await expect(page.locator('.veo-caption')).toContainText('when they go wrong?', { timeout: 5000 });
  await expect(page.locator('.veo-caption')).toContainText('Validate the defenses.', { timeout: 5000 });
  await expect(page.locator('.veo-intro')).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator('.al-hero')).toBeVisible();
});

test('unavailable intro media falls through safely without a player or fake assessment', async ({ page }) => {
  await page.route('**/agentbreak-veo-intro.mp4', route => route.abort());
  await page.goto('/landing');
  await expect(page.locator('.veo-intro')).toHaveCount(0, { timeout: 10000 });
  await expect(page.locator('.al-hero')).toBeVisible();
  await expect(page.locator('.la-results')).toHaveCount(0);
});

test('assessment surfaces an API rejection without claiming a successful run', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/landing');
  await page.getByRole('button', { name: 'Security Assessment', exact: true }).click();
  const modal = page.getByRole('dialog', { name: /AgentBreak.*Security Assessment/ });
  await expect(modal.locator('input[type=checkbox]:checked')).toHaveCount(5);
  await page.route('**/api/campaigns', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Three campaigns are already running.' }) }));
  await modal.getByRole('button', { name: /Launch Assessment/ }).click();
  await expect(modal.getByRole('alert')).toContainText('Three campaigns are already running.');
  await expect(modal.locator('progress')).toHaveCount(0);
  await expect(modal.getByRole('button', { name: /Launch Assessment/ })).toBeEnabled();
});

test('dashboard, surface filters, trace replay, and portable reproduction work', async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible();
  await expect(page.locator('.stat-main').first()).toHaveText('180');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  await page.locator('.findings-table tbody tr').first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('button', { name: 'Execution timeline' })).toBeVisible();
  await expect(drawer.getByText('Policy boundary crossed').first()).toBeVisible();
  const replayRequest = page.waitForResponse(r => r.url().endsWith('/replay') && r.request().method() === 'POST');
  await drawer.getByRole('button', { name: 'Replay attack' }).click();
  const replay = await (await replayRequest).json() as Trace;
  expect(replay.outcome).toBe('success');
  expect(replay.replayOf).toBeTruthy();
  await expect(drawer.getByText('Replayed', { exact: true })).toBeVisible();
  const exported = await request.get(`/api/traces/${replay.id}/export`);
  expect(exported.ok()).toBe(true);
  const envelope = await exported.json();
  const imported = await request.post('/api/traces/import', { data: envelope });
  expect(imported.status()).toBe(201);
  const reproduced = await imported.json() as Trace;
  expect(reproduced.fingerprint).toBe(replay.fingerprint);
  expect(reproduced.steps).toEqual(replay.steps);
  await page.keyboard.press('Escape');
  await page.locator('.surface-row').filter({ hasText: 'Memory poisoning' }).click();
  await expect(page.getByLabel('Attack surface')).toHaveValue('memory');
  await expect(page.locator('.trace-table tbody tr').first()).toContainText('memory');
  await page.getByLabel('Filter traces').fill('does-not-match-any-trace');
  await expect(page.getByText('No matching traces')).toBeVisible();
  expect(errors).toEqual([]);
});

test('landing assessment executes a real selected synthetic campaign and exposes its exact evidence', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/landing');
  await page.getByRole('button', { name: 'Memory Store Poisoning' }).click();
  await expect(page.getByRole('button', { name: 'Memory Store Poisoning' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Launch Custom Test' }).click();
  const modal = page.getByRole('dialog', { name: /AgentBreak.*Security Assessment/ });
  await expect(modal).toBeVisible();
  await modal.getByRole('radio', { name: /Research Copilot/ }).check();
  await expect(modal.getByRole('checkbox', { name: /Memory poisoning/ })).toBeChecked();
  await expect(modal.locator('input[type=checkbox]:checked')).toHaveCount(1);
  await modal.getByRole('spinbutton', { name: 'Attempts' }).fill('5');
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/campaigns') && response.request().method() === 'POST');
  await modal.getByRole('button', { name: /Launch Assessment/ }).click();
  const response = await createdResponse;
  expect(response.status()).toBe(201);
  const created = await response.json();
  expect(created.targetId).toBe('research');
  expect(created.targetSnapshot.mode).toBe('simulation');
  expect(created.surfaces).toEqual(['memory']);
  await expect(modal.getByRole('status')).toHaveText('5 / 5 attempts completed · completed', { timeout: 20000 });
  const state = await (await request.get('/api/state')).json() as Store;
  const campaignTraces = state.traces.filter(trace => trace.campaignId === created.id && !trace.replayOf);
  expect(campaignTraces).toHaveLength(5);
  await expect(modal.locator('.la-totals > div').nth(0).locator('strong')).toHaveText(String(campaignTraces.filter(trace => trace.outcome === 'success').length));
  await expect(modal.locator('.la-totals > div').nth(1).locator('strong')).toHaveText(String(campaignTraces.filter(trace => trace.outcome === 'blocked').length));
  await expect(modal.locator('.la-evidence-note')).toContainText('not results from the platform’s independent verifier');
  await modal.locator('.la-traces button').first().click();
  await expect(modal.locator('.la-trace-detail > pre').first()).toHaveText(campaignTraces[0].input.payload);
  await expect(modal.getByRole('link', { name: /Download exact trace JSON/ })).toHaveAttribute('href', `/api/traces/${campaignTraces[0].id}/export`);
  await modal.getByRole('button', { name: 'Close assessment' }).click();
  await page.getByRole('button', { name: 'Security Assessment', exact: true }).click();
  await expect(modal.getByRole('status')).toHaveText('5 / 5 attempts completed · completed');
  await modal.getByRole('button', { name: 'New assessment', exact: true }).click();
  await expect(modal.getByRole('button', { name: /Launch Assessment/ })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('first-time overview explains the workflow and links the guided demo to real pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible();
  await expect(page.getByText('Run your first security test')).toBeVisible();
  await expect(page.getByText('THE FIRST TEST IN SIX STEPS')).toBeVisible();
  await expect(page.getByText('Recorded findings')).toBeVisible();
  await expect(page.getByText(/Synthetic simulation and real-LLM testing are different/)).toBeVisible();

  await page.getByRole('button', { name: 'Watch a quick demo' }).click();
  const demo = page.getByRole('dialog', { name: 'AgentBreak guided demo' });
  await expect(demo.getByText('NO VIDEO ASSET FOUND')).toBeVisible();
  await expect(demo.getByText('1 / 4')).toBeVisible();
  await demo.getByRole('button', { name: 'Next' }).click();
  await demo.getByRole('button', { name: 'Next' }).click();
  await demo.getByRole('button', { name: 'Next' }).click();
  await demo.getByRole('button', { name: 'Open Defense Lab' }).click();
  await expect(page.getByRole('heading', { name: 'Defense lab' })).toBeVisible();
});

test('primary destinations expose their grouped workflow views and quick test entry', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Quick Test' }).click();
  await expect(page.getByRole('heading', { name: 'Launch a new campaign' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Results & Evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Attack traces' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-results.png'), fullPage: true });
  await page.getByRole('button', { name: /Open Evidence Vault/ }).click();
  await expect(page.getByRole('heading', { name: 'Evidence vault' })).toBeVisible();

  await page.getByRole('button', { name: 'Fix & Retest' }).click();
  await expect(page.getByRole('heading', { name: 'Defense lab' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-fix-retest.png'), fullPage: true });
  await page.locator('.workflow-switcher').getByRole('button', { name: 'Regression Tests' }).click();
  await expect(page.getByRole('heading', { name: /Validation history|Confidence starts with a baseline/ })).toBeVisible();

  await page.getByRole('button', { name: 'Advanced Tools' }).click();
  await expect(page.getByRole('button', { name: 'AttackGraph' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Advanced Tools' }).click();
  await expect(page.getByRole('button', { name: 'AttackGraph' })).toHaveCount(1);
});

test('campaign creation streams progress and retains completed traces', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New campaign' }).click();
  await page.getByLabel('Campaign name').fill('Browser workflow verification');
  await page.getByLabel('Attack budget').fill('10');
  await page.getByRole('button', { name: 'Launch campaign' }).click();
  const row = page.getByRole('row').filter({ hasText: 'Browser workflow verification' });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Completed', { timeout: 20_000 });
  await expect(row).toContainText('10 / 10');
  await row.getByRole('button', { name: /^Browser workflow verification/ }).click();
  await expect(page.getByText('Showing 10 of 10 traces')).toBeVisible();
  const store = await (await request.get('/api/state')).json() as Store;
  const campaign = store.campaigns.find(c => c.name === 'Browser workflow verification')!;
  expect(campaign.successes).toBeGreaterThan(0);
  expect(campaign.completed).toBe(10);
  expect(campaign.errors).toBe(0);
});

test('defense validation retains legitimate utility and detects lockdown regressions', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open defense lab' }).click();
  await page.getByRole('button', { name: 'Run validation' }).click();
  await expect(page.getByRole('heading', { name: 'Validation results' })).toBeVisible();
  await expect(page.locator('.validation-metrics>div').nth(0)).toContainText('100%');
  await expect(page.locator('.validation-metrics>div').nth(1)).toContainText('100%');
  await expect(page.locator('.validation-verdict')).toHaveText('Protected');
  await page.getByLabel('Strict lockdown').check();
  await page.getByRole('button', { name: 'Run validation' }).click();
  await expect(page.locator('.validation-metrics>div').nth(1)).toContainText('0 of 5 tasks passed');
  await expect(page.locator('.validation-verdict')).toHaveText('Needs review');
  await page.getByLabel('Strict lockdown').uncheck();
  await page.getByRole('button', { name: 'Apply to future campaigns' }).click();
  await expect(page.getByRole('status')).toContainText('Defenses applied');
  const state = await (await request.get('/api/state')).json() as Store;
  expect(state.targets.find(t => t.id === 'atlas')!.defenses.toolPermissions).toBe(true);
  expect(state.validations.at(-1)!.utilityPassed).toBe(0);
  await page.getByRole('button', { name: 'Regression tests', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Validation history' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(2);
});

test('mobile dashboard, navigation, and campaign dialog stay within the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: /^Target agents/ }).click();
  await expect(page.getByRole('heading', { name: 'Target agents' })).toBeVisible();
  await page.getByRole('button', { name: 'Test this agent' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('API validates inputs, denies cross-origin mutation, and stops campaigns', async ({ request }) => {
  expect((await request.post('/api/campaigns', { data: { name: '', targetId: 'missing', surfaces: [], budget: 1000 } })).status()).toBe(400);
  expect((await request.post('/api/traces/import', { data: { schemaVersion: 1, trace: {} } })).status()).toBe(400);
  expect((await request.post('/api/campaigns', { headers: { Origin: 'https://unrelated.invalid' }, data: {} })).status()).toBe(403);
  const response = await request.post('/api/campaigns', { data: { name: 'Stop verification', targetId: 'atlas', surfaces: ['tools'], budget: 100, seed: 20 } });
  expect(response.status()).toBe(201);
  const campaign = await response.json();
  const stopped = await request.post(`/api/campaigns/${campaign.id}/stop`);
  expect((await stopped.json()).status).toBe('stopped');
  const state = await (await request.get('/api/state')).json() as Store;
  expect(state.campaigns.find(c => c.id === campaign.id)!.completed).toBeLessThan(100);
});

test('AttackGraph evidence, causal replay, Runtime Shield, and release gate are end-to-end', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^AttackGraph/ }).click();
  await expect(page.getByRole('heading', { name: 'AttackGraph' })).toBeVisible();
  await expect(page.getByText('Verified effects')).toBeVisible();
  await expect(page.getByText('Verified exploit').first()).toBeVisible();
  await page.getByRole('button', { name: 'Inspect full evidence' }).click();
  const evidence = page.getByRole('dialog');
  await evidence.getByRole('button', { name: 'Effect evidence' }).click();
  await expect(evidence.getByText('Independent oracle verdict')).toBeVisible();
  await evidence.getByRole('button', { name: 'Find root cause' }).click();
  await expect(evidence.getByText('Necessary path isolated')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Runtime Shield' }).click();
  await expect(page.getByRole('heading', { name: 'Runtime Shield' })).toBeVisible();
  await page.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByText('Session active')).toBeVisible();
  const runtimeEvent = page.waitForResponse(response => response.url().includes('/api/platform/sessions/') && response.url().endsWith('/events'));
  await page.getByRole('button', { name: 'Execute' }).first().click();
  expect((await runtimeEvent).status()).toBe(201);
  await expect(page.getByText('Decision stream')).toBeVisible();
  const platformAfterEvent = await (await request.get('/api/platform')).json();
  expect(platformAfterEvent.sessions.some((session: { events: unknown[] }) => session.events.length === 1)).toBe(true);
  await expect(page.locator('.event-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Release gate' }).click();
  await expect(page.getByRole('heading', { name: 'Release gate', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run release gate' }).click();
  await expect(page.getByText(/Release blocked by evidence|Your release gate is waiting/)).toBeVisible();
  await page.getByRole('button', { name: 'Evidence vault' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence vault' })).toBeVisible();
  await expect(page.getByText('CHAIN INTACT')).toBeVisible();
  const report = await request.get('/api/platform/report');
  expect(report.ok()).toBe(true);
  const reportBody = await report.json();
  expect(reportBody.platform.integrity.valid).toBe(true);
  expect(errors).toEqual([]);
});
