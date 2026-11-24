import {help, privacy} from './es-pages.js';
import {messages} from './es.js';
export const language = typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang') === 'es' ? 'es' : 'ca';
export const locale = language === 'es' ? 'es-ES' : 'ca-ES';
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phrases = Object.keys(messages).sort((a,b)=>b.length-a.length);
const pattern = new RegExp(`(?<![\\p{L}])(?:${phrases.map(escape).join('|')})(?![\\p{L}])`, 'gu');
export function t(value) {
  if (language !== 'es') return String(value);
  return String(value).replace(pattern, match => messages[match]);
}
export function localize(root = document) {
  if (language !== 'es') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.parentElement?.closest('script,style,[translate="no"],.brand,.footer-brand,#origin option,#source option,.source-item h3')) node.textContent = t(node.textContent);
  }
  const elements = [...(root.matches?.('*') ? [root] : []), ...root.querySelectorAll('[aria-label],[placeholder],meta[name="description"]')];
  for (const element of elements) {
    if (element.closest('[translate="no"]')) continue;
    for (const attr of ['aria-label','placeholder','content']) if (element.hasAttribute(attr)) element.setAttribute(attr, t(element.getAttribute(attr)));
  }
  for (const link of root.querySelectorAll('a[href]')) {
    if (link.getAttribute('href').startsWith('#')) continue;
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin === location.origin && !link.hasAttribute('data-language') && !url.pathname.startsWith('/api/')) {url.searchParams.set('lang','es'); link.href = url.href;}
  }
}
export function setupLanguage() {
  document.documentElement.lang = language === 'es' ? 'es' : 'ca-ES-valencia';
  const nav = document.querySelector('.site-header nav');
  if (nav && !document.querySelector('[data-language]')) {
    const group = document.createElement('span'); group.className = 'language-switch'; group.setAttribute('aria-label', language === 'es' ? 'Idioma' : 'Llengua');
    for (const [code,label] of [['ca','Valencià'],['es','Castellano']]) {
      const link = document.createElement('a'); const url = new URL(location.href);
      if (code === 'es') url.searchParams.set('lang','es'); else url.searchParams.delete('lang');
      link.href = url.href; link.dataset.language = code; link.lang = code; link.textContent = label;
      if (code === language) link.setAttribute('aria-current','true');
      // Compute from the latest URL so filters changed after page load are retained.
      link.addEventListener('click', event => {event.preventDefault(); const target = new URL(location.href); if(code==='es')target.searchParams.set('lang','es');else target.searchParams.delete('lang');location.assign(target.href);});
      group.append(link);
    }
    nav.append(group);
  }
  if (language === 'es') {const helpPage=document.querySelector('main#ajuda'); const privacyPage=document.querySelector('main#privacitat'); if(helpPage)helpPage.innerHTML=help; if(privacyPage)privacyPage.innerHTML=privacy;}
  localize();
}
