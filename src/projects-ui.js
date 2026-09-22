/* Workspace projets. Ce fichier est injecté dans l'IIFE principal. */
var projectUI = {
  view:"dashboard", projectId:null, query:"", tranche:"", code:"", label:"", archived:false,
  collapsed:{}, completedOpen:{}, trancheTabs:{}, returnFocus:null, initialized:false, renderedDay:"", suspendRender:false
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
function pmUrgency(task){return window.PM&&PM.urgency?PM.urgency(task,pmToday()):{level:"normal",rank:0,reason:"",automatic:true};}
function pmUrgencyHtml(task){var u=pmUrgency(task),names={normal:"Normale",watch:"À surveiller",urgent:"Urgente",critical:"Critique"};return '<span class="pmPill pmUrgency pmUrgency-'+pmE(u.level)+'" title="'+pmE(u.level==="normal"?"":u.reason||"")+'">'+pmE(names[u.level]||u.level)+(u.level!=="normal"&&u.reason?' · '+pmE(u.reason):'')+'</span>';}
function pmContactName(p,id){var c=pmArray(p.contacts).find(function(x){return x.id===id;});return c?c.name:"";}
function pmSafe(action,message){try{return action();}catch(e){pmNotify(e.message||message||"Opération impossible.");return null;}}
function pmLabelById(id){ return pmArray(etat.projectLabels).find(function(x){return x.id===id;}); }
function pmLabelsHtml(ids){
  return pmArray(ids).map(function(id){var l=pmLabelById(id);return l?'<span class="pmLabel" style="--label-color:'+pmE(l.color||"#5266ce")+'">'+pmE(l.name)+'</span>':"";}).join("");
}
function pmProgress(project){
  var tasks=pmArray(project.tasks), done=tasks.filter(function(t){return t.status==="done";}).length;
  return {done:done,total:tasks.length,pct:tasks.length?Math.round(done/tasks.length*100):0};
}
function pmTaskScope(task){return task&&["common","1","2"].indexOf(task.tranche)>=0?task.tranche:"common";}
function pmTrancheLabel(scope){return window.PM&&PM.trancheLabel?PM.trancheLabel(scope):({common:"Commun","1":"T1","2":"T2",both:"T1 + T2"}[scope]||"");}
function pmScopeBadge(scope){var label=pmTrancheLabel(scope);return label?'<span class="pmPill pmScope pmScope-'+pmE(scope)+'">'+pmE(label)+'</span>':"";}
function pmProjectTrancheBadge(p){return p.tranche?pmScopeBadge(p.tranche):"";}
function pmScopedTasks(p,scope){var tasks=pmArray(p.tasks);return scope&&scope!=="all"?tasks.filter(function(t){return pmTaskScope(t)===scope;}):tasks;}
function pmScopedProgress(p,scope){var tasks=pmScopedTasks(p,scope),done=tasks.filter(function(t){return t.status==="done";}).length;return {done:done,total:tasks.length,pct:tasks.length?Math.round(done/tasks.length*100):0};}
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
  if(["dashboard","review","projects","planning","settings"].indexOf(view)<0) view="dashboard";
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
  if(compact)return '<button type="button" class="pmProjectRow" data-pm-action="open-project" data-id="'+pmE(p.id)+'"><span><span class="pmProjectName">'+pmE(p.name)+'</span><span class="pmProjectTitle">'+pmE(p.title||"Sans description")+'</span><span class="pmProgress"><span style="width:'+pr.pct+'%"></span></span></span><span class="pmProjectMeta">'+pmProjectTrancheBadge(p)+(p.code?'<span class="pmCode">'+pmE(p.code)+'</span>':"")+pmDeadline(p.deadline)+'<span class="pmPill">'+pr.done+'/'+pr.total+'</span></span></button>';
  return '<button type="button" class="pmCard pmProjectCard" data-pm-action="open-project" data-id="'+pmE(p.id)+'"><span class="pmProjectCardTop"><span><h2>'+pmE(p.name)+'</h2><p>'+pmE(p.title||"Sans description")+'</p></span>'+(p.code?'<span class="pmCode">'+pmE(p.code)+'</span>':"")+'</span><span class="pmLabels">'+labs+'</span><span class="pmProjectMeta" style="justify-content:flex-start;margin-top:9px">'+pmProjectTrancheBadge(p)+pmDeadline(p.deadline)+'</span><span class="pmProgress"><span style="width:'+pr.pct+'%"></span></span><span class="pmProjectStats"><span>'+pr.done+' sur '+pr.total+' actions</span><span>'+pr.pct+' %</span></span></button>';
}

