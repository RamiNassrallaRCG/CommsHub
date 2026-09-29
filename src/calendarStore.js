import { acquireGraphToken, hasMicrosoftAccount, isEntraConfigured, teamCalendarConfig } from './authConfig';

export const CATEGORIES = [
  { name: 'Meeting', color: '#2563eb' },
  { name: 'Task', color: '#7c3aed' },
  { name: 'Deadline', color: '#dc2626' },
  { name: 'Milestone', color: '#059669' },
  { name: 'Out of office', color: '#d97706' },
  { name: 'Training', color: '#0891b2' },
];
export const DRAFT_CATEGORY = { name: 'Draft due', color: '#db2777' };
export const categoryColor = (name) => (
  name === DRAFT_CATEGORY.name ? DRAFT_CATEGORY.color : (CATEGORIES.find((c) => c.name === name) || CATEGORIES[0]).color
);

export const pad = (n) => String(n).padStart(2, '0');
export const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
export const addMinutes = (d, n) => new Date(d.getTime() + n * 60000);

const DAY_MS = 86400000;
const newId = () => `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Turns stored events (including recurring series) into concrete occurrences inside [rangeStart, rangeEnd).
export function expandEvents(events, rangeStart, rangeEnd) {
  const out = [];
  events.forEach((ev) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const rec = ev.recurrence;
    if (!rec || rec.freq === 'none') {
      if (start < rangeEnd && end > rangeStart) out.push({ ...ev, occurrenceId: ev.id, seriesId: null });
      return;
    }
    const duration = end - start;
    const spanDays = Math.round((startOfDay(end) - startOfDay(start)) / DAY_MS);
    const until = rec.until ? addDays(fromDateKey(rec.until), 1) : null;
    const interval = Math.max(1, Number(rec.interval) || 1);
    const exceptions = new Set(ev.exceptions || []);
    const emit = (occStart) => {
      if (until && occStart >= until) return false;
      if (occStart >= rangeEnd) return false;
      const occEnd = ev.allDay ? addDays(occStart, spanDays) : new Date(occStart.getTime() + duration);
      const key = toDateKey(occStart);
      if (occEnd > rangeStart && !exceptions.has(key)) {
        out.push({ ...ev, start: occStart.toISOString(), end: occEnd.toISOString(), occurrenceId: `${ev.id}::${key}`, seriesId: ev.id, occurrenceDate: key });
      }
      return true;
    };
    const lookBack = Math.max(0, Math.floor((rangeStart - start - duration) / DAY_MS));
    let guard = 0;
    if (rec.freq === 'weekly' || rec.freq === 'weekdays') {
      const days = rec.freq === 'weekdays' ? [1, 2, 3, 4, 5] : [...(rec.byDays?.length ? rec.byDays : [start.getDay()])].sort();
      const step = rec.freq === 'weekdays' ? 1 : interval;
      let weekStart = addDays(startOfDay(start), -start.getDay());
      const skipWeeks = Math.max(0, Math.floor(lookBack / 7 / step) - 1) * step;
      weekStart = addDays(weekStart, skipWeeks * 7);
      let running = true;
      while (running && guard < 1500) {
        guard += 1;
        for (const dow of days) {
          const occ = addDays(weekStart, dow);
          occ.setHours(start.getHours(), start.getMinutes(), 0, 0);
          if (occ < start) continue;
          if (!emit(occ)) { running = false; break; }
        }
        weekStart = addDays(weekStart, 7 * step);
      }
      return;
    }
    let i = rec.freq === 'daily' ? Math.max(0, Math.floor(lookBack / interval) - 1) : 0;
    while (guard < 3000) {
      guard += 1;
      const occ = new Date(start);
      if (rec.freq === 'daily') occ.setDate(start.getDate() + i * interval);
      else if (rec.freq === 'monthly') {
        occ.setDate(1);
        occ.setMonth(start.getMonth() + i * interval);
        const daysInMonth = new Date(occ.getFullYear(), occ.getMonth() + 1, 0).getDate();
        occ.setDate(Math.min(start.getDate(), daysInMonth));
      } else if (rec.freq === 'yearly') occ.setFullYear(start.getFullYear() + i * interval);
      else break;
      i += 1;
      if (!emit(occ)) break;
    }
  });
  return out;
}

const icsEscape = (value = '') => String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const icsStamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsDate = (d) => toDateKey(d).replace(/-/g, '');

export function toICS(occ) {
  const start = new Date(occ.start);
  const end = new Date(occ.end);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Comms Hub//Team Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${occ.occurrenceId || occ.id}@commshub`,
    `DTSTAMP:${icsStamp(new Date())}`,
    occ.allDay ? `DTSTART;VALUE=DATE:${icsDate(start)}` : `DTSTART:${icsStamp(start)}`,
    occ.allDay ? `DTEND;VALUE=DATE:${icsDate(end)}` : `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(occ.title)}`,
    `DESCRIPTION:${icsEscape(occ.description)}`,
    `LOCATION:${icsEscape(occ.location)}`,
    `CATEGORIES:${icsEscape(occ.category)}`,
  ];
  if (occ.reminder >= 0) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(occ.title)}`, `TRIGGER:-PT${occ.reminder}M`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function seedEvents() {
  const today = startOfDay(new Date());
  const at = (dayOffset, h, m = 0) => {
    const d = addDays(today, dayOffset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const day = (dayOffset) => addDays(today, dayOffset).toISOString();
  const monday = addDays(today, ((1 - today.getDay()) + 7) % 7 - 7);
  const mondayAt = (h, m) => {
    const d = new Date(monday);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const everyone = ['raminassralla@celebrity.com', 'blopez@celebrity.com', 'jennifernavas@rccl.com', 'mgomez@rccl.com', 'skremer@rccl.com', 'hmccord@rccl.com'];
  const base = { location: '', description: '', attendees: [], status: 'Not started', showAs: 'busy', reminder: 15, recurrence: null, exceptions: [], createdBy: 'raminassralla@celebrity.com', createdAt: new Date().toISOString() };
  return [
    { ...base, id: newId(), title: 'Weekly comms stand-up', category: 'Meeting', start: mondayAt(9, 30), end: mondayAt(10, 0), allDay: false, owner: 'blopez@celebrity.com', attendees: everyone, location: 'Microsoft Teams', description: 'Round-robin on drafts in review, blockers and deadlines for the week.', recurrence: { freq: 'weekly', interval: 1, byDays: [1], until: '' } },
    { ...base, id: newId(), title: 'Review Q4 onboard talking points', category: 'Task', start: at(0, 14), end: at(0, 15), allDay: false, owner: 'jennifernavas@rccl.com', status: 'In progress', description: 'Second review of the Q4 onboard talking points before they go to the manager.' },
    { ...base, id: newId(), title: 'Brand voice refresher training', category: 'Training', start: at(2, 11), end: at(2, 12), allDay: false, owner: 'skremer@rccl.com', attendees: everyone, location: 'Miami HQ · Room 4B' },
    { ...base, id: newId(), title: 'Fall deployment copy due', category: 'Deadline', start: day(3), end: day(4), allDay: true, owner: 'mgomez@rccl.com', status: 'In progress', reminder: 1440 },
    { ...base, id: newId(), title: 'Out of office', category: 'Out of office', start: day(7), end: day(10), allDay: true, owner: 'hmccord@rccl.com', showAs: 'oof', reminder: -1 },
    { ...base, id: newId(), title: 'Q4 comms calendar locked', category: 'Milestone', start: day(10), end: day(11), allDay: true, owner: 'raminassralla@celebrity.com', attendees: everyone, reminder: 1440 },
    { ...base, id: newId(), title: 'Monthly QA KPI readout', category: 'Meeting', start: at(1, 15), end: at(1, 15, 30), allDay: false, owner: 'raminassralla@celebrity.com', attendees: everyone, location: 'Microsoft Teams', recurrence: { freq: 'monthly', interval: 1, byDays: [], until: '' } },
  ];
}

const STORAGE_KEY = 'comms-hub-team-calendar-v1';

function createLocalProvider() {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('comms-hub-team-calendar') : null;
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  };
  const write = (events) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    channel?.postMessage('changed');
  };
  const all = () => {
    const events = read();
    if (events) return events;
    const seeded = seedEvents();
    write(seeded);
    return seeded;
  };
  const requireEvent = (events, id) => {
    const found = events.find((e) => e.id === id);
    if (!found) throw new Error('This event no longer exists. It may have been deleted by someone else.');
    return found;
  };
  return {
    kind: 'local',
    label: 'Saved in this browser',
    async load(rangeStart, rangeEnd) {
      return expandEvents(all(), rangeStart, rangeEnd);
    },
    async getSeries(id) {
      return requireEvent(all(), id);
    },
    async create(event) {
      const created = { exceptions: [], ...event, id: newId() };
      write([...all(), created]);
      return created;
    },
    async updateOccurrence(occ, changes) {
      const events = all();
      if (occ.seriesId) {
        const master = requireEvent(events, occ.seriesId);
        const { id: _id, recurrence: _rec, exceptions: _exc, ...rest } = master;
        const detached = { ...rest, start: occ.start, end: occ.end, ...changes, recurrence: null, exceptions: [], id: newId(), detachedFrom: master.id };
        write(events.map((e) => (e.id === master.id ? { ...e, exceptions: [...(e.exceptions || []), occ.occurrenceDate] } : e)).concat(detached));
        return;
      }
      requireEvent(events, occ.id);
      write(events.map((e) => (e.id === occ.id ? { ...e, ...changes } : e)));
    },
    async updateSeries(seriesId, changes) {
      const events = all();
      requireEvent(events, seriesId);
      write(events.map((e) => (e.id === seriesId ? { ...e, ...changes } : e)));
    },
    async removeOccurrence(occ) {
      const events = all();
      if (occ.seriesId) {
        write(events.map((e) => (e.id === occ.seriesId ? { ...e, exceptions: [...(e.exceptions || []), occ.occurrenceDate] } : e)));
        return;
      }
      write(events.filter((e) => e.id !== occ.id));
    },
    async removeSeries(seriesId) {
      write(all().filter((e) => e.id !== seriesId));
    },
    subscribe(callback) {
      const onStorage = (e) => { if (e.key === STORAGE_KEY) callback(); };
      const onMessage = () => callback();
      window.addEventListener('storage', onStorage);
      channel?.addEventListener('message', onMessage);
      return () => {
        window.removeEventListener('storage', onStorage);
        channel?.removeEventListener('message', onMessage);
      };
    },
  };
}

// Stores Comms Hub-only fields (owner, category, task status) on the Outlook event itself.
const META_PROP = 'String {6c1f3f9e-2b7a-4d3c-9a51-7e0c2f4b8d11} Name CommsHubMeta';
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function toGraphRecurrence(rec, startIso) {
  if (!rec || rec.freq === 'none') return null;
  const s = new Date(startIso);
  const interval = Math.max(1, Number(rec.interval) || 1);
  let pattern;
  if (rec.freq === 'daily') pattern = { type: 'daily', interval };
  else if (rec.freq === 'weekdays') pattern = { type: 'weekly', interval: 1, daysOfWeek: DAY_NAMES.slice(1, 6), firstDayOfWeek: 'sunday' };
  else if (rec.freq === 'weekly') pattern = { type: 'weekly', interval, daysOfWeek: (rec.byDays?.length ? rec.byDays : [s.getDay()]).map((d) => DAY_NAMES[d]), firstDayOfWeek: 'sunday' };
  else if (rec.freq === 'monthly') pattern = { type: 'absoluteMonthly', interval, dayOfMonth: s.getDate() };
  else pattern = { type: 'absoluteYearly', interval, dayOfMonth: s.getDate(), month: s.getMonth() + 1 };
  const startDate = toDateKey(s);
  return { pattern, range: rec.until ? { type: 'endDate', startDate, endDate: rec.until } : { type: 'noEnd', startDate } };
}

function fromGraphRecurrence(recurrence) {
  const p = recurrence?.pattern;
  if (!p) return null;
  const byDays = (p.daysOfWeek || []).map((d) => DAY_NAMES.indexOf(d)).filter((i) => i >= 0);
  let freq = 'daily';
  if (p.type === 'weekly') freq = p.interval === 1 && byDays.length === 5 && [1, 2, 3, 4, 5].every((d) => byDays.includes(d)) ? 'weekdays' : 'weekly';
  else if (p.type.endsWith('Monthly')) freq = 'monthly';
  else if (p.type.endsWith('Yearly')) freq = 'yearly';
  return { freq, interval: p.interval || 1, byDays, until: recurrence.range?.type === 'endDate' ? recurrence.range.endDate : '' };
}

const graphDate = (iso, allDay) => (allDay
  ? { dateTime: `${toDateKey(new Date(iso))}T00:00:00`, timeZone: localTimeZone }
  : { dateTime: new Date(iso).toISOString().slice(0, 19), timeZone: 'UTC' });

const parseGraphDate = (value, allDay) => (allDay ? fromDateKey(value.dateTime.slice(0, 10)) : new Date(`${value.dateTime.slice(0, 19)}Z`));

function toGraph(ev, includeRecurrence) {
  const meta = { category: ev.category, owner: ev.owner, status: ev.status, createdBy: ev.createdBy, updatedBy: ev.updatedBy };
  const body = {
    subject: ev.title,
    body: { contentType: 'text', content: ev.description || '' },
    isAllDay: Boolean(ev.allDay),
    start: graphDate(ev.start, ev.allDay),
    end: graphDate(ev.end, ev.allDay),
    location: { displayName: ev.location || '' },
    categories: ev.category ? [ev.category] : [],
    showAs: ev.showAs || 'busy',
    isReminderOn: ev.reminder >= 0,
    reminderMinutesBeforeStart: ev.reminder >= 0 ? ev.reminder : 0,
    attendees: (ev.attendees || []).map((address) => ({ emailAddress: { address }, type: 'required' })),
    singleValueExtendedProperties: [{ id: META_PROP, value: JSON.stringify(meta) }],
  };
  if (includeRecurrence) body.recurrence = toGraphRecurrence(ev.recurrence, ev.start);
  return body;
}

function fromGraph(g) {
  let meta = {};
  try {
    meta = JSON.parse(g.singleValueExtendedProperties?.find((p) => p.id.toLowerCase() === META_PROP.toLowerCase())?.value || '{}');
  } catch {
    meta = {};
  }
  const start = parseGraphDate(g.start, g.isAllDay);
  const end = parseGraphDate(g.end, g.isAllDay);
  return {
    id: g.id,
    occurrenceId: g.id,
    seriesId: g.seriesMasterId || null,
    title: g.subject || '(No title)',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: Boolean(g.isAllDay),
    category: meta.category || g.categories?.[0] || 'Meeting',
    owner: (meta.owner || g.organizer?.emailAddress?.address || '').toLowerCase(),
    attendees: (g.attendees || []).map((a) => a.emailAddress?.address?.toLowerCase()).filter(Boolean),
    status: meta.status || 'Not started',
    showAs: g.showAs || 'busy',
    reminder: g.isReminderOn ? g.reminderMinutesBeforeStart : -1,
    location: g.location?.displayName || '',
    description: g.body?.content || g.bodyPreview || '',
    recurrence: fromGraphRecurrence(g.recurrence),
    createdBy: meta.createdBy || '',
    updatedBy: meta.updatedBy || '',
    webLink: g.webLink || '',
  };
}

function createGraphProvider({ groupId, owner, calendarId }) {
  const scopes = groupId ? ['Group.ReadWrite.All'] : ['Calendars.ReadWrite.Shared'];
  const calendarRoot = groupId
    ? `/groups/${groupId}/calendar`
    : calendarId ? `/users/${owner}/calendars/${calendarId}` : `/users/${owner}/calendar`;
  const eventPath = (id) => (groupId ? `/groups/${groupId}/events/${id}` : `/users/${owner}/events/${id}`);
  const expandMeta = `singleValueExtendedProperties($filter=id eq '${META_PROP}')`;

  const graphFetch = async (path, { method = 'GET', body } = {}) => {
    const token = await acquireGraphToken(scopes);
    const response = await fetch(path.startsWith('http') ? path : `https://graph.microsoft.com/v1.0${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'outlook.timezone="UTC", outlook.body-content-type="text"' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      let message = `Microsoft 365 returned an error (${response.status}).`;
      try {
        message = (await response.json()).error?.message || message;
      } catch {
        // Error body was not JSON; keep the status message.
      }
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  };

  return {
    kind: 'graph',
    label: 'Microsoft 365 · shared with the team',
    async load(rangeStart, rangeEnd) {
      const params = new URLSearchParams({ startDateTime: rangeStart.toISOString(), endDateTime: rangeEnd.toISOString(), $top: '250', $orderby: 'start/dateTime', $expand: expandMeta });
      let url = `${calendarRoot}/calendarView?${params}`;
      const out = [];
      while (url) {
        const page = await graphFetch(url);
        out.push(...page.value.map(fromGraph));
        url = page['@odata.nextLink'] || null;
      }
      return out;
    },
    async getSeries(id) {
      return fromGraph(await graphFetch(`${eventPath(id)}?$expand=${encodeURIComponent(expandMeta)}`));
    },
    async create(event) {
      return fromGraph(await graphFetch(`${calendarRoot}/events`, { method: 'POST', body: toGraph(event, true) }));
    },
    async updateOccurrence(occ, changes) {
      const includeRecurrence = !occ.seriesId && Object.prototype.hasOwnProperty.call(changes, 'recurrence');
      await graphFetch(eventPath(occ.id), { method: 'PATCH', body: toGraph({ ...occ, ...changes }, includeRecurrence) });
    },
    async updateSeries(seriesId, changes) {
      await graphFetch(eventPath(seriesId), { method: 'PATCH', body: toGraph(changes, true) });
    },
    async removeOccurrence(occ) {
      await graphFetch(eventPath(occ.id), { method: 'DELETE' });
    },
    async removeSeries(seriesId) {
      await graphFetch(eventPath(seriesId), { method: 'DELETE' });
    },
    subscribe(callback) {
      const timer = window.setInterval(callback, 30000);
      window.addEventListener('focus', callback);
      return () => {
        window.clearInterval(timer);
        window.removeEventListener('focus', callback);
      };
    },
  };
}

let cachedProvider = null;
let cachedKind = '';

// Uses the shared Microsoft 365 calendar when it is configured and the user signed in with Microsoft,
// otherwise falls back to browser storage so the calendar still works in demo mode.
export function getCalendarProvider() {
  const { groupId, owner } = teamCalendarConfig;
  const kind = isEntraConfigured && (groupId || owner) && hasMicrosoftAccount() ? 'graph' : 'local';
  if (!cachedProvider || cachedKind !== kind) {
    cachedProvider = kind === 'graph' ? createGraphProvider(teamCalendarConfig) : createLocalProvider();
    cachedKind = kind;
  }
  return cachedProvider;
}
