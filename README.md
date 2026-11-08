# Córrer a prop

Agenda de carreres a peu a un màxim de **50 km de Catarroja**, en valencià. Versió revisada el **8 de novembre de 2026**, amb 18 cites publicades. Inclou Sagunt, Benifaió i Catarroja després de contrastar les fitxes directament en navegador.

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

`check` comprova sintaxi i integritat de les dades. Les proves cobreixen dates de Madrid, anys de traspàs, límit anual, radi, cerca sense accents, filtres, guardades i exportació iCalendar.

## Què fa esta versió

- Agenda per mesos, ordenada per data o proximitat.
- Cerca per nom i població, sense necessitat d’escriure accents.
- Filtres combinables de radi (10/25/50 km), mes, distància de carrera, tipus i font. Les distàncies seleccionades es combinen amb OR; els altres filtres, amb AND.
- Fitxa amb horari, eixida, observacions, fonts i data de revisió.
- Carreres guardades en `localStorage`, sense compte. Si l’emmagatzematge no està disponible, funcionen durant la sessió.
- Exportació de les carreres visibles, o d’una carrera concreta, a `.ics`.
- Filtres en la URL per a compartir una selecció.
- Disseny adaptable, navegació per teclat, diàlegs natius i missatges d’error i de resultat buit.

## Criteris de selecció

**Temps:** des de demà fins a un any després del dia actual, amb data local d’`Europe/Madrid`. S’exclou tot el dia actual de manera conservadora per a no incloure carreres ja acabades. En la revisió inicial, el període és **09/11/2026–08/11/2027**. Es recalcula en carregar la pàgina i en aplicar filtres.

**Proximitat:** fórmula de Haversine entre el centre aproximat de Catarroja (39.402, −0.403) i el centre aproximat de la població. No són quilòmetres per carretera ni la distància exacta fins a l’eixida. El màxim de 50 km s’aplica sempre, encara que es manipule la URL.

**Convocatòries:** només edicions amb data publicada en una font primària o en la plataforma de la prova. No extrapolem l’any següent. Les cites amb diverses distàncies apareixen una vegada; els filtres comproven totes les variants. S’exclouen triatlons i modalitats de marxa. Una data publicada no implica que queden dorsals.

**Calendari descarregat:** esdeveniments de dia complet amb els horaris en la descripció. Això evita assignar un horari incorrecte quan un mateix esdeveniment té diferents modalitats. El fitxer és una còpia estàtica; no rep ajornaments automàticament.

## Fonts i estat de la recerca

Les fonts i els enllaços de cada carrera són dins de [data/races.json](data/races.json), també accessibles des de «Les fonts» a la web.

| Font | Ús i límits en esta revisió |
| --- | --- |
| [Cronorunner](https://inscripciones.cronorunner.com/eventos) | Prioritària per indicació de l’usuari. Benifaió i Catarroja contrastades en navegador amb dates, distàncies i horaris. La càrrega amb JavaScript pot donar una lectura de text incompleta. |
| [Sportmaniacs](https://sportmaniacs.com/es) | Prioritària per indicació de l’usuari. Sagunt contrastada directament en navegador: 15/11/2026, 08:30, proves de 10, 21 i 30 km. Un error 403 del lector de text no implica que la convocatòria siga inaccessible. |
| [RunCáncer](https://runcancer.com/carreras/) | Convocatòries solidàries i actualització de l’ajornament de València al 22/11/2026. |
| [Valencia Ciudad del Running](https://www.valenciaciudaddelrunning.com/calendario/) | Calendari, Breakfast Run, Marató, Ibercaja i 15K/7,5K. |
| [Fundació Esportiva Municipal](https://carreras.fdmvalencia.es/es/otras-carreras/) | Contrast de dates, distàncies i horaris; 10KFem de 2027. |
| [Runática](https://www.runatica.com/) | Sant Silvestre d’Alzira i Mitja Marató de 2027. |
| [Circuit Camp de Túria](https://circuitcampturia.com/) | Calendari i contrast de les proves de la comarca. |
| [AIMS](https://aims-worldrunning.org/races/854.html) i [Pas Ras](https://www.pasras.es/reglamento/) | Data del 21K de València de 2027 i reglament vigent de Pas Ras. |

**Correccions de la revisió:** Catarroja està ajornada del 03/10 al **14/11/2026**, amb eixida a les 08:30 i inscripció oberta en el moment de revisar-la (termini publicat: 11/11 a les 23:59). Benifaió confirma el **15/11/2026 a les 09:30**, amb 10K i mitja marató. Sagunt confirma el **15/11/2026 a les 08:30**, amb 10K, 21K i 30K. Les tres apareixen en l’agenda; ja no hi ha casos pendents d’esta revisió.

Si un lector retorna una fitxa buida, «no disponible» o HTTP 403, comprova la pàgina en navegador abans de descartar-la. En els ajornaments, preval la convocatòria actualitzada sobre el calendari antic del circuit. L’estat de les inscripcions es documenta amb la data de revisió, sense presentar-lo com una comprovació en temps real.

## Actualitzar les carreres

Esta versió **no té un importador automàtic**: la recerca inicial s’ha fet manualment. Oculta les dates passades, però necessita noves revisions per a incorporar proves, canvis de data, cancel·lacions i convocatòries de 2027. Un avís apareix si la revisió té més de 30 dies.

1. Revisa Cronorunner i Sportmaniacs, i després les fonts oficials de cada convocatòria.
2. Afig o modifica una entrada a `data/races.json`. Usa un `id` estable per a l’edició; conserva els antics si encara tenen valor de traçabilitat.
3. Inclou nom, dia ISO, hora `HH:mm` o `null`, població, coordenades aproximades del seu centre, distàncies de carrera en km, tipus, fonts, URL i notes.
4. Actualitza `verifiedAt` de les entrades revisades i `updatedAt` del conjunt. No actualitzes les dates de revisió sense comprovar les fonts.
5. Si hi ha una discrepància sense resoldre o cancel·lació, retira la prova de `races` i documenta-la a `pending`.
6. Executa `npm run check` i `npm test`. La prova de recompte inicial s’haurà d’ajustar quan canvie la selecció de partida.

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
assets/favicon.svg      Identitat visual pròpia
scripts/serve.mjs        Servidor local, sense dependències
scripts/build.mjs        Prepara els fitxers públics de dist/
scripts/validate-data.mjs Validació del catàleg
vercel.json              Configuració del desplegament estàtic
tests/races.test.js      Proves de les regles de negoci
PLAN.md                 Fases següents i decisions de la v1
```
