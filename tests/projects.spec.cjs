#!/usr/bin/env node
'use strict';

/*
 * End-to-end regression harness for Plaaning's project workflow.
 *
 * Run with:
 *   node tests/projects.spec.cjs
 * or against an already-running build:
 *   PLAANING_URL=http://127.0.0.1:4173 node tests/projects.spec.cjs
 *
 * The harness deliberately uses labels and accessible button names: these are part
 * of the product's UI contract and keep the tests independent of CSS structure.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS = process.env.PLAANING_QA_DIR || path.join(os.tmpdir(), 'plaaning-qa');
const STORE_KEY = 'plaaning.v1';
const WATCHDOG_MS = Number(process.env.PLAANING_QA_TIMEOUT || 150000);

const project = {
  name: 'Résidence Ardoise',
  title: 'Réfection des façades',
  tranche: '2',
  code: 'ARD-042',
  editedName: 'Résidence Ardoise — Lot A',
  editedTitle: 'Réfection façades et balcons',
  editedCode: 'ARD-043',
};

function mondayISO(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function activeWorkdayISO(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);
  if (day === 0) d.setDate(d.getDate() + 1);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function legacyV2Fixture() {
  const monday = mondayISO();
  const emptyDay = () => ({ cols: [] });
  return {
    v: 2,
    semaines: {
      [monday]: {
        jours: [
          { cols: [
            { id: 'legacy-prepa', b: 'prepa', nom: 'Dossier Héritage', de: 8, a: 9, fond: true },
            { id: 'legacy-session', b: 'chantier', nom: 'Dossier Héritage', de: 9, a: 11, fond: false },
            { id: 'legacy-recurring', b: 'reunion', nom: 'Point hebdo', de: 11, a: 12, fond: false, serie: 'legacy-series' },
          ] },
          emptyDay(), emptyDay(), emptyDay(), emptyDay(),
        ],
      },
    },
    fiches: {
      'prepa|Dossier Héritage': {
        taches: [{ id: 'legacy-prepare', t: 'Préparer le dossier', f: true, note: 'Préservé aussi', p: { d: monday, h: 8, m: 60 } }],
        note: 'Fiche préparation distincte', debut: monday, fin: '',
      },
      'chantier|Dossier Héritage': {
        taches: [{ id: 'legacy-task', t: 'Relire le CCTP', f: false, note: 'À conserver', p: { d: monday, h: 9, m: 60 } }],
        note: 'Donnée créée avant les projets', debut: monday, fin: '',
      },
    },
    series: [{ id: 'legacy-series', b: 'reunion', nom: 'Point hebdo', de: 11, a: 12, freq: 'semaine', dateDebut: monday, dateFin: '', sauf: [] }],
    modeles: {
      prepa: [], passif: [], chantier: [], cloture: [],
      reception: [], visite: [], preparu: [], reunion: [],
    },
    theme: 'light',
  };
}

function startStaticServer() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const candidate = path.resolve(ROOT, `.${requestPath === '/' ? '/index.html' : requestPath}`);
    if (!candidate.startsWith(`${ROOT}${path.sep}`)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    fs.readFile(candidate, (error, body) => {
      if (error) { res.writeHead(404).end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(candidate)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${server.address().port}/`,
      close: () => new Promise(done => server.close(done)),
    }));
  });
}

async function visible(locator, timeout = 1200) {
  const deadline = Date.now() + timeout;
  do {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
      if (await locator.nth(i).isVisible()) return locator.nth(i);
    }
    await new Promise(resolve => setTimeout(resolve, 40));
  } while (Date.now() < deadline);
  return null;
}

async function button(page, patterns) {
  for (const pattern of patterns) {
    const found = await visible(page.getByRole('button', { name: pattern }));
    if (found) return found;
  }
  throw new Error(`Bouton introuvable: ${patterns.map(String).join(' ou ')}`);
}

async function field(page, patterns) {
  for (const pattern of patterns) {
    const found = await visible(page.getByLabel(pattern));
    if (found) return found;
  }
  throw new Error(`Champ étiqueté introuvable: ${patterns.map(String).join(' ou ')}`);
}

async function fill(page, patterns, value) {
  const input = await field(page, patterns);
  await input.fill(value);
  return input;
}

async function expectText(page, text) {
  const found = await visible(page.getByText(text, { exact: true }), 4000);
  assert.ok(found, `Texte visible introuvable: ${text}`);
}

async function stored(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORE_KEY);
}

async function testLegacyMigration(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
  }, {
    key: STORE_KEY, fixture: legacyV2Fixture(),
  });
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  assert.equal(await page.evaluate(() => typeof window.PM), 'object', 'window.PM doit être exposé');
  const data = await stored(page);
  assert.ok(data, 'les données migrées doivent rester stockées');
  assert.equal(data.v, 3, 'le stockage v2 doit être migré vers la v3');
  assert.ok(Array.isArray(data.projects), 'la migration doit créer la collection de projets');
  assert.equal(data.projects.length, 1, 'les fiches liées homonymes doivent devenir un seul projet');
  assert.deepEqual(data.projects[0].tasks.map(item => item.title).sort(), ['Préparer le dossier', 'Relire le CCTP'].sort(), 'les tâches de chaque fiche historique doivent être récupérées');
  assert.deepEqual(data.projects[0].legacyKeys.sort(), ['chantier|Dossier Héritage', 'prepa|Dossier Héritage'].sort(), 'les deux clés historiques doivent rester traçables');
  const columns = data.semaines[mondayISO()].jours[0].cols;
  assert.equal(columns.find(item => item.id === 'legacy-prepa').projectId, data.projects[0].id, 'la séance prépa doit pointer vers le projet fusionné');
  assert.equal(columns.find(item => item.id === 'legacy-session').projectId, data.projects[0].id, 'la séance chantier doit pointer vers le projet fusionné');
  assert.equal(columns.filter(item => item.taskId).length, 2, 'chaque ancienne tâche datée doit produire son propre créneau');
  assert.equal(columns.find(item => item.id === 'legacy-recurring').serie, 'legacy-series', 'la série récurrente doit rester intacte');
  assert.equal(columns.find(item => item.id === 'legacy-recurring').projectId, undefined, 'une réunion historique ne doit pas devenir un projet');
  assert.match(JSON.stringify(data), /Dossier Héritage/, 'le dossier v2 doit survivre à la migration');
  assert.match(JSON.stringify(data), /Relire le CCTP/, 'la tâche v2 doit survivre à la migration');
  await page.reload();
  const reloaded = await stored(page);
  assert.match(JSON.stringify(reloaded), /À conserver/, 'les notes v2 doivent survivre au rechargement');
  assert.equal(reloaded.projects.length, 1, 'le rechargement ne doit pas dupliquer le projet migré');
  await context.close();
}

async function testPMContract(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(url);
  const result = await page.evaluate(({ monday }) => {
    const project = window.PM.create({
      name: 'Contrat moteur', title: 'Vérifier les créneaux', tranche: '1', code: 'PM-001',
      labels: [],
      phases: [
        { id: 'p1', title: 'Cadrage' },
        { id: 'p2', title: 'Exécution' },
        { id: 'p3', title: 'Clôture' },
      ],
    });
    const task = window.PM.addTask(project.id, { title: 'Contrôler le moteur', phaseId: 'p2', status: 'todo', deadline: monday, labels: [], note: 'Test direct' });
    const first = window.PM.schedule(project.id, task.id, { date: monday, start: '09:00', end: '10:00' });
    const second = window.PM.schedule(project.id, task.id, { date: monday, start: '14:00', end: '15:30' });
    window.PM.updateTask(project.id, task.id, { status: 'done' });
    return { project, task, first, second, slots: window.PM.slots(project.id, task.id) };
  }, { monday: mondayISO() });
  assert.equal(result.slots.length, 2, 'une tâche doit accepter plusieurs créneaux');
  assert.deepEqual(result.slots.map(item => [item.start, item.end]), [['09:00', '10:00'], ['14:00', '15:30']], 'PM.slots doit rendre les deux plages exactes');

  const data = await stored(page);
  const engineProject = data.projects.find(item => item.id === result.project.id);
  assert.equal(engineProject.tasks[0].status, 'done', 'le statut canonique doit être mis à jour');
  const engineColumns = data.semaines[mondayISO()].jours[0].cols.filter(item => item.projectId === result.project.id);
  assert.deepEqual(engineColumns.map(item => [item.de, item.a]), [[9, 10], [14, 15.5]], 'les heures doivent être stockées en nombres');

  await page.reload();
  const afterReload = await page.evaluate(({ pid, tid }) => ({ project: window.PM.get(pid), slots: window.PM.slots(pid, tid) }), { pid: result.project.id, tid: result.task.id });
  assert.equal(afterReload.project.tasks[0].status, 'done', 'le statut doit survivre au rechargement');
  assert.equal(afterReload.slots.length, 2, 'les deux créneaux doivent survivre au rechargement');
  await context.close();
}

async function openProjects(page) {
  const tab = await visible(page.getByRole('button', { name: /projets/i }), 500) ||
    await visible(page.getByRole('link', { name: /projets/i }), 500);
  if (tab) await tab.click();
}

async function ensureLabel(page, name = 'Prioritaire') {
  const settings = await button(page, [/^Personnaliser$/i]);
  await settings.click();
  const form = page.locator('form[data-pm-form="add-label"]');
  await form.locator('input[name="name"]').fill(name);
  await form.getByRole('button', { name: /^Ajouter$/i }).click();
  await expectText(page, name);
}

async function createProject(page) {
  await ensureLabel(page);
  await openProjects(page);
  await (await button(page, [/nouveau projet/i, /créer un projet/i, /ajouter un projet/i])).click();
  await fill(page, [/^nom du projet/i], project.name);
  await fill(page, [/^titre descriptif$/i], project.title);
  const tranche = await field(page, [/^tranche$/i]);
  await tranche.selectOption(project.tranche);
  await fill(page, [/^code$/i], project.code);
  await page.getByRole('checkbox', { name: 'Prioritaire', exact: true }).check();
  await page.getByRole('button', { name: /^Créer le projet$/i }).click();
  await expectText(page, project.name);
  await expectText(page, project.title);
  await expectText(page, project.code);
  await expectText(page, 'Prioritaire');
}

async function testCreateEditReload(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(url);
  await createProject(page);

  await page.getByRole('button', { name: /^Modifier$/i }).click();
  await fill(page, [/^nom du projet/i], project.editedName);
  await fill(page, [/^titre descriptif$/i], project.editedTitle);
  await (await field(page, [/^tranche$/i])).selectOption('1');
  await fill(page, [/^code$/i], project.editedCode);
  await page.getByRole('button', { name: /^Enregistrer$/i }).click();
  await expectText(page, project.editedName);
  await expectText(page, project.editedTitle);
  await expectText(page, project.editedCode);

  await page.reload();
  await openProjects(page);
  await expectText(page, project.editedName);
  await expectText(page, project.editedTitle);
  const saved = await stored(page);
  assert.equal(saved.projects[0].tranche, '1', 'la tranche éditée doit être persistante');
  assert.equal(saved.projects[0].code, project.editedCode, 'le code édité doit être persistant');
  assert.equal(saved.projects[0].labels.length, 1, 'l’étiquette sélectionnée doit être persistante');
  await context.close();
}

async function testPhasesTasksAndPlanning(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(url);
  await createProject(page);

  const phaseNames = ['Diagnostic', 'Consultation', 'Suivi chantier'];
  const phaseIds = ['preparation', 'execution', 'finalisation'];
  for (let i = 0; i < phaseNames.length; i++) {
    page.once('dialog', dialog => dialog.accept(phaseNames[i]));
    await page.locator(`details[data-phase="${phaseIds[i]}"]`).getByRole('button', { name: 'Renommer la phase' }).click();
  }
  for (const phase of phaseNames) await expectText(page, phase);

  await page.getByRole('button', { name: /^\+ Ajouter une action$/i }).click();
  await fill(page, [/^action/i], 'Valider le diagnostic');
  const deadlineISO = activeWorkdayISO();
  await fill(page, [/^à terminer avant$/i, /^échéance$/i], deadlineISO);
  const phaseSelect = await field(page, [/^phase$/i]);
  await phaseSelect.selectOption({ label: phaseNames[0] });
  await page.getByRole('checkbox', { name: 'Prioritaire', exact: true }).check();
  await page.getByRole('button', { name: /^Enregistrer$/i }).click();
  const taskTitle = page.locator('.pmTaskTitle[value="Valider le diagnostic"]');
  await taskTitle.waitFor({ state: 'visible' });

  const taskLine = page.locator('.pmTaskRow').filter({ has: taskTitle });
  const checkbox = taskLine.getByRole('checkbox', { name: /Marquer comme terminée/i });
  await checkbox.check();
  assert.equal(await checkbox.isChecked(), true, 'le statut de tâche doit être cochable');
  assert.equal((await page.evaluate(() => PM.projects()[0].tasks[0].status)), 'done', 'la coche doit mettre à jour la source canonique');
  await taskLine.getByRole('checkbox', { name: /Marquer comme terminée/i }).uncheck();

  await taskLine.getByRole('button', { name: /^Planifier$/i }).click();
  const sessionForm = page.locator('#psSessionForm');
  const slotDate = sessionForm.getByLabel(/^date/i);
  await slotDate.fill(activeWorkdayISO());
  const slotStart = sessionForm.getByLabel(/^début/i);
  await slotStart.fill('09:00');
  const slotEnd = sessionForm.getByLabel(/^fin/i);
  await slotEnd.fill('10:00');
  await sessionForm.getByRole('button', { name: /^Planifier la séance$/i }).click();

  // A second slot catches implementations that silently replace the first one.
  await taskLine.getByRole('button', { name: /^Planifier$/i }).click();
  await sessionForm.getByLabel(/^date/i).fill(activeWorkdayISO());
  await sessionForm.getByLabel(/^début/i).fill('14:00');
  await sessionForm.getByLabel(/^fin/i).fill('15:30');
  await sessionForm.getByRole('button', { name: /^Planifier la séance$/i }).click();
  const slotState = await page.evaluate(() => {
    const p = PM.projects()[0]; return { pid: p.id, tid: p.tasks[0].id, slots: PM.slots(p.id, p.tasks[0].id) };
  });
  assert.deepEqual(slotState.slots.map(item => [item.start, item.end]), [['09:00', '10:00'], ['14:00', '15:30']], 'les deux créneaux UI doivent rester associés à la tâche');

  const scheduledName = `${project.name} — chantier`;
  await page.getByRole('button', { name: /^Modifier$/i }).click();
  await fill(page, [/^nom du projet/i], scheduledName);
  assert.equal(await page.getByRole('checkbox', { name: 'Prioritaire', exact: true }).isChecked(), true, 'l’étiquette doit être précochée pendant une édition');
  await page.getByRole('button', { name: /^Enregistrer$/i }).click();
  const renamed = await page.evaluate(({ pid, tid }) => ({ project: PM.get(pid), slots: PM.slots(pid, tid), state: JSON.parse(localStorage.getItem('plaaning.v1')) }), slotState);
  assert.equal(renamed.slots.length, 2, 'renommer le projet ne doit pas perdre ses créneaux');
  const flatColumns = Object.values(renamed.state.semaines).flatMap(week => week.jours.flatMap(day => day.cols)).filter(col => col.projectId === slotState.pid);
  assert.deepEqual(flatColumns.map(col => col.nom), [scheduledName, scheduledName], 'le nouveau nom doit être propagé aux deux créneaux');
  assert.deepEqual(flatColumns.map(col => col.phaseId), ['preparation', 'preparation'], 'les créneaux conservent la phase choisie');
  assert.deepEqual(flatColumns.map(col => col.taskIds), [[slotState.tid], [slotState.tid]], 'les créneaux conservent leurs actions choisies');
  assert.equal(renamed.project.labels.length, 1, 'renommer doit conserver les étiquettes');

  await page.getByRole('button', { name: /^Planning/i }).last().click();
  const planningColumn = page.locator(`[data-project-id="${slotState.pid}"]`).first();
  await planningColumn.waitFor({ state: 'visible' });
  await planningColumn.locator('label.tache').click();
  assert.equal(await planningColumn.getByRole('checkbox').isChecked(), true, 'la tâche doit être cochable depuis le planning');
  await page.getByRole('button', { name: /^Projets$/i }).click();
  await page.getByRole('button', { name: new RegExp(scheduledName, 'i') }).click();
  assert.equal(await page.locator('.pmTaskRow').getByRole('checkbox', { name: /Marquer comme terminée/i }).isChecked(), true, 'une coche dans le planning doit remonter dans le projet');

  await page.getByRole('button', { name: /^Accueil$/i }).click();
  await expectText(page, 'Projets actifs');
  await expectText(page, scheduledName);

  await page.reload();
  const persisted = await page.evaluate(({ pid, tid }) => ({ project: PM.get(pid), slots: PM.slots(pid, tid) }), slotState);
  assert.equal(persisted.slots.length, 2, 'les deux créneaux doivent être persistants');
  assert.equal(persisted.project.tasks[0].status, 'done', 'le statut changé depuis le planning doit être persistant');
  await context.close();
}

async function testExportImportRoundTrip(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(url);
  await createProject(page);

  await (await button(page, [/sauvegarde/i, /export/i])).click();
  const downloadPromise = page.waitForEvent('download');
  await (await button(page, [/exporter/i])).click();
  const download = await downloadPromise;
  const backupPath = path.join(ARTIFACTS, 'roundtrip.json');
  await download.saveAs(backupPath);
  assert.match(fs.readFileSync(backupPath, 'utf8'), /Résidence Ardoise/, 'l’export doit contenir le projet');

  await page.evaluate(key => localStorage.removeItem(key), STORE_KEY);
  await page.reload();
  await (await button(page, [/sauvegarde/i, /import/i, /restaurer/i])).click();
  const chooserPromise = page.waitForEvent('filechooser');
  await (await button(page, [/restaurer/i, /importer/i])).click();
  const chooser = await chooserPromise;
  page.once('dialog', dialog => dialog.accept());
  await chooser.setFiles(backupPath);
  await expectText(page, project.name);
  await page.reload();
  await openProjects(page);
  await expectText(page, project.name);

  const beforeInvalid = JSON.stringify(await stored(page));
  const invalidPath = path.join(ARTIFACTS, 'invalid-backup.json');
  fs.writeFileSync(invalidPath, '{}');
  await page.getByRole('button', { name: /^Sauvegarde$/i }).click();
  const invalidChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Restaurer un fichier/i }).click();
  const invalidChooser = await invalidChooserPromise;
  let unexpectedConfirm = false;
  const rejectUnexpected = dialog => { unexpectedConfirm = true; dialog.dismiss(); };
  page.once('dialog', rejectUnexpected);
  await invalidChooser.setFiles(invalidPath);
  await page.getByRole('status').filter({ hasText: /sauvegarde Plaaning (?:v1\/v2 )?valide/i }).waitFor({ state: 'visible' });
  assert.equal(unexpectedConfirm, false, 'un fichier invalide ne doit pas ouvrir de confirmation');
  assert.equal(JSON.stringify(await stored(page)), beforeInvalid, 'un import invalide ne doit muter aucune donnée');
  await context.close();
}

async function assertLayout(browser, url, viewport, scheme) {
  const context = await browser.newContext({ viewport, colorScheme: scheme });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `débordement horizontal de ${overflow}px à ${viewport.width}px en thème ${scheme}`);
  assert.deepEqual(errors, [], `erreurs JavaScript à ${viewport.width}px en thème ${scheme}`);
  await page.screenshot({ path: path.join(ARTIFACTS, `layout-${viewport.width}-${scheme}.png`), fullPage: true });
  await context.close();
}

async function run() {
  const watchdog = setTimeout(() => {
    process.stderr.write(`✗ délai global dépassé (${WATCHDOG_MS} ms)\n`);
    process.exit(124);
  }, WATCHDOG_MS);
  watchdog.unref();
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const local = process.env.PLAANING_URL ? null : await startStaticServer();
  const url = process.env.PLAANING_URL || local.url;
  const launchOptions = { headless: true };
  if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launchOptions);
  const tests = [
    ['migration v2 et rechargement', testLegacyMigration],
    ['contrat PM et créneaux multiples', testPMContract],
    ['création, édition et persistance projet', testCreateEditReload],
    ['phases, tâche et créneaux multiples', testPhasesTasksAndPlanning],
    ['export/import complet', testExportImportRoundTrip],
  ];
  const pattern = process.env.PLAANING_QA_PATTERN ? new RegExp(process.env.PLAANING_QA_PATTERN, 'i') : null;
  let failures = 0;
  try {
    for (const [name, test] of tests) {
      if (pattern && !pattern.test(name)) continue;
      const started = Date.now();
      try {
        await test(browser, url);
        process.stdout.write(`✓ ${name} (${Date.now() - started} ms)\n`);
      } catch (error) {
        failures++;
        process.stderr.write(`✗ ${name}\n${error.stack || error}\n`);
      }
    }
    for (const scheme of pattern ? [] : ['light', 'dark']) {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
        try {
          await assertLayout(browser, url, viewport, scheme);
          process.stdout.write(`✓ layout ${viewport.width}px ${scheme}\n`);
        } catch (error) {
          failures++;
          process.stderr.write(`✗ layout ${viewport.width}px ${scheme}\n${error.stack || error}\n`);
        }
      }
    }
  } finally {
    await browser.close();
    if (local) await local.close();
    clearTimeout(watchdog);
  }
  if (failures) process.exitCode = 1;
}

run().catch(error => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
