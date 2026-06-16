
/* OurSpace final repair layer. Keeps the original files, then patches broken wiring. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=v=>String(v==null?'':v);
  function cfg(){try{return JSON.parse($('#profile-config')?.textContent||'{}')}catch{return {}}}
  function profile(){const c=cfg(); const raw=(c.jsonProfile||c.dataProfile||c.profile||(document.body?.dataset.profile||'')).toLowerCase(); return raw.includes('jasper')||raw.includes('squishy')||raw.includes('momma')?'jasper':'william';}
  function owner(){return cfg().ownerName || (profile()==='jasper'?'Jasper':'William');}
  function storeKey(...parts){return ['ourspace',profile(),...parts].join(':')}
  function readLS(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}}
  function writeLS(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function data(name){return window.OurSpaceGetJson ? window.OurSpaceGetJson(name) : ((window.OurSpaceJsonBundle||{})[name]||null)}
  function today(){const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
  function ymd(d){const z=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
  function parseDate(s){if(!s)return null; const m=String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(!m)return null; return new Date(+m[1],+m[2]-1,+m[3]);}
  function freqOf(item){const raw=text(item.frequency||item.freq||item.recurrence||item.repeat||item.respawn||item.type||'').toLowerCase(); if(/daily|every day|repeatable/.test(raw))return 'daily'; if(/weekly|every week/.test(raw))return 'weekly'; if(/monthly|every month/.test(raw))return 'monthly'; return item.date?'once':'';}
  function titleOf(item){return item.title||item.task||item.name||item.label||'Untitled item'}
  function rewardOf(item){return Number(item.rewardCopper||item.copper||item.reward?.totalCopper||item.reward?.copper||0)}
  function noteOf(item){return item.notes||item.gentleNote||item.description||item.summary||''}
  function getProfileData(){const p=profile(); return {cal:data(`${p}/${p}_calendar.json`)||{}, sched:data(`${p}/${p}_schedule.json`)||{}, tasks:data(`${p}/${p}_tasks.json`)||{}, store:data(`${p}/${p}_store.json`)||{}, hobby:data(`${p}/${p}_hobby.json`)||{}, games:data('games/games_manifest_merged.json')||{}, dbt:data('dbt/dbt_skills_catalog.json')||{}, dbtAll:data('dbt/dbt_combined_catalog.json')||{}, dbtWs:data('dbt/dbt_worksheets_catalog.json')||{}}}
  function instancesForRange(start,end){
    const d=getProfileData(); const out=[];
    const push=(item,source,date,extra={})=>out.push(Object.assign({},item,{_source:source,_date:ymd(date),_freq:extra.freq||freqOf(item),_recurring:extra.recurring||false,_title:titleOf(item),_reward:rewardOf(item),_notes:noteOf(item)}));
    (d.cal.events||[]).forEach(ev=>{const base=parseDate(ev.date); const freq=freqOf(ev); if(!base)return; if(freq==='once'){if(base>=start&&base<end)push(ev,'calendar',base,{freq:'once'}); return;} for(let day=new Date(start); day<end; day.setDate(day.getDate()+1)){let ok=false; if(freq==='daily')ok=true; if(freq==='weekly')ok=day.getDay()===base.getDay(); if(freq==='monthly')ok=day.getDate()===base.getDate(); if(ok)push(ev,'calendar',day,{freq,recurring:true});}});
    (d.sched.defaultToday||[]).forEach(it=>{for(let day=new Date(start); day<end; day.setDate(day.getDate()+1))push(it,'schedule',day,{freq:'daily',recurring:true});});
    // Task-bank items stay searchable so the calendar does not become a wall of every possible reward task.
    // Items with dates belong in *_cal.json; daily live schedule belongs in *_sched.json.
    return out.sort((a,b)=>String(a.time||'99:99').localeCompare(String(b.time||'99:99')) || a._title.localeCompare(b._title));
  }
  function currentView(){return $('#calendarView')?.value || 'month'}
  function cursorDate(){let s=sessionStorage.getItem(storeKey('repairCalendarCursor')); return parseDate(s)||today()}
  function setCursor(d){sessionStorage.setItem(storeKey('repairCalendarCursor'),ymd(d))}
  function viewRange(){const cur=cursorDate(), view=currentView(); if(view==='day'){const s=new Date(cur),e=new Date(cur); e.setDate(e.getDate()+1); return [s,e];} if(view==='week'){const s=new Date(cur); s.setDate(cur.getDate()-((cur.getDay()+6)%7)); const e=new Date(s); e.setDate(e.getDate()+7); return [s,e];} const s=new Date(cur.getFullYear(),cur.getMonth(),1); const e=new Date(cur.getFullYear(),cur.getMonth()+1,1); return [s,e];}
  function renderCalendarRepair(){
    if(!$('#calendarList'))return; const [start,end]=viewRange(); const view=currentView(); const items=instancesForRange(start,end); const title=$('#calendarTitle');
    if(title){title.textContent=view==='month'?cursorDate().toLocaleDateString([],{month:'long',year:'numeric'}): view==='week'?`${start.toLocaleDateString()} – ${new Date(end-86400000).toLocaleDateString()}`:start.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'});}
    const list=$('#calendarList');
    if(view==='month'){
      const first=new Date(cursorDate().getFullYear(),cursorDate().getMonth(),1); const gridStart=new Date(first); gridStart.setDate(1-((first.getDay()+6)%7)); const cells=[];
      for(let i=0;i<42;i++){const day=new Date(gridStart); day.setDate(gridStart.getDate()+i); const ds=ymd(day); const dayItems=items.filter(x=>x._date===ds).slice(0,5); const muted=day.getMonth()!==cursorDate().getMonth()?' muted':''; cells.push(`<div class="day-cell${muted}"><div class="day-num">${day.getDate()}</div>${dayItems.map(ev=>`<div class="day-event" data-recurring="${ev._recurring?'true':'false'}" title="${esc(ev._title)}">${esc(ev.time?ev.time+' · ':'')}${esc(ev._title)}</div>`).join('')}${items.filter(x=>x._date===ds).length>5?'<div class="day-event">+'+(items.filter(x=>x._date===ds).length-5)+' more</div>':''}</div>`);}
      list.className='calendar-grid'; list.innerHTML=cells.join('');
    } else {
      list.className='data-list'; list.innerHTML=items.map(ev=>`<div class="data-card"><h3>${esc(ev._title)} ${ev._recurring?`<span class="recurring-badge">${esc(ev._freq)}</span>`:''}</h3><div class="meta">${esc(ev._date)} · ${esc(ev.time||'Any')} · ${esc(ev._source)} · ${ev._reward} copper</div><p>${esc(ev._notes)}</p><button class="tiny-btn" data-repair-add-today="${esc(ev._source+'::'+(ev.id||ev.sourceTaskId||ev._title)+'::'+ev._date)}">Move into today</button></div>`).join('') || '<div class="empty-state">No calendar items in this view.</div>';
    }
    injectGoogleCalendarBox();
  }
  function renderTodayRepair(){
    if(!$('#todayList'))return; const d=getProfileData(); const saved=readLS(storeKey('todayAdditions'),[]); const start=today(), end=new Date(start); end.setDate(end.getDate()+1);
    const daily=instancesForRange(start,end).filter(x=>x._source!=='task' || /daily|weekly|monthly|repeatable/i.test(text(x.respawn||x.recurrence||x.repeat||''))).slice(0,80);
    const seen=new Set(); const items=[]; [...daily,...saved].forEach(x=>{const id=x.id||x.sourceTaskId||x._title||x.title; const key=(x._date||ymd(start))+'::'+id; if(!seen.has(key)){seen.add(key); items.push(x);}});
    $('#todayList').innerHTML=items.map(x=>{const id=esc(x.id||x.sourceTaskId||x._title||x.title||Math.random()); const done=readLS(storeKey('done',id+'::'+ymd(start)),false); return `<div class="schedule-line ${done?'done':''}"><strong>${esc(x.time||'Any')}</strong><span>${esc(x._title||titleOf(x))}<br><span class="meta">${esc(x.category||x.section||x._source||'item')} · ${rewardOf(x)||x._reward||0} copper ${x._recurring||freqOf(x)?`<span class="recurring-badge">${esc(x._freq||freqOf(x))}</span>`:''}</span></span><button class="tiny-btn" data-repair-toggle-done="${id}">${done?'Undo':'Done'}</button></div>`}).join('') || `<div class="empty-state">${esc(owner())}, no schedule items are loaded. Nothing is demanding you from this module right now.</div>`;
    renderSearchRepair();
  }
  function renderSearchRepair(){
    if(!$('#scheduleSearchResults'))return; const q=($('#scheduleSearch')?.value||'').trim().toLowerCase(); const win=$('#scheduleWindow')?.value||'week'; const start=today(), end=new Date(start); end.setDate(end.getDate()+(win==='month'?31:7)); const d=getProfileData();
    const all=[...instancesForRange(start,end), ...(d.tasks.tasks||[]).map(t=>Object.assign({_source:'task',_date:'recurring',_title:titleOf(t),_notes:noteOf(t),_reward:rewardOf(t),_freq:freqOf(t),_recurring:!!freqOf(t)},t))];
    const matched=(q?all.filter(x=>`${x._title} ${x._notes} ${x.category||''} ${x.section||''}`.toLowerCase().includes(q)):all.slice(0,24)).slice(0,80);
    $('#scheduleSearchResults').innerHTML=matched.map(x=>`<div class="data-card"><h3>${esc(x._title)} ${x._recurring?`<span class="recurring-badge">${esc(x._freq)}</span>`:''}</h3><div class="meta">${esc(x._source)} · ${esc(x._date||'')} · ${x._reward||0} copper</div><p>${esc(x._notes)}</p><button class="tiny-btn" data-repair-add-search="${esc(x._source+'::'+(x.id||x.sourceTaskId||x._title))}">Move into today</button></div>`).join('') || '<div class="empty-state">No matching support item was found in this window.</div>';
  }
  function renderStoreRepair(){
    if(!$('#aisleSelect')||!$('#itemGallery'))return; const d=getProfileData(); const st=d.store||{}; const aisles=st.aisles||[]; if(!aisles.length)return;
    if($('#aisleSelect').options.length<=1){$('#aisleSelect').innerHTML='<option value="">Choose an aisle...</option>'+aisles.map(a=>`<option value="${esc(a.id)}">${esc(a.label)}</option>`).join('');}
    $('#storeTitle') && ($('#storeTitle').textContent=st.storeName||cfg().storeName||'Store');
    $('#rewardProvider') && ($('#rewardProvider').textContent=`Reward provided by ${st.rewardProvidedBy||cfg().rewardProvidedBy||'your partner'}.`);
    drawStoreItems();
  }
  function drawStoreItems(){
    const d=getProfileData(), st=d.store||{}; const aisle=$('#aisleSelect')?.value||readLS(storeKey('selectedAisle'),''); const adult=!!$('#adultConfirm')?.checked; if($('#aisleSelect')&&$('#aisleSelect').value!==aisle)$('#aisleSelect').value=aisle;
    const items=aisle?(st.items||[]).filter(i=>(aisle==='all'||i.aisle===aisle)&&(!/adult|21/i.test(i.aisle+i.category+i.tags)||adult)):[];
    $('#itemGallery').innerHTML=!aisle?'<div class="empty-state">Choose an aisle when you are ready; the store stays quiet until then.</div>':items.length?items.map(item=>`<div class="item-card"><div class="item-emoji">${esc(item.emoji||'🛒')}</div><h3>${esc(item.name)}</h3><p>${esc(item.description||'')}</p><div class="meta">${Number(item.priceCopper||0)} copper · ${esc(item.aisle)}</div><div class="item-actions"><select data-qty="${esc(item.id)}">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select><button class="store-add" data-add-item="${esc(item.id)}">Add to cart</button></div></div>`).join(''):'<div class="empty-state">No matching rewards are showing for this aisle, or 21+ items are hidden.</div>';
  }
  function renderGamesRepair(){
    if(!$('#gameSelect'))return; const games=(getProfileData().games.games||[]); if(!games.length)return; const prev=$('#gameSelect').value;
    $('#gameSelect').innerHTML='<option value="">Choose a game...</option>'+games.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join(''); if(prev)$('#gameSelect').value=prev;
    if(!$('#gameSelect').dataset.repairBound){$('#gameSelect').dataset.repairBound='true'; $('#gameSelect').addEventListener('change',()=>{const g=games.find(x=>x.id===$('#gameSelect').value); const wrap=$('#gameFrameWrap'); if(!wrap)return; if(!g){wrap.innerHTML='<div class="game-frame-empty">Choose a game from the JSON-powered list.</div>'; return;} wrap.innerHTML=`<iframe title="${esc(g.name)}" src="${esc(g.path||('games/'+g.file))}"></iframe>`; $('#gameInfo')&&($('#gameInfo').textContent=`${g.name} · ${g.sizeMB||''} MB · ${g.launchMode||'iframe'}`);});}
  }
  function allDbtSkills(){const d=getProfileData(); const skills=[]; const groups=d.dbt.acronyms_and_mnemonics||{}; Object.keys(groups).forEach(k=>(groups[k]||[]).forEach(s=>skills.push(Object.assign({_category:k},s)))); (d.dbt.handouts||[]).forEach(s=>skills.push(Object.assign({_category:s.module||'Handouts'},s))); return skills;}
  function renderDbtPanel(mode, term){
    const root=$('#dbtPromptList'); if(!root)return; const skills=allDbtSkills(); const cats=Array.from(new Set(skills.map(s=>s._category||s.module||'DBT'))).slice(0,18);
    if(!root.dataset.repairReady){root.dataset.repairReady='true'; root.innerHTML=`<div class="dbt-skill-panel"><div class="notice">DBT skill cards stay quiet until Onyx suggests one, you search, or you choose a category.</div><div class="dbt-skill-controls"><input id="dbtSkillSearch" placeholder="Search DBT skill: STOP, TIPP, Wise Mind..."/><select id="dbtSkillCategory"><option value="">Choose category...</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select><button class="tiny-btn" id="dbtSkillClear" type="button">Clear</button></div><div class="dbt-skill-results is-empty" id="dbtSkillResults"><div class="empty-state">Ask Onyx for DBT help, search manually, or choose a DBT category.</div></div></div>`; $('#dbtSkillSearch')?.addEventListener('input',e=>renderDbtPanel('search',e.target.value)); $('#dbtSkillCategory')?.addEventListener('change',e=>renderDbtPanel('category',e.target.value)); $('#dbtSkillClear')?.addEventListener('click',()=>{root.dataset.repairReady=''; renderDbtPanel();}); return;}
    const results=$('#dbtSkillResults'); if(!results)return; let list=[]; const q=(term||'').toLowerCase(); if(mode==='search'&&q)list=skills.filter(s=>`${s.title_full||s.title||''} ${s.summary||''} ${(s.keywords||[]).join(' ')}`.toLowerCase().includes(q)); else if(mode==='category'&&term)list=skills.filter(s=>(s._category||s.module||'')===term); else if(mode==='onyx')list=skills.filter(s=>/stop|wise mind|tipp|check the facts|opposite action|dear man|self-soothe/i.test(`${s.title_full||s.title||''} ${s.summary||''}`)).slice(0,12);
    results.classList.toggle('is-empty',!list.length); results.innerHTML=list.length?list.slice(0,24).map(s=>`<article class="dbt-skill-card"><h3>${esc(s.title_full||s.title||'DBT skill')}</h3><p>${esc(s.summary||s.description||'Use this as a small support skill, not a homework assignment.')}</p><div class="meta">${esc(s._category||s.module||'DBT')}</div></article>`).join(''):'<div class="empty-state">No DBT skill cards are showing yet.</div>';
  }
  function diversifyMarquees(){
    const c=cfg(); const isJasper=profile()==='jasper';
    const common=['Be yourself; everyone else is already taken. — Oscar Wilde','Do the best you can until you know better. Then do better. — Maya Angelou','True nobility is being superior to your former self. — Ernest Hemingway','Stay afraid, but do it anyway. — Carrie Fisher','Growth must be chosen again and again. — Abraham Maslow','If there is no struggle, there is no progress. — Frederick Douglass','Permit yourself to change your mind when something is no longer working. — Nedra Glover Tawwab','Be not afraid of growing slowly; be afraid only of standing still.','Anyone can start from now and make a brand new ending. — Carl Bard','You put your arms around me and I’m home.','We’re not here for perfect, just messy and real.','Still breathing. Still here.','With every step, I find my way.'];
    const jasper=['People get built different. We just need to respect it. — Princess Bubblegum','Space to work out who to be matters. — Elliot Page','Your light turns my darkness into day.'];
    const william=['We’re all stories in the end. Just make it a good one. — The Doctor','Just because someone stumbles does not mean they are lost forever. — Charles Xavier','Hanging is not flying, but it is not the end.'];
    const pages=$$('.page-section'); pages.forEach((sec,i)=>{const span=$('.marquee span',sec); if(!span)return; const bank=[...(isJasper?jasper:william),...common]; const picks=[]; for(let n=0;n<5;n++)picks.push(bank[(i*3+n*5)%bank.length]); span.textContent='✦ '+picks.join(' ✦ ')+' ✦';});
  }
  function repairVisibleLanguage(){
    // Remove profile/menu uses of family-role names; Onyx may still say them directly inside chat responses.
    $$('body *').forEach(el=>{if(el.children.length||['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(el.tagName))return; let t=el.textContent; if(!t)return; let n=t.replace(/Papa's Best Friend Onyx Chat/g,'Onyx Support Chat').replace(/Momma Helper Onyx Chat/g,'Onyx Support Chat').replace(/Papa-protective judgment/g,'protective service-void judgment').replace(/good momma to all of the kitty babies/g,'gentle with all of the kitty babies').replace(/William \/ Papa/g,'William / Dino').replace(/Jasper \/ Momma/g,'Jasper / Squishy'); if(n!==t)el.textContent=n;});
  }
  function buildLoreCarousel(){
    $$('.onyx-lore-header').forEach(header=>{if(header.dataset.carouselReady)return; header.dataset.carouselReady='true'; const cards=$$('.onyx-lore-card',header); if(cards.length<2)return; const tabs=document.createElement('div'); tabs.className='onyx-lore-tabs'; cards.forEach((card,i)=>{const name=$('h2',card)?.textContent||`Lore ${i+1}`; const b=document.createElement('button'); b.type='button'; b.textContent=name; b.setAttribute('aria-selected',i===0?'true':'false'); b.addEventListener('click',()=>{cards[i].scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'}); $$('button',tabs).forEach((x,j)=>x.setAttribute('aria-selected',j===i?'true':'false'));}); tabs.appendChild(b);}); const grid=$('.onyx-lore-grid',header); header.insertBefore(tabs,grid);});
  }
  function injectOnyxPanelLore(){
    $$('.onyx-static-panel').forEach(panel=>{if(panel.dataset.loreReady)return; panel.dataset.loreReady='true'; const cards=['DBT words choose professor bowtie, not hungry face.','Hungry face is reserved for food, snacks, treats, meals, and body-fuel talk.','Onyx answers like a service animal with English: alert, protective, practical, and close.','Every answer should end near one reachable paw-sized step.']; let idx=0; const box=document.createElement('div'); box.className='onyx-repair-lore'; box.innerHTML=`<div class="onyx-repair-lore-card">${esc(cards[0])}</div><div class="onyx-repair-lore-controls"><button type="button">‹ lore</button><button type="button">lore ›</button></div>`; const show=()=>{$('.onyx-repair-lore-card',box).textContent=cards[idx];}; const [prev,next]=$$('button',box); prev.addEventListener('click',()=>{idx=(idx-1+cards.length)%cards.length;show();}); next.addEventListener('click',()=>{idx=(idx+1)%cards.length;show();}); panel.appendChild(box);});
  }
  function reopenBubbles(){
    document.addEventListener('click',ev=>{const bubble=ev.target.closest('.module.collapsed .module-bubble, .module.collapsed'); if(!bubble)return; const mod=bubble.closest('.module'); if(!mod||ev.target.closest('button,select,input,textarea,a'))return; mod.classList.remove('collapsed'); const page=mod.closest('.page-section')?.id||document.body.dataset.page||'home'; const key=storeKey('module',page,mod.dataset.moduleId||'module'); const saved=readLS(key,{}); saved.collapsed=false; writeLS(key,saved); setTimeout(packActivePage,60);},true);
  }
  function moduleWidth(mod){if(mod.classList.contains('profile-module'))return 250; if(mod.classList.contains('wide'))return 760; if(mod.classList.contains('phone-module'))return 390; if(mod.classList.contains('large'))return 500; return 360;}
  function packPage(sec){
    if(!sec||!matchMedia('(min-width:901px)').matches)return; const board=$('.page-board',sec); if(!board)return; const max=Math.max(920,board.clientWidth||1100)-28; let x=24,y=24,rowH=0; const gap=24;
    $$('.module',board).forEach(mod=>{if(mod.classList.contains('collapsed')){const w=86; if(x+w>max){x=24;y+=rowH+gap;rowH=0;} mod.style.left=x+'px'; mod.style.top=y+'px'; mod.style.setProperty('--x',x+'px'); mod.style.setProperty('--y',y+'px'); mod.classList.add('os-repair-positioned'); x+=w+gap; rowH=Math.max(rowH,86); return;}
      const w=Math.min(moduleWidth(mod),max-24); mod.style.width=w+'px'; if(x+w>max){x=24;y+=rowH+gap;rowH=0;} mod.style.left=x+'px'; mod.style.top=y+'px'; mod.style.setProperty('--x',x+'px'); mod.style.setProperty('--y',y+'px'); mod.classList.add('os-repair-positioned'); const h=Math.max(mod.offsetHeight||160, parseFloat(getComputedStyle(mod).minHeight)||120); rowH=Math.max(rowH,h); x+=w+gap;});
    board.style.minHeight=(y+rowH+80)+'px';
  }
  function packActivePage(){packPage($('.page-section.active')||$('#'+((String(location.hash||'#home').split('#').filter(Boolean).filter(h=>h!=='admin-editor').pop())||'home'))||$('#home'));}
  function injectGoogleCalendarBox(){
    const links=readLS(storeKey('links'),[]); const g=links.find(l=>/calendar\.google|google\.com\/calendar|calendar\.app\.google/i.test((l.url||'')+' '+(l.label||''))); const main=$('#calendarList')?.parentElement; if(!main)return; let box=$('#linkedGoogleCalendarEmbed'); if(!g){if(box)box.remove(); return;} if(!box){box=document.createElement('div'); box.id='linkedGoogleCalendarEmbed'; box.className='google-calendar-embed'; main.appendChild(box);} box.innerHTML=`<div class="notice"><strong>Linked Google Calendar</strong><br><span class="repair-notice">Static pages cannot read private Google events without Google permission, but this opens your saved calendar link here when Google allows embedding.</span><br><button class="tiny-btn" type="button" data-open-google-calendar>Show linked calendar</button> <a class="tiny-btn" target="_blank" rel="noopener" href="${esc(g.url)}">Open in Google Calendar</a></div>`;
  }
  function bootBasicMessengerFallback(){
    const root=$('#ourspace-messenger-root'); if(!root||$('.os-messenger',root))return; const me=profile()==='jasper'?'jasper':'william', other=me==='jasper'?'william':'jasper'; const key='ourspace.two-person.v2'; const state=readLS(key,{messages:[],channel:'home'}); const channels=['home','care','games','store','dbt','media','calls'];
    root.innerHTML=`<section class="os-messenger"><div class="notice"><strong>Two-person fallback messenger</strong><br>Local shared browser messenger for William and Jasper. Full messenger scripts did not mount, so this keeps text, channels, and export working.</div><div class="dbt-skill-controls"><select id="tcChan">${channels.map(c=>`<option ${state.channel===c?'selected':''}>${c}</option>`).join('')}</select><input id="tcText" placeholder="Send a message..."/><button class="tiny-btn" id="tcSend">Send</button><button class="tiny-btn" id="tcExport">Export</button></div><div class="data-list" id="tcLog"></div></section>`;
    function draw(){const chan=$('#tcChan').value; $('#tcLog').innerHTML=(state.messages||[]).filter(m=>m.channel===chan).map(m=>`<div class="data-card"><strong>${esc(m.author)}</strong> <span class="meta">${esc(new Date(m.at).toLocaleString())}</span><p>${esc(m.text)}</p></div>`).join('')||'<div class="empty-state">No messages in this channel yet.</div>';}
    $('#tcChan').addEventListener('change',()=>{state.channel=$('#tcChan').value; writeLS(key,state); draw();}); $('#tcSend').addEventListener('click',()=>{const input=$('#tcText'); const msg=input.value.trim(); if(!msg)return; state.messages.push({author:me==='jasper'?'Jasper / Squishy':'William / Dino',to:other,text:msg,channel:$('#tcChan').value,at:new Date().toISOString()}); input.value=''; writeLS(key,state); draw();}); $('#tcExport').addEventListener('click',()=>{const a=document.createElement('a'); a.href='data:application/json,'+encodeURIComponent(JSON.stringify(state,null,2)); a.download='ourspace-two-person-messenger.json'; a.click();}); draw();
  }
  function bindRepairEvents(){
    $('#calPrev')?.addEventListener('click',()=>{const d=cursorDate(),v=currentView(); if(v==='day')d.setDate(d.getDate()-1); else if(v==='week')d.setDate(d.getDate()-7); else d.setMonth(d.getMonth()-1); setCursor(d); setTimeout(renderCalendarRepair,0);},true);
    $('#calNext')?.addEventListener('click',()=>{const d=cursorDate(),v=currentView(); if(v==='day')d.setDate(d.getDate()+1); else if(v==='week')d.setDate(d.getDate()+7); else d.setMonth(d.getMonth()+1); setCursor(d); setTimeout(renderCalendarRepair,0);},true);
    $('#calToday')?.addEventListener('click',()=>{setCursor(today()); setTimeout(renderCalendarRepair,0);},true);
    $('#calendarView')?.addEventListener('change',()=>setTimeout(renderCalendarRepair,0),true);
    $('#scheduleSearch')?.addEventListener('input',()=>setTimeout(renderSearchRepair,0),true); $('#scheduleWindow')?.addEventListener('change',()=>setTimeout(renderSearchRepair,0),true);
    $('#aisleSelect')?.addEventListener('change',()=>{writeLS(storeKey('selectedAisle'),$('#aisleSelect').value); setTimeout(drawStoreItems,0);},true); $('#adultConfirm')?.addEventListener('change',()=>setTimeout(drawStoreItems,0),true);
    document.addEventListener('click',ev=>{const done=ev.target.closest('[data-repair-toggle-done]'); if(done){const k=storeKey('done',done.dataset.repairToggleDone+'::'+ymd(today())); writeLS(k,!readLS(k,false)); renderTodayRepair();}
      const add=ev.target.closest('[data-repair-add-today],[data-repair-add-search]'); if(add){const label=(add.closest('.data-card')?.querySelector('h3')?.textContent||'Added item').replace(/\s+(daily|weekly|monthly)\s*$/i,''); const saved=readLS(storeKey('todayAdditions'),[]); saved.push({id:'repair-added-'+Date.now(),time:'Any',title:label,category:'Added',rewardCopper:0,notes:'Moved in manually.'}); writeLS(storeKey('todayAdditions'),saved); renderTodayRepair();}
      if(ev.target.closest('[data-open-google-calendar]')){const links=readLS(storeKey('links'),[]); const g=links.find(l=>/calendar\.google|google\.com\/calendar|calendar\.app\.google/i.test((l.url||'')+' '+(l.label||''))); const box=$('#linkedGoogleCalendarEmbed'); if(g&&box)box.insertAdjacentHTML('beforeend',`<iframe title="Linked Google Calendar" src="${esc(g.url)}"></iframe>`);}
    },true);
    window.addEventListener('hashchange',()=>setTimeout(()=>{packActivePage(); injectOnyxPanelLore();},120)); window.addEventListener('resize',()=>setTimeout(packActivePage,160));
    window.addEventListener('onyx:message',ev=>{const t=(ev.detail?.userText||'')+' '+(ev.detail?.onyxReply||''); if(/dbt|wise mind|stop|tipp|dear man|opposite action|check the facts|skill/i.test(t))renderDbtPanel('onyx'); setTimeout(injectOnyxPanelLore,80);});
  }
  function run(){
    diversifyMarquees(); repairVisibleLanguage(); buildLoreCarousel(); renderCalendarRepair(); renderTodayRepair(); renderStoreRepair(); renderGamesRepair(); renderDbtPanel(); reopenBubbles(); bindRepairEvents(); setTimeout(bootBasicMessengerFallback,900); setTimeout(injectOnyxPanelLore,400); setTimeout(packActivePage,450); setTimeout(()=>{renderCalendarRepair(); renderTodayRepair(); renderStoreRepair(); renderGamesRepair(); packActivePage();},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run); else run();
})();


/* OurSpace compact packer + knowledge-backed fallback modules. */
(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfg=()=>{try{return JSON.parse($('#profile-config')?.textContent||'{}')}catch{return {}}};
  const siteProfile=()=>{const raw=((cfg().jsonProfile||cfg().dataProfile||cfg().profile||document.body.dataset.profile||'william')+'').toLowerCase(); return raw.includes('jasper')||raw.includes('squishy')||raw.includes('momma')?'jasper':'william';};
  const person=()=>siteProfile()==='jasper'?'Jasper':'William';
  const getJson=name=>window.OurSpaceGetJson?window.OurSpaceGetJson(name):((window.OurSpaceJsonBundle||{})[name]||null);
  const reward=item=>Number(item?.rewardCopper||item?.reward?.totalCopper||item?.cost?.totalCopper||item?.priceCopper||0);
  const title=item=>item?.title||item?.task||item?.name||item?.item||'Knowledge item';
  function data(){const p=siteProfile();return {tasks:getJson(`${p}/${p}_tasks.json`)||{},store:getJson(`${p}/${p}_store.json`)||{},sched:getJson(`${p}/${p}_schedule.json`)||{},cal:getJson(`${p}/${p}_calendar.json`)||{},games:getJson('games/games_manifest_merged.json')||{},dbt:getJson('dbt/dbt_skills_catalog.json')||{},ws:getJson('dbt/dbt_worksheets_catalog.json')||{},master:getJson('docs/ourspace_two_user_rewards_store_reference.json')||{},dis:getJson('docs/knowledge/disability/00_manifest.json')||{}};}
  function fillIfEmpty(sel, html){const el=$(sel); if(el && !el.textContent.trim()) el.innerHTML=html;}
  function renderKnowledgeFallbacks(){
    const d=data(), p=person();
    const taskCount=(d.tasks.tasks||[]).length, storeCount=(d.store.items||[]).length, gameCount=(d.games.games||[]).length, skillCount=(d.dbt.handouts||[]).length, wsCount=(d.ws.worksheets||[]).length;
    fillIfEmpty('#homeAbout', `<div class="notice"><strong>${esc(p)} knowledge base loaded.</strong><br>${taskCount} task/support items, ${storeCount} store rewards, ${gameCount} games, ${skillCount} DBT handouts, and ${wsCount} worksheet templates are available locally.</div>`);
    const cats={}; (d.tasks.tasks||[]).forEach(t=>{const k=t.category||t.section||'Support'; cats[k]=(cats[k]||0)+1;});
    const catHtml=Object.entries(cats).slice(0,8).map(([k,n])=>`<div class="data-card"><h3>${esc(k)}</h3><p>${n} local items available.</p></div>`).join('');
    fillIfEmpty('#homeTaskSummary', `<div class="data-list">${catHtml||'<div class="data-card"><h3>Tasks</h3><p>Task catalog is loaded and ready.</p></div>'}</div>`);
    const hobbies=(getJson(`${siteProfile()}/${siteProfile()}_hobby.json`)?.hobbies||getJson(`${siteProfile()}/${siteProfile()}_hobby.json`)?.items||[]).slice(0,8);
    fillIfEmpty('#hobbyList', (hobbies.length?hobbies:[{title:'Onyx check-in',notes:'Ask Onyx for one grounded next step.'},{title:'DBT skill search',notes:'Search by feeling, need, or category.'},{title:'Game decompression',notes:'Open the games list when play would help regulation.'}]).map(h=>`<div class="data-card"><h3>${esc(title(h))}</h3><p>${esc(h.notes||h.description||h.summary||'Local comfort option.')}</p></div>`).join(''));
    const today=(d.sched.defaultToday||[]).slice(0,6);
    fillIfEmpty('#homeTodayPreview', today.map(i=>`<div class="data-card"><h3>${esc(i.time||'Any')} · ${esc(title(i))}</h3><p>${esc(i.notes||i.category||'Schedule item from JSON.')}</p></div>`).join('')||'<div class="data-card"><h3>Schedule ready</h3><p>The schedule JSON is loaded.</p></div>');
    fillIfEmpty('#scheduleSearchResults', `<div class="data-card"><h3>Search loaded</h3><p>Type hydration, DBT, dishes, appointment, cats, store, or any support need to pull from ${taskCount} local items.</p></div>`);
    fillIfEmpty('#calendarList', `<div class="data-card"><h3>Calendar loaded</h3><p>${(d.cal.events||[]).length} JSON calendar items are available, including daily, weekly, and monthly respawn examples.</p></div>`);
    if($('#phoneScreen') && !$('#phoneScreen').textContent.trim()) $('#phoneScreen').innerHTML=`<div class="notice"><strong>Phone viewer ready.</strong><br>Add Google Calendar, Brev, Facebook, YouTube, or any support link under Profile + External Links, then open it here.</div>`;
    if($('#galleryGrid') && !$('#galleryGrid').textContent.trim()) $('#galleryGrid').innerHTML='<div class="notice">Upload comfort images here. The gallery stays local to this browser.</div>';
    if($('#youtubeEmbed') && !$('#youtubeEmbed').textContent.trim()) $('#youtubeEmbed').innerHTML='<div class="notice">Paste a YouTube link to create a comfort/embed card.</div>';
    if($('#audioList') && !$('#audioList').textContent.trim()) $('#audioList').innerHTML='<div class="notice">Upload MP3s for local audio comfort. Nothing is sent anywhere.</div>';
  }
  function visualWidth(mod){const base=mod.classList.contains('profile-module')?250:mod.classList.contains('wide')?760:mod.classList.contains('phone-module')?390:mod.classList.contains('large')?500:360; return base;}
  function compactPack(sec){ return; }
  function installCompact(){renderKnowledgeFallbacks(); setTimeout(()=>compactPack(),80); setTimeout(()=>{renderKnowledgeFallbacks();compactPack();},800); setTimeout(()=>compactPack(),1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCompact); else installCompact();
  window.OurSpaceCompactPack = compactPack;
  window.addEventListener('resize',()=>setTimeout(()=>compactPack(),80)); window.addEventListener('hashchange',()=>setTimeout(installCompact,120));
  document.addEventListener('click',ev=>{if(ev.target.closest('[data-collapse],.bubble-btn,.page-reset,.module.collapsed')) setTimeout(()=>compactPack(),140);},true);
})();