function pmPriorityCompare(a,b){var au=pmUrgency(a.t),bu=pmUrgency(b.t);return (bu.rank||0)-(au.rank||0)||(Number(a.t.importance||2)-Number(b.t.importance||2))||(a.t.deadline||"9999").localeCompare(b.t.deadline||"9999")||(a.p.id+a.t.id).localeCompare(b.p.id+b.t.id);}
function pmHasFutureSlot(p,t,today){return !!(PM.slots&&PM.slots(p.id,t.id).some(function(slot){return slot.date>=today;}));}
function pmSlotTitle(project,slot){
  var tasks=pmArray(project.tasks),task=tasks.find(function(t){return t.id===slot.taskId;});
  var scope=slot.tranche||(task&&pmTaskScope(task)),prefix=scope?pmTrancheLabel(scope)+" · ":"";
  if(task)return prefix+task.title;
  if(Array.isArray(slot.taskIds)){var phase=pmArray(project.phases).find(function(p){return p.id===slot.phaseId;});return prefix+(phase?phase.title:"Séance")+" · "+slot.taskIds.length+" action"+(slot.taskIds.length>1?"s":"");}
  return project.name;
}
function renderPlanningExtras(){
  if(!projectUI.initialized)return;
  if(typeof renderPlanningSessionsUI==="function")renderPlanningSessionsUI();
  if(typeof renderPlanningDeadlinesUI==="function")renderPlanningDeadlinesUI();
}
window.renderPlanningExtras=renderPlanningExtras;
function pmPriorityItem(x,action){return '<div class="pmQuickRow pmPriorityRow"><span><b>'+pmE(x.t.title)+'</b><small>'+pmE(x.p.name)+(x.t.deadline?' · À terminer avant '+pmE(pmDate(x.t.deadline)):' · Sans date')+'</small><span class="pmTaskInfo">'+pmScopeBadge(pmTaskScope(x.t))+pmUrgencyHtml(x.t)+(x.t.importance?'<span class="pmPill">Importance '+pmE(x.t.importance)+'</span>':'')+'</span></span><button class="pmBtn" data-pm-action="'+(action==="schedule"?'schedule-task':'open-task')+'" data-pid="'+pmE(x.p.id)+'" data-tid="'+pmE(x.t.id)+'">'+(action==="schedule"?'Planifier':'Ouvrir')+'</button></div>';}
function pmDashboardHtml(){
  var all=pmProjects().filter(function(p){return !p.archived;}), today=pmToday(), priority=[], unplanned=[], nextSlots=[];
  all.forEach(function(p){pmArray(p.tasks).forEach(function(t){if(t.status!=="done"){priority.push({p:p,t:t});if(!pmHasFutureSlot(p,t,today))unplanned.push({p:p,t:t});}});if(PM.slots)PM.slots(p.id).forEach(function(s){if(s.date>=today)nextSlots.push({p:p,s:s,t:pmArray(p.tasks).find(function(t){return t.id===s.taskId;})});});});
  priority.sort(pmPriorityCompare);
  nextSlots.sort(function(a,b){return (a.s.date+a.s.start).localeCompare(b.s.date+b.s.start);});
  return '<div class="pmWrap"><header class="pmPageHead"><div><div class="pmEyebrow">Vue d’ensemble</div><h1>Priorités à piloter</h1><p>Les actions les plus sensibles, tous projets confondus.</p></div><div class="pmDetailActions"><button class="pmBtn" data-pm-action="weekly-review">Revue hebdomadaire</button><button class="pmBtn pmBtnPrimary" data-pm-action="new-project">+ Nouveau projet</button></div></header>'
   +'<section class="pmCard pmSection"><div class="pmSectionHead"><h2>Priorités</h2><span class="pmPill">'+priority.length+'</span></div>'+(priority.length?'<div class="pmQuickList">'+priority.slice(0,10).map(pmPriorityItem).join("")+'</div>':'<div class="pmEmpty"><strong>Rien à traiter</strong>Les actions en cours apparaîtront ici.</div>')+'</section>'
   +'<section class="pmCard pmSection pmProjectOverview"><div class="pmSectionHead"><h2>Projets actifs</h2><button class="pmLink" data-pm-action="go-projects">Voir tous →</button></div><div class="pmProjectList">'+(all.length?all.slice(0,5).map(function(p){return pmProjectCard(p,true);}).join(''):'<div class="pmEmpty">Créez un projet avec le bouton +.</div>')+'</div></section>'
   +'<div class="pmDashGrid pmDashActions"><section class="pmCard pmSection"><div class="pmSectionHead"><h2>À planifier</h2><span class="pmPill">'+unplanned.length+'</span></div>'+(unplanned.length?'<div class="pmQuickList">'+unplanned.sort(pmPriorityCompare).slice(0,5).map(function(x){return pmPriorityItem(x,"schedule");}).join("")+'</div>':'<div class="pmEmpty"><strong>Tout est placé</strong></div>')+'</section><section class="pmCard pmSection"><div class="pmSectionHead"><h2>Prochains créneaux</h2><button class="pmLink" data-pm-action="open-planning">Planning →</button></div>'+(nextSlots.length?'<div class="pmQuickList">'+nextSlots.slice(0,5).map(function(x){return '<button class="pmQuickRow pmQuickSlot" data-pm-action="open-slot-date" data-date="'+pmE(x.s.date)+'"><span><b>'+pmE(pmSlotTitle(x.p,x.s))+'</b><small>'+pmE(pmDate(x.s.date))+' · '+pmE(x.s.start)+'–'+pmE(x.s.end)+' · '+pmE(x.p.name)+'</small></span><span>→</span></button>';}).join("")+'</div>':'<div class="pmEmpty"><strong>Aucun créneau à venir</strong></div>')+'</section></div></div>';
}
function pmWeeklyHtml(){
 var today=pmToday(),limit=new Date(today+'T12:00:00');limit.setDate(limit.getDate()+7);limit=iso(limit);var groups={overdue:[],waiting:[],followups:[],unplanned:[],unscheduled:[],next7days:[]};
 pmProjects().filter(function(p){return !p.archived;}).forEach(function(p){pmArray(p.tasks).forEach(function(t){if(t.status==='done')return;var x={p:p,t:t};if(t.deadline&&t.deadline<today)groups.overdue.push(x);if(t.blockedReason|| (PM.blockers&&PM.blockers(p.id,t.id).length))groups.waiting.push(x);if(t.followUpDate&&t.followUpDate<=today)groups.followups.push(x);if(!pmHasFutureSlot(p,t,today))groups.unplanned.push(x);if(!t.deadline)groups.unscheduled.push(x);if(t.deadline&&t.deadline>=today&&t.deadline<=limit)groups.next7days.push(x);});});
 var defs=[['overdue','En retard'],['waiting','En attente / bloquées'],['followups','Relances à faire'],['unplanned','À planifier'],['unscheduled','Sans échéance'],['next7days','7 prochains jours']];
 return '<div class="pmWrap"><header class="pmPageHead"><div><div class="pmEyebrow">Pilotage</div><h1>Revue hebdomadaire</h1><p>Un passage rapide sur les actions qui demandent une décision.</p></div><button class="pmBtn" data-pm-action="go-dashboard">Retour à l’accueil</button></header>'+defs.map(function(d){var rows=groups[d[0]];return '<section class="pmCard pmSection pmReviewSection"><div class="pmSectionHead"><h2>'+d[1]+'</h2><span class="pmPill">'+rows.length+'</span></div>'+(rows.length?'<div class="pmQuickList">'+rows.sort(pmPriorityCompare).map(function(x){return pmPriorityItem(x,d[0]==="unplanned"?"schedule":"open");}).join('')+'</div>':'<div class="pmEmpty">Aucune action.</div>')+'</section>';}).join('')+'</div>';
}
function pmProjectsHtml(){
  var q=projectUI.query.toLocaleLowerCase("fr"), arr=pmProjects().filter(function(p){
    if(!projectUI.archived&&p.archived)return false;
    if(projectUI.archived&&!p.archived)return false;
    if(projectUI.tranche&&p.tranche!==projectUI.tranche&&p.tranche!=="both")return false;
    if(projectUI.code&&p.code!==projectUI.code)return false;
    if(projectUI.label&&pmArray(p.labels).indexOf(projectUI.label)<0)return false;
    return !q||(p.name+" "+(p.title||"")+" "+(p.code||"")).toLocaleLowerCase("fr").indexOf(q)>=0;
  });
  return '<div class="pmWrap"><header class="pmPageHead"><div><div class="pmEyebrow">Portefeuille</div><h1>Mes projets</h1><p>'+arr.length+' projet'+(arr.length>1?'s':'')+' affiché'+(arr.length>1?'s':'')+'.</p></div><button class="pmBtn pmBtnPrimary" data-pm-action="new-project">+ Nouveau projet</button></header>'
    +'<div class="pmCard pmToolbar"><label class="pmSearch"><span class="sr">Rechercher</span><input type="search" data-pm-filter="query" value="'+pmE(projectUI.query)+'" placeholder="Rechercher un projet…"></label><select data-pm-filter="tranche" aria-label="Filtrer par tranche">'+pmSelectOptions(["1","2"],projectUI.tranche,"Toutes les tranches")+'</select><select data-pm-filter="code" aria-label="Filtrer par code">'+pmSelectOptions(pmArray(etat.projectCodes),projectUI.code,"Tous les codes")+'</select><select data-pm-filter="label" aria-label="Filtrer par étiquette">'+pmSelectOptions(pmArray(etat.projectLabels),projectUI.label,"Toutes les étiquettes")+'</select><label class="pmCheck"><input type="checkbox" data-pm-filter="archived"'+(projectUI.archived?' checked':'')+'> Archivés</label></div>'
    +(arr.length?'<div class="pmProjectsGrid">'+arr.map(function(p){return pmProjectCard(p,false);}).join("")+'</div>':'<div class="pmEmpty"><strong>Aucun projet ne correspond</strong>Modifiez les filtres ou créez un nouveau projet.</div>')+'</div>';
}

