// VFX dron test – work log data. Newest entry first.
window.VFX_STEPS = [
  {name: "1 · Príprava plate", state: "done"},
  {name: "2 · 3D track kamery", state: "done"},
  {name: "3 · Maska cesty", state: "now"},
  {name: "4 · CG prostredie"},
  {name: "5 · Stills na schválenie"},
  {name: "6 · Render + kompozit"},
];
window.VFX_LOG = [
  {step: "Krok 2 · 3D track", when: "25. 11. 2026",
   title: "Track sedí: 174/174 snímok",
   html: `<p>Solve vyšiel. Zaregistrovaných je všetkých 174 snímok, máme 12 220 3D bodov a priemernú chybu 0,78 px. Pri skomprimovanom stiahnutom videe s motion blurom je to dobrý výsledok.</p>
<ul><li><b>Objektív:</b> 18,3 mm ekvivalent (horizontálne ~89°), skreslenie takmer nulové.</li>
<li><b>Orientácia:</b> rovina zeme nájdená z 3D bodov (RANSAC), +Z hore, +Y v smere letu.</li>
<li><b>Mierka:</b> podľa auta (Audi A6 Avant, šírka 1,87 m) má cesta ~7,0 m medzi krajnými čiarami. Prvý odhad z posledného snímku bol o 40 % vedľa, lebo tam sa cesta pri križovatke rozširuje.</li>
<li><b>Pohyb:</b> dron klesá z ~23 m na ~3 m nad cestou a za 7,3 s preletí ~200 m (~100 km/h).</li></ul>
<p><b>Kontrola:</b> mriežka 5 × 5 m a oranžové kužele sú CG v Blendri, vyrenderované so solvnutou kamerou cez plate. Celý záber sedia na ceste a nekĺžu. Mriežka končí po 300 m, preto je pod horizontom vidieť jej okraj.</p>
<p>Scéna: <code>VFX_Dron_test/VFX_Dron_test.blend</code> (kamera <code>CAM_solve</code>, plate ako pozadie kamery, mračno bodov).</p>`,
   video: {src: "02_track_check.mp4", cap: "Track check: CG mriežka + kužele cez plate (960×408)"},
   imgs: [{src: "02_track_check.jpg", cap: "Snímky 1 · 101 · 156 · 174"}]},
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
