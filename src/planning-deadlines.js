/* Échéances calendaires de la semaine, indépendantes des créneaux planifiés. */
var planningDeadlinesUI={initialized:false,days:{},anchor:null,pinned:false,closeTimer:null,suppressFocus:false};

function planningDeadlineDate(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return "";
  var d=deIso(value);return d&&iso(d)===value?value:"";
}

function planningDeadlinesForWeek(){
  var first=iso(lundi),last=iso(plusJours(lundi,6)),days={};
  for(var i=0;i<7;i++)days[iso(plusJours(lundi,i))]=[];
  pmProjects().filter(function(p){return p&&!p.archived;}).forEach(function(p){
    var projectDate=planningDeadlineDate(p.deadline);
    if(projectDate>=first&&projectDate<=last)days[projectDate].push({kind:"project",pid:p.id,project:p.name||"Projet sans nom",title:p.title||"Échéance du projet",done:false});
    pmArray(p.tasks).forEach(function(t){
      var taskDate=planningDeadlineDate(t.deadline);
      if(taskDate>=first&&taskDate<=last)days[taskDate].push({kind:"task",pid:p.id,tid:t.id,project:p.name||"Projet sans nom",title:t.title||"Action sans titre",done:t.status==="done"});
    });
    pmArray(p.milestones).forEach(function(m){
      var milestoneDate=planningDeadlineDate(m.date);
      if(milestoneDate>=first&&milestoneDate<=last)days[milestoneDate].push({kind:"milestone",pid:p.id,project:p.name||"Projet sans nom",title:m.title||"Jalon sans titre",done:!!m.done});
    });
  });
  Object.keys(days).forEach(function(date){days[date].sort(function(a,b){return a.project.localeCompare(b.project,"fr")||a.title.localeCompare(b.title,"fr");});});
  return days;
}

function planningDeadlineItem(item){
  var action=item.kind==="task"?"edit-task":"open-project";
  var type=item.kind==="task"?"Action":item.kind==="milestone"?"Jalon":"Projet";
  return '<li><button type="button" class="pdItem'+(item.done?' isDone':'')+'" data-pm-action="'+action+'" data-pid="'+pmE(item.pid)+'" data-id="'+pmE(item.pid)+'"'+(item.tid?' data-tid="'+pmE(item.tid)+'"':'')+' title="Ouvrir '+pmE(type.toLowerCase())+' : '+pmE(item.title)+'"><span class="pdType">'+pmE(type)+(item.done?' · Fait':'')+'</span><strong>'+pmE(item.title)+'</strong><small>'+pmE(item.project)+'</small></button></li>';
}