function pmTaskRow(p,t){
 var blockers=window.PM&&PM.blockers?PM.blockers(p.id,t.id):[], fields=pmArray(p.taskFields),scope=pmTaskScope(t),scopeBadge=p.tranche==="both"&&scope==="common"?'<span class="pmPill pmScope pmScope-common">À affecter</span>':pmScopeBadge(scope);
 return '<div class="pmTaskRow" data-status="'+pmE(t.status)+'" data-urgency="'+pmE(pmUrgency(t).level)+'"><input class="pmTaskCheck" type="checkbox" data-pm-action="toggle-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="Marquer comme terminée"'+(t.status==="done"?' checked':'')+'><div class="pmTaskMain"><input class="pmTaskTitle" value="'+pmE(t.title)+'" data-pm-action="rename-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="Titre de l’action"><div class="pmTaskInfo">'+scopeBadge+pmUrgencyHtml(t)+(t.deadline?'<span class="pmPill">À terminer avant '+pmE(pmDate(t.deadline))+'</span>':'')+(blockers.length?'<span class="pmPill pmPillBad">Bloquée par '+blockers.length+' action'+(blockers.length>1?'s':'')+'</span>':'')+(t.blockedReason?'<span class="pmPill pmPillWarn">'+pmE(t.blockedReason)+'</span>':'')+(t.assigneeId?'<span class="pmPill">Resp. '+pmE(pmContactName(p,t.assigneeId))+'</span>':'')+(t.validatorId?'<span class="pmPill">Valid. '+pmE(pmContactName(p,t.validatorId))+'</span>':'')+pmLabelsHtml(t.labels)+'</div>'+(fields.length?'<div class="pmTaskFields">'+fields.map(function(f){return '<label><span>'+pmE(f.title)+'</span><input value="'+pmE((t.fields||{})[f.id]||'')+'" data-pm-action="task-field" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" data-field="'+pmE(f.id)+'"></label>';}).join('')+'</div>':'')+'</div><textarea class="pmInlineNote" rows="1" maxlength="1000" data-pm-action="task-note" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="Référence ou commentaire pour '+pmE(t.title)+'" placeholder="Référence ou commentaire…" spellcheck="true">'+pmE(t.note||"")+'</textarea><select data-pm-action="task-status" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="État"><option value="todo"'+(t.status==="todo"?' selected':'')+'>À faire</option><option value="doing"'+(t.status==="doing"?' selected':'')+'>En cours</option><option value="done"'+(t.status==="done"?' selected':'')+'>Terminée</option></select><div class="pmTaskActions"><button class="pmScheduleBtn"'+(t.status==="done"?' disabled title="Action déjà terminée"':'')+' data-pm-action="schedule-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'">Planifier</button><button data-pm-action="edit-task" data-pid="'+pmE(p.id)+'" data-tid="'+pmE(t.id)+'" aria-label="Modifier les détails">•••</button></div></div>';
}
function pmLegacyForPhase(p,phaseId){
  var rows=pmArray(p.legacyFiches).filter(function(x){return x.phaseId===phaseId&&(x.note||x.debut||x.fin);});
  if(!rows.length)return "";
  return '<aside class="pmLegacy"><strong>Données héritées du planning</strong>'+rows.map(function(x){return '<div>'+(x.note?'<p>'+pmE(x.note)+'</p>':"")+((x.debut||x.fin)?'<small>Période : '+pmE(x.debut?pmDate(x.debut):"non renseignée")+' → '+pmE(x.fin?pmDate(x.fin):"non renseignée")+'</small>':"")+'</div>';}).join("")+'</aside>';
}
function pmPhaseListHtml(p,scope){
  var phases=pmArray(p.phases),tasks=pmScopedTasks(p,scope);
  return phases.map(function(ph,i){
    var list=tasks.filter(function(t){return t.phaseId===ph.id;}),active=list.filter(function(t){return t.status!=="done";}),done=list.filter(function(t){return t.status==="done";});
    if(PM.sortTasks)active=PM.sortTasks(active,pmToday());
    var key=p.id+":"+(scope||"all")+":"+ph.id;
    return '<details class="pmCard pmPhase" data-phase="'+pmE(ph.id)+'" data-scope="'+pmE(scope||"all")+'"'+(projectUI.collapsed[key]?'':' open')+'><summary><span class="pmPhaseTitle">'+pmE(ph.title)+'</span><span class="pmPhaseCount">'+done.length+' / '+list.length+'</span><span class="pmPhaseTools"><button data-pm-action="phase-up" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'"'+(i===0?' disabled':'')+' title="Monter" aria-label="Monter la phase">↑</button><button data-pm-action="phase-down" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'"'+(i===phases.length-1?' disabled':'')+' title="Descendre" aria-label="Descendre la phase">↓</button><button data-pm-action="rename-phase" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'" title="Renommer" aria-label="Renommer la phase">✎</button></span></summary><div class="pmPhaseBody">'+(list.length?active.map(function(t){return pmTaskRow(p,t);}).join("")+(done.length?'<details class="pmCompletedTasks" data-completed-key="'+pmE(key)+'"'+(projectUI.completedOpen[key]?' open':'')+'><summary>'+done.length+' terminée'+(done.length>1?'s':'')+'</summary>'+done.map(function(t){return pmTaskRow(p,t);}).join("")+'</details>':''):'<div class="pmEmpty" style="padding:17px">Aucune action dans cette phase.</div>')+pmLegacyForPhase(p,ph.id)+'<button class="pmAddTask" data-pm-action="add-task" data-pid="'+pmE(p.id)+'" data-phase="'+pmE(ph.id)+'" data-tranche="'+pmE(scope&&scope!=="all"?scope:"")+'">+ Ajouter une action ici</button></div></details>';
  }).join("")+'<button class="pmBtn" data-pm-action="add-phase" data-pid="'+pmE(p.id)+'">+ Ajouter une phase</button>';
}
function pmBranchDetails(p,scope){return (p.trancheDetails&&p.trancheDetails[scope])||{};}
function pmBranchSummary(p,scope){
  var prog=pmScopedProgress(p,scope),d=pmBranchDetails(p,scope),phase=pmArray(p.phases).find(function(x){return x.id===d.phaseId;});
  return '<article class="pmCard pmBranchSummary"><div class="pmSectionHead"><h2>'+pmE(pmTrancheLabel(scope))+'</h2>'+pmScopeBadge(scope)+'</div><div class="pmProgress"><span style="width:'+prog.pct+'%"></span></div><dl class="pmSideMeta"><dt>Actions</dt><dd>'+prog.done+' / '+prog.total+'</dd><dt>Phase actuelle</dt><dd>'+pmE(phase?phase.title:"Non définie")+'</dd><dt>Échéance</dt><dd>'+pmE(pmDate(d.deadline))+'</dd></dl></article>';
}
function pmUnassignedTasksHtml(p){
  var tasks=pmScopedTasks(p,"common");
  if(!tasks.length)return "";
  if(PM.sortTasks)tasks=PM.sortTasks(tasks,pmToday());
  return '<section class="pmCard pmSection"><div class="pmSectionHead"><div><h2>Actions à affecter à une tranche</h2><p>Modifiez une action pour choisir T1 ou T2.</p></div><span class="pmPill">'+tasks.length+'</span></div>'+tasks.map(function(t){return pmTaskRow(p,t);}).join("")+'</section>';
}
function pmBranchControls(p,scope){
  var d=pmBranchDetails(p,scope),other=scope==="1"?"2":"1";
  return '<section class="pmCard pmBranchControls"><div><div class="pmEyebrow">Pilotage '+pmE(pmTrancheLabel(scope))+'</div><h2>Repères de la tranche</h2></div><label>Phase actuelle<select data-pm-action="tranche-phase" data-pid="'+pmE(p.id)+'" data-tranche="'+scope+'">'+pmArray(p.phases).map(function(ph){return '<option value="'+pmE(ph.id)+'"'+(d.phaseId===ph.id?' selected':'')+'>'+pmE(ph.title)+'</option>';}).join('')+'</select></label><label>Échéance<input type="date" data-pm-action="tranche-deadline" data-pid="'+pmE(p.id)+'" data-tranche="'+scope+'" value="'+pmE(d.deadline||'')+'"></label><button class="pmBtn" data-pm-action="copy-tranche-tasks" data-pid="'+pmE(p.id)+'" data-from="'+scope+'" data-to="'+other+'">Copier les actions vers '+pmE(pmTrancheLabel(other))+'</button></section>';
}
function pmSlotsHtml(p,scope){
  var tasks=pmArray(p.tasks),slots=PM.slots?PM.slots(p.id):[];
  if(scope&&scope!=="all")slots=slots.filter(function(s){var t=tasks.find(function(x){return x.id===s.taskId;});return (s.tranche||pmTaskScope(t))===scope;});
  return slots.length?slots.sort(function(a,b){return (a.date+a.start).localeCompare(b.date+b.start);}).map(function(s){var task=tasks.find(function(t){return t.id===s.taskId;});return '<div class="pmSlot"><button class="pmSlotWhen" data-pm-action="open-slot-date" data-date="'+pmE(s.date)+'"><b>'+pmE(pmSlotTitle(p,s))+'</b><small>'+pmE(pmDate(s.date))+' · '+pmE(s.start)+'–'+pmE(s.end)+'</small></button>'+(task||s.taskIds?'<button data-pm-action="edit-slot" data-pid="'+pmE(p.id)+'" data-slot="'+pmE(s.id)+'" aria-label="Modifier ce créneau" title="Modifier">✎</button>':'')+'<button data-pm-action="unschedule" data-slot="'+pmE(s.id)+'" aria-label="Retirer ce créneau" title="Retirer">×</button></div>';}).join(""):'<div class="pmEmpty" style="padding:17px"><strong>Aucun créneau</strong>Planifiez une action depuis sa ligne.</div>';
}
function pmProjectHtml(p){
  if(!p)return '<div class="pmWrap"><div class="pmEmpty"><strong>Projet introuvable</strong><button class="pmBtn" data-pm-action="go-projects">Retour aux projets</button></div></div>';
  var both=p.tranche==="both",stored=projectUI.trancheTabs[p.id]||"all",active=both&&["all","1","2"].indexOf(stored)>=0?stored:"all",scope=active==="all"?"":active,prog=pmScopedProgress(p,scope),slots=PM.slots?PM.slots(p.id):[];
  if(both&&stored!==active)projectUI.trancheTabs[p.id]=active;
  var tabs=both?'<nav class="pmTrancheTabs" aria-label="Vues du projet">'+[["all","Vue globale"],["1","T1"],["2","T2"]].map(function(x){return '<button type="button" data-pm-action="tranche-tab" data-pid="'+pmE(p.id)+'" data-tranche="'+x[0]+'" aria-current="'+(active===x[0]?'page':'false')+'">'+x[1]+'</button>';}).join('')+'</nav>':'';
  var main=active==="all"&&both?'<section class="pmBranchOverview"><div class="pmBranchGrid">'+pmBranchSummary(p,"1")+pmBranchSummary(p,"2")+'</div>'+pmUnassignedTasksHtml(p)+'</section>':'<div class="pmDetailGrid"><section class="pmPhases" aria-label="Phases '+pmE(scope?pmTrancheLabel(scope):'du projet')+'">'+((scope==="1"||scope==="2")?pmBranchControls(p,scope):'')+pmPhaseListHtml(p,scope)+'</section><aside class="pmSide"><section class="pmCard pmSideCard"><h2>Avancement '+(scope?pmE(pmTrancheLabel(scope)):'')+'</h2><div class="pmProgress"><span style="width:'+prog.pct+'%"></span></div><dl class="pmSideMeta" style="margin-top:13px"><dt>Actions</dt><dd>'+prog.done+' / '+prog.total+'</dd><dt>Échéance</dt><dd>'+pmE(pmDate(scope?pmBranchDetails(p,scope).deadline:p.deadline))+'</dd><dt>Planifiées</dt><dd>'+slots.filter(function(s){if(!scope)return true;var t=pmArray(p.tasks).find(function(x){return x.id===s.taskId;});return (s.tranche||pmTaskScope(t))===scope;}).length+'</dd></dl></section><section class="pmCard pmSideCard"><div class="pmSectionHead"><h2>Créneaux planifiés</h2><button class="pmLink" data-pm-action="open-planning">Planning →</button></div>'+pmSlotsHtml(p,scope)+'</section><section class="pmCard pmSideCard"><h2>Réutiliser</h2><p style="font-size:12px;color:var(--ink-3);margin-bottom:11px">Conservez la structure et les actions comme modèle.</p><button class="pmBtn" data-pm-action="save-template" data-pid="'+pmE(p.id)+'">Créer un modèle</button></section><section class="pmCard pmSideCard pmTaskFieldConfig"><div class="pmSectionHead"><h2>Colonnes des actions</h2><button class="pmLink" data-pm-action="add-task-field" data-pid="'+pmE(p.id)+'">+ Ajouter</button></div>'+(pmArray(p.taskFields).length?pmArray(p.taskFields).map(function(f){return '<div class="pmToken"><span>'+pmE(f.title)+'</span><button data-pm-action="rename-task-field" data-pid="'+pmE(p.id)+'" data-field="'+pmE(f.id)+'">✎</button><button data-pm-action="remove-task-field" data-pid="'+pmE(p.id)+'" data-field="'+pmE(f.id)+'">×</button></div>';}).join(''):'<p>Aucune colonne personnalisée.</p>')+'</section></aside></div>';
  return '<div class="pmWrap"><header class="pmDetailHead"><button class="pmBtn pmBtnIcon pmBack" data-pm-action="go-projects" aria-label="Retour aux projets">←</button><div class="pmDetailIdentity"><div class="pmLabels">'+(p.code?'<span class="pmCode">'+pmE(p.code)+'</span>':'')+pmProjectTrancheBadge(p)+(p.deadline?pmDeadline(p.deadline):"")+pmLabelsHtml(p.labels)+'</div><h1>'+pmE(p.name)+'</h1><p>'+pmE(p.title||"Sans description")+'</p></div><div class="pmDetailActions"><button class="pmBtn pmBtnPrimary" data-pm-action="add-task" data-pid="'+pmE(p.id)+'" data-tranche="'+pmE(scope)+'">+ Ajouter une action</button><button class="pmBtn" data-pm-action="edit-project" data-pid="'+pmE(p.id)+'">Modifier</button><button class="pmBtn" data-pm-action="archive-project" data-pid="'+pmE(p.id)+'">'+(p.archived?'Réactiver':'Archiver')+'</button></div></header>'+tabs+main+'<div class="pmSharedHeading"><span>Informations du projet</span><span>Documents, contacts et informations partagés au niveau du projet</span></div>'+(typeof pmProjectDetailsHtml==="function"?pmProjectDetailsHtml(p):'')+'</div>';
}
function pmSettingsHtml(){
  var codes=pmArray(etat.projectCodes), labels=pmArray(etat.projectLabels), templates=pmArray(etat.projectTemplates);
  return '<div class="pmWrap"><header class="pmPageHead"><div><div class="pmEyebrow">Personnalisation</div><h1>Votre façon de travailler</h1><p>Adaptez les codes, étiquettes et modèles à vos projets.</p></div></header><div class="pmSettingsGrid"><section class="pmCard pmSetting"><h2>Codes projet</h2><p>Une référence courte pour retrouver et filtrer vos projets.</p><div class="pmTokenList">'+(codes.length?codes.map(function(c){return '<div class="pmToken"><span class="pmCode">'+pmE(c)+'</span><span>'+pmE(c)+'</span><button data-pm-action="edit-code" data-value="'+pmE(c)+'" aria-label="Renommer le code">✎</button><button data-pm-action="remove-code" data-value="'+pmE(c)+'" aria-label="Retirer le code">×</button></div>';}).join(""):'<div class="pmEmpty">Aucun code personnalisé.</div>')+'</div><form class="pmInlineAdd" data-pm-form="add-code"><input name="name" maxlength="30" required placeholder="Ex. PRJ-2026"><button class="pmBtn" type="submit">Ajouter</button></form></section>'
   +'<section class="pmCard pmSetting"><h2>Étiquettes</h2><p>Des repères colorés qui peuvent être combinés.</p><div class="pmTokenList">'+(labels.length?labels.map(function(l){return '<div class="pmToken"><span class="pmColor" style="--label-color:'+pmE(l.color)+'"></span><span>'+pmE(l.name)+'</span><button data-pm-action="edit-label" data-id="'+pmE(l.id)+'" aria-label="Modifier l’étiquette">✎</button><button data-pm-action="remove-label" data-id="'+pmE(l.id)+'" aria-label="Retirer l’étiquette">×</button></div>';}).join(""):'<div class="pmEmpty">Aucune étiquette.</div>')+'</div><form class="pmInlineAdd" data-pm-form="add-label"><input name="name" maxlength="30" required placeholder="Nouvelle étiquette"><input type="color" name="color" value="#5266ce" aria-label="Couleur" style="flex:0 0 42px;padding:4px"><button class="pmBtn" type="submit">Ajouter</button></form></section>'
   +'<section class="pmCard pmSetting"><h2>Seuils d’urgence</h2><p>Jours par rapport à l’échéance : une valeur négative agit avant, une valeur positive après.</p><form data-pm-form="urgency-rules" class="pmRuleGrid">'+[1,2,3].map(function(level){var r=(PM.urgencyRules&&PM.urgencyRules()[level])||{};return '<fieldset><legend>Importance '+level+'</legend>'+['watch','urgent','critical'].map(function(k){return '<label>'+({watch:'À surveiller',urgent:'Urgente',critical:'Critique'}[k])+'<input type="number" step="1" min="-3650" max="3650" name="'+level+'-'+k+'" value="'+pmE(r[k]==null?'':r[k])+'"'+(level===3&&k==="critical"?' disabled placeholder="Jamais"':' required')+'></label>';}).join('')+'</fieldset>';}).join('')+'<button class="pmBtn" type="submit">Enregistrer les seuils</button><div class="pmFormError"></div></form></section>'
   +'<section class="pmCard pmSetting pmTemplates"><h2>Modèles de projet</h2><p>Une structure prête à l’emploi avec ses phases et ses actions. Créez un modèle depuis la page d’un projet.</p>'+(templates.length?'<div class="pmTemplateGrid">'+templates.map(function(t){return '<article class="pmTemplate"><strong>'+pmE(t.name)+'</strong><p>'+pmArray(t.phases).length+' phases · '+pmArray(t.tasks).length+' actions</p><div class="pmTemplateActions"><button class="pmBtn" data-pm-action="new-from-template" data-id="'+pmE(t.id)+'">Utiliser</button><button class="pmBtn pmBtnDanger" data-pm-action="remove-template" data-id="'+pmE(t.id)+'">Retirer</button></div></article>';}).join("")+'</div>':'<div class="pmEmpty"><strong>Aucun modèle</strong>Ouvrez un projet structuré puis choisissez « Créer un modèle ».</div>')+'</section></div></div>';
}

