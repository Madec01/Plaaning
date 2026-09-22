/* Échéances calendaires de la semaine, indépendantes des créneaux planifiés. */
var planningDeadlinesUI={initialized:false};

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

function renderPlanningDeadlineRailMarkers(days){
  var heads=document.querySelectorAll("#rail .rHead");
  heads.forEach(function(head,i){
    var old=head.querySelector(".pdRailDeadline");if(old)old.remove();
    var date=iso(plusJours(lundi,i)),count=(days[date]||[]).length;
    if(!count)return;
    var marker=document.createElement("span");marker.className="pdRailDeadline";
    marker.setAttribute("aria-label",count+" échéance"+(count>1?"s":"")+" ce jour");
    marker.title=count+" échéance"+(count>1?"s":"");marker.textContent=String(count);
    head.appendChild(marker);
  });
}

function renderPlanningDeadlinesUI(){
  var rail=document.getElementById("rail");if(!rail||typeof lundi==="undefined"||!window.PM)return;
  var days=planningDeadlinesForWeek(),section=document.getElementById("planningDeadlines");
  if(!section){
    section=document.createElement("section");section.id="planningDeadlines";section.className="planningDeadlines";
    var scroll=rail.parentElement;scroll.parentElement.insertBefore(section,scroll.nextSibling);
  }
  var total=Object.keys(days).reduce(function(n,date){return n+days[date].length;},0);
  var names=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
  section.innerHTML='<header class="pdHead"><div><span class="pdEyebrow">Dates à tenir</span><h2>Échéances de la semaine</h2></div><span class="pdTotal" aria-label="'+total+' échéance'+(total>1?'s':'')+' cette semaine">'+total+'</span></header>'
    +'<div class="pdWeek">'+names.map(function(name,i){
      var d=plusJours(lundi,i),key=iso(d),items=days[key],today=key===iso(new Date());
      return '<details class="pdDay'+(items.length?' hasDeadlines':'')+(today?' isToday':'')+'" open><summary><span><b>'+name+'</b><time datetime="'+key+'">'+pmE(dateCourte(d))+'</time></span><span class="pdCount">'+items.length+'</span></summary>'
        +(items.length?'<ul>'+items.map(planningDeadlineItem).join('')+'</ul>':'<p class="pdEmpty">Aucune échéance</p>')+'</details>';
    }).join('')+'</div>';
  renderPlanningDeadlineRailMarkers(days);
}

function initPlanningDeadlinesUI(){
  if(planningDeadlinesUI.initialized)return;
  planningDeadlinesUI.initialized=true;
  renderPlanningDeadlinesUI();
}

window.initPlanningDeadlinesUI=initPlanningDeadlinesUI;
window.renderPlanningDeadlinesUI=renderPlanningDeadlinesUI;
