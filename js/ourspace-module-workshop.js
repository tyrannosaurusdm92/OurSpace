/* OurSpace module workshop/admin layer.
   Keeps the old visual theme, adds invisible snap-grid positioning, module zoom/resize controls,
   user preferences, and #admin-editor default override export. */
(function(){
  'use strict';
  const SIZE_OPTIONS = ['25','50','75','100','125','130','150','175','200'];
  const DEFAULT_SIZE = '100';
  const LAYOUT_VERSION = 'module-layout-v10-no-current-transparent-grid';
  const GRID_SIZE = 24;
  const ADMIN_HASH = 'admin-editor';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
  const snap = (value) => Math.max(0, Math.round((Number(value) || 0) / GRID_SIZE) * GRID_SIZE);

  function parseConfig(){
    try{return JSON.parse($('#profile-config')?.textContent || '{}');}
    catch{return {};}
  }
  const cfg = parseConfig();
  const dataProfile = String(cfg.dataProfile || cfg.jsonProfile || cfg.profile || document.body?.dataset.profile || 'profile').toLowerCase();
  const storeKey = (...parts) => ['ourspace', dataProfile, ...parts].join(':');
  const userPreferenceKey = () => storeKey('moduleUserPreference', 'saved');

  function hashTokens(){
    return String(location.hash || '').split('#').map(x => x.trim()).filter(Boolean);
  }
  function isAdminMode(){
    return hashTokens().map(x => x.toLowerCase()).includes(ADMIN_HASH);
  }
  function pageTokenFromHash(){
    const tokens = hashTokens().filter(t => t.toLowerCase() !== ADMIN_HASH);
    const raw = tokens[tokens.length - 1] || 'home';
    const aliases = {
      'mobile-game':'mobile-games',
      'mobilegames':'mobile-games',
      'games':'mobile-games',
      'dbt-chat':'onyx-support',
      'chatbot':'onyx-support',
      'chat':'onyx-support',
      'today':'todays-schedule',
      'schedule':'todays-schedule',
      'diary':'dbt-diary-cards',
      'journal':'dbt-journaling'
    };
    return aliases[raw] || raw;
  }
  function currentMode(){
    return matchMedia('(max-width: 900px)').matches ? 'mobile' : 'desktop';
  }
  function moduleId(mod){
    if(!mod.dataset.moduleId){
      const page = pageOf(mod);
      if(mod.id) mod.dataset.moduleId = mod.id;
      else {
        const siblings = allModules(mod.closest('.page-board') || document);
        mod.dataset.moduleId = `module-${page}-${Math.max(0, siblings.indexOf(mod))}`;
        mod.id = mod.dataset.moduleId;
      }
    }
    return mod.dataset.moduleId;
  }
  function pageOf(mod){
    return mod.closest('.page-section')?.id || document.body.dataset.page || pageTokenFromHash() || 'home';
  }
  function moduleKey(mod){
    return pageOf(mod) + '::' + moduleId(mod);
  }
  function stateKey(mod){
    return storeKey('module', pageOf(mod), moduleId(mod));
  }
  function allModules(root=document){
    const mods = $$('.module, [data-module-id]', root).filter(el => el instanceof HTMLElement);
    return [...new Set(mods)];
  }
  function defaultOverrides(){
    return window.OurSpaceDefaultLayoutOverrides || {};
  }
  function overrideState(mod){
    const key = moduleKey(mod);
    const overrides = defaultOverrides();
    const mode = currentMode();
    return (overrides[mode]?.modules?.[key]) || (overrides.both?.modules?.[key]) || null;
  }
  function datasetDefaultState(mod){
    return {
      x: snap(mod.dataset.defaultX ?? mod.dataset.x ?? (parseInt(mod.style.left || '10', 10) || 10)),
      y: snap(mod.dataset.defaultY ?? mod.dataset.y ?? (parseInt(mod.style.top || '10', 10) || 10)),
      collapsed: isCollapsed(mod),
      size: mod.dataset.moduleSize || DEFAULT_SIZE,
      width: parseInt(mod.style.width || '', 10) || undefined,
      height: parseInt(mod.style.height || '', 10) || undefined,
      fontScale: mod.dataset.moduleFontScale || '100',
      buttonScale: mod.dataset.moduleButtonScale || '100',
      contentScale: mod.dataset.moduleContentScale || '100',
      carousel: mod.classList.contains('os-carousel-on'),
      carouselSlide: currentSlide(mod)
    };
  }
  function readState(mod){
    try{
      const raw = localStorage.getItem(stateKey(mod));
      if(raw) return Object.assign({}, datasetDefaultState(mod), JSON.parse(raw) || {});
    }catch{}
    return Object.assign({}, datasetDefaultState(mod), overrideState(mod) || {});
  }
  function writeState(mod, patch={}){
    try{
      localStorage.setItem(stateKey(mod), JSON.stringify(Object.assign({}, readState(mod), patch)));
    }catch(err){console.warn('Module state save failed', err);}
  }
  function isCollapsed(mod){return mod.classList.contains('collapsed') || mod.classList.contains('is-collapsed');}
  function setCollapsed(mod, value){mod.classList.toggle('collapsed', !!value); mod.classList.toggle('is-collapsed', !!value);}
  function headerOf(mod){return $('.module-head, .module-header, .card-header, .panel-header, [data-module-header]', mod);}
  function bodyOf(mod){return $('.module-body, .card-body, .panel-body, [data-module-body]', mod);}
  function actionsOf(mod){
    let actions = $('.module-actions', mod);
    const header = headerOf(mod);
    if(!actions && header){
      actions = document.createElement('div');
      actions.className = 'module-actions os-module-generated';
      header.appendChild(actions);
    }
    return actions;
  }
  function expandBoardFor(mod, x, y){
    const board = mod.closest('.page-board');
    if(!board) return;
    const neededHeight = Math.ceil((y + mod.offsetHeight + GRID_SIZE * 5) / GRID_SIZE) * GRID_SIZE;
    const neededWidth = Math.ceil((x + mod.offsetWidth + GRID_SIZE * 5) / GRID_SIZE) * GRID_SIZE;
    if(neededHeight > board.offsetHeight) board.style.minHeight = neededHeight + 'px';
    if(neededWidth > board.scrollWidth) board.style.minWidth = neededWidth + 'px';
  }
  function ensureModuleClass(){
    allModules().forEach(mod=>{
      if(!mod.classList.contains('module')) mod.classList.add('module');
      if(String(mod.className).includes('modulelarge')) mod.className = String(mod.className).replace(/\bmodulelarge\b/g,'module large');
      moduleId(mod);
    });
  }
  function ensureZoomWrap(mod){
    const body = bodyOf(mod);
    if(!body) return null;
    let wrap = $(':scope > .os-module-zoom-wrap', body);
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'os-module-zoom-wrap';
      const kids = Array.from(body.childNodes).filter(n => !(n.nodeType === 1 && (n.classList.contains('os-module-zoom-wrap') || n.classList.contains('os-module-generated'))));
      kids.forEach(n => wrap.appendChild(n));
      body.appendChild(wrap);
    }else{
      Array.from(body.childNodes).forEach(n => { if(n !== wrap && !(n.nodeType === 1 && n.classList.contains('os-module-generated'))) wrap.appendChild(n); });
    }
    return wrap;
  }
  function applySize(mod, size){
    const safe = SIZE_OPTIONS.includes(String(size)) ? String(size) : DEFAULT_SIZE;
    const f = Number(safe) / 100;
    mod.dataset.moduleSize = safe;
    mod.style.setProperty('--module-scale', String(f));
    mod.style.setProperty('--module-zoom', String(f));
    const select = $('.os-module-size-select', mod);
    if(select) select.value = safe;
  }
  function applyFineScales(mod, state){
    const fontScale = String(clamp(state.fontScale ?? 100, 50, 250));
    const buttonScale = String(clamp(state.buttonScale ?? 100, 50, 250));
    const contentScale = String(clamp(state.contentScale ?? 100, 50, 250));
    mod.dataset.moduleFontScale = fontScale;
    mod.dataset.moduleButtonScale = buttonScale;
    mod.dataset.moduleContentScale = contentScale;
    mod.style.setProperty('--module-font-scale', String(Number(fontScale)/100));
    mod.style.setProperty('--module-button-scale', String(Number(buttonScale)/100));
    mod.style.setProperty('--module-content-scale', String(Number(contentScale)/100));
    [['font',fontScale],['button',buttonScale],['content',contentScale]].forEach(([name,value])=>{
      const input = $(`.os-admin-${name}-scale`, mod);
      if(input) input.value = value;
    });
  }
  function applyDimensions(mod, state){
    if(!isCollapsed(mod)){
      if(state.width) mod.style.width = Math.max(120, Number(state.width)) + 'px';
      if(state.height) mod.style.height = Math.max(100, Number(state.height)) + 'px';
    }
    const wi = $('.os-admin-width', mod), hi = $('.os-admin-height', mod);
    if(wi) wi.value = Math.round(mod.getBoundingClientRect().width || Number(state.width) || 0);
    if(hi) hi.value = Math.round(mod.getBoundingClientRect().height || Number(state.height) || 0);
  }
  function applyPosition(mod, state){
    if(matchMedia('(min-width: 901px)').matches){
      const x = snap(state.x ?? mod.dataset.defaultX ?? mod.dataset.x ?? 10);
      const y = snap(state.y ?? mod.dataset.defaultY ?? mod.dataset.y ?? 10);
      mod.style.left = x + 'px';
      mod.style.top = y + 'px';
      mod.style.setProperty('--x', x + 'px');
      mod.style.setProperty('--y', y + 'px');
      expandBoardFor(mod, x, y);
    }else{
      mod.style.removeProperty('left');
      mod.style.removeProperty('top');
    }
  }
  function applyState(mod, state){
    applySize(mod, state.size || DEFAULT_SIZE);
    applyFineScales(mod, state);
    setCollapsed(mod, !!state.collapsed);
    applyDimensions(mod, state);
    applyPosition(mod, state);
    if(state.carousel){mod.classList.add('os-carousel-on'); setSlide(mod, state.carouselSlide || 0, false);} 
  }
  function moduleSnapshot(mod){
    const rect = mod.getBoundingClientRect();
    return {
      x: snap(parseInt(mod.style.left || mod.dataset.x || '10', 10) || 0),
      y: snap(parseInt(mod.style.top || mod.dataset.y || '10', 10) || 0),
      width: Math.round(rect.width || mod.offsetWidth || 0),
      height: Math.round(rect.height || mod.offsetHeight || 0),
      collapsed: isCollapsed(mod),
      size: mod.dataset.moduleSize || DEFAULT_SIZE,
      fontScale: mod.dataset.moduleFontScale || '100',
      buttonScale: mod.dataset.moduleButtonScale || '100',
      contentScale: mod.dataset.moduleContentScale || '100',
      carousel: mod.classList.contains('os-carousel-on'),
      carouselSlide: currentSlide(mod)
    };
  }
  function allModuleStates(){
    const out = {};
    allModules().forEach(mod=>{out[moduleKey(mod)] = moduleSnapshot(mod);});
    return out;
  }
  function saveUserPreference(){
    try{
      localStorage.setItem(userPreferenceKey(), JSON.stringify({version:LAYOUT_VERSION, savedAt:new Date().toISOString(), modules:allModuleStates()}));
      announceLayoutStatus('Saved module user preference.');
      return true;
    }catch(err){
      console.warn('Could not save module user preference', err);
      announceLayoutStatus('Could not save module user preference in this browser.');
      return false;
    }
  }
  function clearCurrentLayout(){
    const prefix = ['ourspace', dataProfile, 'module'].join(':') + ':';
    Object.keys(localStorage).forEach(k => { if(k.startsWith(prefix)) localStorage.removeItem(k); });
  }
  function restoreUserPreference(){
    try{
      const saved = JSON.parse(localStorage.getItem(userPreferenceKey()) || '{}');
      const modules = saved && saved.modules || {};
      if(!Object.keys(modules).length){ announceLayoutStatus('No saved module user preference yet.'); return false; }
      clearCurrentLayout();
      Object.entries(modules).forEach(([key,state])=>{
        const parts = key.split('::');
        if(parts.length < 2) return;
        localStorage.setItem(storeKey('module', parts[0], parts.slice(1).join('::')), JSON.stringify(state || {}));
      });
      enhance();
      announceLayoutStatus('Restored saved module user preference.');
      return true;
    }catch(err){
      console.warn('Could not restore module user preference', err);
      announceLayoutStatus('Could not restore module user preference.');
      return false;
    }
  }
  function resetToDefault(){
    try{
      clearCurrentLayout();
      allModules().forEach(mod=>{
        const state = Object.assign({}, datasetDefaultState(mod), overrideState(mod) || {}, {collapsed:false});
        applyState(mod, state);
      });
      enhance();
      announceLayoutStatus('Reset modules to default override/default layout.');
      return true;
    }catch(err){
      console.warn('Could not reset modules', err);
      announceLayoutStatus('Could not reset modules.');
      return false;
    }
  }
  function announceLayoutStatus(text){
    let node = $('.os-module-layout-status');
    if(!node){
      node = document.createElement('span');
      node.className = 'os-module-layout-status';
      node.setAttribute('role','status');
      node.setAttribute('aria-live','polite');
      ($('.floating-nav .nav-bar') || $('#ourspace-global-dropdown-nav .osg-bar') || document.body).appendChild(node);
    }
    if(node){ node.textContent = text; setTimeout(()=>{ if(node.textContent===text) node.textContent=''; }, 4200); }
  }
  function resetOldLayouts(){
    const versionKey = storeKey('moduleLayoutVersion');
    try{
      if(localStorage.getItem(versionKey) === LAYOUT_VERSION) return;
      const prefix = ['ourspace', dataProfile, 'module'].join(':') + ':';
      Object.keys(localStorage).forEach(k => { if(k.startsWith(prefix)) localStorage.removeItem(k); });
      localStorage.setItem(versionKey, LAYOUT_VERSION);
    }catch(err){console.warn('Module layout reset skipped', err);}
  }

  function addControls(mod){
    const actions = actionsOf(mod);
    if(!actions || actions.dataset.workshopControls === 'true') return;
    actions.dataset.workshopControls = 'true';
    const saved = readState(mod);
    const size = document.createElement('select');
    size.className = 'os-module-size-select';
    size.title = 'Zoom module';
    size.setAttribute('aria-label','Zoom module contents');
    SIZE_OPTIONS.forEach(v=>{const opt=document.createElement('option'); opt.value=v; opt.textContent=`${v}%${v===DEFAULT_SIZE?' default':''}`; size.append(opt);});
    size.addEventListener('pointerdown', ev=>ev.stopPropagation());
    size.addEventListener('change', ()=>{applySize(mod, size.value); writeState(mod, {size:size.value}); updateAdminDimensionInputs(mod);});
    const prev = document.createElement('button'); prev.type='button'; prev.className='os-module-slide-btn'; prev.textContent='‹'; prev.title='Previous slide';
    const count = document.createElement('span'); count.className='os-module-slide-count';
    const next = document.createElement('button'); next.type='button'; next.className='os-module-slide-btn'; next.textContent='›'; next.title='Next slide';
    const carousel = document.createElement('button'); carousel.type='button'; carousel.className='os-module-carousel-btn'; carousel.textContent='Slides'; carousel.title='Toggle slide mode';
    [prev,next,carousel].forEach(btn=>btn.addEventListener('pointerdown',ev=>ev.stopPropagation()));
    carousel.addEventListener('click',()=>{
      prepareCarousel(mod);
      const on = !mod.classList.contains('os-carousel-on');
      mod.classList.toggle('os-carousel-on', on);
      if(on) setSlide(mod, readState(mod).carouselSlide || 0);
      writeState(mod,{carousel:on,carouselSlide:currentSlide(mod)});
    });
    prev.addEventListener('click',()=>setSlide(mod,currentSlide(mod)-1));
    next.addEventListener('click',()=>setSlide(mod,currentSlide(mod)+1));
    actions.prepend(carousel); actions.prepend(next); actions.prepend(count); actions.prepend(prev); actions.prepend(size);
    applySize(mod, saved.size || DEFAULT_SIZE);
  }
  function slideChildren(mod){
    const wrap = ensureZoomWrap(mod);
    if(!wrap) return [];
    return Array.from(wrap.children).filter(el => !el.classList.contains('module-bubble') && !el.classList.contains('os-module-generated'));
  }
  function currentSlide(mod){
    const slides=$$('.os-carousel-slide', mod);
    const idx=slides.findIndex(s=>s.classList.contains('os-active-slide'));
    return idx<0?0:idx;
  }
  function updateCount(mod){
    const slides=$$('.os-carousel-slide', mod);
    const count=$('.os-module-slide-count', mod);
    if(count) count.textContent=slides.length ? `${currentSlide(mod)+1}/${slides.length}` : '';
  }
  function setSlide(mod, index, persist=true){
    const slides=$$('.os-carousel-slide', mod); if(!slides.length) return;
    const next=((Number(index)||0)%slides.length+slides.length)%slides.length;
    slides.forEach((s,i)=>s.classList.toggle('os-active-slide', i===next));
    updateCount(mod);
    if(persist) writeState(mod,{carouselSlide:next});
  }
  function prepareCarousel(mod){
    const kids = slideChildren(mod);
    if(kids.length < 2){mod.classList.remove('os-carousel-ready','os-carousel-on'); updateCount(mod); return;}
    kids.forEach((child,i)=>{
      child.classList.add('os-carousel-slide');
      if(!child.dataset.slideName){
        const h=child.querySelector?.('h1,h2,h3,h4,legend,label,strong')?.textContent?.trim();
        child.dataset.slideName=h || `Slide ${i+1}`;
      }
    });
    mod.classList.add('os-carousel-ready');
    const saved=readState(mod);
    if(saved.carousel){mod.classList.add('os-carousel-on'); setSlide(mod, saved.carouselSlide || 0, false);} 
    else {mod.classList.remove('os-carousel-on'); kids.forEach(k=>k.classList.remove('os-active-slide')); updateCount(mod);}
  }
  function enableDrag(mod){
    const head = headerOf(mod); if(!head || head.dataset.uxDrag === 'true') return; head.dataset.uxDrag='true';
    head.addEventListener('pointerdown', (ev)=>{
      if(ev.target.closest('button,input,select,textarea,a,summary,label')) return;
      if(!matchMedia('(min-width: 901px)').matches) return;
      ev.preventDefault(); ev.stopImmediatePropagation();
      const board = mod.closest('.page-board'); if(!board) return;
      mod.classList.add('os-dragging');
      const startX=ev.clientX, startY=ev.clientY;
      const baseLeft=parseFloat(mod.style.left || getComputedStyle(mod).left) || Number(mod.dataset.x||10);
      const baseTop=parseFloat(mod.style.top || getComputedStyle(mod).top) || Number(mod.dataset.y||10);
      const place = (x,y)=>{
        const boardWidth = Math.max(board.scrollWidth, board.clientWidth, window.innerWidth);
        const maxLeft = Math.max(0, boardWidth - Math.min(mod.offsetWidth, boardWidth) - GRID_SIZE);
        const nx = snap(Math.max(0, Math.min(maxLeft, x)));
        const ny = snap(Math.max(0, y));
        expandBoardFor(mod,nx,ny);
        mod.style.left = nx + 'px'; mod.style.top = ny + 'px';
        mod.style.setProperty('--x', nx+'px'); mod.style.setProperty('--y', ny+'px');
        return {x:nx,y:ny};
      };
      const move = (e)=>{ place(baseLeft + e.clientX - startX, baseTop + e.clientY - startY); };
      const up = ()=>{
        document.removeEventListener('pointermove', move, true);
        document.removeEventListener('pointerup', up, true);
        mod.classList.remove('os-dragging');
        const pos = place(parseInt(mod.style.left)||0, parseInt(mod.style.top)||0);
        writeState(mod,Object.assign(moduleSnapshot(mod),{x:pos.x,y:pos.y}));
        updateAdminDimensionInputs(mod);
      };
      document.addEventListener('pointermove', move, true);
      document.addEventListener('pointerup', up, true);
    }, true);
    mod.addEventListener('click', ev=>{
      if(ev.target.closest('[data-collapse],[data-collapse-module]')) setTimeout(()=>{setCollapsed(mod,isCollapsed(mod)); writeState(mod,moduleSnapshot(mod));},0);
    });
    mod.addEventListener('pointerup',()=>{ if(isAdminMode()) setTimeout(()=>writeState(mod,moduleSnapshot(mod)),0); }, true);
  }

  function installGlobalControls(){
    const bars = $$('.floating-nav .nav-bar, #ourspace-global-dropdown-nav .osg-bar');
    bars.forEach(bar=>{
      const oldReset = $('.page-reset:not(.os-module-save-pref)', bar);
      if(oldReset && oldReset.tagName !== 'SELECT' && oldReset.dataset.convertedToSelect !== 'true'){
        const select = document.createElement('select');
        select.className = oldReset.className + ' os-module-reset-select';
        select.setAttribute('aria-label','Reset modules');
        select.innerHTML = '<option value="">Reset modules…</option><option value="default">Default</option><option value="user">User preference</option>';
        oldReset.replaceWith(select);
      }
      let resetSelect = $('.os-module-reset-select', bar);
      if(resetSelect && resetSelect.dataset.bound !== 'true'){
        resetSelect.dataset.bound = 'true';
        resetSelect.addEventListener('pointerdown', ev=>ev.stopPropagation());
        resetSelect.addEventListener('change', ()=>{
          if(resetSelect.value === 'default') resetToDefault();
          if(resetSelect.value === 'user') restoreUserPreference();
          resetSelect.value = '';
        });
      }
      if(!$('.os-module-save-pref', bar)){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='page-reset os-module-save-pref';
        btn.textContent='Save module user preference';
        btn.title='Save current module sizes, positions, collapsed states, and carousel slides';
        btn.addEventListener('pointerdown', ev=>ev.stopPropagation());
        btn.addEventListener('click', saveUserPreference);
        resetSelect ? resetSelect.insertAdjacentElement('afterend', btn) : bar.appendChild(btn);
      }
    });
    $$('.page-intro .page-reset, .page-hero [data-reset-page]').forEach(btn=>{
      if(btn.dataset.resetAliasBound === 'true') return;
      btn.dataset.resetAliasBound = 'true';
      btn.addEventListener('click', ev=>{ ev.preventDefault(); resetToDefault(); });
    });
  }

  function makeNumberControl(label, className, min, max, value, onInput){
    const wrap = document.createElement('label');
    wrap.className = 'os-admin-field';
    const span = document.createElement('span'); span.textContent = label;
    const input = document.createElement('input');
    input.type='number'; input.min=String(min); input.max=String(max); input.step='1'; input.value=String(value);
    input.className = className;
    input.addEventListener('pointerdown', ev=>ev.stopPropagation());
    input.addEventListener('input', ()=>onInput(input.value));
    wrap.append(span,input);
    return wrap;
  }
  function updateAdminDimensionInputs(mod){
    const rect=mod.getBoundingClientRect();
    const wi=$('.os-admin-width',mod), hi=$('.os-admin-height',mod);
    if(wi) wi.value=String(Math.round(rect.width));
    if(hi) hi.value=String(Math.round(rect.height));
  }
  function addAdminControls(mod){
    if(!isAdminMode()) return;
    if($('.os-module-admin-controls', mod)) return;
    const body = bodyOf(mod) || mod;
    const state = readState(mod);
    const panel = document.createElement('details');
    panel.className = 'os-module-admin-controls os-module-generated';
    panel.innerHTML = '<summary>Admin sizing</summary>';
    const grid = document.createElement('div');
    grid.className = 'os-module-admin-grid';
    grid.append(
      makeNumberControl('Font %','os-admin-font-scale',50,250,state.fontScale||100,(value)=>{applyFineScales(mod,Object.assign(readState(mod),{fontScale:value})); writeState(mod,{fontScale:String(clamp(value,50,250))});}),
      makeNumberControl('Buttons %','os-admin-button-scale',50,250,state.buttonScale||100,(value)=>{applyFineScales(mod,Object.assign(readState(mod),{buttonScale:value})); writeState(mod,{buttonScale:String(clamp(value,50,250))});}),
      makeNumberControl('Content %','os-admin-content-scale',50,250,state.contentScale||100,(value)=>{applyFineScales(mod,Object.assign(readState(mod),{contentScale:value})); writeState(mod,{contentScale:String(clamp(value,50,250))});}),
      makeNumberControl('Width px','os-admin-width',120,2400,Math.round(mod.getBoundingClientRect().width||state.width||360),(value)=>{mod.style.width=Math.max(120,Number(value)||120)+'px'; writeState(mod,{width:Math.round(mod.getBoundingClientRect().width)});}),
      makeNumberControl('Height px','os-admin-height',100,2400,Math.round(mod.getBoundingClientRect().height||state.height||180),(value)=>{mod.style.height=Math.max(100,Number(value)||100)+'px'; writeState(mod,{height:Math.round(mod.getBoundingClientRect().height)});})
    );
    const save = document.createElement('button');
    save.type='button'; save.textContent='Save this module'; save.className='os-admin-save-module';
    save.addEventListener('pointerdown', ev=>ev.stopPropagation());
    save.addEventListener('click',()=>{writeState(mod,moduleSnapshot(mod)); announceLayoutStatus(`Saved ${moduleId(mod)} settings.`);});
    grid.append(save);
    panel.append(grid);
    body.prepend(panel);
  }
  function applyAdminMode(){
    document.body.classList.toggle('os-admin-editor', isAdminMode());
    document.body.classList.add('os-invisible-grid-ready');
    const panel = installAdminPanel();
    if(panel) panel.hidden = !isAdminMode();
    if(isAdminMode()) allModules().forEach(addAdminControls);
  }
  function installAdminPanel(){
    let panel = $('#os-admin-editor-panel');
    if(panel) return panel;
    panel = document.createElement('section');
    panel.id = 'os-admin-editor-panel';
    panel.className = 'os-admin-editor-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <strong>OurSpace admin editor</strong>
      <span>Drag modules, resize them, tune each module, then export defaults.</span>
      <div class="os-admin-editor-row">
        <button type="button" data-os-export-default="desktop">Export default desktop override</button>
        <button type="button" data-os-export-default="mobile">Export default mobile override</button>
        <button type="button" data-os-export-default="both">Export both defaults</button>
        <button type="button" data-os-clear-local-layout>Clear local layout</button>
      </div>`;
    document.body.appendChild(panel);
    panel.addEventListener('pointerdown', ev=>ev.stopPropagation());
    panel.addEventListener('click', ev=>{
      const exportBtn = ev.target.closest('[data-os-export-default]');
      if(exportBtn) exportOverrideZip(exportBtn.dataset.osExportDefault);
      if(ev.target.closest('[data-os-clear-local-layout]')){ clearCurrentLayout(); enhance(); announceLayoutStatus('Local module layout cleared.'); }
    });
    return panel;
  }

  function crc32(bytes){
    if(!crc32.table){
      const table = new Uint32Array(256);
      for(let i=0;i<256;i++){
        let c=i;
        for(let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i]=c>>>0;
      }
      crc32.table = table;
    }
    let c = 0xFFFFFFFF;
    for(let i=0;i<bytes.length;i++) c = crc32.table[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function u16(n){const b=new Uint8Array(2); new DataView(b.buffer).setUint16(0,n,true); return b;}
  function u32(n){const b=new Uint8Array(4); new DataView(b.buffer).setUint32(0,n>>>0,true); return b;}
  function strBytes(s){return new TextEncoder().encode(s);}
  function dosTimeDate(date=new Date()){
    const time = (date.getHours()<<11) | (date.getMinutes()<<5) | Math.floor(date.getSeconds()/2);
    const day = (date.getFullYear()-1980)<<9 | ((date.getMonth()+1)<<5) | date.getDate();
    return {time, day};
  }
  function zipStore(files){
    const chunks=[], central=[];
    let offset=0;
    const stamp=dosTimeDate();
    files.forEach(file=>{
      const nameBytes=strBytes(file.name.replace(/^\/+/,''));
      const dataBytes=file.bytes || strBytes(file.text || '');
      const crc=crc32(dataBytes);
      const localParts=[u32(0x04034b50),u16(20),u16(0),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),nameBytes,dataBytes];
      const localSize=localParts.reduce((n,p)=>n+p.length,0);
      chunks.push(...localParts);
      const centralParts=[u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(dataBytes.length),u32(dataBytes.length),u16(nameBytes.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nameBytes];
      central.push(...centralParts);
      offset += localSize;
    });
    const centralOffset=offset;
    const centralSize=central.reduce((n,p)=>n+p.length,0);
    const eocd=[u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralSize),u32(centralOffset),u16(0)];
    return new Blob([...chunks,...central,...eocd],{type:'application/zip'});
  }
  function downloadBlob(blob, filename){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},1500);
  }
  function overrideJs(mode, snapshot){
    return `/* OurSpace ${mode} default layout override. Generated from #admin-editor. */\n(function(){\n  window.OurSpaceDefaultLayoutOverrides = window.OurSpaceDefaultLayoutOverrides || {};\n  window.OurSpaceDefaultLayoutOverrides[${JSON.stringify(mode)}] = ${JSON.stringify(snapshot,null,2)};\n  window.dispatchEvent(new CustomEvent('ourspace:default-layout-overrides-loaded',{detail:{mode:${JSON.stringify(mode)}}}));\n})();\n`;
  }
  function overrideCss(mode, snapshot){
    return `/* OurSpace ${mode} default module override.\n   The layout data lives in ../js/ourspace-default-${mode}-override.js.\n   Keep this CSS file beside the exported JS so the override folder contains both css and js. */\n:root{--os-${mode}-default-override-exported-at:${JSON.stringify(snapshot.exportedAt)};}\n`;
  }
  function readme(mode){
    return `OurSpace ${mode} default override\n\nGenerated from #admin-editor.\nUnzip this folder over your GitHub OurSpace folder. The main ourspace-module-workshop.js automatically tries to load the generated override JS from the same js folder.\n\nUse the public site normally without #admin-editor; the editor/export controls stay hidden.\nUse #admin-editor#mobile-games or #admin-editor#mobile-game for the mobile games page while editing.\n`;
  }
  function snapshotForMode(mode){
    return {version:LAYOUT_VERSION, mode, profile:dataProfile, exportedAt:new Date().toISOString(), gridSize:GRID_SIZE, modules:allModuleStates()};
  }
  function exportOverrideZip(mode){
    const modes = mode === 'both' ? ['desktop','mobile'] : [mode];
    const files=[];
    modes.forEach(m=>{
      const snap=snapshotForMode(m);
      files.push({name:`OurSpace/js/ourspace-default-${m}-override.js`, text:overrideJs(m,snap)});
      files.push({name:`OurSpace/css/ourspace-default-${m}-override.css`, text:overrideCss(m,snap)});
      files.push({name:`OurSpace/README-admin-${m}-default-override.txt`, text:readme(m)});
    });
    downloadBlob(zipStore(files), `OurSpace_default_${mode}_override.zip`);
    announceLayoutStatus(`Exported ${mode} override zip.`);
  }

  function loadOptionalDefaultOverrides(){
    const script = document.currentScript;
    if(!script || !script.src) return Promise.resolve();
    const base = new URL('.', script.src);
    const loads = ['desktop','mobile'].map(mode => new Promise(resolve=>{
      if(defaultOverrides()[mode]) return resolve();
      const s=document.createElement('script');
      s.src=new URL(`ourspace-default-${mode}-override.js`, base).href;
      s.async=false;
      s.onload=()=>resolve();
      s.onerror=()=>resolve();
      document.head.appendChild(s);
    }));
    return Promise.allSettled(loads);
  }

  function enhance(){
    ensureModuleClass();
    allModules().forEach(mod=>{
      ensureZoomWrap(mod);
      addControls(mod);
      prepareCarousel(mod);
      applyState(mod, readState(mod));
      enableDrag(mod);
      if(isAdminMode()) addAdminControls(mod);
    });
    applyAdminMode();
  }
  function watchBodies(){
    const observer = new MutationObserver(muts=>{
      const mods = new Set();
      muts.forEach(m=>{const mod=m.target.closest?.('.module,[data-module-id]'); if(mod) mods.add(mod);});
      mods.forEach(mod=>{ensureZoomWrap(mod); prepareCarousel(mod); if(isAdminMode()) addAdminControls(mod);});
    });
    allModules().forEach(mod=>{const body=bodyOf(mod); if(body) observer.observe(body,{childList:true,subtree:false});});
  }
  async function init(){
    document.body.classList.add('os-invisible-grid-ready');
    await loadOptionalDefaultOverrides();
    resetOldLayouts();
    installGlobalControls();
    enhance();
    watchBodies();
    document.addEventListener('change', ev=>{if(ev.target && (ev.target.id==='pageSelect'||ev.target.id==='osg-page-select')) setTimeout(enhance,70);});
    document.addEventListener('click', ev=>{if(ev.target.closest('.page-reset,[data-reset-page],[data-collapse],[data-collapse-module]')) setTimeout(enhance,110);});
    window.OurSpaceModulePrefs = { save:saveUserPreference, restore:restoreUserPreference, resetDefault:resetToDefault, enhance:enhance, exportDefault:exportOverrideZip };
    window.addEventListener('hashchange',()=>{applyAdminMode(); setTimeout(enhance,90);});
    window.addEventListener('resize',()=>setTimeout(enhance,180));
    window.addEventListener('ourspace:default-layout-overrides-loaded',()=>setTimeout(enhance,80));
    setTimeout(enhance,150); setTimeout(enhance,700); setTimeout(enhance,1500);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