function renderProjectsUI(){
  if(!projectUI.initialized||projectUI.suspendRender)return;
  var root=document.getElementById("projectWorkspace"), nav=document.getElementById("appNav"); if(!root||!nav)return;
  document.body.dataset.pmView=projectUI.view;
  nav.querySelectorAll("[data-pm-view]").forEach(function(b){var active=b.dataset.pmView===projectUI.view||(projectUI.view==="project"&&b.dataset.pmView==="projects");b.setAttribute("aria-current",active?"page":"false");});
  if(projectUI.view==="planning"){if(typeof tout==="function")tout();return;}
  if(projectUI.view==="dashboard")root.innerHTML=pmDashboardHtml();
  else if(projectUI.view==="review")root.innerHTML=pmWeeklyHtml();
  else if(projectUI.view==="projects")root.innerHTML=pmProjectsHtml();
  else if(projectUI.view==="project")root.innerHTML=pmProjectHtml(pmGet(projectUI.projectId));
  else root.innerHTML=pmSettingsHtml();
  if(projectUI.view==="project"&&typeof initProjectDetailsUI==="function")initProjectDetailsUI();
  root.querySelectorAll(".pmInlineNote").forEach(pmSizeTaskNote);
  projectUI.renderedDay=pmToday();
}
window.renderProjectsUI=renderProjectsUI;

