# Pla de treball · Córrer a prop

## Objectiu

Trobar ràpidament carreres a peu a menys de 50 km de Catarroja i dins dels pròxims 12 mesos, amb fonts consultables i sense presentar edicions antigues com a futures.

## Fase 1 · Primera versió implementada

- [x] Repositori revisat: buit, sense tecnologia ni instruccions prèvies.
- [x] Fonts prioritàries: Cronorunner i Sportmaniacs. Contrast amb organitzadors, circuits, FDM, RunCáncer, Runática i AIMS.
- [x] Selecció revisada de 18 cites el 08/11/2026, incloent Sagunt, Benifaió i Catarroja.
- [x] Dates discordants o sense convocatòria primària separades com a pendents.
- [x] Web en valencià, estàtica i sense dependències.
- [x] Agenda, filtres combinables, ordre per proximitat, fitxes amb fonts.
- [x] Guardades locals, enllaços amb filtres i exportació iCalendar.
- [x] Regles de data de Madrid, radi real amb Haversine i validació de dades.
- [x] 10 proves automatitzades i validació de les 18 fitxes, amb regressions de Sagunt, Benifaió i l’ajornament de Catarroja.
- [x] Verificació en navegador: cerca sense accents, radi de 10 km, combinació de filtres, guardades, fitxa, fonts i estat buit.
- [x] Descàrrega real d’un fitxer iCalendar i comprovació de mòbil sense desbordament horitzontal.
- [x] Vista d’escriptori revisada i consola sense errors durant les comprovacions.

## Fase 2 · Cobertura i revisió de les fonts

1. Catarroja resolta: ajornament del 3 d’octubre al 14 de novembre; convocatòria i inscripció contrastades en navegador.
2. Sportmaniacs revisada directament: Sagunt incorporada. Si el lector de text retorna 403 o dades buides, contrastar en navegador abans de descartar una convocatòria. Benifaió també resolta amb la fitxa de Cronorunner.
3. Ampliar la cerca a l’Horta Sud, Ribera, Camp de Túria i Camp de Morvedre, incloent trail amb convocatòria publicada.
4. Revisar setmanalment els ajornaments de les proves pròximes i les noves convocatòries de 2027.
5. Afegir estat de convocatòria i d’inscripció quan es puguen comprovar, sense confondre «data publicada» amb «dorsals disponibles».

## Fase 3 · Actualització assistida

1. Comprovar si les fonts ofereixen un canal oficial reutilitzable (API, calendari o exportació). No es pressuposa que existisca.
2. Implementar adaptadors per font amb dades d’entrada guardades per a provar l’extracció, errors visibles i deduplicació per prova/edició.
3. Separar candidats detectats de convocatòries verificades. Els errors d’extracció no han d’esborrar el catàleg revisat.
4. Produir un canvi revisable al JSON, amb data de consulta i URL, abans d’incorporar-lo a l’agenda.
5. Afegir execució periòdica quan l’importador siga estable i s’haja decidit com revisar els resultats.

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
