// VFX dron test – work log data. Newest entry first.
window.VFX_STEPS = [
  {name: "1 · Príprava plate", state: "done"},
  {name: "2 · 3D track kamery", state: "done"},
  {name: "3 · Maska cesty", state: "done"},
  {name: "4 · CG prostredie", state: "done"},
  {name: "5 · Stills na schválenie", state: "now"},
  {name: "6 · Render + kompozit"},
];
window.VFX_LOG = [
  {step: "Krok 5 · Clay", when: "25. 11. 2026",
   title: "Clay render celého záberu s autom",
   html: `<p>Celých 174 snímok: CG scéna v sivej clay (bez textúr), cez ňu cesta, krajnica a auto z plate cez masku. Je tu vidno, ako track drží v pohybe: zem, kríky aj mesto sa hýbu presne s kamerou, od pohľadu zhora až po nízky prelet za autom.</p>
<p>Cycles, 16 spp + denoise, ~3 s na snímku. Clay je zámerne bez farieb a materiálov. Na realizme scény sa pracuje (Megascans).</p>`,
   video: {src: "05_clay_comp.mp4", poster: "05_clay_poster.jpg", cap: "Clay render + plate (cesta, auto) · 7,3 s · 1280×544"},
   imgs: [{src: "05_clay_sheet.jpg", cap: "Snímky 1 · 61 · 121 · 174"}]},
  {step: "Krok 5 · Stills v01", when: "25. 11. 2026",
   title: "Prvé stills: začiatok · stred · koniec",
   html: `<p>Prvý kompozit troch snímok: plate cez masku cesty, pod ním CG z Blendru (Cycles, 64 spp, ~6 s na snímku). Na CG je zladenie farieb podľa plate s jednými koeficientmi pre celý záber, aby neblikalo. Navrch jemné rozostrenie a zrno.</p>
<p><b>Čo už sedí:</b> kamera, mierka a horizont. Mesto, komíny, stožiare a vedenie sú na správnom mieste a krajnica z plate prechádza do CG terénu.</p>
<p><b>Čo ešte nesedí (ďalšie kolo):</b></p>
<ul><li>Obloha je po zladení farieb sivá a matná, plate má svetlú teplú oblohu s protisvetlom. Treba oddeliť oblohu a opar a zladiť ich zvlášť.</li>
<li>Stromy sú príliš červené a tvarom pôsobia ako savana. Plate má ihličnany a brezy, takže vymením zdroje vegetácie a ubratím jesenné farbenie.</li>
<li>CG má tvrdé slnko s ostrými tieňmi, plate mäkké nízke svetlo. Treba slabšie slnko, viac oblohy a opar podľa vzdialenosti.</li>
<li>Odbočka na konci (vpravo) je maskou rovno odrezaná.</li></ul>
<p><b>Cestou opravené:</b> po presune projektu do <code>4_Rocnik</code> chýbalo 95 textúr (ružové plochy na prvom pokuse), teraz sú prelinkované v kópii. Motion blur v CG bol oveľa silnejší ako na plate, ten je točený krátkou uzávierkou, tak som ho vypol. Prechod masky je užší.</p>`,
   imgs: [{src: "04_comp_0001.jpg", cap: "Snímka 1: kompozit"}, {src: "04_comp_0090.jpg", cap: "Snímka 90: kompozit"},
          {src: "04_comp_0174.jpg", cap: "Snímka 174: kompozit"}, {src: "04_plate_vs_comp.jpg", cap: "Vľavo pôvodný plate, vpravo kompozit v01"},
          {src: "04_v0_missing_tex.jpg", cap: "Pokus v00: chýbajúce textúry (ružová) a rovnaká kamera na všetkých snímkach, opravené"}]},
  {step: "Krok 4 · CG prostredie", when: "25. 11. 2026",
   title: "Staviam mesto okolo dronovej kamery",
   html: `<p>Mesto z <code>Dacia_mesto.blend</code> (sídlisko, rafinéria, stožiare, komíny) beží v <b>kópii</b> súboru <code>VFX_Dron_test/VFX_mesto.blend</code>, originál ostáva nedotknutý.</p>
<ul><li>Dronovú kameru som postavil na miesto pôvodnej proxy kamery, takže kompozícia v03 ostáva. Smer letu je rovnaký ako jej pohľad.</li>
<li>Celé mesto je posunuté o 35 m do strany, inak by stožiar vysokého napätia stál priamo na ceste z plate. Teraz vedenie cestu križuje nad hlavou.</li>
<li>Sídlisko je pregenerované pre širší objektív (89° namiesto 54°), od ~330 m pred koncom letu. Pozdĺž cesty nechávam 88 m voľný koridor.</li>
<li>CG cesta (asfalt + čiary) nadväzuje na cestu z plate a pokračuje do mesta.</li>
<li>Blízke okolie (0–300 m) tvorí nový rozptyl krovín, náletových drevín a remízok s hustejšími aj redšími miestami. Pôvodná vegetácia bola postavená len pre starú kameru.</li></ul>`},
  {step: "Krok 3 · Maska cesty", when: "25. 11. 2026",
   title: "Cesta nájdená v 3D, maska podľa kamery",
   html: `<p>Na každom 6. snímku automaticky detegujem asfalt (sivá s nízkou saturáciou + biele čiary) a stred cesty premietam cez solvnutú kameru na zem. Z 1 351 bodov vychádza priebeh cesty v 3D s rozptylom ±0,6 m. Asfalt má ~8 m.</p>
<p>Maska je pás v 3D: asfalt plus ~2,5 m krajnice s trávou na každú stranu, s mäkkým prechodom ďalších 3,5 m. Renderuje sa tou istou kamerou, preto nekĺže a netreba ju ručne rotovať. Ďaleko (250–330 m) sa plate postupne stráca a cestu do mesta preberá CG.</p>`,
   imgs: [{src: "03_asfalt_maska.jpg", cap: "Automatická detekcia asfaltu: snímky 1 · 61 · 121 · 169 (svetlé = asfalt)"}]},
  {step: "Krok 2 · 3D track", when: "25. 11. 2026",
   title: "Track sedí: 174/174 snímok",
   html: `<p>Solve vyšiel. Zaregistrovaných je všetkých 174 snímok, máme 12 220 3D bodov a priemernú chybu 0,78 px. Pri skomprimovanom stiahnutom videe s motion blurom je to dobrý výsledok.</p>
<ul><li><b>Objektív:</b> 18,3 mm ekvivalent (horizontálne ~89°), skreslenie takmer nulové.</li>
<li><b>Orientácia:</b> rovina zeme nájdená z 3D bodov (RANSAC), +Z hore, +Y v smere letu.</li>
<li><b>Mierka:</b> podľa auta (Audi A6 Avant, šírka 1,87 m) má cesta ~7,0 m medzi krajnými čiarami. Prvý odhad z posledného snímku bol o 40 % vedľa, lebo tam sa cesta pri križovatke rozširuje.</li>
<li><b>Pohyb:</b> dron klesá z ~23 m na ~3 m nad cestou a za 7,3 s preletí ~200 m (~100 km/h).</li></ul>
<p><b>Kontrola:</b> mriežka 5 × 5 m a oranžové kužele sú CG v Blendri, vyrenderované so solvnutou kamerou cez plate. Celý záber sedia na ceste a nekĺžu. Mriežka končí po 300 m, preto je pod horizontom vidieť jej okraj.</p>
<p>Scéna: <code>VFX_Dron_test/VFX_Dron_test.blend</code> (kamera <code>CAM_solve</code>, plate ako pozadie kamery, mračno bodov).</p>`,
   video: {src: "02_track_check.mp4", poster: "02_poster.jpg", cap: "Track check: CG mriežka + kužele cez plate (960×408)"},
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