function pmDialogShells(){
  var labels=pmArray(etat.projectLabels);
  return '<dialog class="pmDialog" id="pmProjectDialog"><div class="pmDialogHead"><div><h2 id="pmProjectDialogTitle">Nouveau projet</h2><p>Donnez-lui un nom clair, puis précisez ce qui aide à le piloter.</p></div><button class="pmClose" data-pm-action="close-dialog" aria-label="Fermer">×</button></div><form class="pmForm" id="pmProjectForm"><input type="hidden" name="projectId"><input type="hidden" name="templateId"><div class="pmFields"><div class="pmField pmFieldFull"><label for="pmName">Nom du projet *</label><input id="pmName" name="name" maxlength="100" required autofocus placeholder="Ex. Réhabilitation du site Nord"></div><div class="pmField pmFieldFull"><label for="pmTitle">Titre descriptif</label><input id="pmTitle" name="title" maxlength="180" placeholder="Le résultat attendu, en une phrase"></div><div class="pmField"><label for="pmTranche">Tranche</label><select id="pmTranche" name="tranche"><option value="">Non définie</option><option value="1">Tranche 1</option><option value="2">Tranche 2</option><option value="both">Tranches 1 et 2</option></select></div><div class="pmField"><label for="pmCode">Code</label><input id="pmCode" name="code" list="pmCodes" maxlength="30" placeholder="Choisir ou créer"><datalist id="pmCodes">'+pmArray(etat.projectCodes).map(function(c){return '<option value="'+pmE(c)+'">';}).join("")+'</datalist><small>Un nouveau code sera ajouté à votre liste.</small></div><div class="pmField"><label for="pmDeadline">Échéance</label><input id="pmDeadline" type="date" name="deadline"></div><fieldset class="pmField" style="border:0;padding:0;margin:0"><legend class="pmLegend">Étiquettes</legend><div class="pmChoiceSet">'+(labels.length?labels.map(function(l){return '<label><input type="checkbox" name="labels" value="'+pmE(l.id)+'"><span class="pmColor" style="--label-color:'+pmE(l.color)+'"></span>'+pmE(l.name)+'</label>';}).join(""):'<small>Ajoutez des étiquettes dans Personnaliser.</small>')+'</div></fieldset></div><div class="pmFormError" role="alert"></div><div class="pmFormActions"><button type="button" class="pmBtn" data-pm-action="close-dialog">Annuler</button><button type="submit" class="pmBtn pmBtnPrimary">Créer le projet</button></div></form></dialog>'
    +'<dialog class="pmDialog" id="pmTaskDialog"><div class="pmDialogHead"><div><h2 id="pmTaskDialogTitle">Nouvelle action</h2><p>Une action concrète, rattachée à une phase.</p></div><button class="pmClose" data-pm-action="close-dialog" aria-label="Fermer">×</button></div><form class="pmForm" id="pmTaskForm"><input type="hidden" name="pid"><input type="hidden" name="tid"><div class="pmFields"><div class="pmField pmFieldFull"><label for="pmTaskTitle">Action *</label><input id="pmTaskTitle" name="title" maxlength="180" required autofocus></div><div class="pmField"><label for="pmTaskPhase">Phase</label><select id="pmTaskPhase" name="phaseId"></select></div><div class="pmField"><label for="pmTaskTranche">Portée</label><select id="pmTaskTranche" name="tranche"><option value="common">Commun</option><option value="1">T1</option><option value="2">T2</option></select></div><div class="pmField"><label for="pmTaskStatus">État</label><select id="pmTaskStatus" name="status"><option value="todo">À faire</option><option value="doing">En cours</option><option value="done">Terminée</option></select></div><div class="pmField"><label for="pmTaskDeadline">À terminer avant</label><input id="pmTaskDeadline" type="date" name="deadline"></div><div class="pmField"><label for="pmTaskImportance">Importance</label><select id="pmTaskImportance" name="importance"><option value="1">1 · Impératif — date ferme</option><option value="2">2 · Important — priorité habituelle</option><option value="3">3 · Souple — peut attendre</option></select></div><div class="pmField"><label for="pmTaskUrgency">Urgence</label><select id="pmTaskUrgency" name="manualUrgency"><option value="auto">Automatique</option><option value="normal">Normale</option><option value="watch">À surveiller</option><option value="urgent">Urgente</option><option value="critical">Critique</option></select><small>L’alerte la plus forte entre votre choix et la deadline est retenue.</small></div><div class="pmField pmFieldFull"><label for="pmTaskDepends">Dépend de</label><select id="pmTaskDepends" name="dependsOn" multiple size="4"></select><small>Plusieurs choix possibles : Ctrl ou Cmd sur ordinateur.</small></div><div class="pmField pmFieldFull"><label for="pmTaskBlocked">Motif du blocage</label><input id="pmTaskBlocked" name="blockedReason" maxlength="300"></div><div class="pmField"><label for="pmTaskFollowUp">Date de relance</label><input id="pmTaskFollowUp" type="date" name="followUpDate"></div><div class="pmField"><label for="pmTaskAssignee">Responsable</label><select id="pmTaskAssignee" name="assigneeId"></select></div><div class="pmField"><label for="pmTaskValidator">Validateur</label><select id="pmTaskValidator" name="validatorId"></select></div><fieldset class="pmField" style="border:0;padding:0;margin:0"><legend class="pmLegend">Étiquettes</legend><div class="pmChoiceSet" id="pmTaskLabels"></div></fieldset><div class="pmField pmFieldFull"><label for="pmTaskNote">Note</label><textarea id="pmTaskNote" name="note" maxlength="1000" placeholder="Informations utiles, prochain pas…"></textarea></div></div><div class="pmFormError" role="alert"></div><div class="pmFormActions"><button type="button" class="pmBtn pmBtnDanger" data-pm-action="delete-task" hidden>Supprimer</button><span style="flex:1"></span><button type="button" class="pmBtn" data-pm-action="close-dialog">Annuler</button><button type="submit" class="pmBtn pmBtnPrimary">Enregistrer</button></div></form></dialog>'
    +'<dialog class="pmDialog" id="pmScheduleDialog"><div class="pmDialogHead"><div><h2>Planifier l’action</h2><p id="pmScheduleName"></p></div><button class="pmClose" data-pm-action="close-dialog" aria-label="Fermer">×</button></div><form class="pmForm" id="pmScheduleForm"><input type="hidden" name="slotId"><input type="hidden" name="pid"><input type="hidden" name="tid"><div class="pmFields"><div class="pmField pmFieldFull"><label for="pmScheduleDate">Date *</label><input id="pmScheduleDate" type="date" name="date" required autofocus></div><div class="pmField"><label for="pmScheduleStart">Début *</label><input id="pmScheduleStart" type="time" name="start" value="09:00" required></div><div class="pmField"><label for="pmScheduleEnd">Fin *</label><input id="pmScheduleEnd" type="time" name="end" value="10:00" required></div></div><div class="pmFormError" role="alert"></div><div class="pmFormActions"><button type="button" class="pmBtn" data-pm-action="close-dialog">Annuler</button><button type="submit" class="pmBtn pmBtnPrimary">Planifier</button></div></form></dialog>';
}

