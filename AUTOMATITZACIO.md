# Actualització diària

El procés de GitHub Actions consulta les fonts, valida les dades i publica el catàleg automàticament cada dia a les **05:17 UTC**: **06:17 a l’hivern i 07:17 a l’estiu** en Europe/Madrid. També s’executa quan canvia el codi dels lectors i es pot llançar amb `workflow_dispatch`. GitHub pot retardar l’hora d’inici.

La web desplegada llig el JSON públic de `main`, de manera que un canvi de dades no depén d’un nou desplegament de Vercel. Conserva una còpia local vàlida en el navegador i el JSON inclòs en el desplegament com a reserva. Si usa una còpia de reserva o hi ha fonts fallides, ho indica. En localhost es prova el JSON local.

## Què s’executa

1. Instal·lació reproduïble amb `npm ci` i proves dels lectors.
2. Descoberta de convocatòries, lectura de fitxes i comprovació del període i del radi.
3. Fusió amb els IDs existents, sense duplicar les distàncies d’una mateixa prova.
4. Validació del catàleg complet, compilació i proves.
5. Commit automàtic de **només** `data/races.json` i `data/sync-status.json`, amb el token temporal del mateix repositori.
6. Informe en el resum de l’execució i artefacte `sync-report` conservat 14 dies.

No cal cap token de Vercel, servei de pagament ni ordinador encés. Les accions oficials estan fixades a commits; el token d’escriptura només arriba al pas de publicació. El procés publica informació de convocatòries, no inscripcions ni llistes de participants.

## Cobertura automàtica

| Font | Descoberta i lectura |
| --- | --- |
| Cronorunner | Catàleg públic de totes les edicions publicades i detall de les modalitats. La data de la fitxa preval sobre la d’un calendari antic. |
| Sportmaniacs | Paginació de València i Castelló fins a les dates passades; fitxes i modalitats de carrera. |
| Runática | Secció de pròximes proves de la portada, separada de l’arxiu de resultats, i fitxes conegudes. |
| Multiesport | Calendaris de running, trail i cross, i fitxes conegudes. |
| Crono4Sports | Totes les tandes de «carregar més» del calendari públic i modalitats de les fitxes. |
| TopRun | Servei públic del calendari de portada i fitxes conegudes. |
| Valencia Ciudad del Running | Esdeveniments estructurats del calendari i fitxes conegudes. |
| FDM | Agenda i pàgines de paginació que publica; fitxes conegudes. |
| RunCáncer | Calendari estructurat i convocatòries conegudes. |
| RockTheSport | Actualització de les fitxes conegudes. No es presenta com una enumeració de tot el catàleg internacional: la cerca pública general necessita accés addicional. |
| Mychip | Pròximes convocatòries que publica la portada i fitxes conegudes, amb enllaços a RockTheSport quan n’hi ha. La portada limita el nombre de proves descobertes. |

Camp de Túria continua com a font de contrast manual; les seues carreres es consulten a través de Cronorunner. UPV conserva els casos pendents de la revisió manual. Esta automatització no promet trobar proves que encara no estan publicades ni superar els límits de descoberta de cada font.

La primera consulta completa del **09/11/2026** ha llegit **101 fitxes en onze fonts**, sense errors tècnics, i ha afegit dues cites: Mou-te per la MPOC (Sueca) i Trail Senglars (Favara). El catàleg de partida passa de 46 a **48 cites**.

## Proteccions de dades

- Mai s’esborra una carrera perquè una pàgina falle, torne 403, quede buida o desaparega d’una llista. Es conserva l’última versió bona. Una cancel·lació explícita sí que pot retirar-la.
- Les noves cites necessiten dia, població resolta sense ambigüitat i almenys una distància de carrera. Les incompletes queden fora de l’agenda com a pendents.
- Només entren dates posteriors a hui i fins a un any després, i poblacions a un màxim de 50 km entre centres aproximats. Els anys següents no s’extrapolen.
- Es distingixen dates de carrera i d’inscripció, caminades, dorsals zero, infantils i abonaments de circuit.
- La primera lectura automàtica pren una referència dels valors publicats i conserva les correccions manuals de distància/horari. Els ajornaments es poden incorporar en la primera lectura; els canvis posteriors dels camps publicats s’actualitzen automàticament.
- `scripts/sync/overrides.json` conté correccions condicionals, amb URL de reglament. La de Llíria només substituïx 11/21 per 11,3/20 mentre el calendari continue publicant exactament 11/21.
- Cada fitxa conserva la data de revisió manual i, separadament, la darrera consulta automàtica. Les notes antigues no es presenten com una comprovació actual d’inscripcions obertes.
- Les URLs d’organitzadors reutilitzades l’any següent generen una edició nova si la data avança més de 180 dies. Es conserven els IDs de les edicions antigues i no s’hereten distàncies desconegudes entre edicions.
- Les proves de la revisió manual usen una instantània històrica en `tests/fixtures/`; les noves incorporacions no trenquen un recompte fix de 46. El catàleg viu es valida amb regles generals.

