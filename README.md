# Córrer a prop

Agenda de carreres a peu a un màxim de **50 km de Catarroja**, en valencià. Versió revisada el **8 de novembre de 2026**, amb **46 cites publicades** de ruta, trail i infantils. La revisió de cobertura incorpora 28 cites i documenta també les exclusions i les discrepàncies.

Consulta [REVISIO.md](REVISIO.md) per a veure l’abast exacte de cada calendari, les incorporacions i els casos pendents. L’inventari [research/review.json](research/review.json) vincula les entrades revisades amb el catàleg i permet comprovar-ne la cobertura.

## Posar-la en marxa

Cal Node.js 22 o superior. No hi ha dependències ni pas de compilació.

```sh
npm run dev
```

Obri <http://127.0.0.1:4173>. Atura el servidor amb `Ctrl+C`. Cal servir els fitxers per HTTP: obrir `index.html` directament des del disc no permet carregar els mòduls i el JSON.

```sh
npm run check
npm test
```

`check` comprova sintaxi i integritat de les dades. Les 14 proves cobreixen dates de Madrid, anys de traspàs, límit anual, radi, cerca sense accents, filtres, guardades, exportació iCalendar, modalitats de caminada i cobertura de l’inventari de fonts.

## Què fa esta versió

- Agenda per mesos, ordenada per data o proximitat.
- Cerca per nom i població, sense necessitat d’escriure accents.
- Filtres combinables de radi (10/25/50 km), mes, distància de carrera, tipus (incloent trail i infantil) i font. Les distàncies seleccionades es combinen amb OR; els altres filtres, amb AND. Les distàncies llargues diferents de mitja/marató tenen filtre propi: 20 km no es classifica com a mitja marató.
- Fitxa amb horari, eixida, observacions, fonts i data de revisió.
- Carreres guardades en `localStorage`, sense compte. Si l’emmagatzematge no està disponible, funcionen durant la sessió.
- Exportació de les carreres visibles, o d’una carrera concreta, a `.ics`.
- Filtres en la URL per a compartir una selecció.
- Disseny adaptable, navegació per teclat, diàlegs natius i missatges d’error i de resultat buit.

## Criteris de selecció

**Temps:** des de demà fins a un any després del dia actual, amb data local d’`Europe/Madrid`. S’exclou tot el dia actual de manera conservadora per a no incloure carreres ja acabades. En la revisió inicial, el període és **09/11/2026–08/11/2027**. Es recalcula en carregar la pàgina i en aplicar filtres.

**Proximitat:** fórmula de Haversine entre el centre aproximat de Catarroja (39.402, −0.403) i el centre aproximat de la població. No són quilòmetres per carretera ni la distància exacta fins a l’eixida. El màxim de 50 km s’aplica sempre, encara que es manipule la URL.

**Convocatòries:** només edicions amb data publicada en una font primària o en la plataforma de la prova. No extrapolem l’any següent. Les cites amb diverses distàncies apareixen una vegada; els filtres comproven totes les variants. Incloem ruta, trail i proves infantils independents; s’exclouen triatlons, natació, ciclisme, caminades i competicions híbrides/OCR. Els abonaments de circuit no són carreres addicionals. Una data publicada no implica que queden dorsals.

**Calendari descarregat:** esdeveniments de dia complet amb els horaris en la descripció. Això evita assignar un horari incorrecte quan un mateix esdeveniment té diferents modalitats. El fitxer és una còpia estàtica; no rep ajornaments automàticament.

## Fonts i estat de la recerca

Les fonts i els enllaços de cada carrera són dins de [data/races.json](data/races.json), també accessibles des de «Les fonts» a la web.

