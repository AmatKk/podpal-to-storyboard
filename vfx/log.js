// VFX dron test – work log data. Newest entry first.
window.VFX_STEPS = [
  {name: "1 · Príprava plate", state: "done"},
  {name: "2 · 3D track kamery", state: "now"},
  {name: "3 · Maska cesty"},
  {name: "4 · CG prostredie"},
  {name: "5 · Stills na schválenie"},
  {name: "6 · Render + kompozit"},
];
window.VFX_LOG = [
  {step: "Krok 2 · 3D track", when: "25. 11. 2026",
   title: "Spúšťam solve kamery",
   html: `<p>Blender bol zavretý, takže solve kamery robím mimo neho cez COLMAP (photogrammetria / structure-from-motion). Výsledok, teda pohyb kamery, ohnisko a mračno 3D bodov, potom prenesiem do Blendru ako animovanú kameru.</p>
<ul><li>Jedna spoločná kamera pre všetky snímky (model SIMPLE_RADIAL, ohnisko a skreslenie sa dopočítajú).</li>
<li>Sekvenčné párovanie, každá snímka s 12 nasledujúcimi.</li>
<li>Auto sa hýbe, takže jeho body vypadnú ako outliery (RANSAC).</li></ul>`},
  {step: "Krok 1 · Príprava", when: "25. 11. 2026",
   title: "Plate: 174 snímok, 1920×816",
   html: `<p>Zdroj <code>Inspo/Dron_Shot_Inspo_1.mp4</code>: 7,3 s, 23,976 fps. Čierne pruhy sú vypálené v obraze, tak som ich orezal (1920×1080 → 1920×816) a vyexportoval PNG sekvenciu do <code>VFX_Dron_test/plate/</code>.</p>
<p>Kamera začína takmer zhora nad lesom a klesá za auto skoro do vodorovnej polohy. Vďaka veľkej paralaxe treba plný 3D solve, 2D track by nestačil.</p>
<table><tr><th>Pásmo</th><th>Vzdialenosť</th><th>Zdroj</th></tr>
<tr><td>Cesta, auto, krajnica s trávou</td><td>0 – ~8 m</td><td>plate</td></tr>
<tr><td>Prechod: tráva, burina, pustatina</td><td>~8 – 150 m</td><td>CG</td></tr>
<tr><td>Sídlisko, stožiare vedenia</td><td>150 – 800 m</td><td>CG (Dacia_mesto.blend)</td></tr>
<tr><td>Rafinéria, vzdialené mesto</td><td>1,5 – 2,5 km</td><td>CG</td></tr></table>`,
   imgs: [{src: "00_plate_strip.jpg", cap: "Plate po orezaní, snímky 1 · 36 · 71 · 106 · 141"}]},
];
