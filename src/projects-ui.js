/* Workspace projets. Ce fichier est injecté dans l'IIFE principal. */
var projectUI = {
  view:"dashboard", projectId:null, query:"", tranche:"", code:"", label:"", archived:false,
  collapsed:{}, returnFocus:null, initialized:false
};

function pmE(value){ return esc(value == null ? "" : value); }
function pmArray(value){ return Array.isArray(value) ? value : []; }
function pmToday(){ return iso(new Date()); }
function pmDate(value){
  if(!value) return "Sans échéance";
  var d = new Date(value+"T12:00:00");
  return isNaN(d) ? "Sans échéance" : d.toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:d.getFullYear()!==new Date().getFullYear()?"numeric":undefined});
}
function pmDays(value){
  if(!value) return null;
  var a = new Date(pmToday()+"T12:00:00"), b = new Date(value+"T12:00:00");
  return Math.round((b-a)/86400000);
}
function pmDeadline(value){
  var n=pmDays(value);
  if(n===null) return "";
  if(n<0) return '<span class="pmPill pmPillBad">En retard de '+Math.abs(n)+' j</span>';
  if(n===0) return '<span class="pmPill pmPillWarn">Aujourd’hui</span>';
  if(n<=7) return '<span class="pmPill pmPillWarn">Dans '+n+' j</span>';
  return '<span class="pmPill">'+pmE(pmDate(value))+'</span>';
}
function pmLabelById(id){ return pmArray(etat.projectLabels).find(function(x){return x.id===id;}); }
function pmLabelsHtml(ids){
  return pmArray(ids).map(function(id){var l=pmLabelById(id);return l?'<span class="pmLabel" style="--label-color:'+pmE(l.color||"#5266ce")+'">'+pmE(l.name)+'</span>':"";}).join("");
}
function pmProgress(project){
  var tasks=pmArray(project.tasks), done=tasks.filter(function(t){return t.status==="done";}).length;
  return {done:done,total:tasks.length,pct:tasks.length?Math.round(done/tasks.length*100):0};
}
function pmProjects(){ return window.PM && PM.projects ? PM.projects() : pmArray(etat.projects); }
function pmGet(id){ return window.PM && PM.get ? PM.get(id) : pmProjects().find(function(p){return p.id===id;}); }
function pmSave(){ if(window.PM&&PM.save) PM.save(); else if(typeof sauver==="function") sauver(); }
function pmNotify(message){ if(typeof toast==="function") toast(message); }
function pmSetView(view,id){
  projectUI.view=view||"dashboard"; projectUI.projectId=id||null;
  try{localStorage.setItem("plaaning.projectView",JSON.stringify({view:projectUI.view,projectId:projectUI.projectId}));}catch(e){}
  renderProjectsUI();
  window.scrollTo({top:0,behavior:"instant"});
}
function projectNavigate(view,pid){
  if(view==="home") view="dashboard";
  if(view==="project"&&pid){pmSetView("project",pid);return;}
  if(["dashboard","projects","planning","settings"].indexOf(view)<0) view="dashboard";
  pmSetView(view,pid);
}
window.projectNavigate=projectNavigate;

function pmOpenDialog(id,opener){
  var d=document.getElementById(id); if(!d)return;
  projectUI.returnFocus=opener||document.activeElement;
  if(!d.open)d.showModal();
  requestAnimationFrame(function(){var f=d.querySelector("[autofocus],input,select,button");if(f)f.focus();});
}
function pmCloseDialog(dialog){
  if(dialog&&dialog.open) dialog.close();
  var f=projectUI.returnFocus; projectUI.returnFocus=null;
  if(f&&document.contains(f)) requestAnimationFrame(function(){f.focus();});
  else { var workspace=document.getElementById("projectWorkspace"); if(workspace) workspace.focus({preventScroll:true}); }
}
function pmSelectOptions(items,value,placeholder){
  return '<option value="">'+pmE(placeholder||"Tous")+'</option>'+items.map(function(x){var v=typeof x==="string"?x:x.id,n=typeof x==="string"?x:x.name;return '<option value="'+pmE(v)+'"'+(v===value?' selected':'')+'>'+pmE(n)+'</option>';}).join("");
}
function pmProjectCard(p,compact){
  var pr=pmProgress(p), labs=pmLabelsHtml(p.labels);
  if(compact)return '<button type="button" class="pmProjectRow" data-pm-action="open-project" data-id="'+pmE(p.id)+'"><span><span class="pmProjectName">'+pmE(p.name)+'</span><span class="pmProjectTitle">'+pmE(p.title||"Sans description")+'</span><span class="pmProgress"><span style="width:'+pr.pct+'%"></span></span></span><span class="pmProjectMeta">'+(p.code?'<span class="pmCode">'+pmE(p.code)+'</span>':"")+pmDeadline(p.deadline)+'<span class="pmPill">'+pr.done+'/'+pr.total+'</span></span></button>';
  return '<button type="button" class="pmCard pmProjectCard" data-pm-action="open-project" data-id="'+pmE(p.id)+'"><span class="pmProjectCardTop"><span><h2>'+pmE(p.name)+'</h2><p>'+pmE(p.title||"Sans description")+'</p></span>'+(p.code?'<span class="pmCode">'+pmE(p.code)+'</span>':"")+'</span><span class="pmLabels">'+labs+'</span><span class="pmProjectMeta" style="justify-content:flex-start;margin-top:9px">'+(p.tranche?'<span class="pmPill">Tranche '+pmE(p.tranche)+'</span>':"")+pmDeadline(p.deadline)+'</span><span class="pmProgress"><span style="width:'+pr.pct+'%"></span></span><span class="pmProjectStats"><span>'+pr.done+' sur '+pr.total+' actions</span><span>'+pr.pct+' %</span></span></button>';
}

