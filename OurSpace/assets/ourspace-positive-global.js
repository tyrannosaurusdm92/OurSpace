
(function(){
  'use strict';
  function detectProfile(){
    const b=document.body;
    const text=((b&&b.dataset&&b.dataset.ourspaceUser)||document.title||'').toLowerCase();
    if(text.includes('jasper')) return 'jasper';
    if(text.includes('william')) return 'william';
    return 'shared';
  }
  function add(){
    if(document.querySelector('.page') && window.addPositiveToAllPages) return;
    const data=(window.OURSPACE_POSITIVE_MESSAGES||{})[detectProfile()]||(window.OURSPACE_POSITIVE_MESSAGES||{}).shared||{};
    const affirm=(data.positive_affirmations||[]).filter(Boolean);
    const marquees=(data.marquee_details||[]).map(m=>m.full_text||m).filter(Boolean);
    if(!affirm.length && !marquees.length) return;
    let host=document.getElementById('ourspaceGlobalPositive');
    if(!host){
      host=document.createElement('section');
      host.id='ourspaceGlobalPositive';
      host.className='os-page-positive os-login-positive';
      host.innerHTML='<div class="os-page-marquee"><span></span></div><div class="os-page-affirmation"></div>';
      const target=document.querySelector('main, .auth-card, .login-card, body');
      if(target && target!==document.body) target.prepend(host); else document.body.prepend(host);
    }
    const tick=()=>{
      const i=Math.floor(Date.now()/15000);
      const aff=affirm[i%Math.max(1,affirm.length)]||'';
      const mar=marquees[i%Math.max(1,marquees.length)]||aff;
      host.querySelector('.os-page-affirmation').textContent=aff;
      host.querySelector('.os-page-marquee span').textContent=mar;
    };
    tick();
    if(!window.__ourspaceLoginPositiveTicker) window.__ourspaceLoginPositiveTicker=setInterval(tick,15000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', add);
  else add();
})();
