import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {language, t} from '../lib/i18n.js';
import {makeCalendar} from '../lib/races.js';

test('valencià per defecte, independent de l’idioma del navegador', () => {
  assert.equal(language,'ca'); assert.equal(t('Carregar mapa'),'Carregar mapa');
});
test('castellà explícit: traducció de filtres, dates, consentiment i estats dinàmics', () => {
  const script = `globalThis.location={search:'?lang=es'}; const {language,locale,t}=await import('./lib/i18n.js'); console.log(JSON.stringify([language,locale,t('Carregar mapa'),t('43 carreres · fins al 24 de novembre'),t('Rebutjar analítica'),t('Consulta diària: 24/11/26'),t('Tancar sense canviar')]));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',cwd:new URL('../',import.meta.url)});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),['es','es-ES','Cargar mapa','43 carreras · hasta el 24 de novembre','Rechazar analítica','Consulta diaria: 24/11/26','Cerrar sin cambiar']);
});
test('l’exportació castellana manté identitat i dates dels esdeveniments', () => {
  const race={id:'test',name:'Volta a Peu',date:'2027-01-01',location:'Plaça Major',town:'Catarroja',note:'Original',url:'https://example.org'};
  const calendar=makeCalendar([race],new Date('2026-11-24T10:00:00Z'),'es');
  assert(calendar.includes('X-WR-CALNAME:Carreras de Valencia'));
  assert(calendar.includes('SUMMARY:Volta a Peu')); assert(calendar.includes('Hora pendiente de confirmar.'));
});
