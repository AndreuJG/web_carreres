import {load} from 'cheerio';
import {clean, norm} from './core.mjs';

const routeLabel = /\b(?:track|tracks|gpx|tcx|fit|recorregut|recorreguts|recorrido|recorridos|trazado|circuito|plano|perfil)\b/;

export function findRouteLinks(html, sourceUrl) {
  const $ = load(html || '');
  $('nav, header, footer, aside, script, style').remove();
  return $('a[href], iframe[src]').map((_, node) => {
    const link = $(node);
    const label = clean(link.text() || link.attr('title') || link.attr('aria-label') || link.find('img').attr('alt'));
    let url;
    try {
      url = new URL(link.attr('href') || link.attr('src'), sourceUrl);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const format = url.pathname.match(/\.(gpx|tcx|fit|pdf)$/i)?.[1].toLowerCase();
    const wikiloc = /^(?:[a-z]{2,3}\.|www\.)?wikiloc\.com$/.test(url.hostname)
      && /(?:-\d{5,}$|^\/wikiloc\/(?:embedv2|view)\.do$)/.test(url.pathname);
    if (wikiloc && url.pathname.endsWith('/embedv2.do')) {
      const id = url.searchParams.get('id');
      if (!/^\d+$/.test(id || '')) return null;
      url = new URL(`https://es.wikiloc.com/wikiloc/view.do?id=${id}`);
    }
    const marked = routeLabel.test(norm(label));
    const kind = wikiloc ? 'wikiloc' : format === 'pdf' && marked ? 'pdf' : format !== 'pdf' && format;
    if (!kind && !marked) return null;
    // The file name can disambiguate an edition but never supplies the modality by itself.
    const years = [...new Set((label + ' ' + url.pathname.split('/').filter(Boolean).at(-1))
      .match(/(?<!\d)20\d{2}(?!\d)/g) || [])];
    return {url: url.href, label, kind: kind || 'map', years, marked, sourceUrl};
  }).get().slice(0, 30);
}
