/* Extension du moteur : validation complète avant mutation et sauvegarde unique. */
PM = window.PM = (function(BASE){
  var DEFAULT_RULES={1:{watch:-10,urgent:-5,critical:-2},2:{watch:1,urgent:3,critical:7},3:{watch:7,urgent:21,critical:null}};
  var COLLECTIONS=['milestones','readiness','documents','contacts','taskFields'];
  var TASK_EXTRA=['importance','manualUrgency','dependsOn','blockedReason','followUpDate','assigneeId','validatorId','fields','tranche'];
  var LEVELS=['normal','watch','urgent','critical'];
  function fail(s){throw new Error(s);}
  function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
  function plain(o){return !!o&&typeof o==='object'&&!Array.isArray(o);}
  function copy(o){return JSON.parse(JSON.stringify(o));}
  function text(v,label,optional){if(typeof v!=='string')fail(label+' doit être un texte.');v=v.trim();if(!optional&&!v)fail(label+' est requis.');return v;}
  function date(v,optional){if(optional&&(v==null||v===''))return '';if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!deIso(v)||iso(deIso(v))!==v)fail('Date invalide.');return v;}
  function identifier(v){if(typeof v!=='string'||!v.trim()||['__proto__','constructor','prototype'].indexOf(v)>=0)fail('Identifiant invalide.');return v;}
  function rules(value){
    if(!plain(value))fail('Règles d’urgence invalides.');var out={};
    [1,2,3].forEach(function(n){var r=value[n],previous=-Infinity;if(!plain(r))fail('Règles d’urgence invalides.');out[n]={};
      ['watch','urgent','critical'].forEach(function(k){var v=r[k];if(n===3&&k==='critical'){if(v!==null)fail('Le niveau 3 ne devient pas critique automatiquement.');out[n][k]=null;return;}
        if(!Number.isInteger(v)||Math.abs(v)>3650||v<=previous)fail('Les seuils doivent être des jours entiers strictement croissants (de −3650 à 3650).');previous=v;out[n][k]=v;
      });
    });return out;
  }
  function collection(values,key){
    if(values==null)return [];if(!Array.isArray(values))fail('Liste de suivi invalide.');var seen=Object.create(null);
    return values.map(function(x){if(!plain(x))fail('Élément de suivi invalide.');var id=identifier(x.id);if(seen[id])fail('Identifiant de suivi dupliqué.');seen[id]=true;
      if(key==='contacts')return {id:id,name:text(x.name,'Le nom'),role:x.role==null?'':text(x.role,'Le rôle',true),email:x.email==null?'':text(x.email,'L’e-mail',true),phone:x.phone==null?'':text(x.phone,'Le téléphone',true)};
      var item={id:id,title:text(x.title,'Le titre')};
      if(key==='milestones'||key==='readiness'){if(typeof x.done!=='boolean')fail('État de suivi invalide.');item.done=x.done;if(key==='milestones')item.date=date(x.date,true);}
      if(key==='documents'){
        if(['url','local'].indexOf(x.kind)<0)fail('Type de document invalide.');item.kind=x.kind;item.target=text(x.target,'L’adresse ou le chemin');
        if(x.kind==='url'){var url;try{url=new URL(item.target);}catch(e){fail('URL de document invalide.');}if(!url||['http:','https:'].indexOf(url.protocol)<0)fail('L’URL du document doit utiliser http:// ou https://.');}
      }return item;
    });
  }
  function history(values){
    if(values==null)return [];if(!Array.isArray(values))fail('Historique invalide.');var seen=Object.create(null);
    return values.map(function(x){if(!plain(x))fail('Événement invalide.');identifier(x.id);if(seen[x.id])fail('Identifiant d’historique dupliqué.');seen[x.id]=true;
      if(typeof x.at!=='string'||!Number.isFinite(Date.parse(x.at))||typeof x.type!=='string'||typeof x.text!=='string'||(x.taskId!=null&&typeof x.taskId!=='string'))fail('Événement invalide.');
      var event={id:x.id,at:x.at,type:x.type,text:x.text};if(x.taskId)event.taskId=x.taskId;return event;
    });
  }
  function task(raw,p,skipLabels){
    var t=BASE._normalizeTask(raw,p.phases,skipLabels);
    t.tranche=raw.tranche==null?((p.tranche==='1'||p.tranche==='2')?p.tranche:'common'):raw.tranche;
    if(['common','1','2'].indexOf(t.tranche)<0||((t.tranche==='1'||t.tranche==='2')&&tranchesOf(p).indexOf(t.tranche)<0))fail('Tranche d’action invalide.');
    t.importance=raw.importance==null?2:raw.importance;if([1,2,3].indexOf(t.importance)<0)fail('Importance invalide.');
    t.manualUrgency=raw.manualUrgency==null?'auto':raw.manualUrgency;if(['auto'].concat(LEVELS).indexOf(t.manualUrgency)<0)fail('Urgence manuelle invalide.');
    var dependencies=raw.dependsOn==null?[]:raw.dependsOn;if(!Array.isArray(dependencies)||!dependencies.every(function(x){return typeof x==='string'&&x;}))fail('Dépendances invalides.');
    t.dependsOn=Array.from(new Set(dependencies));t.blockedReason=raw.blockedReason==null?'':text(raw.blockedReason,'Le motif de blocage',true);t.followUpDate=date(raw.followUpDate,true);
    ['assigneeId','validatorId'].forEach(function(k){t[k]=raw[k]==null?'':raw[k];if(typeof t[k]!=='string'||(t[k]&&!p.contacts.some(function(c){return c.id===t[k];})))fail('Contact inconnu.');});
    var fields=raw.fields==null?{}:raw.fields;if(!plain(fields))fail('Champs texte invalides.');t.fields={};
    Object.keys(fields).forEach(function(k){if(!p.taskFields.some(function(f){return f.id===k;}))fail('Un champ texte référence une colonne inconnue.');if(typeof fields[k]!=='string')fail('La valeur du champ doit être un texte.');t.fields[k]=fields[k];});
    return t;
  }
  function tranchesOf(p){var out=['common'];if(p.tranche==='1'||p.tranche==='both')out.push('1');if(p.tranche==='2'||p.tranche==='both')out.push('2');return out;}
  function details(raw,p){if(raw!=null&&!plain(raw))fail('Détails de tranche invalides.');var out={},source=raw||{};Object.keys(source).forEach(function(k){if(['1','2'].indexOf(k)<0)fail('Détails de tranche invalides.');if(!plain(source[k]))fail('Détails de tranche invalides.');if(tranchesOf(p).indexOf(k)<0&&source[k].deadline)fail('Une tranche inactive ne peut pas conserver une échéance.');});['1','2'].forEach(function(k){if(tranchesOf(p).indexOf(k)<0)return;var d=source[k]||{};var phase=d.phaseId==null?p.phases[0].id:d.phaseId;if(!p.phases.some(function(x){return x.id===phase;}))fail('Phase de tranche inconnue.');out[k]={deadline:date(d.deadline,true),phaseId:phase};});return out;}
  function graph(p){
    var map=Object.create(null),active=Object.create(null),seen=Object.create(null);
    p.tasks.forEach(function(t){identifier(t.id);if(map[t.id])fail('Identifiant de tâche dupliqué.');map[t.id]=t;});
    p.tasks.forEach(function(t){t.dependsOn.forEach(function(id){if(id===t.id)fail('Une action ne peut pas dépendre d’elle-même.');if(!map[id])fail('Une dépendance référence une action inconnue.');});});
    function visit(id){if(active[id])fail('Les dépendances forment un cycle.');if(seen[id])return;active[id]=true;map[id].dependsOn.forEach(visit);delete active[id];seen[id]=true;}
    p.tasks.forEach(function(t){visit(t.id);});
  }
  function normalize(p,skipLabels){
    if(p.tranche==null)p.tranche='';
    if(['','1','2','both'].indexOf(p.tranche)<0)fail('Tranche invalide.');
    p.trancheDetails=details(p.trancheDetails,p);
    COLLECTIONS.forEach(function(k){p[k]=collection(p[k],k);});p.history=history(p.history);
    if(!Array.isArray(p.tasks))fail('Liste de tâches invalide.');p.tasks=p.tasks.map(function(t){return task(t,p,skipLabels);});graph(p);return p;
  }
  function project(values,old){
    values=values||{};var p=BASE._normalizeProject(values,old),rawTasks=own(values,'tasks')?values.tasks:(old?old.tasks:[]);
    COLLECTIONS.forEach(function(k){if(own(values,k))p[k]=copy(values[k]);});
    if(own(values,'history'))p.history=copy(values.history);else if(!old)p.history=[];
    /* Preserve extra task data alongside the core normalizer's canonical IDs/defaults. */
    p.tasks=p.tasks.map(function(t,i){var full=Object.assign({},rawTasks[i]||{},t);TASK_EXTRA.forEach(function(k){if(own(rawTasks[i]||{},k))full[k]=copy(rawTasks[i][k]);});return full;});
    if(own(values,'taskFields')&&old){var kept=(values.taskFields||[]).map(function(f){return f.id;});p.tasks.forEach(function(t){if(t.fields)Object.keys(t.fields).forEach(function(k){if(kept.indexOf(k)<0)delete t.fields[k];});});}
    if(own(values,'trancheDetails'))p.trancheDetails=copy(values.trancheDetails);
    if(old&&old.tranche!==p.tranche){var removed=tranchesOf(old).filter(function(k){return tranchesOf(p).indexOf(k)<0;});removed.forEach(function(k){if(old.tasks.some(function(t){return (t.tranche||((old.tranche==='1'||old.tranche==='2')?old.tranche:'common'))===k;})||projectSlots(old.id).some(function(s){return slotTranche(old,s)===k;})||(old.trancheDetails&&old.trancheDetails[k]&&old.trancheDetails[k].deadline))fail('Impossible de retirer une tranche qui contient des actions, des séances ou une échéance.');});}
    normalize(p);checkTransitions(old,p);
    return p;
  }
  function getProject(id){var p=etat.projects.find(function(x){return x.id===id;});if(!p)fail('Projet introuvable.');return p;}
  function getTask(p,id){var t=p.tasks.find(function(x){return x.id===id;});if(!t)fail('Tâche introuvable.');return t;}
  function blockers(p,t){return t.dependsOn.map(function(id){return getTask(p,id);}).filter(function(x){return x.status!=='done';});}
  function checkTransitions(before,after){
    after.tasks.forEach(function(t){var old=before&&before.tasks.find(function(x){return x.id===t.id;});
      if((t.status==='doing'||t.status==='done')&&(!old||old.status!==t.status||JSON.stringify(old.dependsOn)!==JSON.stringify(t.dependsOn))){var blocked=blockers(after,t);if(blocked.length)fail('Terminez d’abord les dépendances : '+blocked.map(function(x){return x.title;}).join(', ')+'.');}
    });
  }
  function log(p,type,message,tid){var e={id:'history_'+uid(),at:new Date().toISOString(),type:type,text:message};if(tid)e.taskId=tid;p.history.push(e);}
  function replace(target,source){Object.keys(target).forEach(function(k){delete target[k];});Object.keys(source).forEach(function(k){target[k]=source[k];});}
  function columns(fn){Object.keys(etat.semaines||{}).forEach(function(w){(etat.semaines[w].jours||[]).forEach(function(day){fn(day);});});}
  function projectSlots(pid){var out=[];columns(function(day){(day.cols||[]).forEach(function(c){if(c.projectId===pid)out.push(c);});});return out;}
  function slotTranche(p,c){if(c.tranche)return c.tranche;var ids=Array.isArray(c.taskIds)?c.taskIds:(c.taskId?[c.taskId]:[]),found=[];ids.forEach(function(id){var t=p.tasks.find(function(x){return x.id===id;}),s=t?t.tranche:null;if(s&&found.indexOf(s)<0)found.push(s);});return found.length===1?found[0]:(ids.length?'':(p.tranche==='both'?'both':((p.tranche==='1'||p.tranche==='2')?p.tranche:'common')));}
  function syncSlots(p){var known=Object.create(null);p.tasks.forEach(function(t){known[t.id]=true;});columns(function(day){day.cols=(day.cols||[]).filter(function(c){
    if(c.projectId!==p.id)return true;
    if(Array.isArray(c.taskIds)){c.taskIds=c.taskIds.filter(function(id){return known[id];});if(!c.taskIds.length)return false;}
    else if(c.taskId&&!known[c.taskId])return false;
    c.nom=p.name;return true;
  });});}
  function commit(target,draft){var beforeTasks=Object.create(null),afterTasks=Object.create(null);target.tasks.forEach(function(t){beforeTasks[t.id]=t;});draft.tasks.forEach(function(t){afterTasks[t.id]=t;});projectSlots(target.id).forEach(function(c){var ids=Array.isArray(c.taskIds)?c.taskIds:(c.taskId?[c.taskId]:[]);ids.forEach(function(id){if(beforeTasks[id]&&afterTasks[id]&&beforeTasks[id].tranche!==afterTasks[id].tranche)fail('Retirez d’abord cette action de ses séances avant de changer sa tranche.');});});replace(target,draft);syncSlots(target);if(target.code&&etat.projectCodes.indexOf(target.code)<0)etat.projectCodes.push(target.code);BASE.save();return copy(target);}
  function dayNumber(s){var v=s.split('-');return Date.UTC(+v[0],+v[1]-1,+v[2])/86400000;}
  function urgency(t,today){
    var manual=t.manualUrgency||'auto';if(t.status==='done')return {level:'normal',rank:0,reason:'Action terminée',daysRemaining:null,automatic:'normal',manual:manual};
    var automatic='normal',days=null,n=t.importance||2;
    if(t.deadline){days=dayNumber(date(t.deadline))-dayNumber(today?date(today):iso(aujourdhui()));var r=etat.urgencyRules[n];['watch','urgent','critical'].forEach(function(k){if(r[k]!==null&&days<=-r[k])automatic=k;});}
    var level=LEVELS.indexOf(manual)>LEVELS.indexOf(automatic)?manual:automatic;
    var when=days===null?'sans échéance':days<0?'retard de '+Math.abs(days)+' j':days===0?'échéance aujourd’hui':'échéance dans '+days+' j';
    return {level:level,rank:LEVELS.indexOf(level),reason:'N'+n+' · '+(manual!=='auto'&&LEVELS.indexOf(manual)>LEVELS.indexOf(automatic)?'priorité manuelle':when),daysRemaining:days,automatic:automatic,manual:manual};
  }
  var api=Object.assign({},BASE);
  api.create=function(values){var p=project(values);if(etat.projects.some(function(x){return x.id===p.id;}))fail('Identifiant de projet déjà utilisé.');log(p,'project','Projet créé : '+p.name+'.');etat.projects.push(p);if(p.code&&etat.projectCodes.indexOf(p.code)<0)etat.projectCodes.push(p.code);BASE.save();return copy(p);};
  api.update=function(id,values){var before=getProject(id),p=project(values,before);p.id=id;
    var labels={name:'Nom',title:'Titre',deadline:'Deadline',tranche:'Tranche',code:'Code',archived:'Archivage'};
    Object.keys(labels).forEach(function(k){if(before[k]!==p[k])log(p,'project',labels[k]+' : '+String(before[k]||'aucun')+' → '+String(p[k]||'aucun')+'.');});
    var names={milestones:'Jalons',readiness:'Préparatifs',documents:'Documents',contacts:'Contacts',taskFields:'Colonnes texte'};
    COLLECTIONS.forEach(function(k){if(JSON.stringify(before[k])!==JSON.stringify(p[k]))log(p,'collection',names[k]+' mis à jour.');});return commit(before,p);
  };
  api.addTask=function(pid,values){var old=getProject(pid),p=copy(old),t=task(values||{},p);if(p.tasks.some(function(x){return x.id===t.id;}))fail('Identifiant de tâche déjà utilisé.');p.tasks.push(t);graph(p);checkTransitions(old,p);log(p,'task','Action créée : '+t.title+'.',t.id);commit(old,p);return copy(t);};
  api.updateTask=function(pid,tid,values){var old=getProject(pid),p=copy(old),before=getTask(p,tid),raw=Object.assign({},before,values||{},{id:tid});
    if(values&&own(values,'fields')&&plain(values.fields))raw.fields=Object.assign({},before.fields,values.fields);
    var updated=task(raw,p);if(updated.tranche!==before.tranche&&projectSlots(pid).some(function(c){return c.taskId===tid||(c.taskIds||[]).indexOf(tid)>=0;}))fail('Retirez d’abord cette action de ses séances avant de changer sa tranche.');p.tasks[p.tasks.indexOf(before)]=updated;graph(p);checkTransitions(old,p);
    var names={title:'Titre',status:'Statut',deadline:'Deadline',importance:'Importance',manualUrgency:'Urgence manuelle',blockedReason:'Blocage',followUpDate:'Relance',assigneeId:'Responsable',validatorId:'Validateur'};
    var words={todo:'À faire',doing:'En cours',done:'Terminée',auto:'Automatique',normal:'Normale',watch:'À surveiller',urgent:'Urgente',critical:'Critique'};
    function show(v,k){if(v==null||v==='')return 'aucun';if(k==='assigneeId'||k==='validatorId'){var c=p.contacts.find(function(x){return x.id===v;});return c?c.name:v;}return words[v]||String(v);}
    Object.keys(names).forEach(function(k){if(before[k]!==updated[k])log(p,'task',updated.title+' — '+names[k]+' : '+show(before[k],k)+' → '+show(updated[k],k)+'.',tid);});
    if(JSON.stringify(before.fields)!==JSON.stringify(updated.fields))log(p,'task',updated.title+' — Informations complémentaires modifiées.',tid);
    if(JSON.stringify(before.dependsOn)!==JSON.stringify(updated.dependsOn))log(p,'task',updated.title+' — Dépendances modifiées.',tid);
    commit(old,p);return copy(updated);
  };
  api.removeTask=function(pid,tid){var old=getProject(pid),p=copy(old),removed=getTask(p,tid);p.tasks=p.tasks.filter(function(t){return t.id!==tid;});p.tasks.forEach(function(t){t.dependsOn=t.dependsOn.filter(function(id){return id!==tid;});});log(p,'task','Action supprimée : '+removed.title+'.',tid);commit(old,p);};
  api.blockers=function(pid,tid){var p=getProject(pid);return copy(blockers(p,getTask(p,tid)));};
  api.tranches=function(pid){return tranchesOf(getProject(pid));};
  api.trancheLabel=function(scope){return {common:'Commun','1':'T1','2':'T2',both:'T1 + T2'}[scope]||'';};
  api.planningTrancheFilter=function(){return etat.planningTrancheFilter||'all';};
  api.setPlanningTrancheFilter=function(scope){if(['all','common','1','2'].indexOf(scope)<0)fail('Filtre de tranche invalide.');etat.planningTrancheFilter=scope;BASE.save();return scope;};
  api.taskTranche=function(pid,tid){return getTask(getProject(pid),tid).tranche;};
  api.updateTranche=function(pid,tranche,value){if(['1','2'].indexOf(tranche)<0)fail('Tranche invalide.');var old=getProject(pid),p=copy(old);if(tranchesOf(p).indexOf(tranche)<0)fail('Tranche inactive.');var next=Object.assign({},p.trancheDetails[tranche],value||{});p.trancheDetails[tranche]={deadline:date(next.deadline,true),phaseId:next.phaseId};if(!p.phases.some(function(ph){return ph.id===next.phaseId;}))fail('Phase de tranche inconnue.');log(p,'project','Tranche '+tranche+' mise à jour.');return commit(old,p);};
  api.copyTrancheTasks=function(pid,from,to){if(from===to||['common','1','2'].indexOf(from)<0||['common','1','2'].indexOf(to)<0)fail('Tranches de copie invalides.');var old=getProject(pid),p=copy(old);if(tranchesOf(p).indexOf(from)<0||tranchesOf(p).indexOf(to)<0)fail('Tranche inactive.');var source=p.tasks.filter(function(t){return t.tranche===from;}),ids={},copies=[];source.forEach(function(t){ids[t.id]='task_'+uid();});source.forEach(function(t){var n=copy(t);n.id=ids[t.id];n.tranche=to;n.status='todo';n.deadline='';n.followUpDate='';n.blockedReason='';n.manualUrgency='auto';n.dependsOn=n.dependsOn.map(function(id){if(ids[id])return ids[id];var dep=getTask(p,id);if(dep.tranche==='common')return id;fail('Une dépendance vers une autre tranche empêche la copie.');});copies.push(n);});p.tasks=p.tasks.concat(copies);graph(p);copies.forEach(function(t){log(p,'task','Action copiée : '+t.title+'.',t.id);});commit(old,p);return copy(copies);};
  api.addDecision=function(pid,value){var p=getProject(pid);log(p,'decision',text(value,'La décision'));BASE.save();return copy(p.history[p.history.length-1]);};
  api.urgency=urgency;
  api.sortTasks=function(tasks,today){return tasks.map(function(t,i){return {t:copy(t),i:i};}).sort(function(a,b){return Number(a.t.status==='done')-Number(b.t.status==='done')||urgency(b.t,today).rank-urgency(a.t,today).rank||(a.t.importance||2)-(b.t.importance||2)||(a.t.deadline||'9999-12-31').localeCompare(b.t.deadline||'9999-12-31')||a.i-b.i;}).map(function(x){return x.t;});};
  api.urgencyRules=function(){return copy(etat.urgencyRules);};api.setUrgencyRules=function(value){var valid=rules(value);etat.urgencyRules=valid;BASE.save();return copy(valid);};
  api.validate=function(state){BASE.validate(state);rules(state.urgencyRules==null?DEFAULT_RULES:state.urgencyRules);state.projects.forEach(function(p){normalize(copy(p),true);});return true;};
  api.migrate=function(state){var migrated=BASE.migrate(state);api.validate(migrated);migrated.urgencyRules=rules(migrated.urgencyRules==null?DEFAULT_RULES:migrated.urgencyRules);migrated.projects=migrated.projects.map(function(p){return normalize(p,true);});return migrated;};
  etat.urgencyRules=rules(etat.urgencyRules==null?DEFAULT_RULES:etat.urgencyRules);
  etat.projects=etat.projects.map(function(p){return normalize(p,true);});
  return api;
})(PM);
