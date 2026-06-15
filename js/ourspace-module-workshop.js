(function(){
  'use strict';
  const SIZE_OPTIONS = ['25','50','75','100'];
  const DEFAULT_SIZE = '100';
  const LAYOUT_VERSION = 'chatbot-layout-v3-zoom-personalized';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  function parseConfig(){
    try { return JSON.parse($('#profile-config')?.textContent || '{}'); }
    catch { return {}; }
  }
  const cfg = parseConfig();
  const dataProfile = cfg.dataProfile || cfg.profile || 'profile';
  const storeKey = (...parts) => ['ourspace', dataProfile, ...parts].join(':');
  function maybeResetOldSavedLayouts(){
    const versionKey = storeKey('moduleLayoutVersion');
    try {
      if (localStorage.getItem(versionKey) === LAYOUT_VERSION) return;
      const prefix = ['ourspace', dataProfile, 'module'].join(':') + ':';
      Object.keys(localStorage).forEach(key => { if (key.startsWith(prefix)) localStorage.removeItem(key); });
      localStorage.setItem(versionKey, LAYOUT_VERSION);
    } catch (err) { console.warn('Module layout migration skipped', err); }
  }
  function readState(page, mod){
    try { return JSON.parse(localStorage.getItem(storeKey('module', page, mod.dataset.moduleId)) || '{}') || {}; }
    catch { return {}; }
  }
  function writeState(page, mod, patch={}){
    const prev = readState(page, mod);
    const next = Object.assign({}, prev, patch);
    try { localStorage.setItem(storeKey('module', page, mod.dataset.moduleId), JSON.stringify(next)); }
    catch(err){ console.warn('Module layout save failed', err); }
  }
  function modulePage(mod){ return mod.closest('.page-section')?.id || document.body.dataset.page || 'home'; }
  function ensureModuleClass(){
    $$('[data-module-id]').forEach(mod => {
      if(!mod.classList.contains('module')) mod.classList.add('module');
      if(String(mod.className).includes('modulelarge')){
        mod.className = String(mod.className).replace(/\bmodulelarge\b/g, 'module large');
      }
    });
  }
  function applySize(mod, size){
    const safe = SIZE_OPTIONS.includes(String(size)) ? String(size) : DEFAULT_SIZE;
    mod.dataset.moduleSize = safe;
    mod.style.setProperty('--module-size-factor', String(Number(safe) / 100));
    const font = safe === '25' ? '.58' : safe === '50' ? '.72' : safe === '75' ? '.86' : '1';
    mod.style.setProperty('--module-font-factor', font);
    mod.style.setProperty('--module-content-zoom', font);
    const select = $('.os-module-size-select', mod);
    if(select) select.value = safe;
  }
  function usableCarouselChildren(body){
    return Array.from(body.children).filter(el => !el.classList.contains('module-bubble') && !el.classList.contains('os-module-generated'));
  }
  function updateCarouselCount(mod){
    const slides = $$('.os-carousel-slide', mod);
    const idx = Math.max(0, slides.findIndex(s => s.classList.contains('os-active-slide')));
    const count = $('.os-module-slide-count', mod);
    if(count) count.textContent = slides.length ? `${idx + 1}/${slides.length}` : '';
  }
  function setSlide(mod, index){
    const slides = $$('.os-carousel-slide', mod);
    if(!slides.length) return;
    const page = modulePage(mod);
    let next = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('os-active-slide', i === next));
    updateCarouselCount(mod);
    writeState(page, mod, { carouselSlide: next });
  }
  function prepareCarousel(mod){
    const body = $('.module-body', mod);
    if(!body) return;
    const children = usableCarouselChildren(body);
    if(children.length < 2){
      mod.classList.remove('os-carousel-ready','os-carousel-on');
      return;
    }
    children.forEach((child, index) => {
      child.classList.add('os-carousel-slide');
      if(!child.dataset.slideName){
        const heading = child.querySelector?.('h1,h2,h3,h4,legend,label,strong')?.textContent?.trim();
        child.dataset.slideName = heading || `Slide ${index + 1}`;
      }
    });
    mod.classList.add('os-carousel-ready');
    const state = readState(modulePage(mod), mod);
    if(state.carousel){
      mod.classList.add('os-carousel-on');
      setSlide(mod, Number(state.carouselSlide || 0));
    } else {
      mod.classList.remove('os-carousel-on');
      children.forEach(child => child.classList.remove('os-active-slide'));
      updateCarouselCount(mod);
    }
  }
  function addControls(mod){
    const actions = $('.module-actions', mod);
    if(!actions || actions.dataset.workshopControls === 'true') return;
    actions.dataset.workshopControls = 'true';
    const page = modulePage(mod);
    const state = readState(page, mod);
    const size = document.createElement('select');
    size.className = 'os-module-size-select';
    size.title = 'Module size';
    size.setAttribute('aria-label', 'Module size');
    SIZE_OPTIONS.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = `${v}%`;
      size.append(opt);
    });
    size.addEventListener('pointerdown', ev => ev.stopPropagation());
    size.addEventListener('change', () => {
      applySize(mod, size.value);
      writeState(modulePage(mod), mod, { size: size.value });
    });
    const prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'os-module-slide-btn'; prev.textContent = '‹'; prev.title = 'Previous slide';
    const count = document.createElement('span');
    count.className = 'os-module-slide-count';
    const next = document.createElement('button');
    next.type = 'button'; next.className = 'os-module-slide-btn'; next.textContent = '›'; next.title = 'Next slide';
    const carousel = document.createElement('button');
    carousel.type = 'button'; carousel.className = 'os-module-carousel-btn'; carousel.textContent = 'Slides'; carousel.title = 'Toggle carousel slide mode';
    [prev,next,carousel].forEach(btn => btn.addEventListener('pointerdown', ev => ev.stopPropagation()));
    carousel.addEventListener('click', () => {
      prepareCarousel(mod);
      const on = !mod.classList.contains('os-carousel-on');
      mod.classList.toggle('os-carousel-on', on);
      if(on) setSlide(mod, readState(modulePage(mod), mod).carouselSlide || 0);
      writeState(modulePage(mod), mod, { carousel: on, carouselSlide: Number(readState(modulePage(mod), mod).carouselSlide || 0) });
    });
    prev.addEventListener('click', () => {
      const slides = $$('.os-carousel-slide', mod);
      const cur = slides.findIndex(s => s.classList.contains('os-active-slide'));
      setSlide(mod, cur - 1);
    });
    next.addEventListener('click', () => {
      const slides = $$('.os-carousel-slide', mod);
      const cur = slides.findIndex(s => s.classList.contains('os-active-slide'));
      setSlide(mod, cur + 1);
    });
    actions.prepend(carousel);
    actions.prepend(next);
    actions.prepend(count);
    actions.prepend(prev);
    actions.prepend(size);
    applySize(mod, state.size || DEFAULT_SIZE);
  }
  function strengthenDragSave(mod){
    const head = $('.module-head', mod);
    if(!head || head.dataset.workshopDragSave === 'true') return;
    head.dataset.workshopDragSave = 'true';
    head.addEventListener('pointerdown', () => mod.classList.add('os-dragging'));
    head.addEventListener('pointerup', () => {
      mod.classList.remove('os-dragging');
      const page = modulePage(mod);
      writeState(page, mod, {
        x: parseInt(mod.style.left || getComputedStyle(mod).left) || Number(mod.dataset.x || 10),
        y: parseInt(mod.style.top || getComputedStyle(mod).top) || Number(mod.dataset.y || 10),
        collapsed: mod.classList.contains('collapsed'),
        size: mod.dataset.moduleSize || DEFAULT_SIZE,
        carousel: mod.classList.contains('os-carousel-on'),
        carouselSlide: Math.max(0, $$('.os-carousel-slide', mod).findIndex(s => s.classList.contains('os-active-slide')))
      });
    });
    mod.addEventListener('click', event => {
      if(event.target.closest('[data-collapse]')){
        setTimeout(() => writeState(modulePage(mod), mod, { collapsed: mod.classList.contains('collapsed'), size: mod.dataset.moduleSize || DEFAULT_SIZE }), 0);
      }
    });
  }
  function restoreModule(mod){
    const state = readState(modulePage(mod), mod);
    applySize(mod, state.size || DEFAULT_SIZE);
    if(typeof state.collapsed === 'boolean') mod.classList.toggle('collapsed', state.collapsed);
    prepareCarousel(mod);
  }
  function enhance(){
    ensureModuleClass();
    $$('.module[data-module-id]').forEach(mod => {
      addControls(mod);
      strengthenDragSave(mod);
      restoreModule(mod);
    });
  }
  function watchDynamicBodies(){
    const observer = new MutationObserver(mutations => {
      const changedMods = new Set();
      mutations.forEach(m => {
        const mod = m.target.closest?.('.module[data-module-id]');
        if(mod) changedMods.add(mod);
      });
      changedMods.forEach(prepareCarousel);
    });
    $$('.module .module-body').forEach(body => observer.observe(body, { childList:true, subtree:false }));
  }
  function init(){
    maybeResetOldSavedLayouts();
    enhance();
    watchDynamicBodies();
    document.addEventListener('change', ev => {
      if(ev.target && ev.target.id === 'pageSelect') setTimeout(enhance, 40);
    });
    document.addEventListener('click', ev => {
      if(ev.target.closest('.page-reset')) setTimeout(enhance, 80);
    });
    window.addEventListener('hashchange', () => setTimeout(enhance, 60));
    setTimeout(enhance, 120);
    setTimeout(enhance, 600);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