function pmCloneTemplate(template){
  var phaseIds={},taskIds={},fieldIds={},contactIds={};pmArray(template.phases).forEach(function(x){phaseIds[x.id]=uid();});pmArray(template.tasks).forEach(function(x){taskIds[x.id]=uid();});pmArray(template.taskFields).forEach(function(x){fieldIds[x.id]=uid();});pmArray(template.contacts).forEach(function(x){contactIds[x.id]=uid();});
  var trancheDetails={};["1","2"].forEach(function(scope){if(template.tranche!==scope&&template.tranche!=="both")return;var original=template.trancheDetails&&template.trancheDetails[scope]||{};trancheDetails[scope]={deadline:"",phaseId:phaseIds[original.phaseId]||phaseIds[(template.phases[0]||{}).id]};});
  return {tranche:template.tranche||"",trancheDetails:trancheDetails,phases:pmArray(template.phases).map(function(x){return{id:phaseIds[x.id],title:x.title};}),milestones:pmArray(template.milestones).map(function(x){return{id:uid(),title:x.title,date:"",done:false};}),readiness:pmArray(template.readiness).map(function(x){return{id:uid(),title:x.title,done:false};}),documents:pmArray(template.documents).map(function(x){return Object.assign({},x,{id:uid()});}),taskFields:pmArray(template.taskFields).map(function(x){return{id:fieldIds[x.id],title:x.title};}),contacts:pmArray(template.contacts).map(function(x){return Object.assign({},x,{id:contactIds[x.id]});}),tasks:pmArray(template.tasks).map(function(x){var fields={};Object.keys(x.fields||{}).forEach(function(k){if(fieldIds[k])fields[fieldIds[k]]=x.fields[k];});return Object.assign({},x,{id:taskIds[x.id]||uid(),tranche:pmTaskScope(x),phaseId:phaseIds[x.phaseId]||"",status:"todo",deadline:"",dependsOn:pmArray(x.dependsOn).map(function(id){return taskIds[id];}).filter(Boolean),blockedReason:"",followUpDate:"",assigneeId:contactIds[x.assigneeId]||"",validatorId:contactIds[x.validatorId]||"",fields:fields});})};
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
  else if(templateId){var template=pmArray(etat.projectTemplates).find(function(x){return x.id===templateId;});if(template)form.elements.tranche.value=template.tranche||"";}
  form.querySelector(".pmFormError").textContent=""; pmOpenDialog(dlg.id,opener);
}
function projectEditTask(pid,tid,phaseId,opener,tranche){
  var p=pmGet(pid), t=p&&pmArray(p.tasks).find(function(x){return x.id===tid;}), form=document.getElementById("pmTaskForm");if(!p||!form)return;
  form.reset();form.elements.importance.value="2";form.elements.pid.value=pid;form.elements.tid.value=t?t.id:"";
  form.elements.phaseId.innerHTML=pmArray(p.phases).map(function(ph){return '<option value="'+pmE(ph.id)+'">'+pmE(ph.title)+'</option>';}).join("");
  form.elements.phaseId.value=(t&&t.phaseId)||phaseId||(p.phases[0]&&p.phases[0].id)||"";
  var taskScope=t&&pmTaskScope(t),initialScope=taskScope||tranche||(p.tranche==="1"||p.tranche==="2"?p.tranche:(p.tranche==="both"&&["1","2"].indexOf(projectUI.trancheTabs[p.id])>=0?projectUI.trancheTabs[p.id]:(p.tranche==="both"?"":"common")));
  if(p.tranche==="both")form.elements.tranche.innerHTML='<option value="" disabled>Choisir une tranche</option>'+(taskScope==="common"?'<option value="common">À affecter (inchangée)</option>':'')+'<option value="1">T1</option><option value="2">T2</option>';
  else form.elements.tranche.innerHTML='<option value="common">Commun</option>'+(p.tranche==="1"?'<option value="1">T1</option>':'')+(p.tranche==="2"?'<option value="2">T2</option>':'');
  form.elements.tranche.required=p.tranche==="both";
  form.elements.tranche.value=initialScope;
  form.elements.dependsOn.innerHTML=pmArray(p.tasks).filter(function(x){return !t||x.id!==t.id;}).map(function(x){return '<option value="'+pmE(x.id)+'">['+pmE(pmTrancheLabel(pmTaskScope(x)))+'] '+pmE(x.title)+'</option>';}).join("");
  var contactOptions='<option value="">Non défini</option>'+pmArray(p.contacts).map(function(c){return '<option value="'+pmE(c.id)+'">'+pmE(c.name)+(c.role?' · '+pmE(c.role):'')+'</option>';}).join("");form.elements.assigneeId.innerHTML=contactOptions;form.elements.validatorId.innerHTML=contactOptions;
  document.getElementById("pmTaskDialogTitle").textContent=t?"Modifier l’action":"Nouvelle action";
  var labels=document.getElementById("pmTaskLabels");labels.innerHTML=pmArray(etat.projectLabels).map(function(l){return '<label><input type="checkbox" name="taskLabels" value="'+pmE(l.id)+'"><span class="pmColor" style="--label-color:'+pmE(l.color)+'"></span>'+pmE(l.name)+'</label>';}).join("")||'<small>Aucune étiquette disponible.</small>';
  if(t){form.elements.title.value=t.title||"";form.elements.status.value=t.status||"todo";form.elements.deadline.value=t.deadline||"";form.elements.importance.value=String(t.importance||2);form.elements.manualUrgency.value=t.manualUrgency||"auto";form.elements.blockedReason.value=t.blockedReason||"";form.elements.followUpDate.value=t.followUpDate||"";form.elements.assigneeId.value=t.assigneeId||"";form.elements.validatorId.value=t.validatorId||"";pmArray(t.dependsOn).forEach(function(id){var o=Array.from(form.elements.dependsOn.options).find(function(x){return x.value===id;});if(o)o.selected=true;});form.elements.note.value=t.note||"";pmArray(t.labels).forEach(function(id){var c=form.querySelector('input[name="taskLabels"][value="'+CSS.escape(id)+'"]');if(c)c.checked=true;});}
  form.querySelector('[data-pm-action="delete-task"]').hidden=!t;form.querySelector(".pmFormError").textContent="";pmOpenDialog("pmTaskDialog",opener);
}
window.projectEditTask=projectEditTask;
function pmOpenSchedule(pid,tid,opener,slot){var p=pmGet(pid),t=p&&pmArray(p.tasks).find(function(x){return x.id===tid;}),f=document.getElementById("pmScheduleForm");if(!t||!f)return;f.reset();f.elements.pid.value=pid;f.elements.tid.value=tid;f.elements.slotId.value=slot?slot.id:"";var nextDay=new Date();while(nextDay.getDay()===0||nextDay.getDay()===6)nextDay.setDate(nextDay.getDate()+1);f.elements.date.value=slot?slot.date:iso(nextDay);f.elements.start.value=slot?slot.start:"09:00";f.elements.end.value=slot?slot.end:"10:00";f.querySelector("[type=submit]").textContent=slot?"Enregistrer":"Planifier";document.getElementById("pmScheduleName").textContent=t.title;f.querySelector(".pmFormError").textContent="";pmOpenDialog("pmScheduleDialog",opener);}

function pmFormDataLabels(form,name){return Array.from(form.querySelectorAll('input[name="'+name+'"]:checked')).map(function(x){return x.value;});}
function pmMutateProject(pid,values){try{PM.update(pid,values);renderProjectsUI();return true;}catch(e){pmNotify(e.message||"Modification impossible.");return false;}}

