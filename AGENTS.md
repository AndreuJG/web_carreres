# Córrer a prop

Agenda estàtica en valencià de carreres futures a la província de València. Producció: https://carreresprop.vercel.app. Mantindre el projecte Vercel existent; no crear altres projectes.

- HTML/CSS i mòduls JavaScript sense framework. `npm run build` prepara `dist`; el servidor local té una llista explícita de fitxers permesos.
- Valencià per defecte; castellà amb `?lang=es`. Traduccions en `lib/es.js` i `lib/es-pages.js`, gestió en `lib/i18n.js`. Conservar filtres i consentiment en canviar de llengua. Mantindre els noms oficials i identificar les notes del catàleg que es conserven en idioma original. No traduir identificadors ni valors de filtres.
- `data/races.json` és el catàleg. Els lectors són en `scripts/sync/`. No executar consultes reals a totes les fonts per verificar canvis de la interfície.
- Mantindre dates Europe/Madrid, finestra de demà fins a un any, àmbit provincial i filtres de 10/25/50 km o tota la província. Llista, mapa i exportació han d’usar les mateixes carreres filtrades.
- Les dades i tracks han de tindre procedència; no inventar dates ni presentar tracks antics com a actuals.
- Els permisos de les fonts estan sol·licitats, no concedits per defecte. Seguiment en `docs/permisos-fonts-correus.txt`. Instagram queda ajornat fins que estiga preparat i hi haja permisos. No enviar missatges a tercers sense instrucció expressa.
- Analítica només després de consentiment afirmatiu vigent. Rebutjar ha de ser tan accessible com acceptar. Mapes externs només després d’activació informada. No afegir píxels, geolocalització ni dependències remotes automàtiques.
- No mostrar tokens ni secrets. No alterar l’automatització de Telegram per canvis visuals. No afirmar que una actualització equival a una sola petició.
- Executar `npm test` i `npm run build` per canvis funcionals. Comprovar també la compilació de producció si es modifica el consentiment. Verificar la interfície en mòbil i escriptori quan siga possible; informar dels límits de verificació.
- Per defecte, un agent és suficient. Delegar només tasques independents quan estiga autoritzat i aporten una millora concreta.
