import {t} from './i18n.js';
import {provinceMunicipality} from './municipalities.js';

export function mapGroups(races) {
  const groups = new Map();
  for (const race of races) {
    const town = provinceMunicipality(race);
    const key = town?.id || `${race.lat},${race.lon}`;
    if (!groups.has(key)) groups.set(key, {name: town?.name || race.town, lat: town?.lat ?? race.lat, lon: town?.lon ?? race.lon, races: []});
    groups.get(key).races.push(race);
  }
  return [...groups.values()];
}

export function createRaceMap({container, status, onSelect}) {
  let map, layers, L, latest, loading;
  function update(races, origin, radius) {
    latest = {races, origin, radius};
    if (!map || container.hidden) return;
    layers.clearLayers();
    const groups = mapGroups(races);
    const centre = [origin.lat, origin.lon];
    const bounds = L.latLngBounds([centre]);
    L.circleMarker(centre, {radius: 9, color: '#fff', weight: 3, fillColor: '#204c3b', fillOpacity: 1})
      .bindTooltip(`Origen: ${origin.name}`).addTo(layers);
    if (radius !== 'all' && Number(radius) > 0) {
      const circle = L.circle(centre, {radius: Number(radius) * 1000, color: '#204c3b', weight: 2, fillOpacity: 0.06}).addTo(layers);
      bounds.extend(circle.getBounds());
    }
    for (const group of groups) {
      const popup = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = `${group.name} · ${group.races.length}`; popup.append(title);
      for (const race of group.races) {
        const button = document.createElement('button'); button.className = 'map-race-link';
        button.textContent = `${race.date.split('-').reverse().join('/')} · ${race.name}`;
        button.addEventListener('click', () => onSelect(race.id)); popup.append(button);
      }
      const marker = L.circleMarker([group.lat, group.lon], {radius: 8 + Math.min(group.races.length, 8), color: '#204c3b', weight: 2, fillColor: '#d5f477', fillOpacity: 0.95}).addTo(layers);
      marker.bindPopup(popup); marker.bindTooltip(`${group.name}: ${group.races.length} ${t('carreres')}`);
      const el = marker.getElement();
      if (el) {el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${group.name}: ${group.races.length} carreres`); el.addEventListener('keydown', e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); marker.openPopup();}});}
      bounds.extend([group.lat, group.lon]);
    }
    map.invalidateSize(); map.fitBounds(bounds, {padding: [25, 25], maxZoom: 12, animate: false});
    status.textContent = t(`${races.length} carreres en ${groups.length} localitats. ${radius === 'all' ? 'Tota la província, sense radi.' : `Radi de ${radius} km des de ${origin.name}.`}${races.length ? '' : ' Cap carrera amb estos filtres.'}`);
  }
  async function show() {
    container.hidden = false;
    if (!map) {
      loading ||= import('../assets/leaflet.js').catch(error => {loading = null; throw error;});
      L = await loading;
      if (!map) {
        // Leaflet needs an initial view before calculating a circle's bounds.
        map = L.map(container, {scrollWheelZoom: false})
          .setView([latest?.origin.lat ?? 39.4, latest?.origin.lon ?? -0.4], 10);
        L.tileLayer(container.dataset.tiles || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'})
          .on('tileerror', () => {status.textContent = t('No s’ha pogut carregar alguna part del mapa. Pots continuar consultant la llista.');}).addTo(map);
        layers = L.layerGroup().addTo(map);
      }
    }
    if (latest) update(latest.races, latest.origin, latest.radius);
  }
  return {update, show, hide() {container.hidden = true;}};
}
