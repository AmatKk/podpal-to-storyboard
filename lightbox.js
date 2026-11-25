/* Shared lightbox: prev/next arrows, X to close, caption, ← → Esc keys, swipe on touch.
   Usage: Lightbox.attach({root: element, selector: "img.ph", caption: (img, i, n) => html}) */
(function () {
  const css = `
.xlb{position:fixed;inset:0;background:#08090a;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:50;
  padding:56px max(16px,env(safe-area-inset-right,0px)) max(20px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));color:#e8ecee}
.xlb.on{display:flex}
.xlb img{max-width:100%;max-height:calc(100% - 64px);object-fit:contain;user-select:none;display:block}
.xlb .cap{font-family:var(--body,system-ui);font-size:14px;text-align:center;max-width:80ch;line-height:1.4;margin:0}
.xlb .cap b{font-family:var(--display,inherit);font-size:22px;font-weight:700;margin-right:8px;color:#fff}
.xlb .cap span{font-family:var(--mono,monospace);font-size:12px;color:#9aa3aa;margin-left:8px}
.xlb button{position:absolute;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);color:#fff;cursor:pointer;
  display:grid;place-items:center;border-radius:999px;transition:background .15s;padding:0}
.xlb button:hover{background:rgba(255,255,255,.2)}
.xlb button svg{width:22px;height:22px;stroke:currentColor;stroke-width:2.2;fill:none;stroke-linecap:round;stroke-linejoin:round}
.xlb .x{top:12px;right:max(12px,env(safe-area-inset-right,0px));width:44px;height:44px}
.xlb .pv,.xlb .nx{top:50%;transform:translateY(-50%);width:52px;height:52px}
.xlb .pv{left:max(12px,env(safe-area-inset-left,0px))}.xlb .nx{right:max(12px,env(safe-area-inset-right,0px))}
.xlb button[disabled]{opacity:.25;cursor:default}
@media (max-width:700px){.xlb .pv,.xlb .nx{top:auto;bottom:max(14px,env(safe-area-inset-bottom,0px));transform:none;width:46px;height:46px}.xlb{padding-bottom:76px}}`;
  function attach(o) {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const lb = document.createElement("div"); lb.className = "xlb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Náhľad obrázka");
    lb.innerHTML = `<img alt=""><p class="cap"></p>
 <button class="x" type="button" aria-label="Zavrieť"><svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18"/></svg></button>
 <button class="pv" type="button" aria-label="Predchádzajúci"><svg viewBox="0 0 24 24"><path d="M15 5 L8 12 L15 19"/></svg></button>
 <button class="nx" type="button" aria-label="Ďalší"><svg viewBox="0 0 24 24"><path d="M9 5 L16 12 L9 19"/></svg></button>`;
    document.body.appendChild(lb);
    const im = lb.querySelector("img"), cap = lb.querySelector(".cap"), pv = lb.querySelector(".pv"), nx = lb.querySelector(".nx");
    const list = () => [...o.root.querySelectorAll(o.selector)].filter(e => e.offsetParent !== null);
    let i = -1;
    const show = k => { const L = list(); if (k < 0 || k >= L.length) return; i = k; const el = L[k];
      im.src = el.currentSrc || el.src; im.alt = el.alt || "";
      cap.innerHTML = o.caption ? o.caption(el, k, L.length) : `${el.alt || ""}<span>${k + 1}/${L.length}</span>`;
      pv.disabled = k === 0; nx.disabled = k === L.length - 1; lb.classList.add("on"); };
    const close = () => { lb.classList.remove("on"); i = -1; };
    o.root.addEventListener("click", e => { const el = e.target.closest(o.selector); if (!el) return; show(list().indexOf(el)); });
    lb.querySelector(".x").addEventListener("click", close);
    pv.addEventListener("click", e => { e.stopPropagation(); show(i - 1); });
    nx.addEventListener("click", e => { e.stopPropagation(); show(i + 1); });
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    document.addEventListener("keydown", e => { if (!lb.classList.contains("on")) return;
      if (e.key === "Escape") close(); else if (e.key === "ArrowRight") show(i + 1); else if (e.key === "ArrowLeft") show(i - 1); });
    let tx = null;
    lb.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive: true});
    lb.addEventListener("touchend", e => { if (tx === null) return; const d = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(d) > 50) show(i + (d < 0 ? 1 : -1)); });
    return {show, close};
  }
  window.Lightbox = {attach};
})();
