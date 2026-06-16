(function(){
  'use strict';
  const SIZE_OPTIONS = ['25','50','75','100','125','130','150','175','200'];
  const DEFAULT_SIZE = '130';
  const LAYOUT_VERSION = 'module-layout-v8-default-130-snap-grid-full-page';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  function parseConfig(){try{return JSON.parse($('#profile-config')?.textContent || '{}');}catch{return {};}}
  const cfg = parseConfig();
  const dataProfile = cfg.dataProfile || cfg.profile || 'profile';
  const storeKey = (...parts) => ['ourspace', dataProfile, ...parts].join(':');
  const userPreferenceKey = () => storeKey('moduleUserPreference', 'saved');
  const GRID_SIZE = 24;
  const snap = (value) => Math.max(0, Math.round((Number(value) || 0) / GRID_SIZE) * GRID_SIZE);
  function expandBoardFor(mod, x, y){
    const board = mod.closest('.page-board');
    if(!board) return;
    const neededHeight = Math.ceil((y + mod.offsetHeight + GRID_SIZE * 4) / GRID_SIZE) * GRID_SIZE;
    const neededWidth = Math.ceil((x + mod.offsetWidth + GRID_SIZE * 4) / GRID_SIZE) * GRID_SIZE;
    if(neededHeight > board.offsetHeight) board.style.minHeight = neededHeight + 'px';
    if(neededWidth > board.scrollWidth) board.style.minWidth = neededWidth + 'px';
  }
  function pageOf(mod){return mod.closest('.page-section')?.id || document.body.dataset.page || 'home';}
  function stateKey(mod){return storeKey('module', pageOf(mod), mod.dataset.moduleId || 'module');}
  function readState(mod){try{return JSON.parse(localStorage.getItem(stateKey(mod)) || '{}') || {};}catch{return {};}}
  function writeState(mod, patch={}){try{localStorage.setItem(stateKey(mod), JSON.stringify(Object.assign({}, readState(mod), patch)));}catch(err){console.warn('Module state save failed', err);}}
  function moduleSnapshot(mod){
    return {
      x: snap(parseInt(mod.style.left || mod.dataset.x || '10', 10) || 0),
      y: snap(parseInt(mod.style.top || mod.dataset.y || '10', 10) || 0),
      collapsed: mod.classList.contains('collapsed'),
      size: mod.dataset.moduleSize || DEFAULT_SIZE,
      carousel: mod.classList.contains('os-carousel-on'),
      carouselSlide: currentSlide(mod)
    };
  }
  function allModuleStates(){
    const out = {};
    $$('.module[data-module-id]').forEach(mod=>{
      const key = pageOf(mod) + '::' + (mod.dataset.moduleId || 'module');
      out[key] = moduleSnapshot(mod);
    });
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
      window.OurSpaceCompactPack && setTimeout(()=>window.OurSpaceCompactPack(),120);
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
      $$('.module[data-module-id]').forEach(mod=>{
        mod.classList.remove('collapsed','os-carousel-on');
        applySize(mod, DEFAULT_SIZE);
        const x = snap(Number(mod.dataset.x || 10)), y = snap(Number(mod.dataset.y || 10));
        if(window.matchMedia('(min-width: 901px)').matches){
          mod.style.left=x+'px'; mod.style.top=y+'px'; mod.style.setProperty('--x',x+'px'); mod.style.setProperty('--y',y+'px'); expandBoardFor(mod,x,y);
        }
      });
      enhance();
      window.OurSpaceCompactPack && setTimeout(()=>window.OurSpaceCompactPack(),120);
      announceLayoutStatus('Reset modules to default.');
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
      $('.floating-nav .nav-bar')?.appendChild(node);
    }
    if(node){ node.textContent = text; setTimeout(()=>{ if(node.textContent===text) node.textContent=''; }, 3600); }
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
  function ensureModuleClass(){
    $$('[data-module-id]').forEach(mod=>{
      if(!mod.classList.contains('module')) mod.classList.add('module');
      if(String(mod.className).includes('modulelarge')) mod.className = String(mod.className).replace(/\bmodulelarge\b/g,'module large');
    });
  }
  function ensureZoomWrap(mod){
    const body = $('.module-body', mod);
    if(!body) return null;
    let wrap = $(':scope > .os-module-zoom-wrap', body);
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'os-module-zoom-wrap';
      const kids = Array.from(body.childNodes).filter(n => !(n.nodeType === 1 && n.classList.contains('os-module-zoom-wrap')));
      kids.forEach(n => wrap.appendChild(n));
      body.appendChild(wrap);
    }else{
      Array.from(body.childNodes).forEach(n => { if(n !== wrap) wrap.appendChild(n); });
    }
    return wrap;
  }
  function applySize(mod, size){
    const safe = SIZE_OPTIONS.includes(String(size)) ? String(size) : DEFAULT_SIZE;
    const f = Number(safe)/100;
    mod.dataset.moduleSize = safe;
    mod.style.setProperty('--module-scale', String(f));
    mod.style.setProperty('--module-zoom', String(f));
    const select = $('.os-module-size-select', mod);
    if(select) select.value = safe;
  }
  function addControls(mod){
    const actions = $('.module-actions', mod);
    if(!actions || actions.dataset.workshopControls === 'true') return;
    actions.dataset.workshopControls = 'true';
    const saved = readState(mod);
    const size = document.createElement('select');
    size.className = 'os-module-size-select';
    size.title = 'Zoom module';
    size.setAttribute('aria-label','Zoom module contents');
    SIZE_OPTIONS.forEach(v=>{const opt=document.createElement('option'); opt.value=v; opt.textContent=`${v}%`; size.append(opt);});
    size.addEventListener('pointerdown', ev=>ev.stopPropagation());
    size.addEventListener('change', ()=>{applySize(mod, size.value); writeState(mod, {size:size.value});});
    const prev = document.createElement('button'); prev.type='button'; prev.className='os-module-slide-btn'; prev.textContent='‹'; prev.title='Previous slide';
    const count = document.createElement('span'); count.className='os-module-slide-count';
    const next = document.createElement('button'); next.type='button'; next.className='os-module-slide-btn'; next.textContent='›'; next.title='Next slide';
    const carousel = document.createElement('button'); carousel.type='button'; carousel.className='os-module-carousel-btn'; carousel.textContent='Slides'; carousel.title='Toggle slide mode';
    [prev,next,carousel].forEach(btn=>btn.addEventListener('pointerdown',ev=>ev.stopPropagation()));
    carousel.addEventListener('click',()=>{prepareCarousel(mod); const on=!mod.classList.contains('os-carousel-on'); mod.classList.toggle('os-carousel-on',on); if(on) setSlide(mod, readState(mod).carouselSlide || 0); writeState(mod,{carousel:on,carouselSlide:currentSlide(mod)});});
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
  function currentSlide(mod){const slides=$$('.os-carousel-slide', mod); const idx=slides.findIndex(s=>s.classList.contains('os-active-slide')); return idx<0?0:idx;}
  function updateCount(mod){const slides=$$('.os-carousel-slide', mod); const count=$('.os-module-slide-count', mod); if(count) count.textContent=slides.length ? `${currentSlide(mod)+1}/${slides.length}` : '';}
  function setSlide(mod, index){
    const slides=$$('.os-carousel-slide', mod); if(!slides.length) return;
    const next=((Number(index)||0)%slides.length+slides.length)%slides.length;
    slides.forEach((s,i)=>s.classList.toggle('os-active-slide', i===next));
    updateCount(mod); writeState(mod,{carouselSlide:next});
  }
  function prepareCarousel(mod){
    const kids = slideChildren(mod);
    if(kids.length < 2){mod.classList.remove('os-carousel-ready','os-carousel-on'); updateCount(mod); return;}
    kids.forEach((child,i)=>{child.classList.add('os-carousel-slide'); if(!child.dataset.slideName){const h=child.querySelector?.('h1,h2,h3,h4,legend,label,strong')?.textContent?.trim(); child.dataset.slideName=h || `Slide ${i+1}`;}});
    mod.classList.add('os-carousel-ready');
    const saved=readState(mod);
    if(saved.carousel){mod.classList.add('os-carousel-on'); setSlide(mod, saved.carouselSlide || 0);} else {mod.classList.remove('os-carousel-on'); kids.forEach(k=>k.classList.remove('os-active-slide')); updateCount(mod);}
  }
  function applyDefaultPosition(mod){
    const saved = readState(mod);
    applySize(mod, saved.size || DEFAULT_SIZE);
    if(typeof saved.collapsed === 'boolean') mod.classList.toggle('collapsed', saved.collapsed);
    const x = snap(saved.x ?? Number(mod.dataset.x || 10));
    const y = snap(saved.y ?? Number(mod.dataset.y || 10));
    if(window.matchMedia('(min-width: 901px)').matches){
      mod.style.left = x + 'px'; mod.style.top = y + 'px'; expandBoardFor(mod,x,y);
      mod.style.setProperty('--x', x+'px'); mod.style.setProperty('--y', y+'px');
    }
  }
  function enableDrag(mod){
    const head = $('.module-head', mod); if(!head || head.dataset.uxDrag === 'true') return; head.dataset.uxDrag='true';
    head.addEventListener('pointerdown', (ev)=>{
      if(ev.target.closest('button,input,select,textarea,a,summary')) return;
      if(!window.matchMedia('(min-width: 901px)').matches) return;
      ev.preventDefault(); ev.stopImmediatePropagation();
      const board = mod.closest('.page-board'); if(!board) return;
      mod.classList.add('os-dragging');
      const startX=ev.clientX, startY=ev.clientY;
      const baseLeft=parseFloat(mod.style.left || getComputedStyle(mod).left) || Number(mod.dataset.x||10);
      const baseTop=parseFloat(mod.style.top || getComputedStyle(mod).top) || Number(mod.dataset.y||10);
      const maxLeft = () => Math.max(0, Math.max(board.scrollWidth, board.clientWidth) - Math.min(mod.offsetWidth, Math.max(board.scrollWidth, board.clientWidth)) - GRID_SIZE);
      const place = (x,y)=>{
        const nx = snap(Math.max(0, Math.min(maxLeft(), x)));
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
        writeState(mod,{x:pos.x,y:pos.y,collapsed:mod.classList.contains('collapsed'),size:mod.dataset.moduleSize||DEFAULT_SIZE,carousel:mod.classList.contains('os-carousel-on'),carouselSlide:currentSlide(mod)});
      };
      document.addEventListener('pointermove', move, true);
      document.addEventListener('pointerup', up, true);
    }, true);
    mod.addEventListener('click', ev=>{if(ev.target.closest('[data-collapse]')) setTimeout(()=>writeState(mod,{collapsed:mod.classList.contains('collapsed'),size:mod.dataset.moduleSize||DEFAULT_SIZE}),0);});
  }
  function installGlobalControls(){
    $$('.floating-nav .nav-bar').forEach(bar=>{
      const oldReset = $('.page-reset', bar);
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
    $$('.page-intro .page-reset').forEach(btn=>{
      if(btn.dataset.resetAliasBound === 'true') return;
      btn.dataset.resetAliasBound = 'true';
      btn.textContent = 'Reset modules';
      btn.addEventListener('click', ev=>{ ev.preventDefault(); resetToDefault(); });
    });
  }
  function enhance(){
    ensureModuleClass();
    $$('.module[data-module-id]').forEach(mod=>{ensureZoomWrap(mod); addControls(mod); applyDefaultPosition(mod); prepareCarousel(mod); enableDrag(mod);});
  }
  function watchBodies(){
    const observer = new MutationObserver(muts=>{
      const mods = new Set();
      muts.forEach(m=>{const mod=m.target.closest?.('.module[data-module-id]'); if(mod) mods.add(mod);});
      mods.forEach(mod=>{ensureZoomWrap(mod); prepareCarousel(mod);});
    });
    $$('.module .module-body').forEach(body=>observer.observe(body,{childList:true,subtree:false}));
  }
  function init(){
    resetOldLayouts(); installGlobalControls(); enhance(); watchBodies();
    document.addEventListener('change', ev=>{if(ev.target && ev.target.id==='pageSelect') setTimeout(enhance,50);});
    document.addEventListener('click', ev=>{if(ev.target.closest('.page-reset')) setTimeout(enhance,90);});
    window.OurSpaceModulePrefs = { save:saveUserPreference, restore:restoreUserPreference, resetDefault:resetToDefault, enhance:enhance };
    window.addEventListener('hashchange',()=>setTimeout(enhance,70));
    setTimeout(enhance,150); setTimeout(enhance,700);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
