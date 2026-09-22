/* Sélecteur de séances chantier. Ce fichier est injecté dans l'IIFE principal. */
var planningSessionsUI={initialized:false,returnFocus:null,slotId:"",originalTaskIds:[],originalProjectId:"",originalTranche:"",seedTaskId:""};

function psArray(value){return Array.isArray(value)?value:[];}
function psEscape(value){return typeof pmE==="function"?pmE(value):String(value==null?"":value).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function psProject(id){return window.PM&&PM.get&&id?PM.get(id):null;}
function psTask(project,id){return project&&psArray(project.tasks).find(function(task){return task.id===id;});}
function psCurrentDate(){try{return iso(dateDuJour());}catch(e){return typeof pmToday==="function"?pmToday():new Date().toISOString().slice(0,10);}}
function psProjectLabel(project){var tranche=project.tranche==="both"?"T1 + T2":project.tranche?"Tranche "+project.tranche:"";return project.name+(project.code?" · "+project.code:"")+(tranche?" · "+tranche:"");}
function psTaskTranche(task){return task&&["1","2"].indexOf(task.tranche)>=0?task.tranche:"common";}
function psTrancheLabel(scope){try{return window.PM&&PM.trancheLabel?PM.trancheLabel(scope):scope==="1"?"T1":scope==="2"?"T2":"Commun";}catch(e){return scope==="1"?"T1":scope==="2"?"T2":"Commun";}}
function psProjectTranches(project){if(project.tranche==="both")return["1","2"];try{return window.PM&&PM.tranches?PM.tranches(project.id):["common"].concat(project.tranche==="both"?["1","2"]:["1","2"].indexOf(project.tranche)>=0?[project.tranche]:[]);}catch(e){return["common"];}}
function psFillTranches(preferred,forceChoice){var form=document.getElementById("psSessionForm");if(!form)return"";var project=psProject(form.elements.projectId.value),scopes=project?psProjectTranches(project):[],value=scopes.indexOf(preferred)>=0?preferred:"";var legacy=project&&project.tranche==="both"&&planningSessionsUI.slotId&&planningSessionsUI.originalProjectId===project.id&&planningSessionsUI.originalTranche==="common";if(legacy){scopes.unshift("common");if(preferred==="common")value="common";}if(project&&project.tranche==="both"&&!value)forceChoice=true;if(!value&&!forceChoice)value=project&&["1","2"].indexOf(project.tranche)>=0?project.tranche:"common";var placeholder=forceChoice&&!value?'<option value="">Choisir une tranche</option>':"";form.elements.tranche.innerHTML=placeholder+scopes.map(function(scope){return '<option value="'+psEscape(scope)+'"'+(scope===value?' selected':'')+'>'+psEscape(legacy&&scope==="common"?"À affecter (séance existante)":psTrancheLabel(scope))+'</option>';}).join("");form.elements.tranche.value=value;return value;}
function psPhaseOptions(project,value){return psArray(project&&project.phases).map(function(phase){return '<option value="'+psEscape(phase.id)+'"'+(phase.id===value?' selected':'')+'>'+psEscape(phase.title)+'</option>';}).join("");}
function psTaskMeta(task){var bits=[];if(task.deadline)bits.push("À terminer avant "+(typeof pmDate==="function"?pmDate(task.deadline):task.deadline));if(task.note)bits.push(task.note);return bits.join(" · ");}
function psTaskChoice(task,checked,original){
  var done=task.status==="done",meta=psTaskMeta(task),urgency=typeof pmUrgencyHtml==="function"?pmUrgencyHtml(task):"";
  return '<label class="psTaskChoice'+(done?' isDone':'')+'"><input type="checkbox" name="taskIds" value="'+psEscape(task.id)+'"'+(checked?' checked':'')+'><span class="psTaskChoiceBody"><span class="psTaskTitle">'+psEscape(task.title)+(done?'<span class="psDone">Terminé · déjà inclus</span>':'')+'</span>'+(meta?'<span class="psTaskNote" title="'+psEscape(meta)+'">'+psEscape(meta)+'</span>':'')+(urgency?'<span class="psTaskBadges">'+urgency+'</span>':'')+'</span></label>';
}
function psSelected(form){return Array.from(form.querySelectorAll('input[name="taskIds"]:checked')).map(function(input){return input.value;});}
function psRenderTasks(keep){
  var form=document.getElementById("psSessionForm"),box=document.getElementById("psTaskChoices");if(!form||!box)return;
  var pid=form.elements.projectId.value,phaseId=form.elements.phaseId.value,tranche=form.elements.tranche.value,project=psProject(pid),selected=keep||psSelected(form),available=[];
  if(!tranche){box.innerHTML='<div class="psEmpty"><strong>Choisissez une tranche pour afficher ses actions.</strong></div>';psUpdateCount();return;}
  try{available=window.PM&&PM.availableTasks?PM.availableTasks(pid,phaseId,tranche):psArray(project&&project.tasks).filter(function(task){return task.phaseId===phaseId&&task.status!=="done"&&psTaskTranche(task)===tranche;});}catch(e){available=[];}
  var seen=Object.create(null),choices=[];
  if(pid===planningSessionsUI.originalProjectId&&tranche===planningSessionsUI.originalTranche)planningSessionsUI.originalTaskIds.forEach(function(id){var task=psTask(project,id);if(task&&psTaskTranche(task)===tranche&&!seen[id]){seen[id]=true;choices.push({task:task,original:true});}});
  available.forEach(function(task){if(!seen[task.id]){seen[task.id]=true;choices.push({task:task,original:false});}});
  box.innerHTML=choices.length?choices.map(function(item){return psTaskChoice(item.task,selected.indexOf(item.task.id)>=0,item.original);}).join(""):'<div class="psEmpty"><strong>Aucune action restante pour '+psEscape(psTrancheLabel(tranche))+' dans cette phase.</strong><button type="button" class="psTextButton" data-ps-action="open-project">Ouvrir le projet pour ajouter une action</button></div>';
  psUpdateCount();
}
function psUpdateCount(){var form=document.getElementById("psSessionForm"),count=document.getElementById("psSelectionCount");if(!form||!count)return;var n=psSelected(form).length;count.textContent=n?n+" action"+(n>1?"s":"")+" sélectionnée"+(n>1?"s":""):"Choisissez au moins une action";}
function psFillPhases(preferred,selectedTasks){
  var form=document.getElementById("psSessionForm"),project=psProject(form&&form.elements.projectId.value);if(!form)return;
  selectedTasks=psArray(selectedTasks);var phase=preferred||(selectedTasks[0]&&psTask(project,selectedTasks[0])||{}).phaseId||(project&&project.trancheDetails&&project.trancheDetails[form.elements.tranche.value]||{}).phaseId||(project&&project.phases[0]&&project.phases[0].id)||"";
  form.elements.phaseId.innerHTML=psPhaseOptions(project,phase);form.elements.phaseId.value=phase;psRenderTasks(selectedTasks);
}
function psClose(){var dialog=document.getElementById("psSessionDialog");if(dialog&&dialog.open)dialog.close();var target=planningSessionsUI.returnFocus;planningSessionsUI.returnFocus=null;if(target&&document.contains(target))requestAnimationFrame(function(){target.focus();});else{var action=document.querySelector('[data-ps-action="new-session"]');if(action)requestAnimationFrame(function(){action.focus();});}}

function openPlanningSession(options){
  options=options||{};initPlanningSessionsUI();var dialog=document.getElementById("psSessionDialog"),form=document.getElementById("psSessionForm");if(!dialog||!form)return;
  var session=null;if(options.slotId&&window.PM&&PM.session){try{session=PM.session(options.slotId);}catch(e){session=null;}}
  var projectId=(session&&session.projectId)||options.projectId||"",taskId=options.taskId||"";
  var taskIds=psArray(session&&session.taskIds).slice();if(!taskIds.length&&session&&session.taskId)taskIds=[session.taskId];if(taskId&&taskIds.indexOf(taskId)<0)taskIds.push(taskId);
  var projects=window.PM&&PM.projects?PM.projects().filter(function(project){return !project.archived||project.id===projectId;}):[];
  if(!projectId&&projects[0])projectId=projects[0].id;
  var project=psProject(projectId),seedTask=psTask(project,taskId),tranche=(session&&session.tranche)||options.tranche||(seedTask&&psTaskTranche(seedTask))||"";
  form.reset();planningSessionsUI.returnFocus=document.activeElement;planningSessionsUI.slotId=(session&&session.id)||options.slotId||"";planningSessionsUI.originalTaskIds=session?taskIds.slice():[];planningSessionsUI.originalProjectId=session?projectId:"";planningSessionsUI.originalTranche=session?tranche:"";planningSessionsUI.seedTaskId=taskId;
  form.elements.slotId.value=planningSessionsUI.slotId;
  form.elements.projectId.innerHTML=projects.map(function(project){return '<option value="'+psEscape(project.id)+'"'+(project.id===projectId?' selected':'')+'>'+psEscape(psProjectLabel(project))+'</option>';}).join("");
  form.elements.projectId.value=projectId;
  tranche=psFillTranches(tranche,project&&project.tranche==="both"&&!tranche);
  psFillPhases((session&&session.phaseId)||options.phaseId||"",taskIds);
  form.elements.date.value=(session&&session.date)||psCurrentDate();form.elements.start.value=(session&&session.start)||"09:00";form.elements.end.value=(session&&session.end)||"10:00";
  form.querySelector(".psFormError").textContent="";document.getElementById("psSessionTitle").textContent=session?"Modifier la séance chantier":"Nouvelle séance chantier";form.querySelector('[type="submit"]').textContent=session?"Enregistrer":"Planifier la séance";
  if(!dialog.open)dialog.showModal();requestAnimationFrame(function(){form.elements.projectId.focus();});
}
window.openPlanningSession=openPlanningSession;

function psHandleClick(event){var button=event.target.closest("[data-ps-action]");if(!button)return;var action=button.dataset.psAction;if(action==="new-session"){openPlanningSession({});return;}if(action==="cancel"){psClose();return;}if(action==="open-project"){var form=document.getElementById("psSessionForm"),pid=form&&form.elements.projectId.value;if(pid&&typeof projectUI!=="undefined"&&projectUI.trancheTabs)projectUI.trancheTabs[pid]=form.elements.tranche.value;psClose();if(pid&&typeof projectNavigate==="function")projectNavigate("project",pid);}}
function psHandleChange(event){var form=event.target.closest("#psSessionForm");if(!form)return;if(event.target.name==="projectId"){planningSessionsUI.originalTaskIds=[];planningSessionsUI.originalProjectId="";planningSessionsUI.originalTranche="";var project=psProject(form.elements.projectId.value);psFillTranches("",project&&project.tranche==="both");psFillPhases("",[]);}else if(event.target.name==="tranche"){psFillPhases("",[]);}else if(event.target.name==="phaseId"){psRenderTasks(psSelected(form));}else if(event.target.name==="taskIds")psUpdateCount();}
function psHandlePlanningFilter(event){if(event.target.name!=="planningTrancheFilter")return;try{if(window.PM&&PM.setPlanningTrancheFilter)PM.setPlanningTrancheFilter(event.target.value);}catch(ex){if(typeof pmNotify==="function")pmNotify(ex.message||"Impossible de filtrer le planning.");}}
function psHandleSubmit(event){
  if(event.target.id!=="psSessionForm")return;event.preventDefault();var form=event.target,error=form.querySelector(".psFormError");error.textContent="";
  try{var pid=form.elements.projectId.value,tranche=form.elements.tranche.value,phaseId=form.elements.phaseId.value,taskIds=psSelected(form),date=form.elements.date.value,start=form.elements.start.value,end=form.elements.end.value;if(!pid)throw new Error("Choisissez un projet.");if(!tranche)throw new Error("Choisissez une tranche pour cette séance.");if(!phaseId)throw new Error("Choisissez une phase.");if(!taskIds.length)throw new Error("Choisissez au moins une action pour cette séance.");if(!date)throw new Error("Choisissez une date.");if(!start||!end||start>=end)throw new Error("L’heure de fin doit être après le début.");PM.scheduleSession(pid,{tranche:tranche,phaseId:phaseId,taskIds:taskIds,date:date,start:start,end:end},form.elements.slotId.value||undefined);psClose();if(typeof tout==="function")tout();if(typeof renderProjectsUI==="function")renderProjectsUI();if(typeof pmNotify==="function")pmNotify("Séance chantier planifiée.");}
  catch(ex){error.textContent=ex.message||"Impossible d’enregistrer la séance.";var invalid=form.querySelector(":invalid");if(invalid)invalid.focus();}
}

function renderPlanningSessionsUI(){
  if(!planningSessionsUI.initialized)return;var action=document.querySelector('[data-ps-action="new-session"]'),filter=document.querySelector('[name="planningTrancheFilter"]');if(action)action.dataset.date=psCurrentDate();if(filter&&window.PM&&PM.planningTrancheFilter){try{filter.value=PM.planningTrancheFilter()||"all";}catch(e){filter.value="all";}}
}
window.renderPlanningSessionsUI=renderPlanningSessionsUI;

function initPlanningSessionsUI(){
  if(planningSessionsUI.initialized)return;var workspace=document.getElementById("planningWorkspace");if(!workspace||!window.PM)return;
  var intro=workspace.querySelector(".intro"),toolbar=document.createElement("div");toolbar.className="psPlanningToolbar wrap";toolbar.innerHTML='<label class="psPlanningFilter"><span>Tranche</span><select name="planningTrancheFilter" aria-label="Filtrer le planning par tranche"><option value="all">Toutes les tranches</option><option value="1">T1</option><option value="2">T2</option><option value="common">Commun</option></select></label><button type="button" class="psNewSession" data-ps-action="new-session"><span aria-hidden="true">+</span> Séance chantier</button>';(intro||workspace.firstElementChild||workspace).after(toolbar);
  document.body.insertAdjacentHTML("beforeend",'<dialog class="pmDialog psSessionDialog" id="psSessionDialog" aria-labelledby="psSessionTitle"><div class="pmDialogHead"><div><h2 id="psSessionTitle">Nouvelle séance chantier</h2><p>Regroupez les actions d’une même phase et d’une même tranche dans un créneau.</p></div><button type="button" class="pmClose" data-ps-action="cancel" aria-label="Fermer">×</button></div><form class="pmForm psSessionForm" id="psSessionForm"><input type="hidden" name="slotId"><div class="psSessionGrid"><label class="pmField psFull" for="psProject"><span>Projet *</span><select id="psProject" name="projectId" required></select></label><label class="pmField psFull psTrancheField" for="psTranche"><span>Tranche *</span><select id="psTranche" name="tranche" required></select></label><label class="pmField psFull" for="psPhase"><span>Phase *</span><select id="psPhase" name="phaseId" required></select></label><fieldset class="psTasks"><legend>Actions de la séance *</legend><span class="psSelectionCount" id="psSelectionCount" aria-live="polite"></span><div class="psTaskChoices" id="psTaskChoices"></div></fieldset><label class="pmField psFull" for="psDate"><span>Date *</span><input id="psDate" type="date" name="date" required></label><label class="pmField" for="psStart"><span>Début *</span><input id="psStart" type="time" name="start" step="300" required></label><label class="pmField" for="psEnd"><span>Fin *</span><input id="psEnd" type="time" name="end" step="300" required></label></div><div class="pmFormError psFormError" role="alert"></div><div class="pmFormActions"><button type="button" class="pmBtn" data-ps-action="cancel">Annuler</button><button type="submit" class="pmBtn pmBtnPrimary">Planifier la séance</button></div></form></dialog>');
  document.addEventListener("click",psHandleClick);document.addEventListener("change",psHandleChange);document.addEventListener("change",psHandlePlanningFilter);document.addEventListener("submit",psHandleSubmit);
  var dialog=document.getElementById("psSessionDialog");dialog.addEventListener("cancel",function(event){event.preventDefault();psClose();});dialog.addEventListener("click",function(event){if(event.target===dialog)psClose();});planningSessionsUI.initialized=true;renderPlanningSessionsUI();
}
window.initPlanningSessionsUI=initPlanningSessionsUI;
