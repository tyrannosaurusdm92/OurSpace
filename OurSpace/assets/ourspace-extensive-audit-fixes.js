(function(){
'use strict';
const profile=(document.body.dataset.ourspaceUser||'william').toLowerCase();
const partner=(document.body.dataset.ourspacePartner||(profile==='william'?'jasper':'william')).toLowerCase();
const label=profile.charAt(0).toUpperCase()+profile.slice(1);
const STORE_KEY='single-file-ourspace-'+profile+'-v4';
const APPEARANCE_KEY='ourspace_appearance_'+profile+'_v2';
const SESSION_KEY='ourspace.session.v1';
const LEGACY_SESSION_KEY='portal-active-session-v2';
const ACCOUNT_SYNC_SCOPE='ourspace-cross-device-account';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const uid=prefix=>prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(e){return fallback;}}
function writeJSON(key,value){localStorage.setItem(key,JSON.stringify(value));}
function readState(){const s=readJSON(STORE_KEY,{}); s.gallery=Array.isArray(s.gallery)?s.gallery:[]; s.musicTracks=Array.isArray(s.musicTracks)?s.musicTracks:[]; return s;}
function saveState(s){writeJSON(STORE_KEY,s);}
function readSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||localStorage.getItem(SESSION_KEY)||localStorage.getItem(LEGACY_SESSION_KEY)||'null');}catch(e){return null;}}
function currentPage(){return document.querySelector('.page.active')?.dataset.page||'home';}
function fileToDataURL(file){return new Promise(resolve=>{const r=new FileReader(); r.onload=()=>resolve(String(r.result||'')); r.readAsDataURL(file);});}
function appReady(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn); else fn();}
function appearanceData(){const raw=readJSON(APPEARANCE_KEY,{pages:{},presets:{}}); raw.pages=raw.pages||{}; raw.presets=raw.presets||{}; return raw;}
function saveAppearancePatch(page,patch){const data=appearanceData(); data.pages[page]=Object.assign({},data.pages[page]||{},patch,{updatedAt:new Date().toISOString()}); writeJSON(APPEARANCE_KEY,data); applyFontForPage(page);}
function normalizeFontStack(family){const v=String(family||'').trim(); if(!v)return '';
  if(v.includes(',')||v.startsWith('var('))return v;
  if(/^['"].*['"]$/.test(v))return `${v}, ui-sans-serif, system-ui, sans-serif`;
  return `'${v.replace(/'/g,'')}', ui-sans-serif, system-ui, sans-serif`;
}
function googleCssUrl(input){let v=String(input||'').trim(); if(!v)return '';
  const importMatch=v.match(/@import\s+url\(['"]?([^'")]+)['"]?\)/i); if(importMatch)v=importMatch[1];
  if(v.includes('fonts.googleapis.com/css'))return v;
  if(!/^https?:\/\//i.test(v) && /^[\w\s:+,-]+$/.test(v)){
    return 'https://fonts.googleapis.com/css2?family='+encodeURIComponent(v).replace(/%20/g,'+')+'&display=swap';
  }
  return v;
}
function ensureFontResources(a,page){
  document.querySelectorAll('link[data-os-google-font="'+page+'"]').forEach(n=>n.remove());
  document.querySelectorAll('style[data-os-upload-font="'+page+'"]').forEach(n=>n.remove());
  const url=googleCssUrl(a.googleFontUrl||a.googleFontFamily||'');
  if(url){const link=document.createElement('link'); link.rel='stylesheet'; link.href=url; link.dataset.osGoogleFont=page; document.head.appendChild(link);}
  if(a.uploadedFontData&&a.uploadedFontName){const safeName=String(a.uploadedFontName).replace(/[^a-zA-Z0-9_-]/g,'_'); const style=document.createElement('style'); style.dataset.osUploadFont=page; style.textContent=`@font-face{font-family:'${safeName}';src:url('${a.uploadedFontData}') format('${fontFormat(a.uploadedFontMime,a.uploadedFileName)}');font-display:swap;}`; document.head.appendChild(style);}
}
function fontFormat(mime,name){const n=String(name||'').toLowerCase(); if(mime&&mime.includes('woff2')||n.endsWith('.woff2'))return 'woff2'; if(mime&&mime.includes('woff')||n.endsWith('.woff'))return 'woff'; if(n.endsWith('.otf'))return 'opentype'; return 'truetype';}
function applyFontForPage(page=currentPage()){
  const data=appearanceData(); const a=data.pages?.[page]||{}; ensureFontResources(a,page);
  let family=a.fontFamily||a.googleFontFamily||'';
  if(a.useUploadedFont&&a.uploadedFontName)family=String(a.uploadedFontName).replace(/[^a-zA-Z0-9_-]/g,'_');
  const stack=normalizeFontStack(family)||'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  document.documentElement.style.setProperty('--os-page-font',stack);
  document.documentElement.style.setProperty('--font',stack);
}
function ensureOneAppearanceButtonPerPage(){
  document.querySelectorAll('.page-toolbar').forEach(toolbar=>{
    const buttons=[...toolbar.querySelectorAll('button')];
    let keep=buttons.find(b=>b.classList.contains('os-appearance-button'))||buttons[0];
    if(!keep)return;
    keep.textContent='Appearance'; keep.type='button'; keep.classList.add('bg-button','os-appearance-button'); keep.removeAttribute('data-bg-open');
    buttons.forEach(b=>{if(b!==keep&&(b.classList.contains('os-appearance-button')||b.hasAttribute('data-bg-open')||/background|appearance/i.test(b.textContent||'')))b.remove();});
  });
  const homeButtons=[...document.querySelectorAll('#page-home .os-appearance-button')];
  homeButtons.slice(1).forEach(b=>b.remove());
}
function ensureAppearanceFontControls(){
  const modal=$('appearanceModal'); const main=modal?.querySelector('main'); if(!modal||!main||$('osFontControls'))return;
  const block=document.createElement('section'); block.id='osFontControls'; block.className='os-audit-controls';
  block.innerHTML=`<h3>Page Font</h3><div class="os-audit-grid"><label>Choose a font<select id="osFontChoice"><option value="">System default</option><option>Inter</option><option>Atkinson Hyperlegible</option><option>Love Ya Like A Sister</option><option>Morris Roman</option><option>Verdana</option><option>Georgia</option><option>Arial</option><option>Courier New</option><option value="custom">Custom / pasted Google family</option></select></label><label>Font family name<input id="osFontFamily" placeholder="Example: Atkinson Hyperlegible"></label><label>Google Fonts family or CSS URL<input id="osGoogleFontUrl" placeholder="Atkinson Hyperlegible or https://fonts.googleapis.com/css2?... "></label><label>Upload font file<input id="osFontUpload" type="file" accept=".ttf,.otf,.woff,.woff2,font/*"></label></div><label><input id="osUseUploadedFont" type="checkbox"> Use uploaded font on this page</label><div class="os-mini-status" id="osFontStatus">OurSpace logo text stays locked to the brand font.</div>`;
  const hr=main.querySelector('hr'); main.insertBefore(block,hr||main.firstChild);
  $('osFontChoice').addEventListener('change',()=>{if($('osFontChoice').value&&$('osFontChoice').value!=='custom')$('osFontFamily').value=$('osFontChoice').value; saveFontControls();});
  ['osFontFamily','osGoogleFontUrl','osUseUploadedFont'].forEach(id=>$(id)?.addEventListener('input',saveFontControls));
  $('osFontUpload').addEventListener('change',async e=>{const f=e.target.files?.[0]; if(!f)return; const dataUrl=await fileToDataURL(f); const page=$('appearancePage')?.value||currentPage(); const family='OSUploaded_'+profile+'_'+page; $('osUseUploadedFont').checked=true; saveAppearancePatch(page,{uploadedFontName:family,uploadedFileName:f.name,uploadedFontMime:f.type||'',uploadedFontData:dataUrl,useUploadedFont:true,fontFamily:family}); $('osFontFamily').value=family; $('osFontStatus').textContent='Uploaded font saved for this page.'; e.target.value=''; fillFontControls(page);});
  modal.addEventListener('input',e=>{if(!e.target.closest('#osFontControls'))setTimeout(saveFontControls,0);},true);
}
function fillFontControls(page=currentPage()){
  ensureAppearanceFontControls(); const data=appearanceData(); const a=data.pages?.[page]||{};
  if($('osFontFamily'))$('osFontFamily').value=a.fontFamily||a.googleFontFamily||'';
  if($('osGoogleFontUrl'))$('osGoogleFontUrl').value=a.googleFontUrl||'';
  if($('osUseUploadedFont'))$('osUseUploadedFont').checked=!!a.useUploadedFont;
  if($('osFontChoice'))$('osFontChoice').value=['Inter','Atkinson Hyperlegible','Love Ya Like A Sister','Morris Roman','Verdana','Georgia','Arial','Courier New'].includes(a.fontFamily)?a.fontFamily:(a.fontFamily?'custom':'');
  if($('osFontStatus'))$('osFontStatus').textContent=a.uploadedFileName?`Uploaded font available: ${a.uploadedFileName}. OurSpace logo remains locked.`:'OurSpace logo text stays locked to the brand font.';
}
function saveFontControls(){const page=$('appearancePage')?.value||currentPage(); const patch={fontFamily:$('osFontFamily')?.value.trim()||'',googleFontUrl:$('osGoogleFontUrl')?.value.trim()||'',useUploadedFont:!!$('osUseUploadedFont')?.checked}; saveAppearancePatch(page,patch);}
function installAppearanceObservers(){
  document.addEventListener('click',e=>{const btn=e.target.closest('.os-appearance-button'); if(btn)setTimeout(()=>{ensureAppearanceFontControls(); fillFontControls($('appearancePage')?.value||currentPage());},50);},true);
  document.addEventListener('click',e=>{const old=e.target.closest('[data-bg-open]'); if(!old)return; e.preventDefault(); e.stopImmediatePropagation(); const replacement=old.closest('.page-toolbar')?.querySelector('.os-appearance-button'); if(replacement&&replacement!==old)replacement.click();},true);
  document.querySelectorAll('[data-page-link]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{ensureOneAppearanceButtonPerPage(); applyFontForPage(currentPage());},70)));
}
function normalizeProfileCrop(s){s.profileImageCrop=Object.assign({fit:'cover',x:50,y:50,zoom:100},s.profileImageCrop||{}); return s.profileImageCrop;}
function applyProfileCrop(){const s=readState(); const c=normalizeProfileCrop(s); const img=$('profileImage'); if(!img)return; img.style.objectFit=c.fit||'cover'; img.style.objectPosition=`${Number(c.x)||50}% ${Number(c.y)||50}%`; img.style.transform=`scale(${(Number(c.zoom)||100)/100})`; img.style.transformOrigin=`${Number(c.x)||50}% ${Number(c.y)||50}%`;}
function ensureProfileCropControls(){const input=$('profileImageInput'); if(!input||$('osCropControls'))return; const box=document.createElement('div'); box.id='osCropControls'; box.className='os-audit-controls os-crop-controls'; box.innerHTML=`<h3>Profile image crop / center</h3><div class="os-audit-grid"><label>Fit<select id="osProfileFit"><option value="cover">Cover square</option><option value="contain">Contain full image</option></select></label><label>Horizontal center<input id="osProfileX" type="range" min="0" max="100"></label><label>Vertical center<input id="osProfileY" type="range" min="0" max="100"></label><label>Zoom<input id="osProfileZoom" type="range" min="100" max="250"></label></div><div class="row"><button type="button" id="osProfileCenter">Center image</button></div>`;
  input.insertAdjacentElement('afterend',box);
  const s=readState(); const c=normalizeProfileCrop(s); saveState(s);
  $('osProfileFit').value=c.fit; $('osProfileX').value=c.x; $('osProfileY').value=c.y; $('osProfileZoom').value=c.zoom;
  ['osProfileFit','osProfileX','osProfileY','osProfileZoom'].forEach(id=>$(id).addEventListener('input',()=>{const st=readState(); st.profileImageCrop={fit:$('osProfileFit').value,x:Number($('osProfileX').value),y:Number($('osProfileY').value),zoom:Number($('osProfileZoom').value)}; saveState(st); applyProfileCrop();}));
  $('osProfileCenter').addEventListener('click',()=>{const st=readState(); st.profileImageCrop={fit:'cover',x:50,y:50,zoom:100}; saveState(st); ensureProfileCropControls(); $('osProfileFit').value='cover'; $('osProfileX').value=50; $('osProfileY').value=50; $('osProfileZoom').value=100; applyProfileCrop();});
  $('profileImageInput')?.addEventListener('change',()=>setTimeout(applyProfileCrop,500));
  applyProfileCrop();
}
function normalizeMusic(s){
  const now=Date.now(); s.musicTracks=Array.isArray(s.musicTracks)?s.musicTracks:[];
  s.musicTracks.forEach((t,i)=>{if(!t.id)t.id='track_'+String(t.name||'mp3').replace(/[^a-z0-9]+/gi,'_')+'_'+i+'_'+now.toString(36); if(!t.addedAt)t.addedAt=new Date(now+i).toISOString();});
  s.playlists=Array.isArray(s.playlists)?s.playlists:[];
  if(!s.playlists.length)s.playlists=[{id:'playlist_all',name:'All uploads',trackIds:s.musicTracks.map(t=>t.id),createdAt:new Date().toISOString()}];
  if(!s.activePlaylistId||!s.playlists.some(p=>p.id===s.activePlaylistId))s.activePlaylistId=s.playlists[0]?.id||'playlist_all';
  const active=s.playlists.find(p=>p.id===s.activePlaylistId)||s.playlists[0]; active.trackIds=Array.isArray(active.trackIds)?active.trackIds:[];
  const assigned=new Set(s.playlists.flatMap(p=>Array.isArray(p.trackIds)?p.trackIds:[]));
  s.musicTracks.forEach(t=>{if(!assigned.has(t.id))active.trackIds.push(t.id);});
  s.playlists.forEach(p=>{p.trackIds=[...new Set((p.trackIds||[]).filter(id=>s.musicTracks.some(t=>t.id===id)))];});
  return s;
}
function ensureMusicControls(){const list=$('playlist'); const upload=$('musicUpload'); if(!list||!upload||$('osMusicControls'))return; const controls=document.createElement('div'); controls.id='osMusicControls'; controls.className='os-audit-controls os-music-controls'; controls.innerHTML=`<h3>Playlists</h3><div class="row"><select id="osPlaylistSelect" aria-label="Playlist"></select><input id="osPlaylistName" placeholder="New playlist name"><button type="button" id="osCreatePlaylist">Create playlist</button><button type="button" id="osDeletePlaylist">Delete playlist</button></div><div class="row"><button type="button" id="osSortPlaylistName">Sort A-Z</button><button type="button" id="osSortPlaylistRecent">Sort newest</button><button type="button" id="osShufflePlaylist">Shuffle</button><button type="button" id="osAddAllTracks">Add all tracks here</button></div><div class="os-mini-status" id="osMusicStatus">Multiple MP3 uploads are saved into the active playlist.</div>`; list.parentNode.insertBefore(controls,list);
  $('osCreatePlaylist').addEventListener('click',()=>{const s=normalizeMusic(readState()); const name=$('osPlaylistName').value.trim()||'Playlist '+(s.playlists.length+1); const row={id:uid('playlist'),name,trackIds:[],createdAt:new Date().toISOString()}; s.playlists.push(row); s.activePlaylistId=row.id; $('osPlaylistName').value=''; saveState(s); renderMusicEnhanced();});
  $('osDeletePlaylist').addEventListener('click',()=>{const s=normalizeMusic(readState()); if(s.playlists.length<=1){$('osMusicStatus').textContent='Keep at least one playlist.'; return;} s.playlists=s.playlists.filter(p=>p.id!==s.activePlaylistId); s.activePlaylistId=s.playlists[0].id; saveState(s); renderMusicEnhanced();});
  $('osPlaylistSelect').addEventListener('change',()=>{const s=normalizeMusic(readState()); s.activePlaylistId=$('osPlaylistSelect').value; saveState(s); renderMusicEnhanced();});
  $('osSortPlaylistName').addEventListener('click',()=>sortActivePlaylist('name'));
  $('osSortPlaylistRecent').addEventListener('click',()=>sortActivePlaylist('recent'));
  $('osShufflePlaylist').addEventListener('click',shuffleActivePlaylist);
  $('osAddAllTracks').addEventListener('click',()=>{const s=normalizeMusic(readState()); const p=s.playlists.find(x=>x.id===s.activePlaylistId); p.trackIds=[...new Set([...p.trackIds,...s.musicTracks.map(t=>t.id)])]; saveState(s); renderMusicEnhanced();});
  ['prevTrack','nextTrack'].forEach(id=>$(id)?.addEventListener('click',e=>{e.preventDefault(); e.stopImmediatePropagation(); stepTrack(id==='nextTrack'?1:-1);},true));
  $('musicUpload')?.addEventListener('change',()=>setTimeout(()=>{const s=normalizeMusic(readState()); saveState(s); renderMusicEnhanced();},900));
  renderMusicEnhanced();
}
function activePlaylistTracks(s){s=normalizeMusic(s||readState()); const p=s.playlists.find(x=>x.id===s.activePlaylistId)||s.playlists[0]; return {s,p,tracks:(p?.trackIds||[]).map(id=>s.musicTracks.find(t=>t.id===id)).filter(Boolean)};}
function playTrackById(id,play=true){const {s,p,tracks}=activePlaylistTracks(); const t=s.musicTracks.find(x=>x.id===id)||tracks[0]; const player=$('musicPlayer'); if(!t||!player)return; s.activeTrackId=t.id; saveState(s); player.src=t.src||t.remoteUrl||''; player.load(); if(play)player.play().catch(()=>{}); renderMusicEnhanced();}
function stepTrack(delta){const {s,tracks}=activePlaylistTracks(); if(!tracks.length)return; const cur=Math.max(0,tracks.findIndex(t=>t.id===s.activeTrackId)); const next=(cur+delta+tracks.length)%tracks.length; playTrackById(tracks[next].id,true);}
function sortActivePlaylist(mode){const {s,p}=activePlaylistTracks(); if(!p)return; const trackById=Object.fromEntries(s.musicTracks.map(t=>[t.id,t])); p.trackIds.sort((a,b)=>{const ta=trackById[a]||{}, tb=trackById[b]||{}; return mode==='recent'?String(tb.addedAt||'').localeCompare(String(ta.addedAt||'')):String(ta.name||'').localeCompare(String(tb.name||''));}); saveState(s); renderMusicEnhanced();}
function shuffleActivePlaylist(){const {s,p}=activePlaylistTracks(); if(!p)return; for(let i=p.trackIds.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [p.trackIds[i],p.trackIds[j]]=[p.trackIds[j],p.trackIds[i]];} saveState(s); renderMusicEnhanced();}
function renderMusicEnhanced(){ensureMusicControls(); const s=normalizeMusic(readState()); saveState(s); const sel=$('osPlaylistSelect'); const list=$('playlist'); if(!sel||!list)return; sel.innerHTML=s.playlists.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${(p.trackIds||[]).length})</option>`).join(''); sel.value=s.activePlaylistId; const {p,tracks}=activePlaylistTracks(s); if(!tracks.length){list.innerHTML='<li><span class="tiny">No tracks in this playlist yet.</span></li>'; return;} list.innerHTML=tracks.map(t=>`<li class="${t.id===s.activeTrackId?'os-active-track':''}"><span>${t.id===s.activeTrackId?'▶ ':''}${esc(t.name||'Track')}</span><span><button type="button" data-os-play="${esc(t.id)}">Play</button><button type="button" data-os-remove="${esc(t.id)}" class="danger">Remove</button></span></li>`).join(''); list.querySelectorAll('[data-os-play]').forEach(b=>b.addEventListener('click',()=>playTrackById(b.dataset.osPlay,true))); list.querySelectorAll('[data-os-remove]').forEach(b=>b.addEventListener('click',()=>{const st=normalizeMusic(readState()); const pl=st.playlists.find(x=>x.id===st.activePlaylistId); if(pl)pl.trackIds=pl.trackIds.filter(id=>id!==b.dataset.osRemove); saveState(st); renderMusicEnhanced();}));}
function normalizeGallery(s){s.gallery=Array.isArray(s.gallery)?s.gallery:[]; const now=Date.now(); s.gallery.forEach((g,i)=>{if(typeof g==='string')s.gallery[i]={id:uid('gallery'),type:'image',src:g,name:'image',addedAt:new Date(now+i).toISOString()}; else {if(!g.id)g.id=uid('gallery'); if(!g.addedAt)g.addedAt=new Date(now+i).toISOString();}}); return s;}
function ensureGalleryControls(){const upload=$('galleryUpload'), grid=$('galleryGrid'); if(!upload||!grid||$('osGalleryControls'))return; const controls=document.createElement('div'); controls.id='osGalleryControls'; controls.className='os-audit-controls os-gallery-controls'; controls.innerHTML=`<h3>Gallery</h3><div class="row"><button type="button" id="osGalleryNewest">Sort newest</button><button type="button" id="osGalleryName">Sort A-Z</button><button type="button" id="osGalleryShowAll">Show full gallery</button></div><div class="os-mini-status">Images and videos open full-size when selected.</div>`; upload.insertAdjacentElement('afterend',controls);
  $('osGalleryNewest').addEventListener('click',()=>sortGallery('recent'));
  $('osGalleryName').addEventListener('click',()=>sortGallery('name'));
  $('osGalleryShowAll').addEventListener('click',()=>{const first=$('galleryGrid img, #galleryGrid video'); if(first)first.click();});
  upload.addEventListener('change',()=>setTimeout(()=>{const s=normalizeGallery(readState()); saveState(s); renderGalleryEnhanced();},900));
  grid.addEventListener('click',e=>{const media=e.target.closest('img,video'); if(!media)return; openGalleryFull(media.getAttribute('src'),media.tagName.toLowerCase()==='video');});
  renderGalleryEnhanced();
}
function renderGalleryEnhanced(){const grid=$('galleryGrid'); if(!grid)return; const s=normalizeGallery(readState()); saveState(s); if(!s.gallery.length)return; grid.innerHTML=s.gallery.map((item,i)=>{const isVideo=String(item.type||'').startsWith('video'); return `<div>${isVideo?`<video src="${esc(item.src)}" controls style="width:100%;border-radius:12px"></video>`:`<img src="${esc(item.src)}" alt="${esc(item.name||'Gallery image')}">`}<button data-os-del-gallery="${i}" class="danger" style="width:100%;margin-top:.25rem">Remove</button></div>`;}).join(''); grid.querySelectorAll('[data-os-del-gallery]').forEach(b=>b.addEventListener('click',()=>{const st=normalizeGallery(readState()); st.gallery.splice(Number(b.dataset.osDelGallery),1); saveState(st); renderGalleryEnhanced();}));}
function sortGallery(mode){const s=normalizeGallery(readState()); s.gallery.sort((a,b)=>mode==='recent'?String(b.addedAt||'').localeCompare(String(a.addedAt||'')):String(a.name||'').localeCompare(String(b.name||''))); saveState(s); renderGalleryEnhanced();}
function ensureGalleryModal(){let m=$('osGalleryFullscreen'); if(m)return m; m=document.createElement('section'); m.id='osGalleryFullscreen'; m.className='os-gallery-fullscreen'; m.innerHTML='<div class="os-gallery-frame" id="osGalleryFrame"></div>'; document.body.appendChild(m); m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}); return m;}
function openGalleryFull(src,isVideo){const m=ensureGalleryModal(), frame=$('osGalleryFrame'); frame.innerHTML=(isVideo?`<video src="${esc(src)}" controls autoplay></video>`:`<img src="${esc(src)}" alt="Gallery media">`)+'<button type="button" id="osCloseGalleryFull">Close</button>'; $('osCloseGalleryFull').addEventListener('click',()=>m.classList.remove('open')); m.classList.add('open');}
function accountName(){const s=readSession()||{}; return String(s.accountName||s.displayName||s.email||label).trim().toLowerCase().replace(/[^a-z0-9@._-]+/g,'-')||label.toLowerCase();}
function accountSyncKey(){return 'full-state-v9:'+accountName()+':'+profile;}
function bundleForSync(){const keys=[STORE_KEY,APPEARANCE_KEY,'ourspace_home_journal_'+profile+'_v2','ourspace_wellness_combined_'+profile+'_v2','ourspace_currency_'+profile+'_v1','ourspace_ledger_'+profile+'_v1','ourspace_private_william_jasper_messages_v2']; const bundle={schema:'ourspace.account.full-state.v9',profile,accountName:accountName(),updatedAt:new Date().toISOString(),items:{}}; keys.forEach(k=>bundle.items[k]=readJSON(k,null)); return bundle;}
function applySyncBundle(bundle){if(!bundle||!bundle.items)return; Object.entries(bundle.items).forEach(([k,v])=>{if(v!==null&&v!==undefined)writeJSON(k,v);});}
async function pushAccountSync(){const status=$('osAccountSyncStatus')||$('osSyncStatus'); if(status)status.textContent='Syncing account state...'; try{const api=window.OurSpaceBackend?.action; if(!api)throw new Error('Backend tools are not loaded.'); await api('preference.set',{scope:ACCOUNT_SYNC_SCOPE,key:accountSyncKey(),value:bundleForSync()},{tolerateOpaque:true,timeout:20000}); if(status)status.textContent='Synced by account: '+accountName();}catch(e){if(status)status.textContent='Sync waiting for backend: '+(e.message||e);}}
async function pullAccountSync(){const status=$('osAccountSyncStatus')||$('osSyncStatus'); if(status)status.textContent='Pulling account state...'; try{const api=window.OurSpaceBackend?.action; if(!api)throw new Error('Backend tools are not loaded.'); const data=await api('preference.get',{scope:ACCOUNT_SYNC_SCOPE,key:accountSyncKey()},{tolerateOpaque:false,timeout:16000}); const value=data.value||data.data?.value; if(value){applySyncBundle(value); if(status)status.textContent='Pulled latest for '+accountName()+'. Refresh to see every change.';} else if(status)status.textContent='No account sync bundle found yet.';}catch(e){if(status)status.textContent='Pull waiting for backend: '+(e.message||e);}}
function ensureAccountSyncControls(){const page=$('page-sync'); if(!page||$('osAccountSyncControls'))return; const sec=document.createElement('section'); sec.id='osAccountSyncControls'; sec.className='card os-sync-controls'; sec.innerHTML=`<div class="card-head"><h2>Account-name Sync</h2></div><div class="card-body"><p class="os-account-sync-key">Account key: <strong>${esc(accountSyncKey())}</strong></p><div class="row"><button id="osAccountPush" type="button" class="primary">Sync this account now</button><button id="osAccountPull" type="button">Pull this account</button></div><div class="os-sync-status" id="osAccountSyncStatus">Ready to sync by account name.</div></div>`; const existing=$('osSyncStatus')?.closest('section.card'); (existing?.parentNode||page).insertBefore(sec,existing?.nextSibling||page.firstChild); $('osAccountPush').addEventListener('click',pushAccountSync); $('osAccountPull').addEventListener('click',pullAccountSync); ['osPushSync','osPullSync'].forEach(id=>$(id)?.addEventListener('click',e=>{e.preventDefault(); e.stopImmediatePropagation(); id==='osPushSync'?pushAccountSync():pullAccountSync();},true));}
function installStorageRefresh(){window.addEventListener('storage',e=>{if(e.key===STORE_KEY){setTimeout(()=>{applyProfileCrop(); renderMusicEnhanced(); renderGalleryEnhanced();},30);} if(e.key===APPEARANCE_KEY)applyFontForPage(currentPage());});}
function boot(){ensureOneAppearanceButtonPerPage(); installAppearanceObservers(); applyFontForPage(currentPage()); ensureProfileCropControls(); ensureMusicControls(); ensureGalleryControls(); ensureAccountSyncControls(); installStorageRefresh(); setTimeout(()=>{ensureOneAppearanceButtonPerPage(); ensureAppearanceFontControls(); applyProfileCrop(); renderMusicEnhanced(); renderGalleryEnhanced();},400);}
appReady(()=>setTimeout(boot,120));
})();