function pmHandleClick(e){
  var b=e.target.closest("[data-pm-action]");if(!b)return;var a=b.dataset.pmAction,pid=b.dataset.pid,tid=b.dataset.tid,p,phases,i,name;
  if(a==="weekly-review"){projectNavigate("review");return;}if(a==="go-dashboard"){projectNavigate("dashboard");return;}if(a==="open-task"){var targetProject=pmGet(pid),targetTask=targetProject&&targetProject.tasks.find(function(t){return t.id===tid;});if(targetTask){projectUI.collapsed[pid+":"+pmTaskScope(targetTask)+":"+targetTask.phaseId]=false;if(targetProject.tranche==="both")projectUI.trancheTabs[pid]=pmTaskScope(targetTask)==="common"?"all":pmTaskScope(targetTask);}projectNavigate("project",pid);requestAnimationFrame(function(){var x=document.querySelector('[data-pm-action="edit-task"][data-tid="'+CSS.escape(tid)+'"]');if(x){x.scrollIntoView({block:"center"});x.focus();}});return;}
  if(a==="new-project"){pmOpenProjectForm(null,"",b);return;} if(a==="open-project"){var openId=b.dataset.id||pid;if(b.dataset.tranche)projectUI.trancheTabs[openId]=b.dataset.tranche;projectNavigate("project",openId);return;} if(a==="go-projects"){projectNavigate("projects");return;} if(a==="open-planning"){projectNavigate("planning");return;} if(a==="close-dialog"){pmCloseDialog(b.closest("dialog"));return;}
  if(a==="tranche-tab"){projectUI.trancheTabs[pid]=["1","2"].indexOf(b.dataset.tranche)>=0?b.dataset.tranche:"all";renderProjectsUI();return;}
  if(a==="edit-project"){pmOpenProjectForm(pmGet(pid),"",b);return;} if(a==="archive-project"){p=pmGet(pid);var wasArchived=p&&p.archived;if(p&&pmMutateProject(pid,{archived:!wasArchived}))pmNotify(wasArchived?"Projet réactivé.":"Projet archivé.");return;}
  if(a==="add-task-field"){name=window.prompt("Nom de la colonne (ex. Référence, N° dossier)");if(name&&name.trim()){p=pmGet(pid);pmMutateProject(pid,{taskFields:pmArray(p.taskFields).concat([{id:uid(),title:name.trim()}])});}return;}
  if(a==="rename-task-field"){p=pmGet(pid);var field=pmArray(p.taskFields).find(function(x){return x.id===b.dataset.field;});name=window.prompt("Nom de la colonne",field?field.title:"");if(field&&name&&name.trim()){pmMutateProject(pid,{taskFields:pmArray(p.taskFields).map(function(x){return x.id===field.id?{id:x.id,title:name.trim()}:x;})});}return;}
  if(a==="remove-task-field"){p=pmGet(pid);if(window.confirm("Supprimer cette colonne et ses valeurs ?")){pmMutateProject(pid,{taskFields:pmArray(p.taskFields).filter(function(x){return x.id!==b.dataset.field;})});}return;}
  if(a==="add-task"){projectEditTask(pid,"",b.dataset.phase,b,b.dataset.tranche);return;} if(a==="edit-task"){projectEditTask(pid,tid,"",b);return;} if(a==="schedule-task"){p=pmGet(pid);var scheduledTask=p&&pmArray(p.tasks).find(function(x){return x.id===tid;});if(p&&p.tranche==="both"&&pmTaskScope(scheduledTask)==="common"){pmNotify("Choisissez T1 ou T2 avant de planifier cette action.");projectEditTask(pid,tid,"",b);return;}window.openPlanningSession({projectId:pid,taskId:tid,tranche:pmTaskScope(scheduledTask)});return;}
  if(a==="copy-tranche-tasks"){p=pmGet(pid);var sourceCount=pmScopedTasks(p,b.dataset.from).length;if(!sourceCount){pmNotify("Aucune action à copier dans cette tranche.");return;}if(window.confirm("Copier "+sourceCount+" action"+(sourceCount>1?"s":"")+" vers "+pmTrancheLabel(b.dataset.to)+" ? Les copies seront à faire, sans date ni créneau.")){var copied=pmSafe(function(){return PM.copyTrancheTasks(pid,b.dataset.from,b.dataset.to);});if(copied===null)return;renderProjectsUI();pmNotify(sourceCount+" action"+(sourceCount>1?"s copiées.":" copiée."));}return;}
  if(a==="delete-task"){var f=document.getElementById("pmTaskForm");if(!f.elements.tid.value)return;if(window.confirm("Supprimer cette action ? Cette opération ne peut pas être annulée.")){if(pmSafe(function(){return PM.removeTask(f.elements.pid.value,f.elements.tid.value);})===null)return;pmCloseDialog(document.getElementById("pmTaskDialog"));renderProjectsUI();pmNotify("Action supprimée.");}return;}
  if(a==="unschedule"){if(pmSafe(function(){return PM.unschedule(b.dataset.slot);})===null)return;renderProjectsUI();pmNotify("Créneau retiré.");return;}
  if(a==="edit-slot"){var slot=PM.slots(pid).find(function(x){return x.id===b.dataset.slot;});if(slot){if(slot.taskId)pmOpenSchedule(pid,slot.taskId,b,slot);else window.openPlanningSession({slotId:slot.id});}return;}
  if(a==="open-slot-date"){if(PM.openDate)PM.openDate(b.dataset.date);projectNavigate("planning");return;}
  if(a==="add-phase"){name=window.prompt("Nom de la nouvelle phase");if(name&&name.trim()){p=pmGet(pid);phases=pmArray(p.phases).concat([{id:uid(),title:name.trim()}]);pmMutateProject(pid,{phases:phases});}return;}
  if(a==="rename-phase"){e.preventDefault();e.stopPropagation();p=pmGet(pid);phases=pmArray(p.phases).map(function(x){return {id:x.id,title:x.title};});i=phases.findIndex(function(x){return x.id===b.dataset.phase;});name=window.prompt("Nom de la phase",i>=0?phases[i].title:"");if(i>=0&&name&&name.trim()){phases[i].title=name.trim();pmMutateProject(pid,{phases:phases});}return;}
  if(a==="phase-up"||a==="phase-down"){e.preventDefault();e.stopPropagation();p=pmGet(pid);phases=pmArray(p.phases).map(function(x){return {id:x.id,title:x.title};});i=phases.findIndex(function(x){return x.id===b.dataset.phase;});var j=a==="phase-up"?i-1:i+1;if(i>=0&&j>=0&&j<phases.length){var tmp=phases[i];phases[i]=phases[j];phases[j]=tmp;pmMutateProject(pid,{phases:phases});}return;}
  if(a==="save-template"){p=pmGet(pid);name=window.prompt("Nom du modèle",p.name);if(name&&name.trim()){etat.projectTemplates=pmArray(etat.projectTemplates);etat.projectTemplates.push({id:uid(),name:name.trim(),tranche:p.tranche||"",trancheDetails:{"1":Object.assign({},pmBranchDetails(p,"1"),{deadline:""}),"2":Object.assign({},pmBranchDetails(p,"2"),{deadline:""})},taskFields:pmArray(p.taskFields).map(function(x){return{id:x.id,title:x.title};}),milestones:pmArray(p.milestones).map(function(x){return{id:x.id,title:x.title,date:"",done:false};}),readiness:pmArray(p.readiness).map(function(x){return{id:x.id,title:x.title,done:false};}),documents:pmArray(p.documents).map(function(x){return Object.assign({},x);}),contacts:pmArray(p.contacts).map(function(x){return Object.assign({},x);}),phases:pmArray(p.phases).map(function(x){return{id:x.id,title:x.title};}),tasks:pmArray(p.tasks).map(function(t){return{id:t.id,title:t.title,tranche:pmTaskScope(t),phaseId:t.phaseId,status:"todo",deadline:"",labels:pmArray(t.labels),note:t.note||"",importance:t.importance||2,manualUrgency:t.manualUrgency||"auto",dependsOn:pmArray(t.dependsOn),blockedReason:"",followUpDate:"",assigneeId:t.assigneeId||"",validatorId:t.validatorId||"",fields:Object.assign({},t.fields||{})};})});pmSave();renderProjectsUI();pmNotify("Modèle créé.");}return;}
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
function pmKeepCompletedVisible(el){var p=pmGet(el.dataset.pid),t=p&&p.tasks.find(function(x){return x.id===el.dataset.tid;});if(t){var scope=p.tranche==="both"?pmTaskScope(t):"all";projectUI.completedOpen[p.id+":"+scope+":"+t.phaseId]=true;}}
function pmSizeTaskNote(el){el.style.height="auto";el.style.height=Math.max(38,Math.min(132,el.scrollHeight))+"px";}
function pmHandleChange(e){
  var el=e.target,filter=el.dataset.pmFilter,a=el.dataset.pmAction;
  if(filter){projectUI[filter]=el.type==="checkbox"?el.checked:el.value;renderProjectsUI();return;}
  if(a==="tranche-phase"||a==="tranche-deadline"){var changes={};changes[a==="tranche-phase"?"phaseId":"deadline"]=el.value;var updated=pmSafe(function(){return PM.updateTranche(el.dataset.pid,el.dataset.tranche,changes);});if(updated===null){renderProjectsUI();return;}renderProjectsUI();pmNotify("Repères de tranche enregistrés.");return;}
  if(a==="toggle-task"){pmKeepCompletedVisible(el);if(pmSafe(function(){return PM.updateTask(el.dataset.pid,el.dataset.tid,{status:el.checked?"done":"todo"});})===null){renderProjectsUI();return;}renderProjectsUI();pmRestoreTaskFocus(a,el.dataset.pid,el.dataset.tid);return;}
  if(a==="task-status"){pmKeepCompletedVisible(el);if(pmSafe(function(){return PM.updateTask(el.dataset.pid,el.dataset.tid,{status:el.value});})===null){renderProjectsUI();return;}renderProjectsUI();pmRestoreTaskFocus(a,el.dataset.pid,el.dataset.tid);return;}
  if(a==="rename-task"){var title=el.value.trim();if(title)pmSafe(function(){return PM.updateTask(el.dataset.pid,el.dataset.tid,{title:title});});else renderProjectsUI();return;}
  if(a==="task-note"){projectUI.suspendRender=true;try{pmSafe(function(){return PM.updateTask(el.dataset.pid,el.dataset.tid,{note:el.value});});}finally{projectUI.suspendRender=false;}return;}
  if(a==="task-field"){var project=pmGet(el.dataset.pid),task=project&&pmArray(project.tasks).find(function(x){return x.id===el.dataset.tid;}),fields=Object.assign({},task&&task.fields||{});fields[el.dataset.field]=el.value;projectUI.suspendRender=true;try{pmSafe(function(){return PM.updateTask(el.dataset.pid,el.dataset.tid,{fields:fields});});}finally{projectUI.suspendRender=false;}return;}
}
function pmHandleInput(e){if(e.target.dataset.pmAction==="task-note"){pmSizeTaskNote(e.target);return;}if(e.target.dataset.pmFilter==="query"){projectUI.query=e.target.value;var pos=e.target.selectionStart;renderProjectsUI();var f=document.querySelector('[data-pm-filter="query"]');if(f){f.focus();f.setSelectionRange(pos,pos);}}}
function pmHandleToggle(e){var d=e.target;if(d.matches(".pmCompletedTasks"))projectUI.completedOpen[d.dataset.completedKey]=d.open;if(d.matches(".pmPhase")){var p=pmGet(projectUI.projectId);if(p)projectUI.collapsed[p.id+":"+(d.dataset.scope||"all")+":"+d.dataset.phase]=!d.open;}}

function pmHandleSubmit(e){
  var form=e.target;if(!form.matches("[data-pm-form],#pmProjectForm,#pmTaskForm,#pmScheduleForm"))return;e.preventDefault();var fd=new FormData(form),err=form.querySelector(".pmFormError");if(err)err.textContent="";
  try{
    if(form.matches("#pmProjectForm")){
      var name=String(fd.get("name")||"").trim(), code=String(fd.get("code")||"").trim();if(!name)throw new Error("Le nom du projet est requis.");
      var values={name:name,title:String(fd.get("title")||"").trim(),tranche:String(fd.get("tranche")||""),code:code,deadline:String(fd.get("deadline")||""),labels:pmFormDataLabels(form,"labels")};
      if(code&&pmArray(etat.projectCodes).indexOf(code)<0){etat.projectCodes=pmArray(etat.projectCodes).concat([code]);}
      var id=String(fd.get("projectId")||"");
      if(id){PM.update(id,values);}else{var template=pmArray(etat.projectTemplates).find(function(x){return x.id===fd.get("templateId");});if(template){var cloned=pmCloneTemplate(template);if(!values.tranche)values.tranche=cloned.tranche;values.trancheDetails=cloned.trancheDetails;values.phases=cloned.phases;values.tasks=cloned.tasks;values.taskFields=cloned.taskFields;values.milestones=cloned.milestones;values.readiness=cloned.readiness;values.documents=cloned.documents;values.contacts=cloned.contacts;}var created=PM.create(values);id=created&&created.id?created.id:created;}
      pmCloseDialog(document.getElementById("pmProjectDialog"));projectNavigate("project",id);pmNotify(fd.get("projectId")?"Projet mis à jour.":"Projet créé.");return;
    }
    if(form.matches("#pmTaskForm")){
      var title=String(fd.get("title")||"").trim();if(!title)throw new Error("Le titre de l’action est requis.");var pid=String(fd.get("pid")||""),taskProject=pmGet(pid),taskTranche=String(fd.get("tranche")||"");if(taskProject&&taskProject.tranche==="both"&&!taskTranche)throw new Error("Choisissez T1 ou T2 pour cette action.");var v={title:title,tranche:taskTranche||"common",phaseId:String(fd.get("phaseId")||""),status:String(fd.get("status")||"todo"),deadline:String(fd.get("deadline")||""),importance:Number(fd.get("importance")||2),manualUrgency:String(fd.get("manualUrgency")||"auto"),dependsOn:Array.from(form.elements.dependsOn.selectedOptions).map(function(x){return x.value;}),blockedReason:String(fd.get("blockedReason")||"").trim(),followUpDate:String(fd.get("followUpDate")||""),assigneeId:String(fd.get("assigneeId")||""),validatorId:String(fd.get("validatorId")||""),labels:pmFormDataLabels(form,"taskLabels"),note:String(fd.get("note")||"").trim()},tid=String(fd.get("tid")||"");if(tid)PM.updateTask(pid,tid,v);else PM.addTask(pid,v);var savedProject=pmGet(pid);if(savedProject&&savedProject.tranche==="both")projectUI.trancheTabs[pid]=v.tranche==="common"?"all":v.tranche;pmCloseDialog(document.getElementById("pmTaskDialog"));renderProjectsUI();pmNotify(tid?"Action mise à jour.":"Action ajoutée.");return;
    }
    if(form.matches("#pmScheduleForm")){var start=String(fd.get("start")),end=String(fd.get("end"));if(start>=end)throw new Error("L’heure de fin doit être après le début.");PM.schedule(String(fd.get("pid")),String(fd.get("tid")),{date:String(fd.get("date")),start:start,end:end},String(fd.get("slotId")||"")||undefined);pmCloseDialog(document.getElementById("pmScheduleDialog"));renderProjectsUI();pmNotify("Action planifiée.");return;}
    if(form.dataset.pmForm==="urgency-rules"){var rules={};[1,2,3].forEach(function(level){rules[level]={};["watch","urgent","critical"].forEach(function(k){var raw=String(fd.get(level+"-"+k)||"").trim();rules[level][k]=raw===""?null:Number(raw);});});PM.setUrgencyRules(rules);renderProjectsUI();pmNotify("Seuils enregistrés.");return;}
    if(form.dataset.pmForm==="add-code"){var c=String(fd.get("name")||"").trim();if(c&&pmArray(etat.projectCodes).indexOf(c)<0){etat.projectCodes=pmArray(etat.projectCodes).concat([c]);pmSave();}renderProjectsUI();return;}
    if(form.dataset.pmForm==="add-label"){var n=String(fd.get("name")||"").trim();if(n){etat.projectLabels=pmArray(etat.projectLabels).concat([{id:uid(),name:n,color:String(fd.get("color")||"#5266ce")}]);pmSave();}renderProjectsUI();return;}
  }catch(ex){if(err)err.textContent=ex.message||"Vérifiez les informations saisies.";else pmNotify(ex.message||"Opération impossible.");}
}

function initProjectsUI(){
  if(projectUI.initialized)return; if(!window.PM){console.warn("Plaaning: API projets indisponible");return;}
  var bar=document.querySelector(".bar"), intro=document.querySelector("body > .intro"), footer=document.querySelector("footer.pied");if(!bar||!intro)return;
  function syncHeaderHeight(){document.documentElement.style.setProperty("--pm-header-height",bar.getBoundingClientRect().height+"px");}
  syncHeaderHeight();if(window.ResizeObserver)new ResizeObserver(syncHeaderHeight).observe(bar);else window.addEventListener("resize",syncHeaderHeight);
  var nav=document.createElement("div");nav.className="appNavShell";nav.innerHTML='<nav class="appNav" id="appNav" aria-label="Navigation principale"><button data-pm-view="dashboard" data-pm-action="navigate">Accueil</button><button data-pm-view="review" data-pm-action="navigate">Revue</button><button data-pm-view="projects" data-pm-action="navigate">Projets</button><button data-pm-view="planning" data-pm-action="navigate">Planning</button><button data-pm-view="settings" data-pm-action="navigate">Personnaliser</button><button class="pmNew" data-pm-action="new-project">+ Nouveau</button></nav>';bar.after(nav);
  var planning=document.createElement("div");planning.id="planningWorkspace";intro.before(planning);[intro,document.querySelector("body > .bilan"),document.querySelector("body > .railZone"),document.querySelector("body > main.jour"),document.querySelector("body > section.modeles")].forEach(function(x){if(x)planning.appendChild(x);});
  var root=document.createElement("main");root.id="projectWorkspace";root.tabIndex=-1;(footer||planning.nextSibling).before(root);
  document.body.insertAdjacentHTML("beforeend",pmDialogShells());
  document.addEventListener("click",function(e){var navButton=e.target.closest('[data-pm-action="navigate"]');if(navButton){projectNavigate(navButton.dataset.pmView);return;}pmHandleClick(e);});
  document.addEventListener("change",pmHandleChange);document.addEventListener("input",pmHandleInput);document.addEventListener("submit",pmHandleSubmit);document.addEventListener("toggle",pmHandleToggle,true);
  document.querySelectorAll(".pmDialog").forEach(function(d){d.addEventListener("click",function(e){if(e.target===d)pmCloseDialog(d);});d.addEventListener("cancel",function(e){e.preventDefault();pmCloseDialog(d);});});
  try{var stored=JSON.parse(localStorage.getItem("plaaning.projectView")||"null");if(stored&&["dashboard","review","projects","planning","settings","project"].indexOf(stored.view)>=0){projectUI.view=stored.view;projectUI.projectId=stored.projectId||null;}}catch(e){}
  if(projectUI.view==="project"&&!pmGet(projectUI.projectId)){projectUI.view="dashboard";projectUI.projectId=null;}
  document.addEventListener("visibilitychange",function(){if(!document.hidden&&projectUI.renderedDay!==pmToday()&&!document.querySelector("dialog[open]")&&!document.activeElement.matches("input,textarea,select"))renderProjectsUI();});
  window.setInterval(function(){if(projectUI.renderedDay!==pmToday()&&!document.querySelector("dialog[open]")&&!document.activeElement.matches("input,textarea,select"))renderProjectsUI();},60000);
  projectUI.initialized=true;
  if(typeof initPlanningSessionsUI==="function")initPlanningSessionsUI();
  if(typeof initPlanningDeadlinesUI==="function")initPlanningDeadlinesUI();
  renderProjectsUI();
}
window.initProjectsUI=initProjectsUI;
