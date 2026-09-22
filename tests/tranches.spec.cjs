#!/usr/bin/env node
'use strict';

/* Regression coverage for projects split into common, T1 and T2 scopes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const STORE_KEY = 'plaaning.v1';

function server() {
  const instance = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = path.resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${ROOT}${path.sep}`)) return res.writeHead(403).end();
    fs.readFile(file, (error, body) => {
      if (error) return res.writeHead(404).end();
      res.writeHead(200, { 'content-type': path.extname(file) === '.html' ? 'text/html; charset=utf-8' : 'text/plain', 'cache-control': 'no-store' });
      res.end(body);
    });
  });
  return new Promise((resolve, reject) => {
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${instance.address().port}/`,
      close: () => new Promise(done => instance.close(done)),
    }));
  });
}

async function fresh(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 960 } });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  await page.goto(url);
  await page.waitForFunction(() => window.PM && typeof PM.create === 'function');
  return { context, page };
}

async function testLegacyMigration(browser, url) {
  const { context, page } = await fresh(browser, url);
  const ids = await page.evaluate(() => {
    const p = PM.create({ name: 'Migration tranches', title: 'Données historiques', tranche: '1' });
    const t = PM.addTask(p.id, { title: 'Action historique', phaseId: p.phases[0].id, status: 'doing', deadline: '2026-10-12', note: 'Note conservée' });
    const slot = PM.scheduleSession(p.id, { phaseId: p.phases[0].id, taskIds: [t.id], date: '2026-10-06', start: '09:00', end: '10:30' });
    const state = JSON.parse(localStorage.getItem('plaaning.v1'));
    const storedProject = state.projects.find(x => x.id === p.id);
    storedProject.tranche = '1';
    delete storedProject.trancheDetails;
    storedProject.tasks.forEach(task => delete task.tranche);
    localStorage.setItem('plaaning.v1', JSON.stringify(state));
    return { pid: p.id, tid: t.id, sid: slot.id };
  });
  await page.reload();
  await page.waitForFunction(() => window.PM && typeof PM.tranches === 'function');
  const migrated = await page.evaluate(ids => {
    const legacy = PM.get(ids.pid);
    const upgraded = PM.update(ids.pid, { tranche: 'both' });
    return { legacy, upgraded, slot: PM.session(ids.sid) };
  }, ids);
  assert.equal(migrated.upgraded.id, ids.pid, 'la migration conserve l’identifiant du projet');
  assert.equal(migrated.legacy.tranche, '1', 'la migration conserve la tranche historique du projet');
  assert.equal(migrated.upgraded.tranche, 'both', 'le projet historique peut ensuite activer T1 + T2');
  assert.deepEqual(await page.evaluate(pid => PM.tranches(pid), ids.pid), ['common', '1', '2']);
  assert.equal(migrated.upgraded.tasks[0].id, ids.tid, 'la migration conserve l’identifiant de l’action');
  assert.equal(migrated.upgraded.tasks[0].tranche, '1', 'une action d’un ancien projet T1 reste rattachée à T1');
  assert.equal(migrated.upgraded.tasks[0].status, 'doing');
  assert.equal(migrated.upgraded.tasks[0].deadline, '2026-10-12');
  assert.equal(migrated.upgraded.tasks[0].note, 'Note conservée');
  assert.equal(migrated.slot.id, ids.sid, 'la migration conserve la séance');
  assert.deepEqual(migrated.slot.taskIds, [ids.tid]);
  assert.equal(migrated.slot.tranche, '1', 'la séance historique reste rattachée à T1');
  await context.close();
}

async function testScopeAndDeadlines(browser, url) {
  const { context, page } = await fresh(browser, url);
  const got = await page.evaluate(() => {
    const p = PM.create({ name: 'Deux tranches', title: 'Indépendance', tranche: 'both' });
    const phase = p.phases[0].id;
    const common = PM.addTask(p.id, { title: 'Socle', phaseId: phase, tranche: 'common', status: 'doing' });
    const t1 = PM.addTask(p.id, { title: 'Même intitulé', phaseId: phase, tranche: '1', status: 'done', deadline: '2026-11-03' });
    const t2 = PM.addTask(p.id, { title: 'Même intitulé', phaseId: phase, tranche: '2', status: 'todo', deadline: '2026-12-04' });
    PM.updateTranche(p.id, '1', { deadline: '2026-11-20', phaseId: phase });
    PM.updateTranche(p.id, '2', { deadline: '2026-12-21', phaseId: phase });
    return {
      project: PM.get(p.id), ids: { common: common.id, t1: t1.id, t2: t2.id },
      labels: ['common', '1', '2', 'both'].map(PM.trancheLabel),
      scopes: PM.tranches(p.id),
    };
  });
  assert.deepEqual(got.scopes, ['common', '1', '2']);
  assert.deepEqual(got.labels, ['Commun', 'T1', 'T2', 'T1 + T2']);
  assert.equal(new Set(Object.values(got.ids)).size, 3, 'les actions de même titre restent des objets distincts');
  assert.equal(got.project.tasks.find(t => t.id === got.ids.t1).status, 'done');
  assert.equal(got.project.tasks.find(t => t.id === got.ids.t2).status, 'todo');
  assert.equal(got.project.tasks.filter(t => t.id === got.ids.common).length, 1, 'l’action commune reste canonique et unique');
  assert.deepEqual(got.project.trancheDetails, {
    1: { deadline: '2026-11-20', phaseId: got.project.phases[0].id },
    2: { deadline: '2026-12-21', phaseId: got.project.phases[0].id },
  });
  await context.close();
}

async function testSessionsAndAtomicValidation(browser, url) {
  const { context, page } = await fresh(browser, url);
  const got = await page.evaluate(() => {
    const p = PM.create({ name: 'Séances tranchées', tranche: 'both' });
    const phase = p.phases[0].id;
    const common = PM.addTask(p.id, { title: 'Commune', phaseId: phase, tranche: 'common' });
    const one = PM.addTask(p.id, { title: 'T1', phaseId: phase, tranche: '1' });
    const two = PM.addTask(p.id, { title: 'T2', phaseId: phase, tranche: '2' });
    const availableCommon = PM.availableTasks(p.id, phase, 'common');
    const available1 = PM.availableTasks(p.id, phase, '1');
    const available2 = PM.availableTasks(p.id, phase, '2');
    const slot = PM.scheduleSession(p.id, { tranche: '1', phaseId: phase, taskIds: [one.id], date: '2026-10-08', start: '08:30', end: '10:00' });
    const slot2 = PM.scheduleSession(p.id, { tranche: '2', phaseId: phase, taskIds: [two.id], date: '2026-10-08', start: '13:30', end: '15:00' });
    const before = JSON.stringify(JSON.parse(localStorage.getItem('plaaning.v1')));
    let mixed = '', invalid = '', invalidMetadata = '', scheduledScope = '';
    try { PM.scheduleSession(p.id, { tranche: '1', phaseId: phase, taskIds: [common.id, one.id], date: '2026-10-08', start: '11:00', end: '12:00' }); } catch (error) { mixed = error.message; }
    const afterMixed = JSON.stringify(JSON.parse(localStorage.getItem('plaaning.v1')));
    const bad = JSON.parse(before); bad.projects.find(x => x.id === p.id).tasks.find(x => x.id === two.id).tranche = 'bad';
    try { PM.validate(bad); } catch (error) { invalid = error.message; }
    const badMetadata = JSON.parse(before); badMetadata.projects.find(x => x.id === p.id).trancheDetails.bad = { deadline: '2026-10-09', phaseId: phase };
    try { PM.validate(badMetadata); } catch (error) { invalidMetadata = error.message; }
    const tasks = PM.get(p.id).tasks.map(task => Object.assign({}, task, task.id === one.id ? { tranche: '2' } : {}));
    try { PM.update(p.id, { tasks }); } catch (error) { scheduledScope = error.message; }
    const afterScheduledScope = JSON.stringify(JSON.parse(localStorage.getItem('plaaning.v1')));
    PM.setPlanningTrancheFilter('1');
    const slotsAfterFilter = PM.slots(p.id);
    return { p: PM.get(p.id), common, one, two, availableCommon, available1, available2, slot, slot2, slots: slotsAfterFilter, mixed, invalid, invalidMetadata, scheduledScope, before, afterMixed, afterScheduledScope };
  });
  assert.deepEqual(got.availableCommon.map(t => t.id), [got.common.id], 'la portée commune reste une séance distincte');
  assert.deepEqual(got.available1.map(t => t.id), [got.one.id], 'T1 ne propose que les actions T1');
  assert.deepEqual(got.available2.map(t => t.id), [got.two.id], 'T2 ne propose que les actions T2');
  assert.equal(got.slot.tranche, '1');
  assert.deepEqual(got.slots.map(slot => slot.tranche), ['1', '2'], 'PM.slots expose la tranche de chaque séance');
  assert.match(got.mixed, /tranche|mélang|action/i, 'une séance refuse de mélanger T1 et T2');
  assert.equal(got.afterMixed, got.before, 'le rejet d’une séance mixte est atomique');
  assert.match(got.invalid, /tranche/i, 'la validation de sauvegarde refuse une portée invalide');
  assert.match(got.invalidMetadata, /tranche|métadonnée/i, 'la validation refuse aussi une métadonnée de tranche inconnue');
  assert.match(got.scheduledScope, /tranche|séance|planifi/i, 'une mise à jour groupée refuse de déplacer une action planifiée');
  assert.equal(got.afterScheduledScope, got.before, 'le changement groupé de portée planifiée est atomique');
  assert.equal(got.slots.length, 2, 'filtrer le planning ne supprime aucune séance');
  await page.evaluate(() => PM.openDate('2026-10-08'));
  assert.ok(await page.locator(`#chrono [data-t="${got.one.id}"]`).count() > 0, 'le filtre T1 conserve la séance T1 dans le planning');
  assert.equal(await page.locator(`#chrono [data-t="${got.two.id}"]`).count(), 0, 'le filtre T1 masque la séance T2');
  await page.reload();
  assert.deepEqual(await page.evaluate(pid => PM.slots(pid).map(slot => slot.tranche), got.p.id), ['1', '2'], 'les tranches de séance survivent au rechargement');
  await context.close();
}

async function testCopyTranche(browser, url) {
  const { context, page } = await fresh(browser, url);
  const got = await page.evaluate(() => {
    const p = PM.create({ name: 'Copie T1 vers T2', tranche: 'both' });
    const phase = p.phases[0].id;
    const common = PM.addTask(p.id, { title: 'Référence commune', phaseId: phase, tranche: 'common', status: 'done' });
    const first = PM.addTask(p.id, { title: 'Préparer', phaseId: phase, tranche: '1', status: 'todo', deadline: '2026-10-01', followUpDate: '2026-09-28', blockedReason: 'Ancien blocage', manualUrgency: 'critical', dependsOn: [common.id] });
    const second = PM.addTask(p.id, { title: 'Contrôler', phaseId: phase, tranche: '1', status: 'todo', deadline: '2026-10-02', dependsOn: [first.id, common.id] });
    PM.scheduleSession(p.id, { tranche: '1', phaseId: phase, taskIds: [first.id, second.id], date: '2026-10-01', start: '09:00', end: '11:00' });
    PM.updateTask(p.id, first.id, { status: 'done' });
    PM.updateTask(p.id, second.id, { status: 'doing' });
    const copies = PM.copyTrancheTasks(p.id, '1', '2');
    return { common, first, second, copies, slots: PM.slots(p.id), project: PM.get(p.id) };
  });
  assert.equal(got.copies.length, 2);
  assert.equal(got.copies.every(t => t.tranche === '2' && t.status === 'todo' && !t.deadline && !t.followUpDate && !t.blockedReason && t.manualUrgency === 'auto'), true, 'les copies repartent à faire sans dates ni blocage');
  assert.equal(got.copies.some(t => [got.first.id, got.second.id].includes(t.id)), false, 'chaque copie reçoit un identifiant neuf');
  const copiedFirst = got.copies.find(t => t.title === 'Préparer');
  const copiedSecond = got.copies.find(t => t.title === 'Contrôler');
  assert.deepEqual(copiedFirst.dependsOn, [got.common.id], 'une référence commune est conservée');
  assert.deepEqual(copiedSecond.dependsOn.sort(), [copiedFirst.id, got.common.id].sort(), 'une dépendance interne est remappée');
  assert.equal(got.slots.length, 1, 'la copie ne crée aucun créneau');
  assert.deepEqual(got.slots[0].taskIds, [got.first.id, got.second.id]);
  await context.close();
}

async function testFormsAndTabs(browser, url) {
  const { context, page } = await fresh(browser, url);
  await page.locator('[data-pm-action="new-project"]').first().click();
  const projectForm = page.locator('#pmProjectForm');
  const projectTranches = await projectForm.locator('select[name="tranche"] option').evaluateAll(options => options.map(o => [o.value, o.textContent.trim()]));
  assert.deepEqual(projectTranches.map(option => option[0]), ['', '1', '2', 'both'], 'le formulaire permet de créer un projet à deux tranches');
  assert.match(projectTranches[3][1], /(?:T1.*T2|Tranches? 1.*2)/i, 'le choix des deux tranches a un libellé explicite');
  await projectForm.locator('[name="name"]').fill('Projet UI T1 + T2');
  await projectForm.locator('[name="tranche"]').selectOption('both');
  await projectForm.getByRole('button', { name: /Créer le projet/i }).click();
  await page.waitForSelector('[data-pm-action="tranche-tab"]');
  assert.deepEqual(await page.locator('[data-pm-action="tranche-tab"]').evaluateAll(buttons => buttons.map(b => b.dataset.tranche)), ['all', 'common', '1', '2'], 'la fiche expose les quatre vues de tranche');

  await page.getByRole('button', { name: /Ajouter une action/i }).first().click();
  const taskForm = page.locator('#pmTaskForm');
  const tranche = taskForm.locator('select[name="tranche"]');
  await tranche.waitFor({ state: 'visible' });
  assert.equal(await tranche.inputValue(), 'common', 'une nouvelle action est commune par défaut');
  assert.deepEqual(await tranche.locator('option').evaluateAll(options => options.map(o => o.textContent.trim())), ['Commun', 'T1', 'T2']);
  await taskForm.locator('[name="title"]').fill('Action UI T2');
  await tranche.selectOption('2');
  await taskForm.getByRole('button', { name: /^Enregistrer$/ }).click();

  const ids = await page.evaluate(() => { const p = PM.projects().find(x => x.name === 'Projet UI T1 + T2'); return { pid: p.id, tid: p.tasks[0].id, phase: p.phases[0].id }; });
  await page.evaluate(({ pid, phase }) => { PM.updateTranche(pid, '2', { deadline: '2026-10-09', phaseId: phase }); projectNavigate('project', pid); }, ids);
  await page.locator('[data-pm-action="tranche-tab"][data-tranche="2"]').click();
  assert.ok(await page.locator('.pmTaskTitle[value="Action UI T2"]').first().isVisible(), 'l’action T2 apparaît dans son onglet');
  assert.equal((await page.locator('.pmTaskRow .pmScope').first().textContent()).trim(), 'T2', 'le libellé de tranche est visible');
  assert.equal(await page.locator('[data-pm-action="tranche-deadline"][data-tranche="2"]').inputValue(), '2026-10-09', 'la deadline de tranche est visible et éditable');
  const taskCheck = page.locator(`[data-pm-action="toggle-task"][data-tid="${ids.tid}"]`);
  await taskCheck.check();
  assert.equal(await page.evaluate(({ pid, tid }) => PM.get(pid).tasks.find(t => t.id === tid).status, ids), 'done', 'la coche met à jour l’action de la tranche affichée');
  await taskCheck.uncheck();

  await page.evaluate(() => PM.openDate('2026-10-09'));
  const deadlineMarker = page.locator('#rail .pdRailDeadline[data-date="2026-10-09"]');
  await deadlineMarker.hover();
  assert.equal(await page.locator('#pdPopover .pdItem[data-tranche="2"]').count(), 1, 'le rail rattache l’échéance à T2');
  assert.equal((await page.locator('#pdPopover .pdScope').textContent()).trim(), 'T2', 'la bulle du rail affiche la portée T2');

  await page.evaluate(({ pid, tid }) => openPlanningSession({ projectId: pid, taskIds: [tid], tranche: '2' }), ids);
  const sessionForm = page.locator('#psSessionForm');
  const sessionTranche = sessionForm.locator('select[name="tranche"]');
  await sessionTranche.waitFor({ state: 'visible' });
  assert.equal(await sessionTranche.inputValue(), '2', 'le formulaire de séance reprend la tranche de l’action');
  assert.deepEqual(await sessionTranche.locator('option').evaluateAll(options => options.map(o => o.textContent.trim())), ['Commun', 'T1', 'T2']);
  await context.close();
}

async function testBothProjectTemplateUI(browser, url) {
  const { context, page } = await fresh(browser, url);
  const original = await page.evaluate(() => {
    const p = PM.create({ name: 'Source modèle tranché', tranche: 'both', phases: [{ id: 'source-study', title: 'Études' }, { id: 'source-work', title: 'Travaux' }] });
    PM.addTask(p.id, { title: 'Action T1 modèle', tranche: '1', phaseId: 'source-study', deadline: '2026-11-01' });
    PM.addTask(p.id, { title: 'Action T2 modèle', tranche: '2', phaseId: 'source-work', deadline: '2026-12-01' });
    PM.updateTranche(p.id, '1', { phaseId: 'source-study', deadline: '2026-11-15' });
    PM.updateTranche(p.id, '2', { phaseId: 'source-work', deadline: '2026-12-15' });
    projectNavigate('project', p.id);
    return PM.get(p.id);
  });
  await page.locator('[data-pm-action="tranche-tab"][data-tranche="1"]').click();
  page.once('dialog', dialog => dialog.accept('Modèle deux tranches'));
  await page.locator('[data-pm-action="save-template"]').click();
  await page.evaluate(() => projectNavigate('settings'));
  const template = page.locator('.pmTemplate').filter({ hasText: 'Modèle deux tranches' });
  await template.locator('[data-pm-action="new-from-template"]').click();
  const form = page.locator('#pmProjectForm');
  assert.equal(await form.locator('[name="tranche"]').inputValue(), 'both');
  await form.locator('[name="name"]').fill('Clone modèle tranché');
  await form.getByRole('button', { name: /Créer le projet/i }).click();
  const clone = await page.evaluate(() => PM.projects().find(p => p.name === 'Clone modèle tranché'));
  assert.ok(clone, 'le formulaire crée le projet depuis le modèle');
  assert.equal(clone.tranche, 'both');
  assert.equal(clone.tasks.length, 2);
  assert.deepEqual(clone.tasks.map(task => task.tranche).sort(), ['1', '2']);
  assert.equal(clone.tasks.every(task => !task.deadline), true, 'les échéances des actions sont réinitialisées');
  assert.equal(clone.trancheDetails['1'].deadline, '');
  assert.equal(clone.trancheDetails['2'].deadline, '');
  const newPhaseIds = clone.phases.map(phase => phase.id);
  assert.equal(newPhaseIds.some(id => original.phases.some(phase => phase.id === id)), false, 'le clone régénère les identifiants de phase');
  assert.equal(clone.tasks.every(task => newPhaseIds.includes(task.phaseId)), true, 'les actions pointent vers les nouvelles phases');
  assert.equal(['1', '2'].every(scope => newPhaseIds.includes(clone.trancheDetails[scope].phaseId)), true, 'les métadonnées de tranche pointent vers les nouvelles phases');
  await context.close();
}

async function run() {
  const local = process.env.PLAANING_URL ? null : await server();
  const url = process.env.PLAANING_URL || local.url;
  const options = { headless: true };
  if (process.env.CHROMIUM_PATH) options.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(options);
  let failures = 0;
  const tests = [
    ['migration historique vers T1 + T2', testLegacyMigration],
    ['portées, libellés et échéances indépendantes', testScopeAndDeadlines],
    ['séances tranchées et validation atomique', testSessionsAndAtomicValidation],
    ['copie T1 vers T2', testCopyTranche],
    ['formulaires et onglets de tranche', testFormsAndTabs],
    ['modèle UI à deux tranches', testBothProjectTemplateUI],
  ];
  try {
    for (const [name, test] of tests) {
      try { await test(browser, url); process.stdout.write(`✓ ${name}\n`); }
      catch (error) { failures++; process.stderr.write(`✗ ${name}\n${error.stack || error}\n`); }
    }
  } finally { await browser.close(); if (local) await local.close(); }
  if (failures) process.exitCode = 1;
}

run().catch(error => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