function pmDashboardHtml(){
  var all=pmProjects().filter(function(p){return !p.archived;}), today=pmToday();
  var overdue=[], upcoming=[], unplanned=[], nextSlots=[];
  all.forEach(function(p){pmArray(p.tasks).forEach(function(t){
    if(t.status!=="done"&&t.deadline){(t.deadline<today?overdue:upcoming).push({p:p,t:t,date:t.deadline});}
    if(t.status!=="done" && (!PM.slots||!PM.slots(p.id,t.id).length)) unplanned.push({p:p,t:t});
  });if(PM.slots)PM.slots(p.id).forEach(function(s){if(s.date>=today)nextSlots.push({p:p,s:s,t:pmArray(p.tasks).find(function(t){return t.id===s.taskId;})});});});
  upcoming=upcoming.filter(function(x){return x.date>=today;}).sort(function(a,b){return a.date.localeCompare(b.date);});
  overdue.sort(function(a,b){return a.date.localeCompare(b.date);});
  unplanned.sort(function(a,b){return (a.t.deadline||"9999").localeCompare(b.t.deadline||"9999");});nextSlots.sort(function(a,b){return (a.s.date+a.s.start).localeCompare(b.s.date+b.s.start);});
  var focus=all.slice().sort(function(a,b){return (a.deadline||"9999").localeCompare(b.deadline||"9999");}).slice(0,5);
  var deadlines=overdue.concat(upcoming).slice(0,7);
  return '<div class="pmWrap"><header class="pmPageHead"><div><div class="pmEyebrow">Vue d’ensemble</div><h1>Bonjour, voici l’essentiel.</h1><p>Vos projets actifs, les prochaines échéances et ce qui reste à placer.</p></div><button class="pmBtn pmBtnPrimary" data-pm-action="new-project">+ Nouveau projet</button></header>'
    +'<section class="pmKpis" aria-label="Indicateurs"><article class="pmCard pmKpi"><div class="pmKpiTop"><span>Projets actifs</span><span class="pmKpiIcon">◫</span></div><div class="pmKpiValue">'+all.length+' <small>en cours</small></div></article><article class="pmCard pmKpi pmBad"><div class="pmKpiTop"><span>Actions en retard</span><span class="pmKpiIcon">!</span></div><div class="pmKpiValue">'+overdue.length+' <small>à reprendre</small></div></article><article class="pmCard pmKpi pmWarn"><div class="pmKpiTop"><span>À planifier</span><span class="pmKpiIcon">○</span></div><div class="pmKpiValue">'+unplanned.length+' <small>actions</small></div></article></section>'
    +'<div class="pmDashGrid"><section class="pmCard pmSection"><div class="pmSectionHead"><h2>Projets à suivre</h2><button class="pmLink" data-pm-action="go-projects">Voir tous →</button></div>'+(focus.length?'<div class="pmProjectList">'+focus.map(function(p){return pmProjectCard(p,true);}).join("")+'</div>':'<div class="pmEmpty"><strong>Aucun projet actif</strong>Créez votre premier projet pour structurer les prochaines actions.<br><button class="pmBtn pmBtnPrimary" data-pm-action="new-project">Créer un projet</button></div>')+'</section>'
    +'<aside class="pmCard pmSection"><div class="pmSectionHead"><h2>Échéances</h2></div>'+(deadlines.length?'<ol class="pmTimeline">'+deadlines.map(function(x){return '<li><span class="pmTimelineDate">'+pmE(pmDate(x.date))+'</span><span class="pmTimelineText">'+pmE(x.t.title)+'<small>'+pmE(x.p.name)+'</small></span></li>';}).join("")+'</ol>':'<div class="pmEmpty"><strong>Rien d’urgent</strong>Les échéances de vos actions apparaîtront ici.</div>')+'</aside></div>'
    +'<div class="pmDashGrid pmDashActions"><section class="pmCard pmSection"><div class="pmSectionHead"><h2>À planifier</h2><span class="pmPill">'+unplanned.length+'</span></div>'+(unplanned.length?'<div class="pmQuickList">'+unplanned.slice(0,5).map(function(x){return '<div class="pmQuickRow"><span><b>'+pmE(x.t.title)+'</b><small>'+pmE(x.p.name)+(x.t.deadline?' · '+pmE(pmDate(x.t.deadline)):'')+'</small></span><button class="pmBtn" data-pm-action="schedule-task" data-pid="'+pmE(x.p.id)+'" data-tid="'+pmE(x.t.id)+'">Planifier</button></div>';}).join("")+'</div>':'<div class="pmEmpty"><strong>Tout est placé</strong>Les actions non planifiées apparaîtront ici.</div>')+'</section>'
    +'<section class="pmCard pmSection"><div class="pmSectionHead"><h2>Prochains créneaux</h2><button class="pmLink" data-pm-action="open-planning">Planning →</button></div>'+(nextSlots.length?'<div class="pmQuickList">'+nextSlots.slice(0,5).map(function(x){return '<button class="pmQuickRow pmQuickSlot" data-pm-action="open-slot-date" data-date="'+pmE(x.s.date)+'"><span><b>'+pmE(x.t?x.t.title:x.p.name)+'</b><small>'+pmE(pmDate(x.s.date))+' · '+pmE(x.s.start)+'–'+pmE(x.s.end)+' · '+pmE(x.p.name)+'</small></span><span aria-hidden="true">→</span></button>';}).join("")+'</div>':'<div class="pmEmpty"><strong>Aucun créneau à venir</strong>Planifiez une action pour la retrouver ici.</div>')+'</section></div></div>';
}

