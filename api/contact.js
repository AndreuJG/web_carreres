const buckets = new Map();
export function validMessage(body) {
  return body && typeof body.email === 'string' && body.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    && typeof body.message === 'string' && body.message.trim().length >= 10 && body.message.length <= 4000
    && (body.name === undefined || typeof body.name === 'string' && body.name.length <= 100);
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const recipient = process.env.CONTACT_EMAIL;
  if (req.method === 'GET') return res.status(200).json({available: Boolean(recipient && process.env.CONTACT_FORM_ACTIVE === 'true')});
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  if (!recipient) return res.status(503).json({error: 'Contact unavailable'});
  if (req.headers.origin !== 'https://carreresprop.vercel.app') return res.status(403).json({error: 'Forbidden'});
  if (!req.headers['content-type']?.startsWith('application/json')) return res.status(415).json({error:'JSON required'});
  if (Number(req.headers['content-length']) > 12000) return res.status(413).json({error:'Too large'});
  let body;
  try {body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;} catch {return res.status(400).json({error:'Invalid message'});}
  if (body?.website) return res.status(200).json({ok:true});
  if (!validMessage(body)) return res.status(400).json({error:'Invalid message'});
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0];
  const now = Date.now();
  for (const [key, value] of buckets) if (now - value.at > 3600000) buckets.delete(key);
  const limit = buckets.get(ip) || {at:now,count:0};
  if (limit.count >= 5 || buckets.size >= 2000) return res.status(429).json({error:'Try later'});
  limit.count++; buckets.set(ip,limit);
  try {
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
      method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Referer:'https://carreresprop.vercel.app/contacte.html',Origin:'https://carreresprop.vercel.app'},
      body:JSON.stringify({name:body.name?.trim() || 'Visitant',email:body.email.trim(),message:body.message.trim(),_subject:'Contacte · Córrer a prop',_template:'table',_captcha:'false',_url:'https://carreresprop.vercel.app/contacte.html'}),
      signal:AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok || ![true,'true'].includes(result.success)) console.error('Contact provider response', response.status, String(result.message || '').replace(/[^\s@]+@[^\s@]+/g, '[email]').slice(0,300));
    if (!response.ok || ![true,'true'].includes(result.success)) return res.status(502).json({error:'Delivery not confirmed'});
    return res.status(200).json({ok:true});
  } catch {return res.status(502).json({error:'Delivery not confirmed'});}
}
