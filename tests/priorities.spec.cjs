#!/usr/bin/env node
'use strict';

/* Regression tests for project priority, dependency and project-detail data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const STORE_KEY = 'plaaning.v1';

function server() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  const instance = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = path.resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${ROOT}${path.sep}`)) return res.writeHead(403).end();
    fs.readFile(file, (error, body) => {
      if (error) return res.writeHead(404).end();
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
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

async function fresh(browser, url, options = {}) {
  const context = await browser.newContext({ viewport: options.viewport || { width: 1280, height: 900 }, colorScheme: options.colorScheme || 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(url);
  await page.waitForFunction(() => window.PM && typeof PM.urgency === 'function');
  return { context, page };
}

async function testUrgencyBoundaries(browser, url) {
  const { context, page } = await fresh(browser, url);
  const got = await page.evaluate(() => {
    const u = (importance, deadline, manualUrgency) => PM.urgency({ id: `${importance}-${deadline}`, title: 'Action', status: 'todo', importance, deadline, manualUrgency }, '2026-03-25');
    return {
      n1: [u(1, '2026-04-05'), u(1, '2026-04-04'), u(1, '2026-03-30'), u(1, '2026-03-27')],
      n2: [u(2, '2026-03-25'), u(2, '2026-03-24'), u(2, '2026-03-22'), u(2, '2026-03-18')],
      n3: [u(3, '2026-03-25'), u(3, '2026-03-18'), u(3, '2026-03-04'), u(3, '2026-01-01')],
      manual: u(3, '2027-01-01', 'urgent'),
      cannotLower: u(1, '2026-03-25', 'watch'),
      fallback: PM.urgency({ title: 'Sans niveau', status: 'todo', deadline: '2026-03-28' }, '2026-03-25'),
      done: PM.urgency({ title: 'Terminée', status: 'done', importance: 1, deadline: '2020-01-01', manualUrgency: 'critical' }, '2026-03-25'),
      dst: PM.urgency({ title: 'DST', status: 'todo', importance: 2, deadline: '2026-03-28' }, '2026-03-29'),
    };
  });
  assert.deepEqual(got.n1.map(x => x.level), ['normal', 'watch', 'urgent', 'critical'], 'N1 doit basculer exactement à J-10, J-5 et J-2');
  assert.deepEqual(got.n2.map(x => x.level), ['normal', 'watch', 'urgent', 'critical'], 'N2 doit basculer exactement à J+1, J+3 et J+7');
  assert.deepEqual(got.n3.map(x => x.level), ['normal', 'watch', 'urgent', 'urgent'], 'N3 doit basculer à J+7/J+21 sans critique automatique');
  assert.equal(got.manual.level, 'urgent', 'une priorité manuelle peut relever une échéance lointaine');
  assert.equal(got.manual.automatic, 'normal', 'le niveau automatique reste exposé sous une priorité manuelle');
  assert.equal(got.cannotLower.level, 'critical', 'la priorité manuelle ne doit pas masquer une alerte automatique supérieure');
  assert.equal(got.fallback.level, 'normal', 'l’importance absente vaut N2');
  assert.equal(got.done.level, 'normal', 'une tâche terminée est exclue des alertes');
  assert.equal(got.dst.daysRemaining, -1, 'le calcul calendaire reste exact au changement d’heure');
  for (const item of [...got.n1, ...got.n2, ...got.n3, got.manual]) {
    assert.equal(typeof item.rank, 'number');
    assert.equal(typeof item.reason, 'string');
    assert.equal(typeof item.daysRemaining, 'number');
    assert.equal(typeof item.manual, 'string');
  }
  await context.close();
}

async function testSortingAndRules(browser, url) {
  const { context, page } = await fresh(browser, url);
  const result = await page.evaluate(() => {
    const tasks = [
      { id: 'later', title: 'Plus tard', status: 'todo', importance: 1, deadline: '2026-04-04' },
      { id: 'critical', title: 'Critique', status: 'todo', importance: 2, deadline: '2026-03-18' },
      { id: 'done', title: 'Finie', status: 'done', importance: 1, deadline: '2020-01-01' },
      { id: 'manual', title: 'Manuelle', status: 'todo', importance: 3, deadline: '', manualUrgency: 'urgent' },
    ];
    const before = JSON.stringify(tasks);
    const sorted = PM.sortTasks(tasks, '2026-03-25');
    const defaults = PM.urgencyRules();
    PM.setUrgencyRules({ ...defaults, 2: { watch: 4, urgent: 8, critical: 12 } });
    return { before, afterInput: JSON.stringify(tasks), ids: sorted.map(x => x.id), defaults, changed: PM.urgencyRules(), persisted: JSON.parse(localStorage.getItem('plaaning.v1')).urgencyRules };
  });
  assert.equal(result.afterInput, result.before, 'le tri ne doit pas muter la liste appelante');
  assert.deepEqual(result.ids, ['critical', 'manual', 'later', 'done'], 'le tri place les alertes fortes en tête et les tâches finies à la fin');
  assert.deepEqual(result.defaults['1'] || result.defaults[1], { watch: -10, urgent: -5, critical: -2 });
  assert.equal((result.changed['2'] || result.changed[2]).critical, 12, 'les seuils personnalisés sont relus');
  assert.deepEqual(result.persisted, result.changed, 'les règles sont persistées immédiatement');
  await page.reload();
  assert.equal(await page.evaluate(() => (PM.urgencyRules()['2'] || PM.urgencyRules()[2]).urgent), 8, 'les règles survivent au rechargement');
  await context.close();
}

async function testDataAndDependencies(browser, url) {
  const { context, page } = await fresh(browser, url);
  const outcome = await page.evaluate(() => {
    const p = PM.create({
      name: 'Dossier QA', title: 'Contrat enrichi', phases: [{ id: 'p', title: 'Phase' }],
      milestones: [{ id: 'm1', title: 'Dépôt', date: '2026-05-04', done: false }],
      readiness: [{ id: 'r1', title: 'Pièces reçues', done: true }],
      documents: [{ id: 'd1', title: 'Note locale', kind: 'local', target: 'Texte conservé' }, { id: 'd2', title: 'Portail', kind: 'url', target: 'https://example.test/dossier' }],
      contacts: [{ id: 'c1', name: 'Camille Test', role: 'MOA', email: 'camille@example.test', phone: '0102030405' }],
      history: [], taskFields: [{ id: 'tf1', title: 'Visa requis' }],
    });
    const first = PM.addTask(p.id, { title: 'Préparer', phaseId: 'p', importance: 1, assigneeId: 'c1', validatorId: 'c1', fields: { tf1: 'Oui' } });
    const second = PM.addTask(p.id, { title: 'Valider', phaseId: 'p', importance: 2, dependsOn: [first.id], blockedReason: 'Attente préparation', followUpDate: '2026-05-02', manualUrgency: 'watch' });
    let blocked = '';
    try { PM.updateTask(p.id, second.id, { status: 'doing' }); } catch (error) { blocked = error.message; }
    PM.updateTask(p.id, first.id, { status: 'done' });
    PM.updateTask(p.id, second.id, { status: 'doing', note: 'Tout doit rester' });
    let cycle = '';
    try { PM.updateTask(p.id, first.id, { dependsOn: [second.id] }); } catch (error) { cycle = error.message; }
    const afterEdit = PM.get(p.id).tasks.find(x => x.id === second.id);
    PM.addDecision(p.id, 'Go validé');
    PM.removeTask(p.id, first.id);
    const final = PM.get(p.id);
    return { p, first, second, blocked, cycle, afterEdit, final };
  });
  assert.match(outcome.blocked, /dépend|bloqu|termin/i, 'une dépendance ouverte empêche le démarrage');
  assert.match(outcome.cycle, /cycle|dépend/i, 'un cycle est rejeté');
  assert.equal(outcome.afterEdit.importance, 2, 'une édition partielle conserve l’importance');
  assert.deepEqual(outcome.afterEdit.dependsOn, [outcome.first.id], 'une édition partielle conserve les dépendances');
  assert.equal(outcome.afterEdit.followUpDate, '2026-05-02');
  assert.equal(outcome.final.documents[0].target, 'Texte conservé', 'le contenu local reste du texte, sans transformation en URL');
  assert.ok(outcome.final.history.some(item => item.type === 'decision' && item.text === 'Go validé'), 'une décision est ajoutée à l’historique');
  assert.deepEqual(outcome.final.tasks[0].dependsOn, [], 'supprimer une tâche nettoie les dépendances entrantes');
  assert.equal(outcome.final.milestones[0].date, '2026-05-04');
  assert.equal(outcome.final.readiness[0].done, true);
  assert.equal(outcome.final.contacts[0].email, 'camille@example.test');
  assert.equal(outcome.final.taskFields[0].title, 'Visa requis');
  await page.reload();
  const persisted = await page.evaluate(id => PM.get(id), outcome.p.id);
  assert.equal(persisted.documents[0].target, 'Texte conservé');
  assert.ok(persisted.history.some(item => item.type === 'decision' && item.text === 'Go validé'));
  await context.close();
}

async function testValidationIsAtomic(browser, url) {
  const { context, page } = await fresh(browser, url);
  const checked = await page.evaluate(() => {
    PM.create({ name: 'Base validation', title: 'Base validation' });
    const original = localStorage.getItem('plaaning.v1');
    const base = JSON.parse(original);
    const failures = {};
    const attempt = (name, mutate) => {
      const candidate = JSON.parse(JSON.stringify(base)); mutate(candidate);
      try { PM.validate(candidate); failures[name] = ''; } catch (error) { failures[name] = error.message; }
    };
    attempt('unsafe', s => s.projects.push({ id: 'unsafe', name: 'X', title: 'X', phases: [{ id: 'p', title: 'P' }], tasks: [], labels: [], documents: [{ id: 'd', title: 'X', kind: 'url', target: 'javascript:alert(1)' }] }));
    attempt('missingDependency', s => s.projects.push({ id: 'ref', name: 'X', title: 'X', phases: [{ id: 'p', title: 'P' }], labels: [], tasks: [{ id: 't', title: 'T', phaseId: 'p', status: 'todo', deadline: '', labels: [], note: '', dependsOn: ['absent'] }] }));
    attempt('cycle', s => s.projects.push({ id: 'cycle', name: 'X', title: 'X', phases: [{ id: 'p', title: 'P' }], labels: [], tasks: [{ id: 'a', title: 'A', phaseId: 'p', status: 'todo', deadline: '', labels: [], note: '', dependsOn: ['b'] }, { id: 'b', title: 'B', phaseId: 'p', status: 'todo', deadline: '', labels: [], note: '', dependsOn: ['a'] }] }));
    attempt('unknownField', s => s.projects.push({ id: 'field-ref', name: 'X', title: 'X', phases: [{ id: 'p', title: 'P' }], labels: [], taskFields: [], tasks: [{ id: 't', title: 'T', phaseId: 'p', status: 'todo', deadline: '', labels: [], note: '', fields: { removed: 'ne pas perdre silencieusement' } }] }));
    return { failures, unchanged: localStorage.getItem('plaaning.v1') === original };
  });
  assert.match(checked.failures.unsafe, /url|lien|protocole|document/i);
  assert.match(checked.failures.missingDependency, /dépend|référence/i);
  assert.match(checked.failures.cycle, /cycle|dépend/i);
  assert.match(checked.failures.unknownField, /champ|colonne|inconnue/i, 'un champ orphelin dans une sauvegarde doit être rejeté, pas supprimé');
  assert.equal(checked.unchanged, true, 'les validations rejetées ne mutent pas le stockage');
  await context.close();
}

async function testAtomicCreateAndTaskDefaults(browser, url) {
  const { context, page } = await fresh(browser, url);
  const result = await page.evaluate(() => {
    PM.create({ name: 'Référence atomique', title: 'État initial' });
    const beforeStorage = localStorage.getItem('plaaning.v1');
    const beforeProjects = JSON.stringify(PM.projects());
    let error = '';
    try { PM.create({ name: 'Projet invalide', title: 'Projet invalide', documents: [{ id: 'bad', title: 'Piège', kind: 'url', target: 'javascript:alert(1)' }] }); }
    catch (ex) { error = ex.message; }
    const unchangedProjects = beforeProjects === JSON.stringify(PM.projects());
    const unchangedStorage = beforeStorage === localStorage.getItem('plaaning.v1');
    const project = PM.create({ name: 'Conservation', title: 'Avant', taskFields: [{ id: 'ref', title: 'Référence' }] });
    const task = PM.addTask(project.id, { title: 'Action minimale', fields: { ref: 'ABC-12' } });
    PM.updateTask(project.id, task.id, { status: 'doing' });
    PM.update(project.id, { title: 'Après' });
    const after = PM.get(project.id).tasks[0];
    return {
      error,
      unchangedProjects,
      unchangedStorage,
      task: after,
    };
  });
  assert.match(result.error, /url|http|document/i);
  assert.equal(result.unchangedProjects, true, 'la création invalide ne doit pas ajouter de projet');
  assert.equal(result.unchangedStorage, true, 'la création invalide ne doit pas écrire le projet rejeté');
  assert.equal(result.task.importance, 2);
  assert.equal(result.task.manualUrgency, 'auto');
  assert.deepEqual(result.task.dependsOn, []);
  assert.equal(result.task.blockedReason, '');
  assert.equal(result.task.followUpDate, '');
  assert.equal(result.task.assigneeId, '');
  assert.equal(result.task.validatorId, '');
  assert.deepEqual(result.task.fields, { ref: 'ABC-12' }, 'renommer/statuer le projet et la tâche conserve les champs personnalisés');
  assert.equal(result.task.status, 'doing');
  await context.close();
}

async function testDetailFormsAndAssignment(browser, url) {
  const { context, page } = await fresh(browser, url);
  const pid = await page.evaluate(() => PM.create({ name: 'Formulaires réels', title: 'Suivi complet' }).id);
  const projects = page.getByRole('button', { name: /projets/i }).first(); if (await projects.count()) await projects.click();
  await page.getByText('Formulaires réels', { exact: true }).first().click();

  async function add(section, buttonName, values) {
    const root = page.locator(`details[data-detail-section="${section}"]`);
    if (!(await root.evaluate(el => el.open))) await root.locator(':scope > summary').click();
    await root.getByRole('button', { name: buttonName }).click();
    const dialog = page.locator('#pmDetailDialog');
    for (const [label, value] of values) {
      const input = dialog.getByLabel(label);
      if (typeof value === 'object') await input.selectOption(value);
      else await input.fill(value);
    }
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  }
  await add('milestones', /ajouter un jalon/i, [[/^titre/i, 'Jalon sans date']]);
  await add('readiness', /ajouter un élément/i, [[/élément à vérifier/i, 'Autorisation reçue']]);
  await add('documents', /ajouter un document/i, [[/^nom/i, 'Dossier local'], [/^type/i, { label: 'Chemin sur ce PC' }], [/adresse ou chemin/i, 'C:\\Dossiers\\Projet']]);
  await add('contacts', /ajouter un contact/i, [[/^nom/i, 'Alex Test'], [/responsabilité/i, 'Validation'], [/e-mail/i, 'alex@example.test']]);

  const contactId = await page.evaluate(id => PM.get(id).contacts[0].id, pid);
  await page.getByRole('button', { name: /ajouter une action ici/i }).first().click();
  const taskDialog = page.locator('#pmTaskDialog');
  await taskDialog.getByLabel(/^action/i).fill('Action assignée');
  await taskDialog.getByLabel(/^responsable/i).selectOption(contactId);
  await taskDialog.getByLabel(/^validateur/i).selectOption(contactId);
  await taskDialog.getByRole('button', { name: 'Enregistrer' }).click();
  const saved = await page.evaluate(id => PM.get(id), pid);
  assert.equal(saved.milestones[0].date, '', 'un jalon sans date est accepté par le vrai formulaire');
  assert.equal(saved.readiness[0].done, false);
  assert.deepEqual(saved.documents[0], { id: saved.documents[0].id, title: 'Dossier local', kind: 'local', target: 'C:\\Dossiers\\Projet' });
  assert.equal(saved.contacts[0].email, 'alex@example.test');
  assert.equal(saved.tasks[0].assigneeId, saved.contacts[0].id);
  assert.equal(saved.tasks[0].validatorId, saved.contacts[0].id);
  await context.close();
}

async function testTemplateCloneRemapsRelations(browser, url) {
  const { context, page } = await fresh(browser, url);
  const source = await page.evaluate(() => {
    const p = PM.create({
      name: 'Source modèle', title: 'Structure à copier', phases: [{ id: 'phase-source', title: 'Étude' }],
      milestones: [{ id: 'jalon-source', title: 'Dépôt', date: '2026-12-12', done: true }],
      readiness: [{ id: 'check-source', title: 'Pièces réunies', done: true }],
      documents: [{ id: 'doc-source', title: 'Répertoire', kind: 'local', target: 'D:\\Projet' }],
      contacts: [{ id: 'contact-source', name: 'Morgan Test', role: 'Pilotage', email: '', phone: '' }],
      taskFields: [{ id: 'field-source', title: 'Référence' }],
    });
    const a = PM.addTask(p.id, { id: 'task-source-a', title: 'Préparer', phaseId: 'phase-source', deadline: '2026-11-01', status: 'done', fields: { 'field-source': 'REF-1' }, assigneeId: 'contact-source' });
    PM.addTask(p.id, { id: 'task-source-b', title: 'Relire', phaseId: 'phase-source', deadline: '2026-11-02', dependsOn: [a.id], validatorId: 'contact-source' });
    return PM.get(p.id);
  });
  const projects = page.getByRole('button', { name: /projets/i }).first(); if (await projects.count()) await projects.click();
  await page.getByText('Source modèle', { exact: true }).first().click();
  page.once('dialog', dialog => dialog.accept('Modèle relationnel'));
  await page.getByRole('button', { name: 'Créer un modèle' }).click();
  await page.getByRole('button', { name: /personnaliser/i }).click();
  const template = page.locator('.pmTemplate').filter({ hasText: 'Modèle relationnel' });
  await template.getByRole('button', { name: 'Utiliser' }).click();
  const form = page.locator('#pmProjectForm');
  await form.getByLabel(/^nom du projet/i).fill('Clone modèle');
  await form.getByRole('button', { name: 'Créer le projet' }).click();
  const clone = await page.evaluate(() => PM.projects().find(p => p.name === 'Clone modèle'));
  assert.ok(clone, 'le projet est créé depuis le vrai parcours modèle');
  assert.equal(clone.milestones[0].date, '');
  assert.equal(clone.milestones[0].done, false);
  assert.equal(clone.readiness[0].done, false);
  assert.equal(clone.tasks.every(t => t.status === 'todo' && t.deadline === ''), true);
  assert.notEqual(clone.taskFields[0].id, source.taskFields[0].id);
  assert.notEqual(clone.contacts[0].id, source.contacts[0].id);
  assert.equal(clone.tasks[0].fields[clone.taskFields[0].id], 'REF-1', 'la valeur suit le nouvel identifiant de colonne');
  assert.equal(clone.tasks[0].assigneeId, clone.contacts[0].id, 'le responsable suit le nouvel identifiant de contact');
  assert.deepEqual(clone.tasks[1].dependsOn, [clone.tasks[0].id], 'la dépendance suit les nouveaux identifiants de tâche');
  await context.close();
}

async function testNarrowLayouts(browser, url) {
  for (const width of [320, 390]) for (const colorScheme of ['light', 'dark']) {
    const { context, page } = await fresh(browser, url, { viewport: { width, height: 800 }, colorScheme });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => PM.create({ name: 'Projet mobile', title: 'Revue et documents', milestones: [{ id: 'm', title: 'Jalon mobile', date: '2026-10-01', done: false }], readiness: [{ id: 'r', title: 'Checklist mobile', done: false }], documents: [{ id: 'd', title: 'Document mobile', kind: 'local', target: 'Contenu' }] }));
    const projects = page.getByRole('button', { name: /projets/i }).first(); if (await projects.count()) await projects.click();
    const card = page.getByText('Projet mobile', { exact: true }).first(); if (await card.count()) await card.click();
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `débordement horizontal de ${overflow}px à ${width}px en thème ${colorScheme}`);
    await page.getByRole('button', { name: 'Personnaliser', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1,
      `les réglages doivent tenir à ${width}px en thème ${colorScheme}`);
    await page.locator('[name="1-watch"]').fill('-12');
    await page.getByRole('button', { name: 'Enregistrer les seuils' }).click();
    assert.equal(await page.evaluate(() => PM.urgencyRules()[1].watch), -12, 'les seuils se règlent depuis le formulaire');
    assert.deepEqual(errors, []);
    await context.close();
  }
}

async function testInlineFieldBlurKeepsClick(browser, url) {
  const { context, page } = await fresh(browser, url);
  const ids = await page.evaluate(() => {
    const project = PM.create({ name: 'Saisie directe', title: 'Test du rendu', taskFields: [{ id: 'visa', title: 'Visa' }, { id: 'lot', title: 'Lot' }] });
    const task = PM.addTask(project.id, { title: 'Contrôler la saisie' });
    return { project: project.id, task: task.id };
  });
  const projects = page.getByRole('button', { name: /projets/i }).first();
  if (await projects.count()) await projects.click();
  await page.getByText('Saisie directe', { exact: true }).first().click();
  const visa = page.locator('input[data-pm-action="task-field"][data-field="visa"]');
  const lot = page.locator('input[data-pm-action="task-field"][data-field="lot"]');
  await visa.fill('Bon pour accord');
  await lot.click();
  assert.equal(await lot.evaluate(el => el === document.activeElement), true, 'le clic vers le champ suivant ne doit pas être perdu au rendu déclenché par blur');
  assert.equal(await page.evaluate(({ project, task }) => PM.get(project).tasks.find(x => x.id === task).fields.visa, ids), 'Bon pour accord');
  await lot.fill('Façades');
  const section = page.locator('details[data-detail-section="milestones"]');
  const details = section.locator(':scope > summary');
  const wasOpen = await section.evaluate(el => el.open);
  await details.click();
  assert.equal(await section.evaluate(el => el.open), !wasOpen, 'le clic vers Détails ne doit pas être avalé par l’enregistrement du champ');
  assert.equal(await page.evaluate(({ project, task }) => PM.get(project).tasks.find(x => x.id === task).fields.lot, ids), 'Façades');
  await context.close();
}

async function testInlineTaskNoteWithoutCustomFields(browser, url) {
  const { context, page } = await fresh(browser, url);
  const ids = await page.evaluate(() => {
    const project = PM.create({
      name: 'Note directe', title: 'Projet sans colonnes',
    });
    const task = PM.addTask(project.id, {
      title: 'Vérifier la référence', status: 'doing', importance: 1,
      note: 'Référence initiale',
    });
    return { project: project.id, task: task.id };
  });
  const projects = page.getByRole('button', { name: /projets/i }).first();
  if (await projects.count()) await projects.click();
  await page.getByText('Note directe', { exact: true }).first().click();

  const note = page.locator(`textarea[data-pm-action="task-note"][data-tid="${ids.task}"]`);
  assert.equal(await note.count(), 1, 'la note directe est affichée même sans colonne personnalisée');
  assert.equal(await note.inputValue(), 'Référence initiale', 'la note existante est visible dans la ligne');
  assert.match(await note.getAttribute('placeholder') || '', /référence|commentaire/i);

  const inlineValue = 'ADR-42\nRelancer jeudi';
  await note.fill(inlineValue);
  await page.locator(`[data-pm-action="schedule-task"][data-tid="${ids.task}"]`).click();
  assert.equal(await page.locator('#psSessionDialog').evaluate(el => el.open), true,
    'un seul clic sur Planifier ouvre la fenêtre après le blur de la note');
  const afterInline = await page.evaluate(({ project, task }) => PM.get(project).tasks.find(x => x.id === task), ids);
  assert.equal(afterInline.note, inlineValue, 'la note multiligne est enregistrée au blur');
  assert.equal(afterInline.title, 'Vérifier la référence');
  assert.equal(afterInline.status, 'doing');
  assert.equal(afterInline.importance, 1);
  assert.deepEqual(afterInline.labels, []);
  await page.locator('#psSessionDialog').getByRole('button', { name: 'Annuler' }).click();

  await page.reload();
  await page.waitForFunction(() => window.PM && typeof PM.get === 'function');
  if (!(await page.locator(`textarea[data-pm-action="task-note"][data-tid="${ids.task}"]`).count())) {
    const projectsAfterReload = page.getByRole('button', { name: /projets/i }).first();
    if (await projectsAfterReload.count()) await projectsAfterReload.click();
    await page.getByText('Note directe', { exact: true }).first().click();
  }
  const reloadedNote = page.locator(`textarea[data-pm-action="task-note"][data-tid="${ids.task}"]`);
  assert.equal(await reloadedNote.inputValue(), inlineValue, 'la note directe survit au rechargement');

  await page.locator(`[data-pm-action="edit-task"][data-tid="${ids.task}"]`).click();
  const taskDialog = page.locator('#pmTaskDialog');
  assert.equal(await taskDialog.getByLabel('Note').inputValue(), inlineValue,
    'le formulaire d’édition relit la note saisie dans la ligne');
  const modalValue = 'FEP-7\nValidation reçue';
  await taskDialog.getByLabel('Note').fill(modalValue);
  await taskDialog.getByRole('button', { name: 'Enregistrer' }).click();
  assert.equal(await page.locator(`textarea[data-pm-action="task-note"][data-tid="${ids.task}"]`).inputValue(), modalValue,
    'la ligne reflète la note mise à jour dans le formulaire');
  const finalTask = await page.evaluate(({ project, task }) => PM.get(project).tasks.find(x => x.id === task), ids);
  assert.equal(finalTask.title, 'Vérifier la référence');
  assert.equal(finalTask.status, 'doing');
  assert.equal(finalTask.importance, 1);
  assert.deepEqual(finalTask.labels, []);
  await context.close();
}

async function testTaskSyncAcrossProjectAndPlanning(browser, url) {
  const { context, page } = await fresh(browser, url);
  const fixture = await page.evaluate(() => {
    const project = PM.create({ name: 'Synchronisation chantier', title: 'Une source commune' });
    const task = PM.addTask(project.id, { title: 'Contrôler le PDS', status: 'todo', note: 'PDS-18\nVisa attendu' });
    const date = '2026-09-23';
    PM.schedule(project.id, task.id, { date, start: '09:00', end: '10:00' });
    PM.schedule(project.id, task.id, { date, start: '11:00', end: '12:00' });
    return { project: project.id, task: task.id, date };
  });
  const projects = page.getByRole('button', { name: /projets/i }).first();
  if (await projects.count()) await projects.click();
  await page.getByText('Synchronisation chantier', { exact: true }).first().click();

  const projectCheck = page.locator(`[data-pm-action="toggle-task"][data-tid="${fixture.task}"]`);
  await projectCheck.check();
  assert.equal((await page.evaluate(({ project, task }) => PM.get(project).tasks.find(x => x.id === task).status, fixture)), 'done');
  assert.equal((await page.evaluate(({ project, task }) => PM.slots(project, task).length, fixture)), 2,
    'le changement de statut conserve les deux occurrences planifiées');

  await page.evaluate(date => PM.openDate(date), fixture.date);
  const columnChecks = page.locator(`#jourCorps [data-act="pmCheck"][data-p="${fixture.project}"][data-t="${fixture.task}"]`);
  assert.equal(await columnChecks.count(), 2, 'les deux occurrences affichent la même tâche dans les colonnes');
  assert.equal(await columnChecks.evaluateAll(boxes => boxes.every(box => box.checked)), true,
    'le statut coché depuis le projet est reflété dans chaque occurrence');
  assert.equal(await page.locator('#jourCorps .col[data-project-id]').filter({ hasText: 'PDS-18' }).count(), 2,
    'la note canonique apparaît dans chaque colonne planifiée');

  await page.locator('#vues [data-vue="chrono"]').click();
  const chronoChecks = page.locator(`#chrono [data-act="pmCheck"][data-p="${fixture.project}"][data-t="${fixture.task}"]`);
  assert.equal(await chronoChecks.count(), 2, 'les deux occurrences apparaissent dans la chronologie');
  assert.equal(await chronoChecks.evaluateAll(boxes => boxes.every(box => box.checked)), true);
  assert.equal(await page.locator('#chrono .chronoBloc').filter({ hasText: 'PDS-18' }).count(), 2,
    'la chronologie affiche le même texte de note pour chaque occurrence');

  await chronoChecks.first().evaluate(box => box.click());
  assert.equal((await page.evaluate(({ project, task }) => PM.get(project).tasks.find(x => x.id === task).status, fixture)), 'todo',
    'décocher depuis le planning met à jour la tâche canonique');
  assert.equal(await page.locator(`#chrono [data-act="pmCheck"][data-t="${fixture.task}"]`).evaluateAll(boxes => boxes.every(box => !box.checked)), true,
    'toutes les occurrences reflètent aussitôt le statut modifié');

  await page.evaluate(id => projectNavigate('project', id), fixture.project);
  assert.equal(await page.locator(`[data-pm-action="toggle-task"][data-tid="${fixture.task}"]`).isChecked(), false,
    'la ligne projet reflète le statut modifié depuis le planning');
  assert.equal(await page.locator(`[data-pm-action="task-note"][data-tid="${fixture.task}"]`).inputValue(), 'PDS-18\nVisa attendu');
  await context.close();
}

async function testMultiTaskPlanningSessionContract(browser, url) {
  const { context, page } = await fresh(browser, url);
  const result = await page.evaluate(() => {
    const project = PM.create({
      name: 'Session de phase', title: 'Choix explicite des actions',
      phases: [{ id: 'study', title: 'Études' }, { id: 'works', title: 'Chantier' }],
    });
    const first = PM.addTask(project.id, { title: 'Régimes', phaseId: 'study', status: 'todo', importance: 1 });
    const second = PM.addTask(project.id, { title: 'ADR', phaseId: 'study', status: 'doing', importance: 2 });
    const done = PM.addTask(project.id, { title: 'FEP terminé', phaseId: 'study', status: 'done' });
    const otherPhase = PM.addTask(project.id, { title: 'PDS chantier', phaseId: 'works', status: 'todo' });
    const available = PM.availableTasks(project.id, 'study');
    const slot = PM.scheduleSession(project.id, {
      phaseId: 'study', taskIds: [first.id, second.id], date: '2026-09-24', start: '09:00', end: '11:00',
    });
    const full = PM.session(slot.id);
    let rejectsDone = '';
    try {
      PM.scheduleSession(project.id, { phaseId: 'study', taskIds: [done.id], date: '2026-09-24', start: '13:00', end: '14:00' });
    } catch (error) { rejectsDone = error.message; }
    let rejectsOtherPhase = '';
    try {
      PM.scheduleSession(project.id, { phaseId: 'study', taskIds: [otherPhase.id], date: '2026-09-24', start: '14:00', end: '15:00' });
    } catch (error) { rejectsOtherPhase = error.message; }
    PM.updateTask(project.id, first.id, { status: 'done' });
    const edited = PM.scheduleSession(project.id, {
      phaseId: 'study', taskIds: [first.id, second.id], date: '2026-09-25', start: '10:00', end: '12:00',
    }, slot.id);
    PM.removeTask(project.id, first.id);
    const afterOneRemoval = PM.session(slot.id);
    PM.removeTask(project.id, second.id);
    const afterAllRemoval = PM.session(slot.id);
    return {
      ids: { first: first.id, second: second.id, done: done.id }, available, slot, full,
      rejectsDone, rejectsOtherPhase, edited, afterOneRemoval, afterAllRemoval,
      remainingSlots: PM.slots(project.id),
    };
  });
  assert.deepEqual(result.available.map(t => t.id), [result.ids.first, result.ids.second],
    'les choix proposent les actions restantes de la phase et excluent les terminées');
  assert.equal(result.slot.phaseId, 'study');
  assert.deepEqual(result.slot.taskIds, [result.ids.first, result.ids.second]);
  assert.equal(result.full.id, result.slot.id);
  assert.deepEqual(result.full.taskIds, result.slot.taskIds);
  assert.match(result.rejectsDone, /termin|disponible|action/i, 'une nouvelle session refuse une action terminée');
  assert.match(result.rejectsOtherPhase, /phase|action/i, 'une session refuse une action d’une autre phase');
  assert.equal(result.edited.date, '2026-09-25');
  assert.deepEqual(result.edited.taskIds, [result.ids.first, result.ids.second],
    'modifier la session peut conserver une action devenue terminée');
  assert.deepEqual(result.afterOneRemoval.taskIds, [result.ids.second],
    'supprimer une action la retire de la session sans supprimer les autres membres');
  assert.equal(result.afterAllRemoval, null, 'la session vide disparaît après suppression de son dernier membre');
  assert.deepEqual(result.remainingSlots, []);
  await context.close();
}

async function testMultiTaskPlanningSessionUI(browser, url) {
  const { context, page } = await fresh(browser, url);
  const ids = await page.evaluate(() => {
    const project = PM.create({ name: 'Séance chantier UI', title: 'Regroupement visible' });
    const first = PM.addTask(project.id, { title: 'Régimes UI', phaseId: project.phases[0].id });
    const second = PM.addTask(project.id, { title: 'ADR UI', phaseId: project.phases[0].id });
    return { project: project.id, first: first.id, second: second.id };
  });
  const projects = page.getByRole('button', { name: /projets/i }).first();
  if (await projects.count()) await projects.click();
  await page.getByText('Séance chantier UI', { exact: true }).first().click();
  await page.locator(`[data-pm-action="schedule-task"][data-tid="${ids.first}"]`).click();
  const form = page.locator('#psSessionForm');
  assert.equal(await form.getByLabel('Régimes UI').isChecked(), true, 'Planifier depuis une ligne présélectionne son action');
  await form.getByLabel('ADR UI').check();
  await form.getByLabel(/^date/i).fill('2026-09-24');
  await form.getByLabel(/^début/i).fill('08:30');
  await form.getByLabel(/^fin/i).fill('10:30');
  await form.getByRole('button', { name: /Planifier la séance/i }).click();
  const slot = await page.evaluate(id => PM.slots(id)[0], ids.project);
  assert.deepEqual(slot.taskIds, [ids.first, ids.second], 'le formulaire planifie plusieurs actions de la même phase');

  await page.evaluate(date => PM.openDate(date), slot.date);
  assert.equal(await page.locator('#dailyProgress').textContent(), '0 / 2', 'l’avancement du jour compte uniquement les membres choisis');
  await page.locator(`#jourCorps [data-act="pmCheck"][data-t="${ids.first}"]`).first().evaluate(box => box.click());
  assert.equal(await page.locator('#dailyProgress').textContent(), '1 / 2');
  await page.evaluate(id => projectNavigate('project', id), ids.project);
  await page.locator(`[data-pm-action="edit-slot"][data-slot="${slot.id}"]`).click();
  assert.equal(await form.getByLabel('Régimes UI').isChecked(), true,
    'une action terminée déjà membre reste visible pendant l’édition');
  assert.equal(await form.getByLabel('ADR UI').isChecked(), true);
  await form.getByLabel(/^fin/i).fill('11:00');
  await form.getByRole('button', { name: /^Enregistrer$/i }).click();
  const edited = await page.evaluate(id => PM.slots(id)[0], ids.project);
  assert.equal(edited.end, '11:00');
  assert.deepEqual(edited.taskIds, [ids.first, ids.second]);
  await context.close();
}

async function testPlanningDeadlineMarkersWithoutSlots(browser, url) {
  const { context, page } = await fresh(browser, url);
  await page.evaluate(() => {
    const date = '2026-09-23';
    const project = PM.create({
      name: 'Échéances seules', title: 'Sans créneau', deadline: date,
      milestones: [{ id: 'deadline-milestone', title: 'Jalon ADR', date, done: false }],
    });
    PM.addTask(project.id, { title: 'Remettre le PDS', deadline: date });
    PM.openDate(date);
  });
  assert.equal(await page.locator('#planningDeadlines .pdTotal').textContent(), '3',
    'projet, action et jalon apparaissent sans aucun créneau planifié');
  const day = page.locator('#planningDeadlines time[datetime="2026-09-23"]').locator('xpath=../../..');
  assert.equal(await day.locator('.pdCount').textContent(), '3');
  assert.equal(await day.locator('.pdItem').count(), 3);
  assert.equal(await page.locator('#rail .pdRailDeadline[aria-label="3 échéances ce jour"]').count(), 1,
    'le rail porte le repère rouge du jour concerné');
  await context.close();
}

async function testGeneratedBackgroundCleanupPreservesEditedTitles(browser, url) {
  const { context, page } = await fresh(browser, url);
  await page.evaluate(() => {
    PM.create({ name: 'Amorce nettoyage', title: 'Amorce nettoyage' });
    const state = JSON.parse(localStorage.getItem('plaaning.v1'));
    const titles = state.modeles.prepa.slice();
    const tasks = prefix => titles.map((title, index) => ({ id: `${prefix}-${index}`, t: title, f: false, note: '', p: null }));
    const pristineId = 'qa-pristine-prepa';
    const editedId = 'qa-edited-prepa';
    const editedTasks = tasks('edited');
    editedTasks[0].t += ' personnalisé';
    state.fiches[`local|${pristineId}`] = { taches: tasks('pristine'), note: '', debut: '', fin: '' };
    state.fiches[`local|${editedId}`] = { taches: editedTasks, note: '', debut: '', fin: '' };
    state.semaines['2026-10-05'] = { jours: [
      { cols: [
        { id: pristineId, b: 'prepa', nom: '', de: 8, a: 12, fond: true },
        { id: editedId, b: 'prepa', nom: '', de: 8, a: 12, fond: true },
      ] }, { cols: [] }, { cols: [] }, { cols: [] }, { cols: [] },
    ] };
    localStorage.setItem('plaaning.v1', JSON.stringify(state));
  });
  await page.reload();
  await page.waitForFunction(() => window.PM && typeof PM.projects === 'function');
  const repaired = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('plaaning.v1'));
    const ids = state.semaines['2026-10-05'].jours[0].cols.map(col => col.id);
    return { ids, pristineFiche: state.fiches['local|qa-pristine-prepa'], editedFiche: state.fiches['local|qa-edited-prepa'] };
  });
  assert.equal(repaired.ids.includes('qa-pristine-prepa'), false, 'un fond géné strictement vierge est nettoyé');
  assert.equal(repaired.ids.includes('qa-edited-prepa'), true, 'modifier seulement un titre protège le bloc du nettoyage');
  assert.ok(repaired.pristineFiche, 'le nettoyage du bloc ne supprime pas sa fiche potentiellement partagée');
  assert.match(repaired.editedFiche.taches[0].t, /personnalisé$/);
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
    ['seuils de priorité et dates civiles', testUrgencyBoundaries],
    ['tri et règles configurables', testSortingAndRules],
    ['données projet et dépendances', testDataAndDependencies],
    ['validation atomique', testValidationIsAtomic],
    ['création atomique et valeurs par défaut', testAtomicCreateAndTaskDefaults],
    ['formulaires de suivi et assignation', testDetailFormsAndAssignment],
    ['clonage de modèle et relations', testTemplateCloneRemapsRelations],
    ['champs personnalisés au blur', testInlineFieldBlurKeepsClick],
    ['note directe sans colonnes personnalisées', testInlineTaskNoteWithoutCustomFields],
    ['synchronisation projet et planning', testTaskSyncAcrossProjectAndPlanning],
    ['contrat des sessions de phase', testMultiTaskPlanningSessionContract],
    ['formulaire de séance multi-actions', testMultiTaskPlanningSessionUI],
    ['repères d’échéances sans créneau', testPlanningDeadlineMarkersWithoutSlots],
    ['nettoyage prudent des fonds générés', testGeneratedBackgroundCleanupPreservesEditedTitles],
    ['interface étroite claire et sombre', testNarrowLayouts],
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
