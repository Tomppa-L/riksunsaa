// Tomppa – Riksun Sää
// Data: Ilmatieteen laitos, avoin data (CC BY 4.0). Ei riippuvuuksia, ei build-vaihetta.
'use strict';

const PLACE = 'Riihimäki';
const LATLON = '60.7377,24.7773';
const WFS = 'https://opendata.fmi.fi/wfs';
const REFRESH_MIN = 15;

// ---------- apufunktiot ----------
const $ = (id) => document.getElementById(id);
const MINUS = '−';
const num = (v, d = 0) => {
  const s = Math.abs(v).toFixed(d).replace('.', ',');
  return (v < 0 && Number(s.replace(',', '.')) !== 0 ? MINUS : '') + s;
};
const deg = (t) => {
  const r = Math.round(t);
  return (r < 0 ? MINUS + Math.abs(r) : r > 0 ? '+' + r : '0') + '°';
};
const pad2 = (n) => String(n).padStart(2, '0');
const hhmm = (d) => d.getHours() + '.' + pad2(d.getMinutes());
const isoHour = (d) => { const x = new Date(d); x.setMinutes(0, 0, 0); return x.toISOString().replace('.000', ''); };

// ---------- haku Ilmatieteen laitokselta ----------
async function wfs(storedquery, params) {
  const q = new URLSearchParams({ service: 'WFS', version: '2.0.0', request: 'getFeature', storedquery_id: storedquery, ...params });
  const res = await fetch(WFS + '?' + q.toString());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
  if (doc.getElementsByTagNameNS('*', 'ExceptionReport').length) throw new Error('FMI: virheellinen kysely');
  const byTime = new Map();
  for (const el of doc.getElementsByTagNameNS('*', 'BsWfsElement')) {
    const t = el.getElementsByTagNameNS('*', 'Time')[0].textContent;
    const p = el.getElementsByTagNameNS('*', 'ParameterName')[0].textContent;
    const v = parseFloat(el.getElementsByTagNameNS('*', 'ParameterValue')[0].textContent);
    if (!byTime.has(t)) byTime.set(t, { time: new Date(t) });
    byTime.get(t)[p] = Number.isFinite(v) ? v : null;
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

async function getForecast() {
  const now = new Date();
  const end = new Date(now.getTime() + 10.5 * 24 * 3600e3);
  const time = { starttime: isoHour(now), endtime: isoHour(end), timestep: '60' };
  const full = 'Temperature,WindSpeedMS,WindDirection,Precipitation1h,WeatherSymbol3,Humidity,HourlyMaximumGust';
  const basic = 'Temperature,WindSpeedMS,WindDirection,Precipitation1h,WeatherSymbol3';
  // Virallinen, meteorologin muokkaama ennuste; varalla HARMONIE-malli.
  const tries = [
    ['fmi::forecast::edited::weather::scandinavia::point::simple', { place: PLACE, parameters: full }],
    ['fmi::forecast::edited::weather::scandinavia::point::simple', { place: PLACE, parameters: basic }],
    ['fmi::forecast::edited::weather::scandinavia::point::simple', { latlon: LATLON, parameters: basic }],
    ['fmi::forecast::harmonie::surface::point::simple', { latlon: LATLON, parameters: basic }],
  ];
  let lastErr;
  for (const [sq, p] of tries) {
    try {
      const rows = await wfs(sq, { ...p, ...time });
      const ok = rows.filter((r) => r.Temperature != null);
      if (ok.length) return ok;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Ennustetta ei saatu');
}

async function getObservation() {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 3600e3);
  try {
    const rows = await wfs('fmi::observations::weather::simple', {
      place: PLACE, parameters: 't2m,ws_10min,wg_10min,wd_10min,rh,p_sea,r_1h',
      starttime: start.toISOString().replace(/\.\d+Z$/, 'Z'), timestep: '10',
    });
    const latest = {};
    for (const r of rows) for (const k of Object.keys(r)) if (r[k] != null) latest[k] = r[k];
    return latest.t2m != null ? latest : null;
  } catch { return null; }
}

// ---------- sääsymbolit ----------
const TEXTS = {
  1: 'Selkeää', 2: 'Puolipilvistä', 3: 'Pilvistä',
  21: 'Heikkoja sadekuuroja', 22: 'Sadekuuroja', 23: 'Voimakkaita sadekuuroja',
  31: 'Heikkoa vesisadetta', 32: 'Vesisadetta', 33: 'Voimakasta vesisadetta',
  41: 'Heikkoja lumikuuroja', 42: 'Lumikuuroja', 43: 'Voimakkaita lumikuuroja',
  51: 'Heikkoa lumisadetta', 52: 'Lumisadetta', 53: 'Voimakasta lumisadetta',
  61: 'Ukkoskuuroja', 62: 'Voimakkaita ukkoskuuroja', 63: 'Ukkosta', 64: 'Voimakasta ukkosta',
  71: 'Heikkoja räntäkuuroja', 72: 'Räntäkuuroja', 73: 'Voimakkaita räntäkuuroja',
  81: 'Heikkoa räntäsadetta', 82: 'Räntäsadetta', 83: 'Voimakasta räntäsadetta',
  91: 'Utua', 92: 'Sumua',
};
function symbol(code) {
  let c = Math.round(code || 0);
  if (c > 100) c -= 100;
  let kind = 'cloud';
  if (c === 1) kind = 'sun';
  else if (c === 2) kind = 'partly';
  else if ((c >= 21 && c <= 23) || (c >= 31 && c <= 33)) kind = c < 30 ? 'showers' : 'rain';
  else if ((c >= 41 && c <= 43) || (c >= 51 && c <= 53)) kind = 'snow';
  else if (c >= 61 && c <= 64) kind = 'thunder';
  else if (c >= 71 && c <= 83) kind = 'sleet';
  else if (c >= 91) kind = 'fog';
  return { kind, text: TEXTS[c] || '' };
}
// Karkea valoisan ajan arvio Riihimäelle kuukausittain (auringonnousu, -lasku tunteina).
const DAYLIGHT = [[9, 15], [8, 17], [7, 18], [6, 20], [5, 21], [4, 22], [4, 22], [5, 21], [7, 19], [8, 17], [9, 15], [9, 15]];
const isNight = (d) => { const [a, b] = DAYLIGHT[d.getMonth()]; const h = d.getHours(); return h < a || h >= b; };

const CLOUD_HI = 'M7 14h10a3.5 3.5 0 0 0 .5-6.96A5.2 5.2 0 0 0 7.3 6.4 3.8 3.8 0 0 0 7 14z';
const CLOUD = 'M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z';
// Värit tulevat CSS:stä (.wx), joten kuvakkeet toimivat sekä vaaleassa että tummassa teemassa.
function icon(kind, night, label) {
  const a = `class="wx" role="img" aria-label="${label || ''}" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const sun = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`;
  const moon = `<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`;
  const dots = `<circle class="dot" cx="8" cy="18" r="1"/><circle class="dot" cx="12" cy="20" r="1"/><circle class="dot" cx="16" cy="18" r="1"/>`;
  const drops = `<path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>`;
  switch (kind) {
    case 'sun': return night ? `<svg ${a}><g class="m">${moon}</g></svg>` : `<svg ${a}><g class="s">${sun}</g></svg>`;
    case 'partly': return `<svg ${a}><g class="${night ? 'm' : 's'}" transform="translate(-3 -4) scale(.75)">${night ? moon : sun}</g><path class="cf" d="M9 20h8.5a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 9.2 12.3 3.9 3.9 0 0 0 9 20z"/></svg>`;
    case 'rain': case 'showers': return `<svg ${a}><path d="${CLOUD_HI}"/>${drops}</svg>`;
    case 'snow': return `<svg ${a}><path d="${CLOUD_HI}"/>${dots}</svg>`;
    case 'sleet': return `<svg ${a}><path d="${CLOUD_HI}"/><path d="M8 17l-1 3M16 17l-1 3"/><circle class="dot" cx="12" cy="19" r="1"/></svg>`;
    case 'thunder': return `<svg ${a}><path d="${CLOUD_HI}"/><path class="s" d="M13 15l-2 3h3l-2 4"/></svg>`;
    case 'fog': return `<svg ${a}><path d="M4 9h16M3 13h18M5 17h14"/></svg>`;
    default: return `<svg ${a}><path d="${CLOUD}"/></svg>`;
  }
}

// ---------- tuuli ----------
const DIRS = ['pohjoisesta', 'koillisesta', 'idästä', 'kaakosta', 'etelästä', 'lounaasta', 'lännestä', 'luoteesta'];
const dirName = (d) => DIRS[Math.round(((d % 360) + 360) % 360 / 45) % 8];
const arrow = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${(d + 180) % 360}deg)" aria-hidden="true"><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>`;
function feelsLike(t, v) {
  if (t == null || v == null || t > 10 || v < 1.4) return t;
  const p = Math.pow(v, 0.16);
  return 13.12 + 0.6215 * t - 13.956 * p + 0.4867 * t * p;
}

// ---------- piirto ----------
function renderNow(obs, fc) {
  const f = fc[0];
  const night = isNight(new Date());
  const s = symbol(f.WeatherSymbol3);
  const t = obs ? obs.t2m : f.Temperature;
  const ws = obs && obs.ws_10min != null ? obs.ws_10min : f.WindSpeedMS;
  const wd = obs && obs.wd_10min != null ? obs.wd_10min : f.WindDirection;
  const gust = obs && obs.wg_10min != null ? obs.wg_10min : f.HourlyMaximumGust;
  const rain = obs && obs.r_1h != null ? obs.r_1h : f.Precipitation1h;
  const hum = obs && obs.rh != null ? obs.rh : f.Humidity;
  const pres = obs ? obs.p_sea : null;

  $('nowTemp').textContent = deg(t);
  $('nowDesc').textContent = s.text || ' ';
  const fl = feelsLike(t, ws);
  $('nowFeels').textContent = fl != null && Math.round(fl) !== Math.round(t) ? 'Tuntuu kuin ' + deg(fl) : ' ';
  $('nowIcon').innerHTML = icon(s.kind, night, s.text);
  $('wind').textContent = ws != null ? Math.round(ws) + ' m/s' : '–';
  $('windArrow').innerHTML = wd != null ? arrow(wd) : '';
  $('windDir').textContent = wd != null ? dirName(wd) + (gust != null ? ', puuskissa ' + Math.round(gust) : '') : '';
  $('rain').textContent = rain != null ? num(rain, 1) + ' mm' : '–';
  $('hum').textContent = hum != null ? Math.round(hum) + ' %' : '–';
  $('pres').textContent = pres != null ? Math.round(pres) + ' hPa' : '–';
  $('nowSource').textContent = obs ? 'Lämpötila ja tuuli: Ilmatieteen laitoksen havainto' : 'Havaintoa ei saatu, näytetään ennuste';
}

function renderHourly(fc) {
  const hrs = fc.slice(0, 24);
  const W = 56, H = 56;
  const temps = hrs.map((h) => h.Temperature);
  const tMax = Math.max(...temps), tMin = Math.min(...temps);
  const pts = temps.map((t, i) => `${i * W + W / 2},${(8 + ((tMax - t) / ((tMax - tMin) || 1)) * 40).toFixed(1)}`).join(' ');
  const cells = hrs.map((h, i) => {
    const s = symbol(h.WeatherSymbol3);
    return `<div class="hcell"><span class="htime">${i === 0 ? 'Nyt' : pad2(h.time.getHours())}</span>${icon(s.kind, isNight(h.time), s.text)}<span class="htemp">${deg(h.Temperature)}</span></div>`;
  }).join('');
  const bars = hrs.map((h) => {
    const mm = h.Precipitation1h || 0;
    const bh = mm > 0 ? Math.min(40, Math.max(4, Math.round(mm * 30))) : 2;
    return `<div class="pcell"><div class="pbar${mm > 0 ? ' wet' : ''}" style="height:${bh}px"></div><span class="pval">${mm > 0 ? num(mm, 1) : ''}</span></div>`;
  }).join('');
  const el = $('hourly');
  el.style.width = hrs.length * W + 'px';
  el.innerHTML = `<div class="hrow">${cells}</div>
    <svg width="${hrs.length * W}" height="${H}" aria-hidden="true"><polyline class="curve" points="${pts}" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
    <div class="prow">${bars}</div>`;
}

const WEEKDAYS = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
function renderDaily(fc) {
  const days = new Map();
  for (const h of fc) {
    const key = h.time.toDateString();
    if (!days.has(key)) days.set(key, { date: h.time, temps: [], rain: 0, syms: [] });
    const d = days.get(key);
    d.temps.push(h.Temperature);
    d.rain += h.Precipitation1h || 0;
    d.syms.push({ hour: h.time.getHours(), code: h.WeatherSymbol3 });
  }
  const list = [...days.values()].slice(0, 10);
  const lo = Math.min(...list.map((d) => Math.min(...d.temps)));
  const hi = Math.max(...list.map((d) => Math.max(...d.temps)));
  const span = (hi - lo) || 1;
  const today = new Date().toDateString();
  $('daily').innerHTML = list.map((d) => {
    const mn = Math.min(...d.temps), mx = Math.max(...d.temps);
    // Päivän kuvake: klo 14 tienoilla, muuten yleisin.
    const mid = d.syms.reduce((b, s) => (Math.abs(s.hour - 14) < Math.abs(b.hour - 14) ? s : b), d.syms[0]);
    const s = symbol(mid.code);
    const left = ((mn - lo) / span) * 100;
    const width = Math.max(6, ((mx - mn) / span) * 100);
    const label = d.date.toDateString() === today ? 'Tänään' : `${WEEKDAYS[d.date.getDay()]} ${d.date.getDate()}.${d.date.getMonth() + 1}.`;
    const grad = `linear-gradient(90deg, var(--rain), ${mx > 0 ? 'var(--warm)' : 'var(--accent)'})`;
    return `<div class="drow"><span class="dday">${label}</span><span class="dicon">${icon(s.kind, false, s.text)}</span>
      <span class="dmin">${deg(mn)}</span><div class="track"><div class="range" style="left:${left.toFixed(1)}%;width:${Math.min(width, 100 - left).toFixed(1)}%;background:${grad}"></div></div>
      <span class="dmax">${deg(mx)}</span><span class="dprec">${d.rain >= 0.1 ? num(d.rain, 1) + ' mm' : '–'}</span></div>`;
  }).join('');
}

// ---------- säävaroitukset (Ilmatieteen laitoksen CAP-syöte) ----------
// Ilmatieteen laitoksen varoitussyöte ei salli suoraa hakua selaimesta (CORS),
// joten GitHub Actions hakee sen puolen tunnin välein sivuston omaksi tiedostoksi.
const CAP_FEEDS = ['./warnings.xml', 'https://alerts.fmi.fi/cap/feed/atom_fi-FI.xml'];
const CAP_NS = 'urn:oasis:names:tc:emergency:cap:1.2';
const [LAT, LON] = LATLON.split(',').map(Number);
const AREA_WORDS = ['riihimäki', 'kanta-häme'];
const capText = (el, tag) => { const x = el.getElementsByTagNameNS(CAP_NS, tag)[0]; return x ? x.textContent.trim() : ''; };

function pointInPolygon(lat, lon, polyText) {
  const pts = polyText.trim().split(/\s+/).map((p) => p.split(',').map(Number));
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [yi, xi] = pts[i], [yj, xj] = pts[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function fetchFeed() {
  for (const url of CAP_FEEDS) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
      if (!doc.getElementsByTagName('parsererror').length && doc.documentElement.localName === 'feed') return doc;
    } catch (e) { /* kokeillaan seuraavaa */ }
  }
  throw new Error('Varoituksia ei saatu');
}

async function getWarnings() {
  const doc = await fetchFeed();
  const now = new Date();
  const seen = new Set();
  const out = [];
  for (const alert of doc.getElementsByTagNameNS(CAP_NS, 'alert')) {
    if (capText(alert, 'msgType') === 'Cancel' || capText(alert, 'status') !== 'Actual') continue;
    for (const info of alert.getElementsByTagNameNS(CAP_NS, 'info')) {
      if (!capText(info, 'language').startsWith('fi')) continue;
      const expires = new Date(capText(info, 'expires'));
      if (!(expires > now)) continue;
      let hit = false;
      for (const area of info.getElementsByTagNameNS(CAP_NS, 'area')) {
        const desc = capText(area, 'areaDesc').toLowerCase();
        if (AREA_WORDS.some((w) => desc.includes(w))) hit = true;
        for (const poly of area.getElementsByTagNameNS(CAP_NS, 'polygon')) if (pointInPolygon(LAT, LON, poly.textContent)) hit = true;
      }
      if (!hit) continue;
      const headline = capText(info, 'headline') || capText(info, 'event');
      if (seen.has(headline)) continue;
      seen.add(headline);
      const sev = capText(info, 'severity');
      const level = /punainen/i.test(headline) || sev === 'Extreme' ? 'red' : /oranssi/i.test(headline) || sev === 'Severe' ? 'orange' : 'yellow';
      out.push({ level, headline, description: capText(info, 'description'), onset: new Date(capText(info, 'onset') || capText(info, 'effective')) });
    }
  }
  const order = { red: 0, orange: 1, yellow: 2 };
  return out.sort((x, y) => order[x.level] - order[y.level] || x.onset - y.onset);
}

const WARN_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h.01"/></svg>';
const OK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>';
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WARN_URL = 'https://www.ilmatieteenlaitos.fi/varoitukset';

function renderWarnings(list) {
  const el = $('warnings');
  if (list === null) {
    el.innerHTML = `<a class="warn none" href="${WARN_URL}" target="_blank" rel="noopener">${WARN_ICON}<div><p class="warn-title">Säävaroitukset Ilmatieteen laitokselta</p></div></a>`;
  } else if (!list.length) {
    el.innerHTML = `<a class="warn none" href="${WARN_URL}" target="_blank" rel="noopener">${OK_ICON}<div><p class="warn-title">Ei voimassa olevia säävaroituksia Riihimäellä</p></div></a>`;
  } else {
    el.innerHTML = list.map((w) => `<a class="warn ${w.level}" href="${WARN_URL}" target="_blank" rel="noopener">${WARN_ICON}<div><p class="warn-title">${esc(w.headline)}</p>${w.description ? `<p class="warn-text">${esc(w.description)}</p>` : ''}</div></a>`).join('');
  }
}

// ---------- teema ----------
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#0D1620' : '#EEF3F8');
}
setTheme(document.documentElement.getAttribute('data-theme') || 'light');
$('theme').addEventListener('click', () => {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(t);
  try { localStorage.setItem('riksu-theme', t); } catch (e) { /* esim. yksityinen selaus */ }
});

// ---------- päälogiikka ----------
let busy = false;
async function load() {
  if (busy) return;
  busy = true;
  $('refresh').classList.add('spin');
  $('error').hidden = true;
  try {
    getWarnings().then(renderWarnings, () => renderWarnings(null));
    const [fc, obs] = await Promise.all([getForecast(), getObservation()]);
    renderNow(obs, fc);
    renderHourly(fc);
    renderDaily(fc);
    $('updated').textContent = 'päivitetty ' + hhmm(new Date());
  } catch (e) {
    $('error').textContent = 'Säätietojen haku epäonnistui (' + e.message + '). Yritä hetken päästä uudelleen.';
    $('error').hidden = false;
    $('updated').textContent = 'ei yhteyttä';
  } finally {
    busy = false;
    $('refresh').classList.remove('spin');
  }
}

$('refresh').addEventListener('click', load);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
setInterval(load, REFRESH_MIN * 60e3);
load();