function pmProjectsHtml(){
  var q=projectUI.query.toLocaleLowerCase("fr"), arr=pmProjects().filter(function(p){
    if(!projectUI.archived&&p.archived)return false;
    if(projectUI.archived&&!p.archived)return false;
    if(projectUI.tranche&&p.tranche!==projectUI.tranche)return false;
    if(projectUI.code&&p.code!==projectUI.code)return false;
    if(projectUI.label&&pmArray(p.labels).indexOf(projectUI.label)<0)return false;
    return !q||(p.name+" "+(p.title||"")+" "+(p.code||"")).toLocaleLowerCase("fr").indexOf(q)>=0;
  });
  return '<div class="pmWrap"><header class="pmPageHead"><div><div class="pmEyebrow">Portefeuille</div><h1>Mes projets</h1><p>'+arr.length+' projet'+(arr.length>1?'s':'')+' affiché'+(arr.length>1?'s':'')+'.</p></div><button class="pmBtn pmBtnPrimary" data-pm-action="new-project">+ Nouveau projet</button></header>'
    +'<div class="pmCard pmToolbar"><label class="pmSearch"><span class="sr">Rechercher</span><input type="search" data-pm-filter="query" value="'+pmE(projectUI.query)+'" placeholder="Rechercher un projet…"></label><select data-pm-filter="tranche" aria-label="Filtrer par tranche">'+pmSelectOptions(["1","2"],projectUI.tranche,"Toutes les tranches")+'</select><select data-pm-filter="code" aria-label="Filtrer par code">'+pmSelectOptions(pmArray(etat.projectCodes),projectUI.code,"Tous les codes")+'</select><select data-pm-filter="label" aria-label="Filtrer par étiquette">'+pmSelectOptions(pmArray(etat.projectLabels),projectUI.label,"Toutes les étiquettes")+'</select><label class="pmCheck"><input type="checkbox" data-pm-filter="archived"'+(projectUI.archived?' checked':'')+'> Archivés</label></div>'
    +(arr.length?'<div class="pmProjectsGrid">'+arr.map(function(p){return pmProjectCard(p,false);}).join("")+'</div>':'<div class="pmEmpty"><strong>Aucun projet ne correspond</strong>Modifiez les filtres ou créez un nouveau projet.</div>')+'</div>';
}

