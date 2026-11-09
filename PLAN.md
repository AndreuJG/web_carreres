# Pla de treball · Córrer a prop

## Objectiu

Trobar ràpidament carreres a peu a menys de 50 km de Catarroja i dins dels pròxims 12 mesos, amb fonts consultables i sense presentar edicions antigues com a futures.

## Fase 1 · Primera versió implementada

- [x] Repositori revisat: buit, sense tecnologia ni instruccions prèvies.
- [x] Fonts prioritàries: Cronorunner i Sportmaniacs. Contrast amb organitzadors, circuits, FDM, RunCáncer, Runática i AIMS.
- [x] Selecció revisada de 46 cites el 08/11/2026, amb 28 incorporacions en la revisió de cobertura.
- [x] Dates discordants o sense convocatòria primària separades com a pendents.
- [x] Web en valencià, estàtica i sense dependències.
- [x] Agenda, filtres combinables, ordre per proximitat, fitxes amb fonts.
- [x] Guardades locals, enllaços amb filtres i exportació iCalendar.
- [x] Regles de data de Madrid, radi real amb Haversine i validació de dades.
- [x] 14 proves automatitzades i validació de les 46 fitxes, amb regressions de Sagunt, Benifaió, Catarroja, modalitats de caminada, distàncies llargues i cobertura de l’inventari.
- [x] Verificació en navegador: cerca sense accents, radi de 10 km, combinació de filtres, guardades, fitxa, fonts i estat buit.
- [x] Descàrrega real d’un fitxer iCalendar i comprovació de mòbil sense desbordament horitzontal.
- [x] Vista d’escriptori revisada i consola sense errors durant les comprovacions.

## Fase 2 · Cobertura i revisió de les fonts

1. Catarroja resolta: ajornament del 3 d’octubre al 14 de novembre; convocatòria i inscripció contrastades en navegador.
2. Sportmaniacs revisada directament: Sagunt incorporada. Si el lector de text retorna 403 o dades buides, contrastar en navegador abans de descartar una convocatòria. Benifaió també resolta amb la fitxa de Cronorunner.
3. Revisió ampliada completada: 17 fitxes i cinc circuits de Cronorunner, Sportmaniacs de València i Castelló, TopRun, Runática, Multiesport, Crono4Sports i organitzadors. Inclou ruta, trail i infantils; cobertura i límits documentats en `REVISIO.md` i `research/review.json`.
4. Revisar setmanalment els ajornaments de les proves pròximes i les noves convocatòries de 2027.
5. Afegir estat de convocatòria i d’inscripció quan es puguen comprovar, sense confondre «data publicada» amb «dorsals disponibles».
6. Completar les dos fitxes pendents del circuit UPV 2026–2027 quan es publiquen les distàncies i els horaris de l’edició actual.

## Fase 3 · Actualització diària implementada

- [x] Onze lectors amb consultes públiques i paginació de les fonts principals.
- [x] Deduplicació, control de dates, radi, caminades, dorsals zero i abonaments.
- [x] Conservació de dades bones davant de fallades i casos incomplets separats com a pendents.
- [x] Correccions condicionals de reglament, dates de consulta separades i detecció de canvis.
- [x] GitHub Actions diari, validació abans de publicar i informes de salut.
- [x] Catàleg viu en la web, amb còpia de reserva i avís de dades no actualitzades.
- [x] 31 proves, amb instantània històrica i validació del catàleg viu.

La primera sincronització del 09/11/2026 llig 101 fitxes sense errors i incorpora dos cites: total 48. Cobertura i límits exactes en `AUTOMATITZACIO.md`.

## Fase 4 · Publicació i millores

- Publicar en GitHub Pages des del repositori personal quan es vulga fer accessible.
- Afegir mapa només si facilita decidir on córrer; mantindre l’agenda com a vista principal.
- Valorar coordenades de l’arc d’eixida quan es publiquen, diferenciades del centre de la població.
- Valorar subscripció de calendari quan hi haja una actualització fiable. La descàrrega `.ics` actual és estàtica.

## Decisions de la primera versió

- **Web estàtica:** la funció principal és consultar un catàleg petit; no necessita autenticació, base de dades ni serveis externs d’execució.
- **Radi en línia recta:** criteri reproduïble i sense API de rutes; es presenta explícitament com a aproximació entre centres de població.
- **Sense dates deduïdes:** la falta de convocatòries per a molts mesos de 2027 és una limitació de les dades disponibles.
- **iCalendar de dia complet:** un mateix esdeveniment pot tindre horaris diferents segons la modalitat. La descripció conserva els horaris publicats.