function pdClose(restoreFocus){
  clearTimeout(planningDeadlinesUI.closeTimer);
  var anchor=planningDeadlinesUI.anchor,popup=document.getElementById("pdPopover");
  if(anchor)anchor.setAttribute("aria-expanded","false");
  if(popup)popup.hidden=true;
  planningDeadlinesUI.anchor=null;planningDeadlinesUI.pinned=false;
  if(restoreFocus&&anchor&&anchor.isConnected){planningDeadlinesUI.suppressFocus=true;anchor.focus();planningDeadlinesUI.suppressFocus=false;}
}
function pdPosition(){
  var anchor=planningDeadlinesUI.anchor,popup=document.getElementById("pdPopover");if(!anchor||!anchor.isConnected||!popup||popup.hidden)return;
  var r=anchor.getBoundingClientRect(),width=popup.offsetWidth,height=popup.offsetHeight;
  popup.style.left=Math.max(8,Math.min(r.right-width,window.innerWidth-width-8))+"px";
  popup.style.top=Math.max(8,r.bottom+height+8<=window.innerHeight?r.bottom+6:r.top-height-6)+"px";
}
function pdOpen(anchor,pin){
  clearTimeout(planningDeadlinesUI.closeTimer);
  var same=planningDeadlinesUI.anchor===anchor;if(!same)pdClose(false);
  planningDeadlinesUI.anchor=anchor;planningDeadlinesUI.pinned=!!pin||(same&&planningDeadlinesUI.pinned);
  var popup=document.getElementById("pdPopover"),days=planningDeadlinesUI.days;
  var dates=anchor.dataset.date==="weekend"?[iso(plusJours(lundi,5)),iso(plusJours(lundi,6))]:[anchor.dataset.date];
  popup.innerHTML='<div class="pdPopupHead"><strong>Échéances</strong><button type="button" data-pd-close aria-label="Fermer les échéances">×</button></div>'+dates.filter(function(date){return days[date]&&days[date].length;}).map(function(date){
    var label=deIso(date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    return '<section class="pdDateGroup"><h3>'+pmE(label)+'</h3><ul>'+days[date].map(planningDeadlineItem).join("")+'</ul></section>';
  }).join("");
  popup.hidden=false;anchor.setAttribute("aria-expanded","true");pdPosition();
}
function pdDelayClose(){
  clearTimeout(planningDeadlinesUI.closeTimer);
  if(!planningDeadlinesUI.pinned)planningDeadlinesUI.closeTimer=setTimeout(function(){var popup=document.getElementById("pdPopover"),active=document.activeElement;if(active===planningDeadlinesUI.anchor||popup.contains(active))return;pdClose(false);},160);
}
function pdMarker(date,count,label,weekend){
  var button=document.createElement("button");button.type="button";button.className="pdRailDeadline"+(weekend?" pdWeekend":"");button.dataset.date=date;
  button.setAttribute("aria-label",count+" échéance"+(count>1?"s":"")+" · "+label);
  button.setAttribute("aria-haspopup","dialog");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","pdPopover");
  button.innerHTML=(weekend?'<span>Week-end</span>':'')+'<i aria-hidden="true"></i>';
  return button;
}
function renderPlanningDeadlinesUI(){
  var rail=document.getElementById("rail");if(!rail||typeof lundi==="undefined"||!window.PM)return;
  pdClose(false);planningDeadlinesUI.days=planningDeadlinesForWeek();
  var old=document.getElementById("planningDeadlines");if(old)old.remove();
  rail.querySelectorAll(".pdRailDeadline").forEach(function(marker){marker.remove();});
  var days=planningDeadlinesUI.days,heads=rail.querySelectorAll(".rHead");
  heads.forEach(function(head,i){
    var cell=head.parentElement;
    if(!cell.classList.contains("pdRailCell")){cell=document.createElement("div");cell.className="pdRailCell";head.before(cell);cell.appendChild(head);}
    var date=iso(plusJours(lundi,i)),count=(days[date]||[]).length;
    if(count)cell.appendChild(pdMarker(date,count,deIso(date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}),false));
    if(i===4){var weekend=(days[iso(plusJours(lundi,5))]||[]).length+(days[iso(plusJours(lundi,6))]||[]).length;if(weekend)cell.appendChild(pdMarker("weekend",weekend,"ce week-end",true));}
  });
}
function initPlanningDeadlinesUI(){
  if(planningDeadlinesUI.initialized)return;planningDeadlinesUI.initialized=true;
  var popup=document.createElement("div");popup.id="pdPopover";popup.className="pdPopover";popup.hidden=true;popup.setAttribute("role","dialog");popup.setAttribute("aria-label","Détail des échéances");document.body.appendChild(popup);
  document.addEventListener("pointerover",function(event){var marker=event.target.closest(".pdRailDeadline");if(marker&&event.pointerType!=="touch"&&!marker.contains(event.relatedTarget))pdOpen(marker,false);if(popup.contains(event.target))clearTimeout(planningDeadlinesUI.closeTimer);});
  document.addEventListener("pointerout",function(event){var marker=event.target.closest(".pdRailDeadline");if((marker&&!marker.contains(event.relatedTarget))||(popup.contains(event.target)&&!popup.contains(event.relatedTarget)))pdDelayClose();});
  document.addEventListener("focusin",function(event){var marker=event.target.closest(".pdRailDeadline");if(marker&&!planningDeadlinesUI.suppressFocus)pdOpen(marker,false);else if(!marker&&!popup.contains(event.target))pdClose(false);});
  document.addEventListener("click",function(event){
    var marker=event.target.closest(".pdRailDeadline");
    if(marker){if(planningDeadlinesUI.anchor===marker&&planningDeadlinesUI.pinned)pdClose(false);else pdOpen(marker,true);return;}
    if(event.target.closest("[data-pd-close]")){pdClose(true);return;}
    if(event.target.closest(".pdItem")){pdClose(false);return;}
    if(!popup.contains(event.target))pdClose(false);
  });
  document.addEventListener("keydown",function(event){
    if(popup.hidden)return;
    if(event.key==="Escape"){event.preventDefault();pdClose(true);}
    if(event.key==="ArrowDown"&&event.target.closest(".pdRailDeadline")){event.preventDefault();var first=popup.querySelector(".pdItem");if(first)first.focus();}
    if(event.key==="Tab"&&!event.shiftKey&&event.target.closest(".pdRailDeadline")){event.preventDefault();popup.querySelector("[data-pd-close]").focus();}
  });
  window.addEventListener("resize",pdPosition);window.addEventListener("scroll",pdPosition,true);
  renderPlanningDeadlinesUI();
}
window.initPlanningDeadlinesUI=initPlanningDeadlinesUI;
window.renderPlanningDeadlinesUI=renderPlanningDeadlinesUI;