## Fallades i manteniment excepcional

Una fallada parcial deixa funcionant les altres fonts i és visible en «Les fonts». Una fallada total conserva les carreres i marca l’execució de GitHub com a fallida. La web avisa si passen més de tres dies sense una consulta recent. Les notificacions d’execucions fallides depenen de les preferències de GitHub.

La consulta diària deixa un commit real del catàleg i de la seua salut encara que no canvien les carreres. Això manté activitat al repositori i traçabilitat de les comprovacions. No requerix revisions diàries teues; si una plataforma canvia l’estructura, pot caldre reparar el seu lector.

Per a diagnosticar o provar canvis, sense publicar:

```sh
npm ci
npm run sync:preview
npm test
npm run build
```

Per a actualitzar els fitxers locals:

```sh
npm run sync
```

`--sources=cronorunner,sportmaniacs` limita una consulta a fonts concretes; `--dry-run` evita modificar els fitxers públics. No s’han de confondre les consultes parcials amb una revisió completa.

El nomenclàtor és una còpia local de [GeoNames](https://www.geonames.org/export/), amb atribució CC BY. Inclou nuclis de la zona i poblacions d’altres punts d’Espanya per a detectar homònims i excloure llocs llunyans. La web acredita la font. Per a renovar-lo excepcionalment, descarrega `ES.zip` del servidor oficial i executa `python scripts/build-gazetteer.py ruta/ES.zip`.

## Canal públic de Telegram

1. Crea un canal públic en Telegram i crea el bot amb [BotFather](https://t.me/BotFather). Afig-lo com a administrador del canal amb permís per publicar missatges.
2. En **Settings → Secrets and variables → Actions** de GitHub, crea el secret `TELEGRAM_BOT_TOKEN` i la variable `TELEGRAM_CHAT_ID` amb el nom públic del canal, inclosa l’arrova. Introduïx el token directament en GitHub.
3. Executa **Novetats de carreres en Telegram → Run workflow → send** una vegada per fixar el catàleg de partida. Després, el workflow comprova les novetats a les 10.00 d’Europe/Madrid. El mode `preview` mostra el resum en el registre.
4. Per mostrar l’enllaç en el peu de la web, afegix la mateixa variable pública `TELEGRAM_CHAT_ID` al projecte de Vercel i redesplega.

El resum inclou les altes, les cancel·lacions confirmades i els canvis de data, hora i distàncies. L’estat es conserva en la branca `telegram-state`. Un rebuig explícit de Telegram conserva els fragments pendents per al següent intent. Davant d’un lliurament incert, revisa el canal i executa `confirm-delivery` si el missatge hi apareix o `retry-delivery` si hi falta. Després executa `send` per reprendre l’enviament.

## Vercel Web Analytics

Obri **Analytics** en el projecte de la web pública, prem **Enable** i redesplega producció. El build usa `VERCEL_ENV` per carregar el script en producció. Si Vercel indica un camí personalitzat per al script, posa’l en la variable de producció `VERCEL_ANALYTICS_SCRIPT_PATH`. Obri la web i comprova una petició a l’endpoint de vistes i la visita en el panell. [Guia de Vercel Web Analytics](https://vercel.com/docs/analytics/quickstart)

## Recorreguts

Les fitxes poden tindre una llista opcional `routes` amb modalitat, edició, tipus d’enllaç i font. L’actualització incorpora els enllaços amb edició i modalitat identificades i deixa els dubtes en `routePending` dins de l’informe diari. Els enllaços verificats manualment es poden afegir al catàleg i es conserven en les actualitzacions. Els GPX, TCX i FIT s’enllacen a l’origen i es poden importar com a trajecte des de Garmin Connect.

## Canvi de repositori

L’URL del catàleg viu en `lib/catalog.js` i les restriccions de repositori/branca del workflow i del publicador estan fixades a `AndreuJG/web_carreres`, branca `main`. En una còpia del projecte cal canviar-les deliberadament. Si el repositori es fa privat, l’URL pública deixa de ser una via vàlida i cal adaptar el lliurament de les dades.