function pmTaskRow(p,t){
  return '<div class="pmTaskRow" data-status="'+pmE(t.status)+'"><input class="pmTaskCheck" type="checkbox" data-pm-action="toggle-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="Marquer comme terminée"'+(t.status==="done"?' checked':'')+'><div class="pmTaskMain"><input class="pmTaskTitle" value="'+pmE(t.title)+'" data-pm-action="rename-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="Titre de l’action"><div class="pmTaskInfo">'+(t.status==="done"&&t.deadline?'<span class="pmPill">'+pmE(pmDate(t.deadline))+'</span>':pmDeadline(t.deadline))+pmLabelsHtml(t.labels)+'</div></div><select data-pm-action="task-status" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="État"><option value="todo"'+(t.status==="todo"?' selected':'')+'>À faire</option><option value="doing"'+(t.status==="doing"?' selected':'')+'>En cours</option><option value="done"'+(t.status==="done"?' selected':'')+'>Terminée</option></select><div class="pmTaskActions"><button class="pmScheduleBtn" data-pm-action="schedule-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" title="Ajouter au planning">Planifier</button><button data-pm-action="edit-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" title="Détails" aria-label="Modifier les détails">•••</button></div></div>';
}
function pmLegacyForPhase(p,phaseId){
  var rows=pmArray(p.legacyFiches).filter(function(x){return x.phaseId===phaseId&&(x.note||x.debut||x.fin);});
  if(!rows.length)return "";
  return '<aside class="pmLegacy"><strong>Données héritées du planning</strong>'+rows.map(function(x){return '<div>'+(x.note?'<p>'+pmE(x.note)+'</p>':"")+((x.debut||x.fin)?'<small>Période : '+pmE(x.debut?pmDate(x.debut):"non renseignée")+' → '+pmE(x.fin?pmDate(x.fin):"non renseignée")+'</small>':"")+'</div>';}).join("")+'</aside>';
}
function pmProjectHtml(p){
  if(!p)return '<div class="pmWrap"><div class="pmEmpty"><strong>Projet introuvable</strong><button class="pmBtn" data-pm-action="go-projects">Retour aux projets</button></div></div>';
  var phases=pmArray(p.phases), tasks=pmArray(p.tasks), prog=pmProgress(p), slots=PM.slots?PM.slots(p.id):[];
  return '<div class="pmWrap"><header class="pmDetailHead"><button class="pmBtn pmBtnIcon pmBack" data-pm-action="go-projects" aria-label="Retour aux projets">←</button><div class="pmDetailIdentity"><div class="pmLabels">'+(p.code?'<span class="pmCode">'+pmE(p.code)+'</span>':"")+(p.tranche?'<span class="pmPill">Tranche '+pmE(p.tranche)+'</span>':"")+pmDeadline(p.deadline)+pmLabelsHtml(p.labels)+'</div><h1>'+pmE(p.name)+'</h1><p>'+pmE(p.title||"Sans description")+'</p></div><div class="pmDetailActions"><button class="pmBtn pmBtnPrimary" data-pm-action="add-task" data-pid="'+pmE(p.id)+'">+ Ajouter une action</button><button class="pmBtn" data-pm-action="edit-project" data-pid="'+pmE(p.id)+'">Modifier</button><button class="pmBtn" data-pm-action="archive-project" data-pid="'+pmE(p.id)+'">'+(p.archived?'Réactiver':'Archiver')+'</button></div></header>'
   +'<div class="pmDetailGrid"><section class="pmPhases" aria-label="Phases">'+phases.map(function(ph,i){var list=tasks.filter(function(t){return t.phaseId===ph.id;});return '<details class="pmCard pmPhase" data-phase="'+pmE(ph.id)+'"'+(projectUI.collapsed[p.id+":"+ph.id]?'':' open')+'><summary><span class="pmPhaseTitle">'+pmE(ph.title)+'</span><span class="pmPhaseCount">'+list.filter(function(t){return t.status==="done";}).length+' / '+list.length+'</span><span class="pmPhaseTools"><button data-pm-action="phase-up" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'"'+(i===0?' disabled':'')+' title="Monter" aria-label="Monter la phase">↑</button><button data-pm-action="phase-down" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'"'+(i===phases.length-1?' disabled':'')+' title="Descendre" aria-label="Descendre la phase">↓</button><button data-pm-action="rename-phase" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'" title="Renommer" aria-label="Renommer la phase">✎</button></span></summary><div class="pmPhaseBody">'+(list.length?list.map(function(t){return pmTaskRow(p,t);}).join(""):'<div class="pmEmpty" style="padding:17px">Aucune action dans cette phase.</div>')+pmLegacyForPhase(p,ph.id)+'<button class="pmAddTask" data-pm-action="add-task" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'">+ Ajouter une action ici</button></div></details>';}).join("")+'<button class="pmBtn" data-pm-action="add-phase" data-pid="'+pmE(p.id)+'">+ Ajouter une phase</button></section>'
   +'<aside class="pmSide"><section class="pmCard pmSideCard"><h2>Avancement</h2><div class="pmProgress"><span style="width:'+prog.pct+'%"></span></div><dl class="pmSideMeta" style="margin-top:13px"><dt>Actions</dt><dd>'+prog.done+' / '+prog.total+'</dd><dt>Échéance</dt><dd>'+pmE(pmDate(p.deadline))+'</dd><dt>Planifiées</dt><dd>'+slots.length+'</dd></dl></section><section class="pmCard pmSideCard"><div class="pmSectionHead"><h2>Créneaux planifiés</h2><button class="pmLink" data-pm-action="open-planning">Planning →</button></div>'+(slots.length?slots.sort(function(a,b){return (a.date+a.start).localeCompare(b.date+b.start);}).map(function(s){var task=tasks.find(function(t){return t.id===s.taskId;});return '<div class="pmSlot"><button class="pmSlotWhen" data-pm-action="open-slot-date" data-date="'+pmE(s.date)+'"><b>'+pmE(task?task.title:"Projet")+'</b><small>'+pmE(pmDate(s.date))+' · '+pmE(s.start)+'–'+pmE(s.end)+'</small></button>'+(task?'<button data-pm-action="edit-slot" data-pid="'+pmE(p.id)+'" data-slot="'+pmE(s.id)+'" aria-label="Modifier ce créneau" title="Modifier">✎</button>':'')+'<button data-pm-action="unschedule" data-slot="'+pmE(s.id)+'" aria-label="Retirer ce créneau" title="Retirer">×</button></div>';}).join(""):'<div class="pmEmpty" style="padding:17px"><strong>Aucun créneau</strong>Planifiez une action depuis sa ligne.</div>')+'</section><section class="pmCard pmSideCard"><h2>Réutiliser</h2><p style="font-size:12px;color:var(--ink-3);margin-bottom:11px">Conservez la structure et les actions comme modèle.</p><button class="pmBtn" data-pm-action="save-template" data-pid="'+pmE(p.id)+'">Créer un modèle</button></section></aside></div></div>';
}

function pmSettingsHtml(){
  var codes=pmArray(etat.projectCodes), labels=pmArray(etat.projectLabels), templates=pmArray(etat.projectTemplates);
  return '<div class="pmWrap"><header class="pmPageHead"><div><div class="pmEyebrow">Personnalisation</div><h1>Votre façon de travailler</h1><p>Adaptez les codes, étiquettes et modèles à vos projets.</p></div></header><div class="pmSettingsGrid"><section class="pmCard pmSetting"><h2>Codes projet</h2><p>Une référence courte pour retrouver et filtrer vos projets.</p><div class="pmTokenList">'+(codes.length?codes.map(function(c){return '<div class="pmToken"><span class="pmCode">'+pmE(c)+'</span><span>'+pmE(c)+'</span><button data-pm-action="edit-code" data-value="'+pmE(c)+'" aria-label="Renommer le code">✎</button><button data-pm-action="remove-code" data-value="'+pmE(c)+'" aria-label="Retirer le code">×</button></div>';}).join(""):'<div class="pmEmpty">Aucun code personnalisé.</div>')+'</div><form class="pmInlineAdd" data-pm-form="add-code"><input name="name" maxlength="30" required placeholder="Ex. PRJ-2026"><button class="pmBtn" type="submit">Ajouter</button></form></section>'
   +'<section class="pmCard pmSetting"><h2>Étiquettes</h2><p>Des repères colorés qui peuvent être combinés.</p><div class="pmTokenList">'+(labels.length?labels.map(function(l){return '<div class="pmToken"><span class="pmColor" style="--label-color:'+pmE(l.color)+'"></span><span>'+pmE(l.name)+'</span><button data-pm-action="edit-label" data-id="'+pmE(l.id)+'" aria-label="Modifier l’étiquette">✎</button><button data-pm-action="remove-label" data-id="'+pmE(l.id)+'" aria-label="Retirer l’étiquette">×</button></div>';}).join(""):'<div class="pmEmpty">Aucune étiquette.</div>')+'</div><form class="pmInlineAdd" data-pm-form="add-label"><input name="name" maxlength="30" required placeholder="Nouvelle étiquette"><input type="color" name="color" value="#5266ce" aria-label="Couleur" style="flex:0 0 42px;padding:4px"><button class="pmBtn" type="submit">Ajouter</button></form></section>'
   +'<section class="pmCard pmSetting pmTemplates"><h2>Modèles de projet</h2><p>Une structure prête à l’emploi avec ses phases et ses actions. Créez un modèle depuis la page d’un projet.</p>'+(templates.length?'<div class="pmTemplateGrid">'+templates.map(function(t){return '<article class="pmTemplate"><strong>'+pmE(t.name)+'</strong><p>'+pmArray(t.phases).length+' phases · '+pmArray(t.tasks).length+' actions</p><div class="pmTemplateActions"><button class="pmBtn" data-pm-action="new-from-template" data-id="'+pmE(t.id)+'">Utiliser</button><button class="pmBtn pmBtnDanger" data-pm-action="remove-template" data-id="'+pmE(t.id)+'">Retirer</button></div></article>';}).join("")+'</div>':'<div class="pmEmpty"><strong>Aucun modèle</strong>Ouvrez un projet structuré puis choisissez « Créer un modèle ».</div>')+'</section></div></div>';
}

function renderProjectsUI(){
  if(!projectUI.initialized)return;
  var root=document.getElementById("projectWorkspace"), nav=document.getElementById("appNav"); if(!root||!nav)return;
  document.body.dataset.pmView=projectUI.view;
  nav.querySelectorAll("[data-pm-view]").forEach(function(b){var active=b.dataset.pmView===projectUI.view||(projectUI.view==="project"&&b.dataset.pmView==="projects");b.setAttribute("aria-current",active?"page":"false");});
  if(projectUI.view==="planning"){if(typeof tout==="function")tout();return;}
  if(projectUI.view==="dashboard")root.innerHTML=pmDashboardHtml();
  else if(projectUI.view==="projects")root.innerHTML=pmProjectsHtml();
  else if(projectUI.view==="project")root.innerHTML=pmProjectHtml(pmGet(projectUI.projectId));
  else root.innerHTML=pmSettingsHtml();
}
window.renderProjectsUI=renderProjectsUI;

function pmDialogShells(){
  var labels=pmArray(etat.projectLabels);
  return '<dialog class="pmDialog" id="pmProjectDialog"><div class="pmDialogHead"><div><h2 id="pmProjectDialogTitle">Nouveau projet</h2><p>Donnez-lui un nom clair, puis précisez ce qui aide à le piloter.</p></div><button class="pmClose" data-pm-action="close-dialog" aria-label="Fermer">×</button></div><form class="pmForm" id="pmProjectForm"><input type="hidden" name="projectId"><input type="hidden" name="templateId"><div class="pmFields"><div class="pmField pmFieldFull"><label for="pmName">Nom du projet *</label><input id="pmName" name="name" maxlength="100" required autofocus placeholder="Ex. Réhabilitation du site Nord"></div><div class="pmField pmFieldFull"><label for="pmTitle">Titre descriptif</label><input id="pmTitle" name="title" maxlength="180" placeholder="Le résultat attendu, en une phrase"></div><div class="pmField"><label for="pmTranche">Tranche</label><select id="pmTranche" name="tranche"><option value="">Non définie</option><option value="1">Tranche 1</option><option value="2">Tranche 2</option></select></div><div class="pmField"><label for="pmCode">Code</label><input id="pmCode" name="code" list="pmCodes" maxlength="30" placeholder="Choisir ou créer"><datalist id="pmCodes">'+pmArray(etat.projectCodes).map(function(c){return '<option value="'+pmE(c)+'">';}).join("")+'</datalist><small>Un nouveau code sera ajouté à votre liste.</small></div><div class="pmField"><label for="pmDeadline">Échéance</label><input id="pmDeadline" type="date" name="deadline"></div><fieldset class="pmField" style="border:0;padding:0;margin:0"><legend class="pmLegend">Étiquettes</legend><div class="pmChoiceSet">'+(labels.length?labels.map(function(l){return '<label><input type="checkbox" name="labels" value="'+pmE(l.id)+'"><span class="pmColor" style="--label-color:'+pmE(l.color)+'"></span>'+pmE(l.name)+'</label>';}).join(""):'<small>Ajoutez des étiquettes dans Personnaliser.</small>')+'</div></fieldset></div><div class="pmFormError" role="alert"></div><div class="pmFormActions"><button type="button" class="pmBtn" data-pm-action="close-dialog">Annuler</button><button type="submit" class="pmBtn pmBtnPrimary">Créer le projet</button></div></form></dialog>'
    +'<dialog class="pmDialog" id="pmTaskDialog"><div class="pmDialogHead"><div><h2 id="pmTaskDialogTitle">Nouvelle action</h2><p>Une action concrète, rattachée à une phase.</p></div><button class="pmClose" data-pm-action="close-dialog" aria-label="Fermer">×</button></div><form class="pmForm" id="pmTaskForm"><input type="hidden" name="pid"><input type="hidden" name="tid"><div class="pmFields"><div class="pmField pmFieldFull"><label for="pmTaskTitle">Action *</label><input id="pmTaskTitle" name="title" maxlength="180" required autofocus></div><div class="pmField"><label for="pmTaskPhase">Phase</label><select id="pmTaskPhase" name="phaseId"></select></div><div class="pmField"><label for="pmTaskStatus">État</label><select id="pmTaskStatus" name="status"><option value="todo">À faire</option><option value="doing">En cours</option><option value="done">Terminée</option></select></div><div class="pmField"><label for="pmTaskDeadline">Échéance</label><input id="pmTaskDeadline" type="date" name="deadline"></div><fieldset class="pmField" style="border:0;padding:0;margin:0"><legend class="pmLegend">Étiquettes</legend><div class="pmChoiceSet" id="pmTaskLabels"></div></fieldset><div class="pmField pmFieldFull"><label for="pmTaskNote">Note</label><textarea id="pmTaskNote" name="note" maxlength="1000" placeholder="Informations utiles, prochain pas…"></textarea></div></div><div class="pmFormError" role="alert"></div><div class="pmFormActions"><button type="button" class="pmBtn pmBtnDanger" data-pm-action="delete-task" hidden>Supprimer</button><span style="flex:1"></span><button type="button" class="pmBtn" data-pm-action="close-dialog">Annuler</button><button type="submit" class="pmBtn pmBtnPrimary">Enregistrer</button></div></form></dialog>'
    +'<dialog class="pmDialog" id="pmScheduleDialog"><div class="pmDialogHead"><div><h2>Planifier l’action</h2><p id="pmScheduleName"></p></div><button class="pmClose" data-pm-action="close-dialog" aria-label="Fermer">×</button></div><form class="pmForm" id="pmScheduleForm"><input type="hidden" name="slotId"><input type="hidden" name="pid"><input type="hidden" name="tid"><div class="pmFields"><div class="pmField pmFieldFull"><label for="pmScheduleDate">Date *</label><input id="pmScheduleDate" type="date" name="date" required autofocus></div><div class="pmField"><label for="pmScheduleStart">Début *</label><input id="pmScheduleStart" type="time" name="start" value="09:00" required></div><div class="pmField"><label for="pmScheduleEnd">Fin *</label><input id="pmScheduleEnd" type="time" name="end" value="10:00" required></div></div><div class="pmFormError" role="alert"></div><div class="pmFormActions"><button type="button" class="pmBtn" data-pm-action="close-dialog">Annuler</button><button type="submit" class="pmBtn pmBtnPrimary">Planifier</button></div></form></dialog>';
}

function pmOpenProjectForm(project,templateId,opener){
  var form=document.getElementById("pmProjectForm"), dlg=document.getElementById("pmProjectDialog"); if(!form)return;
  form.reset(); form.elements.projectId.value=project?project.id:""; form.elements.templateId.value=templateId||"";
  form.elements.code.setAttribute("list","pmCodes");
  document.getElementById("pmCodes").innerHTML=pmArray(etat.projectCodes).map(function(c){return '<option value="'+pmE(c)+'">';}).join("");
  var choices=form.querySelector(".pmChoiceSet"); choices.innerHTML=pmArray(etat.projectLabels).map(function(l){return '<label><input type="checkbox" name="labels" value="'+pmE(l.id)+'"><span class="pmColor" style="--label-color:'+pmE(l.color)+'"></span>'+pmE(l.name)+'</label>';}).join("")||'<small>Ajoutez des étiquettes dans Personnaliser.</small>';
  document.getElementById("pmProjectDialogTitle").textContent=project?"Modifier le projet":"Nouveau projet";
  form.querySelector('[type="submit"]').textContent=project?"Enregistrer":"Créer le projet";
  if(project){["name","title","tranche","code","deadline"].forEach(function(k){form.elements[k].value=project[k]||"";});pmArray(project.labels).forEach(function(id){var c=Array.from(form.querySelectorAll('input[name="labels"]')).find(function(x){return x.value===id;});if(c)c.checked=true;});}
  form.querySelector(".pmFormError").textContent=""; pmOpenDialog(dlg.id,opener);
}
function projectEditTask(pid,tid,phaseId,opener){
  var p=pmGet(pid), t=p&&pmArray(p.tasks).find(function(x){return x.id===tid;}), form=document.getElementById("pmTaskForm");if(!p||!form)return;
  form.reset();form.elements.pid.value=pid;form.elements.tid.value=t?t.id:"";
  form.elements.phaseId.innerHTML=pmArray(p.phases).map(function(ph){return '<option value="'+pmE(ph.id)+'">'+pmE(ph.title)+'</option>';}).join("");
  form.elements.phaseId.value=(t&&t.phaseId)||phaseId||(p.phases[0]&&p.phases[0].id)||"";
  document.getElementById("pmTaskDialogTitle").textContent=t?"Modifier l’action":"Nouvelle action";
  var labels=document.getElementById("pmTaskLabels");labels.innerHTML=pmArray(etat.projectLabels).map(function(l){return '<label><input type="checkbox" name="taskLabels" value="'+pmE(l.id)+'"><span class="pmColor" style="--label-color:'+pmE(l.color)+'"></span>'+pmE(l.name)+'</label>';}).join("")||'<small>Aucune étiquette disponible.</small>';
  if(t){form.elements.title.value=t.title||"";form.elements.status.value=t.status||"todo";form.elements.deadline.value=t.deadline||"";form.elements.note.value=t.note||"";pmArray(t.labels).forEach(function(id){var c=form.querySelector('input[name="taskLabels"][value="'+CSS.escape(id)+'"]');if(c)c.checked=true;});}
  form.querySelector('[data-pm-action="delete-task"]').hidden=!t;form.querySelector(".pmFormError").textContent="";pmOpenDialog("pmTaskDialog",opener);
}
window.projectEditTask=projectEditTask;
function pmOpenSchedule(pid,tid,opener,slot){var p=pmGet(pid),t=p&&pmArray(p.tasks).find(function(x){return x.id===tid;}),f=document.getElementById("pmScheduleForm");if(!t||!f)return;f.reset();f.elements.pid.value=pid;f.elements.tid.value=tid;f.elements.slotId.value=slot?slot.id:"";var nextDay=new Date();while(nextDay.getDay()===0||nextDay.getDay()===6)nextDay.setDate(nextDay.getDate()+1);f.elements.date.value=slot?slot.date:iso(nextDay);f.elements.start.value=slot?slot.start:"09:00";f.elements.end.value=slot?slot.end:"10:00";f.querySelector("[type=submit]").textContent=slot?"Enregistrer":"Planifier";document.getElementById("pmScheduleName").textContent=t.title;f.querySelector(".pmFormError").textContent="";pmOpenDialog("pmScheduleDialog",opener);}

function pmFormDataLabels(form,name){return Array.from(form.querySelectorAll('input[name="'+name+'"]:checked')).map(function(x){return x.value;});}
function pmMutateProject(pid,values){try{PM.update(pid,values);renderProjectsUI();return true;}catch(e){pmNotify(e.message||"Modification impossible.");return false;}}

function pmHandleClick(e){
  var b=e.target.closest("[data-pm-action]");if(!b)return;var a=b.dataset.pmAction,pid=b.dataset.pid,tid=b.dataset.tid,p,phases,i,name;
  if(a==="new-project"){pmOpenProjectForm(null,"",b);return;} if(a==="open-project"){projectNavigate("project",b.dataset.id);return;} if(a==="go-projects"){projectNavigate("projects");return;} if(a==="open-planning"){projectNavigate("planning");return;} if(a==="close-dialog"){pmCloseDialog(b.closest("dialog"));return;}
  if(a==="edit-project"){pmOpenProjectForm(pmGet(pid),"",b);return;} if(a==="archive-project"){p=pmGet(pid);var wasArchived=p&&p.archived;if(p&&pmMutateProject(pid,{archived:!wasArchived}))pmNotify(wasArchived?"Projet réactivé.":"Projet archivé.");return;}
  if(a==="add-task"){projectEditTask(pid,"",b.dataset.phase,b);return;} if(a==="edit-task"){projectEditTask(pid,tid,"",b);return;} if(a==="schedule-task"){pmOpenSchedule(pid,tid,b);return;}
  if(a==="delete-task"){var f=document.getElementById("pmTaskForm");if(!f.elements.tid.value)return;if(window.confirm("Supprimer cette action ? Cette opération ne peut pas être annulée.")){PM.removeTask(f.elements.pid.value,f.elements.tid.value);pmCloseDialog(document.getElementById("pmTaskDialog"));renderProjectsUI();pmNotify("Action supprimée.");}return;}
  if(a==="unschedule"){PM.unschedule(b.dataset.slot);renderProjectsUI();pmNotify("Créneau retiré.");return;}
  if(a==="edit-slot"){var slot=PM.slots(pid).find(function(x){return x.id===b.dataset.slot;});if(slot)pmOpenSchedule(pid,slot.taskId,b,slot);return;}
  if(a==="open-slot-date"){if(PM.openDate)PM.openDate(b.dataset.date);projectNavigate("planning");return;}
  if(a==="add-phase"){name=window.prompt("Nom de la nouvelle phase");if(name&&name.trim()){p=pmGet(pid);phases=pmArray(p.phases).concat([{id:uid(),title:name.trim()}]);pmMutateProject(pid,{phases:phases});}return;}
  if(a==="rename-phase"){e.preventDefault();e.stopPropagation();p=pmGet(pid);phases=pmArray(p.phases).map(function(x){return {id:x.id,title:x.title};});i=phases.findIndex(function(x){return x.id===b.dataset.phase;});name=window.prompt("Nom de la phase",i>=0?phases[i].title:"");if(i>=0&&name&&name.trim()){phases[i].title=name.trim();pmMutateProject(pid,{phases:phases});}return;}
  if(a==="phase-up"||a==="phase-down"){e.preventDefault();e.stopPropagation();p=pmGet(pid);phases=pmArray(p.phases).map(function(x){return {id:x.id,title:x.title};});i=phases.findIndex(function(x){return x.id===b.dataset.phase;});var j=a==="phase-up"?i-1:i+1;if(i>=0&&j>=0&&j<phases.length){var tmp=phases[i];phases[i]=phases[j];phases[j]=tmp;pmMutateProject(pid,{phases:phases});}return;}
  if(a==="save-template"){p=pmGet(pid);name=window.prompt("Nom du modèle",p.name);if(name&&name.trim()){etat.projectTemplates=pmArray(etat.projectTemplates);etat.projectTemplates.push({id:uid(),name:name.trim(),phases:pmArray(p.phases).map(function(x){return{id:x.id,title:x.title};}),tasks:pmArray(p.tasks).map(function(t){return{title:t.title,phaseId:t.phaseId,status:"todo",deadline:"",labels:pmArray(t.labels),note:t.note||""};})});pmSave();renderProjectsUI();pmNotify("Modèle créé.");}return;}
  if(a==="new-from-template"){pmOpenProjectForm(null,b.dataset.id,b);return;} if(a==="remove-template"){if(window.confirm("Retirer ce modèle ? Les projets existants seront conservés.")){etat.projectTemplates=pmArray(etat.projectTemplates).filter(function(x){return x.id!==b.dataset.id;});pmSave();renderProjectsUI();}return;}
  if(a==="remove-code"){if(window.confirm("Retirer ce code de la liste ? Les projets qui l’utilisent le conserveront.")){etat.projectCodes=pmArray(etat.projectCodes).filter(function(x){return x!==b.dataset.value;});pmSave();renderProjectsUI();}return;}
  if(a==="edit-code"){var oldCode=b.dataset.value,newCode=window.prompt("Nouveau code",oldCode);if(newCode&&newCode.trim()&&newCode.trim()!==oldCode){newCode=newCode.trim();if(pmArray(etat.projectCodes).indexOf(newCode)>=0){pmNotify("Ce code existe déjà.");return;}etat.projectCodes=pmArray(etat.projectCodes).map(function(x){return x===oldCode?newCode:x;});pmProjects().filter(function(x){return x.code===oldCode;}).forEach(function(x){PM.update(x.id,{code:newCode});});pmSave();renderProjectsUI();pmNotify("Code renommé.");}return;}
  if(a==="edit-label"){var label=pmLabelById(b.dataset.id);if(!label)return;var newName=window.prompt("Nom de l’étiquette",label.name);if(newName===null)return;newName=newName.trim();if(!newName){pmNotify("Le nom ne peut pas être vide.");return;}var newColor=window.prompt("Couleur hexadécimale",label.color||"#5266ce");if(newColor===null)return;newColor=newColor.trim();if(!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(newColor)){pmNotify("Utilisez une couleur hexadécimale, par exemple #5266ce.");return;}label.name=newName;label.color=newColor;pmSave();renderProjectsUI();pmNotify("Étiquette modifiée.");return;}
  if(a==="remove-label"){var used=pmProjects().some(function(x){return pmArray(x.labels).indexOf(b.dataset.id)>=0||pmArray(x.tasks).some(function(t){return pmArray(t.labels).indexOf(b.dataset.id)>=0;});})||pmArray(etat.projectTemplates).some(function(x){return pmArray(x.tasks).some(function(t){return pmArray(t.labels).indexOf(b.dataset.id)>=0;});});if(used){pmNotify("Cette étiquette est encore utilisée par un projet ou un modèle.");return;}if(window.confirm("Retirer cette étiquette de la liste ?")){etat.projectLabels=pmArray(etat.projectLabels).filter(function(x){return x.id!==b.dataset.id;});pmSave();renderProjectsUI();}return;}
}

function pmRestoreTaskFocus(action,pid,tid){
  var match=Array.from(document.querySelectorAll("#projectWorkspace [data-pm-action]")).find(function(x){return x.dataset.pmAction===action&&x.dataset.pid===pid&&x.dataset.tid===tid;});
  if(match) match.focus({preventScroll:true});
}
function pmHandleChange(e){
  var el=e.target,filter=el.dataset.pmFilter,a=el.dataset.pmAction;
  if(filter){projectUI[filter]=el.type==="checkbox"?el.checked:el.value;renderProjectsUI();return;}
  if(a==="toggle-task"){PM.updateTask(el.dataset.pid,el.dataset.tid,{status:el.checked?"done":"todo"});renderProjectsUI();pmRestoreTaskFocus(a,el.dataset.pid,el.dataset.tid);return;}
  if(a==="task-status"){PM.updateTask(el.dataset.pid,el.dataset.tid,{status:el.value});renderProjectsUI();pmRestoreTaskFocus(a,el.dataset.pid,el.dataset.tid);return;}
  if(a==="rename-task"){var title=el.value.trim();if(title)PM.updateTask(el.dataset.pid,el.dataset.tid,{title:title});else renderProjectsUI();return;}
}
function pmHandleInput(e){if(e.target.dataset.pmFilter==="query"){projectUI.query=e.target.value;var pos=e.target.selectionStart;renderProjectsUI();var f=document.querySelector('[data-pm-filter="query"]');if(f){f.focus();f.setSelectionRange(pos,pos);}}}
function pmHandleToggle(e){var d=e.target;if(d.matches(".pmPhase")){var p=pmGet(projectUI.projectId);if(p)projectUI.collapsed[p.id+":"+d.dataset.phase]=!d.open;}}

function pmHandleSubmit(e){
  var form=e.target;if(!form.matches("[data-pm-form],#pmProjectForm,#pmTaskForm,#pmScheduleForm"))return;e.preventDefault();var fd=new FormData(form),err=form.querySelector(".pmFormError");if(err)err.textContent="";
  try{
    if(form.matches("#pmProjectForm")){
      var name=String(fd.get("name")||"").trim(), code=String(fd.get("code")||"").trim();if(!name)throw new Error("Le nom du projet est requis.");
      var values={name:name,title:String(fd.get("title")||"").trim(),tranche:String(fd.get("tranche")||""),code:code,deadline:String(fd.get("deadline")||""),labels:pmFormDataLabels(form,"labels")};
      if(code&&pmArray(etat.projectCodes).indexOf(code)<0){etat.projectCodes=pmArray(etat.projectCodes).concat([code]);}
      var id=String(fd.get("projectId")||"");
      if(id){PM.update(id,values);}else{var template=pmArray(etat.projectTemplates).find(function(x){return x.id===fd.get("templateId");});if(template){values.phases=template.phases;values.tasks=template.tasks;}var created=PM.create(values);id=created&&created.id?created.id:created;}
      pmCloseDialog(document.getElementById("pmProjectDialog"));projectNavigate("project",id);pmNotify(fd.get("projectId")?"Projet mis à jour.":"Projet créé.");return;
    }
    if(form.matches("#pmTaskForm")){
      var title=String(fd.get("title")||"").trim();if(!title)throw new Error("Le titre de l’action est requis.");var v={title:title,phaseId:String(fd.get("phaseId")||""),status:String(fd.get("status")||"todo"),deadline:String(fd.get("deadline")||""),labels:pmFormDataLabels(form,"taskLabels"),note:String(fd.get("note")||"").trim()},tid=String(fd.get("tid")||""),pid=String(fd.get("pid")||"");if(tid)PM.updateTask(pid,tid,v);else PM.addTask(pid,v);pmCloseDialog(document.getElementById("pmTaskDialog"));renderProjectsUI();pmNotify(tid?"Action mise à jour.":"Action ajoutée.");return;
    }
    if(form.matches("#pmScheduleForm")){var start=String(fd.get("start")),end=String(fd.get("end"));if(start>=end)throw new Error("L’heure de fin doit être après le début.");PM.schedule(String(fd.get("pid")),String(fd.get("tid")),{date:String(fd.get("date")),start:start,end:end},String(fd.get("slotId")||"")||undefined);pmCloseDialog(document.getElementById("pmScheduleDialog"));renderProjectsUI();pmNotify("Action planifiée.");return;}
    if(form.dataset.pmForm==="add-code"){var c=String(fd.get("name")||"").trim();if(c&&pmArray(etat.projectCodes).indexOf(c)<0){etat.projectCodes=pmArray(etat.projectCodes).concat([c]);pmSave();}renderProjectsUI();return;}
    if(form.dataset.pmForm==="add-label"){var n=String(fd.get("name")||"").trim();if(n){etat.projectLabels=pmArray(etat.projectLabels).concat([{id:uid(),name:n,color:String(fd.get("color")||"#5266ce")}]);pmSave();}renderProjectsUI();return;}
  }catch(ex){if(err)err.textContent=ex.message||"Vérifiez les informations saisies.";else pmNotify(ex.message||"Opération impossible.");}
}

function initProjectsUI(){
  if(projectUI.initialized)return; if(!window.PM){console.warn("Plaaning: API projets indisponible");return;}
  var bar=document.querySelector(".bar"), intro=document.querySelector("body > .intro"), footer=document.querySelector("footer.pied");if(!bar||!intro)return;
  function syncHeaderHeight(){document.documentElement.style.setProperty("--pm-header-height",bar.getBoundingClientRect().height+"px");}
  syncHeaderHeight();if(window.ResizeObserver)new ResizeObserver(syncHeaderHeight).observe(bar);else window.addEventListener("resize",syncHeaderHeight);
  var nav=document.createElement("div");nav.className="appNavShell";nav.innerHTML='<nav class="appNav" id="appNav" aria-label="Navigation principale"><button data-pm-view="dashboard" data-pm-action="navigate">Accueil</button><button data-pm-view="projects" data-pm-action="navigate">Projets</button><button data-pm-view="planning" data-pm-action="navigate">Planning</button><button data-pm-view="settings" data-pm-action="navigate">Personnaliser</button><button class="pmNew" data-pm-action="new-project">+ Nouveau</button></nav>';bar.after(nav);
  var planning=document.createElement("div");planning.id="planningWorkspace";intro.before(planning);[intro,document.querySelector("body > .bilan"),document.querySelector("body > .railZone"),document.querySelector("body > main.jour"),document.querySelector("body > section.modeles")].forEach(function(x){if(x)planning.appendChild(x);});
  var root=document.createElement("main");root.id="projectWorkspace";root.tabIndex=-1;(footer||planning.nextSibling).before(root);
  document.body.insertAdjacentHTML("beforeend",pmDialogShells());
  document.addEventListener("click",function(e){var navButton=e.target.closest('[data-pm-action="navigate"]');if(navButton){projectNavigate(navButton.dataset.pmView);return;}pmHandleClick(e);});
  document.addEventListener("change",pmHandleChange);document.addEventListener("input",pmHandleInput);document.addEventListener("submit",pmHandleSubmit);document.addEventListener("toggle",pmHandleToggle,true);
  document.querySelectorAll(".pmDialog").forEach(function(d){d.addEventListener("click",function(e){if(e.target===d)pmCloseDialog(d);});d.addEventListener("cancel",function(e){e.preventDefault();pmCloseDialog(d);});});
  try{var stored=JSON.parse(localStorage.getItem("plaaning.projectView")||"null");if(stored&&["dashboard","projects","planning","settings","project"].indexOf(stored.view)>=0){projectUI.view=stored.view;projectUI.projectId=stored.projectId||null;}}catch(e){}
  if(projectUI.view==="project"&&!pmGet(projectUI.projectId)){projectUI.view="dashboard";projectUI.projectId=null;}
  projectUI.initialized=true;renderProjectsUI();
}
window.initProjectsUI=initProjectsUI;
