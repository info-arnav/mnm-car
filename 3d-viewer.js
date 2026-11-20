(function () {
  'use strict';
  var script = document.currentScript;
  if (!script || !script.src) return;
  var scriptURL = new URL(script.src, document.baseURI);
  var model = (scriptURL.searchParams.get('id') || 'SCN').trim().toUpperCase();
  var targetId = script.getAttribute('data-target') || 'digiiq-3d-viewer';
  var viewerURL = new URL(script.getAttribute('data-viewer-url') || 'embed/', scriptURL);
  if (!/^https?:$/.test(viewerURL.protocol)) return;
  viewerURL.searchParams.set('id', model);
  viewerURL.searchParams.set('parentOrigin', location.origin);
  viewerURL.searchParams.set('v', 'embed-scn-colours-1');
  var watcher, mounted = false;
  function mount() {
    var container = document.getElementById(targetId);
    if (!container || mounted) return false;
    if (container.getAttribute('data-digiiq-mounted') === 'true') { mounted = true; return true; }
    mounted = true; container.setAttribute('data-digiiq-mounted', 'true'); container.setAttribute('aria-busy', 'true');
    var root = container.shadowRoot || container.attachShadow({ mode: 'open' });
    var wrap = document.createElement('div');
    Object.assign(wrap.style, { display: 'block', position: 'relative', width: '100%', height: '500px', overflow: 'hidden', background: '#f0f1ed', boxSizing: 'border-box' });
    var frame = document.createElement('iframe');
    frame.title = model === 'SCN' ? 'Scorpio-N 360° viewer' : 'Car viewer';
    frame.loading = 'lazy'; frame.allow = 'fullscreen'; frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    Object.assign(frame.style, { display: 'block', width: '100%', height: '100%', border: '0', margin: '0', padding: '0' });
    var status = document.createElement('div'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    Object.assign(status.style, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '17px', background: '#f0f1ed', color: '#303b34', font: '16px Arial,Helvetica,sans-serif' });
    var ring = document.createElement('span'); ring.setAttribute('aria-hidden', 'true');
    Object.assign(ring.style, { display: 'block', width: '30px', height: '30px', border: '2px solid #c5cec4', borderTopColor: '#e9232b', borderRadius: '50%', boxSizing: 'border-box' });
    var motion = !matchMedia('(prefers-reduced-motion: reduce)').matches && ring.animate ? ring.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 900, iterations: Infinity }) : null;
    var label = document.createElement('span'); label.textContent = 'Loading the model…';
    var retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Try again';
    Object.assign(retry.style, { display: 'none', border: '0', borderRadius: '4px', padding: '11px 22px', font: '14px Arial,Helvetica,sans-serif', background: '#182019', color: '#fff', cursor: 'pointer' });
    status.append(ring, label, retry); wrap.append(frame, status); root.append(wrap);
    var stall, ready = false, visible = true;
    function armTimeout() { clearTimeout(stall); if (visible && !ready) stall = setTimeout(showError, 45000); }
    function showError() { status.style.display = 'flex'; ring.style.display = 'none'; label.textContent = model === 'SCN' ? 'Couldn’t load the model.' : 'This model is unavailable.'; retry.style.display = model === 'SCN' ? 'block' : 'none'; status.setAttribute('role', 'alert'); motion && motion.pause(); }
    function resize() {
      var width = container.getBoundingClientRect().width;
      var fixed = Number(script.getAttribute('data-height'));
      var height = fixed > 0 ? Math.max(280, Math.min(1200, fixed)) : width < 640 ? Math.max(340, width * .9) : Math.max(360, Math.min(720, width * 9 / 16));
      wrap.style.height = Math.round(height) + 'px';
    }
    function sendVisibility() { frame.contentWindow && frame.contentWindow.postMessage({ namespace: 'digiiq-3d-viewer', type: 'visibility', visible: visible && !document.hidden }, viewerURL.origin); }
    function receive(event) {
      if (event.source !== frame.contentWindow || event.origin !== viewerURL.origin || !event.data || event.data.namespace !== 'digiiq-3d-viewer' || event.data.model !== model) return;
      if (event.data.type === 'progress') armTimeout();
      if (event.data.type === 'ready') { ready = true; clearTimeout(stall); status.style.display = 'none'; motion && motion.cancel(); container.setAttribute('aria-busy', 'false'); sendVisibility(); }
      if (event.data.type === 'error') showError();
    }
    retry.onclick = function () { ready = false; ring.style.display = 'block'; label.textContent = 'Loading the model…'; retry.style.display = 'none'; status.setAttribute('role', 'status'); motion && motion.play(); viewerURL.searchParams.set('retry', Date.now()); frame.src = viewerURL.href; armTimeout(); };
    addEventListener('message', receive); document.addEventListener('visibilitychange', sendVisibility);
    var resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
    var intersection = new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sendVisibility(); if (visible) armTimeout(); else clearTimeout(stall); }); intersection.observe(container);
    var cleanup = new MutationObserver(function () { if (container.isConnected) return; clearTimeout(stall); motion && motion.cancel(); resizeObserver.disconnect(); intersection.disconnect(); cleanup.disconnect(); removeEventListener('message', receive); document.removeEventListener('visibilitychange', sendVisibility); }); cleanup.observe(document.documentElement, { childList: true, subtree: true });
    if (model !== 'SCN') { showError(); return true; }
    frame.src = viewerURL.href; armTimeout(); return true;
  }
  if (!mount()) {
    watcher = new MutationObserver(function () { if (mount()) watcher.disconnect(); });
    watcher.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { watcher.disconnect(); }, 30000);
  }
})();
