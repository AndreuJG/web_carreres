export const CONSENT_KEY = 'correr-a-prop:consent-v1';
export const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;
export function readConsent(storage, now = Date.now()) {
  try {
    const value = JSON.parse(storage?.getItem(CONSENT_KEY) || 'null');
    return value?.version === 1 && typeof value.analytics === 'boolean' && Number.isFinite(value.at) && value.at <= now && now - value.at < CONSENT_LIFETIME ? value : null;
  } catch {return null;}
}