| Font | Ús i límits en esta revisió |
| --- | --- |
| [Cronorunner](https://inscripciones.cronorunner.com/eventos) | 17 fitxes i cinc circuits revisats en navegador: 13 cites admissibles incorporades, dos esdeveniments del dia actual i dos fora del radi. |
| [Sportmaniacs](https://sportmaniacs.com/es) | València fins a les dates passades, abonaments de circuit i primera pàgina de Castelló fins a dates passades. 13 cites admissibles contrastades en navegador. |
| [RunCáncer](https://runcancer.com/carreras/) | Convocatòries solidàries i actualització de l’ajornament de València al 22/11/2026. |
| [Valencia Ciudad del Running](https://www.valenciaciudaddelrunning.com/calendario/) | Calendari, Breakfast Run, Marató, Ibercaja i 15K/7,5K. |
| [Fundació Esportiva Municipal](https://carreras.fdmvalencia.es/es/otras-carreras/) | Contrast de dates, distàncies i horaris; 10KFem de 2027. |
| [Runática](https://www.runatica.com/) | Sant Silvestre d’Alzira i Mitja Marató de 2027. |
| [TopRun](https://www.toprun.es/), [Multiesport](https://multiesport.es/calendario/) i [Crono4Sports](https://crono4sports.com/eventos) | Revisió dels calendaris vigents; incorporacions de Calderona, Llíria, Bonrepòs, Xeraco i Xàtiva. |
| [RockTheSport](https://web.rockthesport.com/) | Contrast individual de les mitges d’Algemesí i Paiporta–Picanya. |
| [Trifitness31](https://trifitness31.eu/calendario/) i [UPV](https://www.upv.es/entidades/ad/eventos-deportivos/carreras-upv/) | Contrast de les etapes de trail publicades i del circuit universitari. Dos cites UPV pendents de completar les fitxes de l’edició actual. |
| [Circuit Camp de Túria](https://circuitcampturia.com/) | Calendari i contrast de les proves de la comarca. |
| [AIMS](https://aims-worldrunning.org/races/854.html) i [Pas Ras](https://www.pasras.es/reglamento/) | Data del 21K de València de 2027 i reglament vigent de Pas Ras. |

**Correccions destacades:** Catarroja continua amb la nova data del **14/11/2026**, a les 08:30; Benifaió i Sagunt conserven les modalitats verificades. S’han confirmat hores de Marines, Bétera i Alzira; Llíria usa 11,3/20 km segons el reglament. Les discrepàncies de Mislata, Sot de Ferrer i Paiporta–Picanya es descriuen en cada fitxa. Els dos casos UPV estan en `pending`, fora de l’agenda.

Si un lector retorna una fitxa buida, «no disponible» o HTTP 403, comprova la pàgina en navegador abans de descartar-la. En els ajornaments, preval la convocatòria actualitzada sobre el calendari antic del circuit. L’estat de les inscripcions es documenta amb la data de revisió, sense presentar-lo com una comprovació en temps real.

## Actualitzar les carreres

Esta versió **no té un importador automàtic**: la recerca inicial s’ha fet manualment. Oculta les dates passades, però necessita noves revisions per a incorporar proves, canvis de data, cancel·lacions i convocatòries de 2027. Un avís apareix si la revisió té més de 30 dies.

1. Enumera totes les entrades i la paginació de Cronorunner i Sportmaniacs, i després les altres fonts i convocatòries oficials. Segueix el protocol de `REVISIO.md` i registra també les exclusions.
2. Afig o modifica una entrada a `data/races.json`. Usa un `id` estable per a l’edició; conserva els antics si encara tenen valor de traçabilitat.
3. Inclou nom, dia ISO, hora `HH:mm` o `null`, població, coordenades aproximades del seu centre, distàncies de carrera en km, tipus, fonts, URL i notes.
4. Actualitza `verifiedAt` de les entrades revisades i `updatedAt` del conjunt. No actualitzes les dates de revisió sense comprovar les fonts.
5. Si hi ha una discrepància sense resoldre o cancel·lació, retira la prova de `races` i documenta-la a `pending`.
6. Actualitza `research/review.json` i executa `npm run build` i `npm test`. Ajusta el recompte de la instantània juntament amb les seues dates; conserva les comprovacions de cobertura i les regressions.

Els `sourceIds` corresponen a les fonts que aporten o contrasten la convocatòria. No s’ha de marcar Sportmaniacs com a font d’una prova que no s’hi ha pogut comprovar.

## Publicació en GitHub Pages

L’estructura és estàtica i usa rutes relatives compatibles amb `/web_carreres/`. Després de pujar els fitxers al repositori, es pot configurar GitHub Pages per a servir l’arrel de la branca `main`, segons les opcions disponibles del repositori. `.nojekyll` evita el processament de Jekyll. No cal un servidor d’aplicació. Consulta les [instruccions oficials de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), inclosa la disponibilitat segons el pla i la visibilitat del repositori.

## Publicació en Vercel

`vercel.json` configura esta web com a projecte estàtic. `npm run build` valida les dades i copia només els fitxers que necessita la web a `dist/`.

1. Els fitxers han d’estar en un commit pujat a GitHub. Tindre’ls només en la carpeta local no els fa accessibles a Vercel.
2. Importa el repositori `AndreuJG/web_carreres` a Vercel i selecciona la branca `main`.
3. Usa l’arrel del repositori com a **Root Directory**. La configuració indica **Framework Preset: Other**, **Build Command: npm run build** i **Output Directory: dist**.
4. No calen variables d’entorn ni un servidor Node en producció.

Si la importació anterior indicava «repositori buit», torna a intentar-la després de pujar el primer commit. Si el projecte ja està creat, inicia un nou desplegament del commit de `main`.

Referència: [configuració de projecte de Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Estructura

```text
index.html              Estructura i controls accessibles
styles.css              Disseny i adaptació a mòbil
app.js                  Agenda, filtres, guardades i diàlegs
lib/races.js            Dates, geografia, selecció i iCalendar
data/races.json         Convocatòries, fonts i casos pendents
research/review.json    Inventari, decisions i abast de la revisió
REVISIO.md              Resultat i protocol de revisió de fonts
assets/favicon.svg      Identitat visual pròpia
scripts/serve.mjs        Servidor local, sense dependències
scripts/build.mjs        Prepara els fitxers públics de dist/
scripts/validate-data.mjs Validació del catàleg
vercel.json              Configuració del desplegament estàtic
tests/races.test.js      Proves de les regles de negoci
PLAN.md                 Fases següents i decisions de la v1
```
