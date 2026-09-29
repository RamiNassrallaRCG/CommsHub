import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Cloud, Download, HardDrive, MapPin,
  Minus, Pencil, Plus, RefreshCw, Repeat, Search, Trash2, UsersRound, X,
} from 'lucide-react';
import {
  CATEGORIES, DRAFT_CATEGORY, addDays, addMinutes, categoryColor, fromDateKey, getCalendarProvider, pad, startOfDay,
  toDateKey, toICS,
} from './calendarStore';
import './teamCalendar.css';

const HOUR_PX = 48;
const MIN_PX = HOUR_PX / 60;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const VIEWS = [['day', 'Day'], ['workweek', 'Work week'], ['week', 'Week'], ['month', 'Month'], ['agenda', 'Agenda']];
const REPEAT_OPTIONS = [['none', 'Does not repeat'], ['daily', 'Daily'], ['weekdays', 'Every weekday (Mon–Fri)'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']];
const SHOW_AS = [['busy', 'Busy'], ['tentative', 'Tentative'], ['free', 'Free'], ['oof', 'Out of office'], ['workingElsewhere', 'Working elsewhere']];
const REMINDERS = [[-1, 'No reminder'], [0, 'At start time'], [5, '5 minutes before'], [15, '15 minutes before'], [30, '30 minutes before'], [60, '1 hour before'], [1440, '1 day before']];
const STATUSES = ['Not started', 'In progress', 'Completed'];
const REMINDER_KEY = 'comms-hub-cal-reminders-v1';
const VIEW_KEY = 'comms-hub-cal-view';

const labelFor = (pairs, value) => (pairs.find(([v]) => v === value) || pairs[0])[1];
const valueFor = (pairs, label) => (pairs.find(([, l]) => l === label) || pairs[0])[0];
const startOfWeek = (d) => addDays(startOfDay(d), -d.getDay());
const sameDay = (a, b) => toDateKey(a) === toDateKey(b);
const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const toTimeValue = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const combine = (dateKey, time) => {
  const d = fromDateKey(dateKey);
  const [h, m] = (time || '00:00').split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
const isAllDayLike = (occ) => occ.allDay || new Date(occ.end) - new Date(occ.start) >= 86400000;

export const formatWhen = (occ) => {
  const s = new Date(occ.start);
  const e = new Date(occ.end);
  const dateOpts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (occ.allDay) {
    const last = addDays(e, -1);
    return sameDay(s, last) ? `${s.toLocaleDateString([], dateOpts)} · All day` : `${s.toLocaleDateString([], dateOpts)} – ${last.toLocaleDateString([], dateOpts)} · All day`;
  }
  return sameDay(s, e)
    ? `${s.toLocaleDateString([], dateOpts)} · ${fmtTime(s)} – ${fmtTime(e)}`
    : `${s.toLocaleDateString([], dateOpts)} ${fmtTime(s)} – ${e.toLocaleDateString([], dateOpts)} ${fmtTime(e)}`;
};

function getRange(view, cursor) {
  if (view === 'month') {
    const start = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return { start, end: addDays(start, 42), days: 42 };
  }
  if (view === 'week') {
    const start = startOfWeek(cursor);
    return { start, end: addDays(start, 7), days: 7 };
  }
  if (view === 'workweek') {
    const start = addDays(startOfWeek(cursor), 1);
    return { start, end: addDays(start, 5), days: 5 };
  }
  const start = startOfDay(cursor);
  const days = view === 'day' ? 1 : 30;
  return { start, end: addDays(start, days), days };
}

function rangeLabel(view, cursor, range) {
  if (view === 'month') return cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  if (view === 'day') return cursor.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const last = addDays(range.end, -1);
  const month = (d) => d.toLocaleDateString([], { month: 'long' });
  if (range.start.getFullYear() !== last.getFullYear()) {
    return `${month(range.start)} ${range.start.getDate()}, ${range.start.getFullYear()} – ${month(last)} ${last.getDate()}, ${last.getFullYear()}`;
  }
  const lastPart = range.start.getMonth() === last.getMonth() ? `${last.getDate()}` : `${month(last)} ${last.getDate()}`;
  return `${month(range.start)} ${range.start.getDate()} – ${lastPart}, ${last.getFullYear()}`;
}

// Places overlapping timed events side by side, Outlook style.
function layoutDay(segments) {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const result = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const columns = [];
    cluster.forEach((seg) => {
      let col = columns.findIndex((end) => end <= seg.startMin);
      if (col === -1) {
        col = columns.length;
        columns.push(0);
      }
      columns[col] = seg.endMin;
      seg.col = col;
    });
    cluster.forEach((seg) => result.push({ ...seg, cols: columns.length }));
    cluster = [];
    clusterEnd = -1;
  };
  sorted.forEach((seg) => {
    if (cluster.length && seg.startMin >= clusterEnd) flush();
    cluster.push(seg);
    clusterEnd = Math.max(clusterEnd, seg.endMin);
  });
  if (cluster.length) flush();
  return result;
}

const roundUpToHalfHour = (d) => {
  const r = new Date(d);
  r.setSeconds(0, 0);
  r.setMinutes(Math.ceil(r.getMinutes() / 30) * 30);
  return r;
};

function blankForm(start, end, allDay, ownerEmail) {
  return {
    title: '', category: 'Meeting', allDay,
    startDate: toDateKey(start), startTime: allDay ? '09:00' : toTimeValue(start),
    endDate: toDateKey(end), endTime: allDay ? '09:30' : toTimeValue(end),
    recurrence: { freq: 'none', interval: 1, byDays: [start.getDay()], until: '' },
    owner: ownerEmail, attendees: [], status: 'Not started', showAs: 'busy', reminder: 15, location: '', description: '',
  };
}

function formFromEvent(ev) {
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const endForForm = ev.allDay ? addDays(e, -1) : e;
  return {
    title: ev.title || '', category: ev.category || 'Meeting', allDay: Boolean(ev.allDay),
    startDate: toDateKey(s), startTime: ev.allDay ? '09:00' : toTimeValue(s),
    endDate: toDateKey(endForForm), endTime: ev.allDay ? '09:30' : toTimeValue(e),
    recurrence: { freq: 'none', interval: 1, byDays: [s.getDay()], until: '', ...(ev.recurrence || {}) },
    owner: ev.owner || '', attendees: ev.attendees || [], status: ev.status || 'Not started', showAs: ev.showAs || 'busy',
    reminder: typeof ev.reminder === 'number' ? ev.reminder : 15, location: ev.location || '', description: ev.description || '',
  };
}

function eventFromForm(form) {
  const start = form.allDay ? fromDateKey(form.startDate) : combine(form.startDate, form.startTime);
  const end = form.allDay ? addDays(fromDateKey(form.endDate), 1) : combine(form.endDate, form.endTime);
  return {
    title: form.title.trim(), category: form.category, allDay: form.allDay,
    start: start.toISOString(), end: end.toISOString(),
    recurrence: form.recurrence.freq === 'none' ? null : { ...form.recurrence, interval: Math.max(1, Number(form.recurrence.interval) || 1) },
    owner: form.owner, attendees: form.attendees, status: form.status, showAs: form.showAs, reminder: Number(form.reminder),
    location: form.location.trim(), description: form.description.trim(),
  };
}

function formError(form) {
  if (!form.title.trim()) return 'Add a title';
  if (!form.startDate || !form.endDate) return 'Pick the start and end dates';
  const { start, end } = eventFromForm(form);
  if (new Date(end) <= new Date(start)) return 'End must be after the start';
  if (form.recurrence.freq !== 'none' && form.recurrence.until && form.recurrence.until < form.startDate) return 'Repeat end date must be after the start';
  return '';
}

function MiniMonth({ cursor, range, onPick }) {
  const [month, setMonth] = useState(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  useEffect(() => { setMonth(new Date(cursor.getFullYear(), cursor.getMonth(), 1)); }, [cursor]);
  const first = startOfWeek(month);
  const today = new Date();
  return (
    <div className="tc-mini">
      <div className="tc-mini-head">
        <strong>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong>
        <div>
          <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={15} /></button>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="tc-mini-grid">
        {WEEKDAY_LETTER.map((d, i) => <span key={`h${i}`} className="tc-mini-dow">{d}</span>)}
        {Array.from({ length: 42 }, (_, i) => {
          const day = addDays(first, i);
          const classes = ['tc-mini-day'];
          if (day.getMonth() !== month.getMonth()) classes.push('outside');
          if (day >= range.start && day < range.end) classes.push('in-range');
          if (sameDay(day, today)) classes.push('today');
          if (sameDay(day, cursor)) classes.push('selected');
          return <button type="button" key={i} className={classes.join(' ')} onClick={() => onPick(day)} aria-label={day.toDateString()}>{day.getDate()}</button>;
        })}
      </div>
    </div>
  );
}

export default function TeamCalendar({ currentUser, team, drafts, Select, onOpenDraft }) {
  const provider = useMemo(() => getCalendarProvider(), []);
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    return VIEWS.some(([v]) => v === saved) ? saved : 'week';
  });
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [occurrences, setOccurrences] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '', syncedAt: null });
  const [refreshTick, setRefreshTick] = useState(0);
  const [hiddenPeople, setHiddenPeople] = useState(() => new Set());
  const [hiddenCategories, setHiddenCategories] = useState(() => new Set());
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('comms-hub-cal-collapsed')) || {}; } catch { return {}; }
  });
  const [search, setSearch] = useState('');
  const [peek, setPeek] = useState(null);
  const [editor, setEditor] = useState(null);
  const [scopePrompt, setScopePrompt] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [notifyPermission, setNotifyPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const noticeTimer = useRef(null);

  const range = useMemo(() => getRange(view, cursor), [view, cursor]);
  const rangeKey = `${range.start.getTime()}-${range.end.getTime()}`;
  const me = currentUser?.email?.toLowerCase() || '';
  const people = useMemo(() => {
    const list = [...team];
    if (me && !list.some((p) => p.email.toLowerCase() === me)) list.unshift({ name: currentUser.name, email: me });
    return list.sort((a, b) => (a.email.toLowerCase() === me ? -1 : b.email.toLowerCase() === me ? 1 : a.name.localeCompare(b.name)));
  }, [team, me, currentUser]);
  const personName = (email) => people.find((p) => p.email.toLowerCase() === (email || '').toLowerCase())?.name || email || 'Unassigned';

  useEffect(() => {
    let cancelled = false;
    setStatus((s) => ({ ...s, loading: true }));
    provider.load(range.start, range.end)
      .then((list) => {
        if (!cancelled) {
          setOccurrences(list);
          setStatus({ loading: false, error: '', syncedAt: new Date() });
        }
      })
      .catch((err) => {
        if (!cancelled) setStatus((s) => ({ ...s, loading: false, error: err.message || 'Could not load the team calendar.' }));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, rangeKey, refreshTick]);

  useEffect(() => provider.subscribe(() => setRefreshTick((t) => t + 1)), [provider]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);
  // Start the time grid at 7 AM the first time it appears, like Outlook.
  const setGridRef = (el) => {
    gridRef.current = el;
    if (el && !el.dataset.scrolled) {
      el.scrollTop = 7 * HOUR_PX;
      el.dataset.scrolled = '1';
    }
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setPeek(null);
      setScopePrompt(null);
      setConfirmDelete(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const flash = (message) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3200);
  };

  const run = async (action, successMessage) => {
    try {
      await action();
      setRefreshTick((t) => t + 1);
      if (successMessage) flash(successMessage);
    } catch (err) {
      setStatus((s) => ({ ...s, error: err.message || 'Something went wrong. Please try again.' }));
    }
  };

  const draftEvents = useMemo(() => (drafts || [])
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate || ''))
    .map((d) => {
      const start = fromDateKey(d.dueDate);
      const owner = people.find((p) => p.name === d.copywriter || p.name.split(' ')[0] === d.copywriter)?.email || '';
      return {
        id: `draft-${d.id}`, occurrenceId: `draft-${d.id}`, draftId: d.id, title: `Due: ${d.title}`, start: start.toISOString(), end: addDays(start, 1).toISOString(),
        allDay: true, category: DRAFT_CATEGORY.name, owner, attendees: [], reminder: -1, readOnly: true,
        description: [d.brand, d.documentType, (d.currentStage || d.type) && `Current step: ${d.currentStage || d.type}`, d.priority && `Priority: ${d.priority}`].filter(Boolean).join(' · '),
      };
    })
    .filter((e) => new Date(e.start) < range.end && new Date(e.end) > range.start),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [drafts, people, rangeKey]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const syncedDrafts = new Set(occurrences.map((o) => o.draftId).filter(Boolean));
    const merged = [
      ...occurrences.map((o) => (o.draftId ? { ...o, readOnly: true } : o)),
      ...draftEvents.filter((o) => !syncedDrafts.has(o.draftId)),
    ];
    return merged.filter((o) => {
      if (hiddenCategories.has(o.category)) return false;
      const involved = [o.owner, ...(o.attendees || [])].filter(Boolean).map((p) => p.toLowerCase());
      if (involved.length && hiddenPeople.size && involved.every((p) => hiddenPeople.has(p))) return false;
      if (q && !`${o.title} ${o.location || ''} ${o.description || ''} ${personName(o.owner)} ${o.category}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => new Date(a.start) - new Date(b.start) || Number(isAllDayLike(b)) - Number(isAllDayLike(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrences, draftEvents, hiddenCategories, hiddenPeople, search, people]);

  const eventsOnDay = (day) => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    return visible.filter((o) => new Date(o.start) < dayEnd && new Date(o.end) > dayStart);
  };

  const step = (dir) => setCursor((c) => {
    if (view === 'month') return new Date(c.getFullYear(), c.getMonth() + dir, 1);
    if (view === 'day') return addDays(c, dir);
    if (view === 'agenda') return addDays(c, dir * 30);
    return addDays(c, dir * 7);
  });

  const openCreate = (start, { allDay = false } = {}) => {
    setPeek(null);
    const s = start || roundUpToHalfHour(new Date());
    setEditor({ mode: 'create', form: blankForm(s, allDay ? s : addMinutes(s, 30), allDay, me) });
  };

  const beginEdit = async (occ, scope) => {
    setPeek(null);
    setScopePrompt(null);
    if (scope === 'series') {
      try {
        const master = await provider.getSeries(occ.seriesId);
        setEditor({ mode: 'edit', scope, occ, form: formFromEvent(master) });
      } catch (err) {
        setStatus((s) => ({ ...s, error: err.message || 'Could not open the series.' }));
      }
      return;
    }
    setEditor({ mode: 'edit', scope: occ.seriesId ? 'occurrence' : 'single', occ, form: formFromEvent(occ) });
  };

  const requestEdit = (occ) => (occ.seriesId ? setScopePrompt({ occ, action: 'edit' }) : beginEdit(occ, 'single'));
  const requestDelete = (occ) => {
    setPeek(null);
    if (occ.seriesId) setScopePrompt({ occ, action: 'delete' });
    else setConfirmDelete(occ);
  };
  const doDelete = (occ, scope) => {
    setScopePrompt(null);
    setConfirmDelete(null);
    setEditor(null);
    run(() => (scope === 'series' ? provider.removeSeries(occ.seriesId) : provider.removeOccurrence(occ)), scope === 'series' ? 'Series deleted for everyone' : 'Event deleted for everyone');
  };

  const stamp = () => ({ updatedBy: me, updatedAt: new Date().toISOString() });

  const saveEditor = () => {
    if (!editor || formError(editor.form)) return;
    const data = eventFromForm(editor.form);
    if (editor.mode === 'create') {
      run(() => provider.create({ ...data, ...stamp(), createdBy: me, createdAt: new Date().toISOString() }), 'Added to the team calendar');
    } else if (editor.scope === 'series') {
      run(() => provider.updateSeries(editor.occ.seriesId, { ...data, ...stamp() }), 'Series updated');
    } else if (editor.scope === 'occurrence') {
      const { recurrence: _recurrence, ...single } = data;
      run(() => provider.updateOccurrence(editor.occ, { ...single, ...stamp() }), 'Event updated');
    } else {
      run(() => provider.updateOccurrence(editor.occ, { ...data, ...stamp() }), 'Event updated');
    }
    setEditor(null);
  };

  const setTaskStatus = (occ, value) => {
    setPeek((p) => (p ? { ...p, occ: { ...p.occ, status: value } } : p));
    run(() => provider.updateOccurrence(occ, { status: value, ...stamp() }), `Marked ${value.toLowerCase()}`);
  };

  const downloadIcs = (occ) => {
    const blob = new Blob([toICS(occ)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${occ.title.replace(/[^\w\- ]+/g, '').trim() || 'event'}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openPeek = (occ, e) => {
    e.stopPropagation();
    if (occ.draftId && onOpenDraft && drafts?.some((d) => d.id === occ.draftId)) {
      setPeek(null);
      onOpenDraft(occ.draftId);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 340;
    const left = rect.right + 8 + width < window.innerWidth ? rect.right + 8 : Math.max(8, rect.left - width - 8);
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - 360));
    setPeek({ occ, left, top });
  };

  const onDragStart = (occ, e) => {
    if (occ.readOnly) {
      e.preventDefault();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { occ, grabMinutes: isAllDayLike(occ) ? 0 : (e.clientY - rect.top) / MIN_PX };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', occ.occurrenceId);
    setPeek(null);
  };
  const allowDrop = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const moveTo = (buildStart) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const { occ } = drag;
    const oldStart = new Date(occ.start);
    const duration = new Date(occ.end) - oldStart;
    const newStart = buildStart(drag, oldStart);
    if (!newStart || newStart.getTime() === oldStart.getTime()) return;
    run(() => provider.updateOccurrence(occ, { start: newStart.toISOString(), end: new Date(newStart.getTime() + duration).toISOString(), ...stamp() }), 'Event moved');
  };
  const dropOnDay = (day) => (e) => {
    e.preventDefault();
    moveTo(({ occ }, oldStart) => {
      const next = startOfDay(day);
      if (!occ.allDay) next.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
      return next;
    });
  };
  const dropOnTimeGrid = (day) => (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    moveTo(({ occ, grabMinutes }) => {
      if (occ.allDay) return null;
      const minutes = Math.round(((e.clientY - rect.top) / MIN_PX - grabMinutes) / 15) * 15;
      return addMinutes(startOfDay(day), Math.max(0, Math.min(24 * 60 - 15, minutes)));
    });
  };

  const toggleSet = (setter, value) => setter((prev) => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });

  const eventLabel = (occ) => `${occ.title}, ${formatWhen(occ)}, ${occ.category}, ${personName(occ.owner)}`;

  const renderChip = (occ, day) => {
    const color = categoryColor(occ.category);
    const allDay = isAllDayLike(occ);
    const done = occ.status === 'Completed' && ['Task', 'Deadline'].includes(occ.category);
    return (
      <button
        type="button"
        key={`${occ.occurrenceId}-${toDateKey(day)}`}
        className={`tc-chip${allDay ? ' all-day' : ''}${done ? ' done' : ''}${occ.readOnly ? ' read-only' : ''}`}
        style={{ '--ev': color }}
        draggable={!occ.readOnly}
        onDragStart={(e) => onDragStart(occ, e)}
        onClick={(e) => openPeek(occ, e)}
        aria-label={eventLabel(occ)}
        title={occ.draftId ? `${eventLabel(occ)} · Click to open the draft` : eventLabel(occ)}
      >
        {!allDay && <span className="tc-chip-dot" />}
        {!allDay && <span className="tc-chip-time">{fmtTime(new Date(occ.start)).replace(':00', '')}</span>}
        <span className="tc-chip-title">{done && <CheckCircle2 size={12} />}{occ.title}</span>
      </button>
    );
  };

  const renderMonth = () => {
    const today = new Date();
    return (
      <div className="tc-month">
        <div className="tc-month-head">{WEEKDAY_SHORT.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="tc-month-grid">
          {Array.from({ length: 42 }, (_, i) => {
            const day = addDays(range.start, i);
            const dayEvents = eventsOnDay(day);
            const shown = dayEvents.slice(0, 3);
            const more = dayEvents.length - shown.length;
            const classes = ['tc-month-cell'];
            if (day.getMonth() !== cursor.getMonth()) classes.push('outside');
            if (sameDay(day, today)) classes.push('today');
            if ([0, 6].includes(day.getDay())) classes.push('weekend');
            return (
              <div
                key={i}
                className={classes.join(' ')}
                onClick={() => { const s = startOfDay(day); s.setHours(9, 0, 0, 0); openCreate(s); }}
                onDragOver={allowDrop}
                onDrop={dropOnDay(day)}
              >
                <button type="button" className="tc-daynum" onClick={(e) => { e.stopPropagation(); setCursor(day); setView('day'); }} aria-label={`Open ${day.toDateString()}`}>
                  {day.getDate() === 1 ? day.toLocaleDateString([], { month: 'short', day: 'numeric' }) : day.getDate()}
                </button>
                <div className="tc-month-events">
                  {shown.map((occ) => renderChip(occ, day))}
                  {more > 0 && <button type="button" className="tc-more" onClick={(e) => { e.stopPropagation(); setCursor(day); setView('day'); }}>+{more} more</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeGrid = () => {
    const days = Array.from({ length: range.days }, (_, i) => addDays(range.start, i));
    const columns = { gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` };
    const today = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return (
      <div className="tc-week">
        <div className="tc-week-head" style={columns}>
          <span />
          {days.map((day) => (
            <button type="button" key={toDateKey(day)} className={`tc-week-day${sameDay(day, today) ? ' today' : ''}`} onClick={() => { setCursor(day); setView('day'); }}>
              <small>{WEEKDAY_SHORT[day.getDay()]}</small>
              <strong>{day.getDate()}</strong>
            </button>
          ))}
        </div>
        <div className="tc-allday-row" style={columns}>
          <span className="tc-allday-label">All day</span>
          {days.map((day) => (
            <div
              key={toDateKey(day)}
              className="tc-allday-cell"
              onClick={() => openCreate(startOfDay(day), { allDay: true })}
              onDragOver={allowDrop}
              onDrop={dropOnDay(day)}
            >
              {eventsOnDay(day).filter(isAllDayLike).map((occ) => renderChip(occ, day))}
            </div>
          ))}
        </div>
        <div className="tc-grid-scroll" ref={setGridRef}>
          <div className="tc-grid" style={{ ...columns, height: 24 * HOUR_PX }}>
            <div className="tc-hours">
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} style={{ top: h * HOUR_PX }}>{h === 0 ? '' : fmtTime(new Date(2000, 0, 1, h)).replace(':00', '')}</span>
              ))}
            </div>
            {days.map((day) => {
              const dayStart = startOfDay(day);
              const dayEnd = addDays(dayStart, 1);
              const segments = layoutDay(eventsOnDay(day).filter((o) => !isAllDayLike(o)).map((occ) => {
                const s = Math.max(new Date(occ.start), dayStart);
                const e = Math.min(new Date(occ.end), dayEnd);
                return { occ, startMin: (s - dayStart) / 60000, endMin: Math.max((e - dayStart) / 60000, (s - dayStart) / 60000 + 20) };
              }));
              return (
                <div
                  key={toDateKey(day)}
                  className={`tc-day-col${[0, 6].includes(day.getDay()) ? ' weekend' : ''}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const minutes = Math.floor((e.clientY - rect.top) / MIN_PX / 30) * 30;
                    openCreate(addMinutes(dayStart, minutes));
                  }}
                  onDragOver={allowDrop}
                  onDrop={dropOnTimeGrid(day)}
                >
                  {segments.map(({ occ, startMin, endMin, col, cols }) => {
                    const height = (endMin - startMin) * MIN_PX;
                    const done = occ.status === 'Completed' && ['Task', 'Deadline'].includes(occ.category);
                    return (
                      <button
                        type="button"
                        key={occ.occurrenceId}
                        className={`tc-event${height < 36 ? ' compact' : ''}${done ? ' done' : ''}${occ.showAs === 'tentative' ? ' tentative' : ''}`}
                        style={{ '--ev': categoryColor(occ.category), top: startMin * MIN_PX, height: height - 2, left: `calc(${(col * 100) / cols}% + 2px)`, width: `calc(${100 / cols}% - 4px)` }}
                        draggable={!occ.readOnly}
                        onDragStart={(e) => onDragStart(occ, e)}
                        onClick={(e) => openPeek(occ, e)}
                        aria-label={eventLabel(occ)}
                      >
                        <strong>{done && <CheckCircle2 size={12} />}{occ.title}</strong>
                        <span>{fmtTime(new Date(occ.start))} – {fmtTime(new Date(occ.end))}</span>
                        {height >= 56 && <span>{occ.location || personName(occ.owner)}</span>}
                        {occ.seriesId && <Repeat size={11} className="tc-event-repeat" />}
                      </button>
                    );
                  })}
                  {sameDay(day, today) && <div className="tc-now" style={{ top: nowMinutes * MIN_PX }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderAgenda = () => {
    const groups = Array.from({ length: range.days }, (_, i) => addDays(range.start, i))
      .map((day) => ({ day, events: eventsOnDay(day) }))
      .filter((g) => g.events.length);
    if (!groups.length) {
      return (
        <div className="tc-empty">
          <CalendarDays size={28} />
          <strong>Nothing scheduled</strong>
          <span>{search ? 'No events match your search.' : 'No team events in the next 30 days.'}</span>
          <button type="button" className="tc-primary" onClick={() => openCreate()}><Plus size={15} /> New event</button>
        </div>
      );
    }
    return (
      <div className="tc-agenda">
        {groups.map(({ day, events }) => (
          <section key={toDateKey(day)} className="tc-agenda-day">
            <header className={sameDay(day, new Date()) ? 'today' : ''}>
              <strong>{day.getDate()}</strong>
              <div><span>{day.toLocaleDateString([], { weekday: 'long' })}</span><small>{day.toLocaleDateString([], { month: 'long', year: 'numeric' })}</small></div>
            </header>
            <div className="tc-agenda-list">
              {events.map((occ) => (
                <button type="button" key={occ.occurrenceId} className="tc-agenda-item" style={{ '--ev': categoryColor(occ.category) }} onClick={(e) => openPeek(occ, e)}>
                  <span className="tc-agenda-time">{isAllDayLike(occ) ? 'All day' : `${fmtTime(new Date(occ.start))} – ${fmtTime(new Date(occ.end))}`}</span>
                  <span className="tc-agenda-bar" />
                  <span className="tc-agenda-main">
                    <strong>{occ.title}{occ.seriesId && <Repeat size={12} />}</strong>
                    <small>{[occ.location, personName(occ.owner)].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className="tc-agenda-tags">
                    <span className="tc-tag" style={{ '--ev': categoryColor(occ.category) }}>{occ.category}</span>
                    {['Task', 'Deadline'].includes(occ.category) && <span className={`tc-status status-${(occ.status || '').replace(/\s+/g, '-').toLowerCase()}`}>{occ.status}</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderPeek = () => {
    if (!peek) return null;
    const { occ } = peek;
    const isTask = ['Task', 'Deadline'].includes(occ.category);
    return (
      <>
        <div className="tc-peek-backdrop" onClick={() => setPeek(null)} />
        <div className="tc-peek" style={{ left: peek.left, top: peek.top, '--ev': categoryColor(occ.category) }} role="dialog" aria-label={occ.title}>
          <div className="tc-peek-actions">
            {!occ.readOnly && <button type="button" onClick={() => requestEdit(occ)} aria-label="Edit"><Pencil size={15} /></button>}
            {!occ.readOnly && <button type="button" onClick={() => requestDelete(occ)} aria-label="Delete"><Trash2 size={15} /></button>}
            <button type="button" onClick={() => downloadIcs(occ)} aria-label="Add to my Outlook (.ics)" title="Add to my Outlook (.ics)"><Download size={15} /></button>
            <button type="button" onClick={() => setPeek(null)} aria-label="Close"><X size={15} /></button>
          </div>
          <div className="tc-peek-title">
            <span className="tc-peek-swatch" />
            <div>
              <h3>{occ.title}</h3>
              <p><Clock3 size={13} /> {formatWhen(occ)}</p>
              {occ.seriesId && <p><Repeat size={13} /> Part of a recurring series</p>}
              {occ.location && <p><MapPin size={13} /> {occ.location}</p>}
            </div>
          </div>
          <div className="tc-peek-meta">
            <span className="tc-tag" style={{ '--ev': categoryColor(occ.category) }}>{occ.category}</span>
            <span className="tc-peek-owner"><span className="tc-avatar">{initials(personName(occ.owner))}</span>{personName(occ.owner)}</span>
          </div>
          {isTask && !occ.readOnly && (
            <div className="tc-peek-status" role="group" aria-label="Task status">
              {STATUSES.map((s) => (
                <button type="button" key={s} className={occ.status === s ? 'active' : ''} onClick={() => setTaskStatus(occ, s)}>{s}</button>
              ))}
            </div>
          )}
          {occ.attendees?.length > 0 && (
            <div className="tc-peek-people">
              <small><UsersRound size={13} /> {occ.attendees.length} attendee{occ.attendees.length === 1 ? '' : 's'}</small>
              <div>{occ.attendees.slice(0, 8).map((a) => <span key={a} className="tc-avatar" title={personName(a)}>{initials(personName(a))}</span>)}{occ.attendees.length > 8 && <span className="tc-avatar more">+{occ.attendees.length - 8}</span>}</div>
            </div>
          )}
          {occ.description && <p className="tc-peek-notes">{occ.description}</p>}
          {occ.draftId && (
            <div className="tc-peek-draft">
              <p className="tc-peek-hint">Synced from the draft&apos;s due date. Change the date on the draft and the calendar updates for everyone.</p>
              {onOpenDraft && drafts?.some((d) => d.id === occ.draftId) && (
                <button type="button" onClick={() => { setPeek(null); onOpenDraft(occ.draftId); }}>Open draft</button>
              )}
            </div>
          )}
          {occ.updatedBy && <p className="tc-peek-hint">Last updated by {personName(occ.updatedBy)}</p>}
        </div>
      </>
    );
  };

  const renderEditor = () => {
    if (!editor) return null;
    const { form } = editor;
    const set = (changes) => setEditor((ed) => ({ ...ed, form: { ...ed.form, ...changes } }));
    const setRec = (changes) => set({ recurrence: { ...form.recurrence, ...changes } });
    const error = formError(form);
    const attendeeOptions = people.filter((p) => !form.attendees.includes(p.email.toLowerCase())).map((p) => p.name);
    const isTask = ['Task', 'Deadline'].includes(form.category);
    const title = editor.mode === 'create' ? 'New team event' : editor.scope === 'series' ? 'Edit series' : editor.scope === 'occurrence' ? 'Edit this occurrence' : 'Edit event';
    return (
      <div className="tc-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditor(null); }}>
        <form className="tc-modal tc-editor" role="dialog" aria-label={title} onSubmit={(e) => { e.preventDefault(); saveEditor(); }}>
          <header>
            <div>
              <span className="tc-editor-kicker" style={{ '--ev': categoryColor(form.category) }}>{form.category}</span>
              <h2>{title}</h2>
            </div>
            <button type="button" className="tc-icon-button" onClick={() => setEditor(null)} aria-label="Close"><X size={18} /></button>
          </header>
          <div className="tc-editor-body">
            <input className="tc-title-input" autoFocus placeholder="Add a title" value={form.title} onChange={(e) => set({ title: e.target.value })} aria-label="Title" />
            <div className="tc-category-row" role="radiogroup" aria-label="Category">
              {CATEGORIES.map((c) => (
                <button type="button" role="radio" aria-checked={form.category === c.name} key={c.name} className={form.category === c.name ? 'active' : ''} style={{ '--ev': c.color }} onClick={() => set({ category: c.name, showAs: c.name === 'Out of office' ? 'oof' : form.showAs })}>
                  <span />{c.name}
                </button>
              ))}
            </div>

            <div className="tc-field-grid">
              <label className="tc-field">
                <span>Start</span>
                <div className="tc-datetime">
                  <input type="date" value={form.startDate} onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const shift = Math.round((fromDateKey(value) - fromDateKey(form.startDate)) / 86400000);
                    set({ startDate: value, endDate: toDateKey(addDays(fromDateKey(form.endDate), shift)) });
                  }} />
                  {!form.allDay && <input type="time" step="900" value={form.startTime} onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    const oldStart = combine(form.startDate, form.startTime);
                    const duration = combine(form.endDate, form.endTime) - oldStart;
                    const newStart = combine(form.startDate, value);
                    const newEnd = new Date(newStart.getTime() + Math.max(duration, 15 * 60000));
                    set({ startTime: value, endDate: toDateKey(newEnd), endTime: toTimeValue(newEnd) });
                  }} />}
                </div>
              </label>
              <label className="tc-field">
                <span>End</span>
                <div className="tc-datetime">
                  <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => e.target.value && set({ endDate: e.target.value })} />
                  {!form.allDay && <input type="time" step="900" value={form.endTime} onChange={(e) => e.target.value && set({ endTime: e.target.value })} />}
                </div>
              </label>
            </div>
            <label className="tc-switch">
              <input type="checkbox" checked={form.allDay} onChange={(e) => set({ allDay: e.target.checked })} />
              <span className="tc-switch-track" />
              All day
            </label>

            {editor.scope !== 'occurrence' && (
              <div className="tc-repeat">
                <div className="tc-field">
                  <span>Repeat</span>
                  <Select allowClear={false} value={labelFor(REPEAT_OPTIONS, form.recurrence.freq)} options={REPEAT_OPTIONS.map(([, l]) => l)} onChange={(e) => setRec({ freq: valueFor(REPEAT_OPTIONS, e.target.value) })} ariaLabel="Repeat" align="left" />
                </div>
                {['daily', 'weekly', 'monthly', 'yearly'].includes(form.recurrence.freq) && (
                  <label className="tc-field tc-interval">
                    <span>Every</span>
                    <div className="tc-inline">
                      <input type="number" min="1" max="99" value={form.recurrence.interval} onChange={(e) => setRec({ interval: e.target.value })} />
                      <small>{{ daily: 'day(s)', weekly: 'week(s)', monthly: 'month(s)', yearly: 'year(s)' }[form.recurrence.freq]}</small>
                    </div>
                  </label>
                )}
                {form.recurrence.freq !== 'none' && (
                  <label className="tc-field">
                    <span>Ends (optional)</span>
                    <input type="date" value={form.recurrence.until} min={form.startDate} onChange={(e) => setRec({ until: e.target.value })} />
                  </label>
                )}
                {form.recurrence.freq === 'weekly' && (
                  <div className="tc-weekdays" role="group" aria-label="Repeat on">
                    {WEEKDAY_LETTER.map((letter, i) => {
                      const on = form.recurrence.byDays.includes(i);
                      return (
                        <button type="button" key={i} className={on ? 'active' : ''} aria-pressed={on} aria-label={WEEKDAY_SHORT[i]} onClick={() => {
                          const next = on ? form.recurrence.byDays.filter((d) => d !== i) : [...form.recurrence.byDays, i];
                          setRec({ byDays: next.length ? next : [i] });
                        }}>{letter}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="tc-field-grid">
              <div className="tc-field">
                <span>{isTask ? 'Assigned to' : 'Organizer'}</span>
                <Select allowClear={false} value={personName(form.owner)} options={people.map((p) => p.name)} onChange={(e) => set({ owner: people.find((p) => p.name === e.target.value)?.email.toLowerCase() || me })} ariaLabel="Owner" align="left" />
              </div>
              {isTask ? (
                <div className="tc-field">
                  <span>Status</span>
                  <Select allowClear={false} value={form.status} options={STATUSES} onChange={(e) => set({ status: e.target.value })} ariaLabel="Status" align="left" />
                </div>
              ) : (
                <div className="tc-field">
                  <span>Show as</span>
                  <Select allowClear={false} value={labelFor(SHOW_AS, form.showAs)} options={SHOW_AS.map(([, l]) => l)} onChange={(e) => set({ showAs: valueFor(SHOW_AS, e.target.value) })} ariaLabel="Show as" align="left" />
                </div>
              )}
            </div>

            <div className="tc-field">
              <span>Attendees</span>
              <div className="tc-attendees">
                {form.attendees.map((email) => (
                  <span key={email} className="tc-attendee">
                    <span className="tc-avatar">{initials(personName(email))}</span>{personName(email)}
                    <button type="button" aria-label={`Remove ${personName(email)}`} onClick={() => set({ attendees: form.attendees.filter((a) => a !== email) })}><X size={12} /></button>
                  </span>
                ))}
                {!form.attendees.length && <small className="tc-muted">Nobody invited yet</small>}
              </div>
              <div className="tc-attendee-actions">
                {attendeeOptions.length > 0 && (
                  <Select allowClear={false} value="" placeholder="Invite a teammate..." options={attendeeOptions} onChange={(e) => {
                    const person = people.find((p) => p.name === e.target.value);
                    if (person) set({ attendees: [...form.attendees, person.email.toLowerCase()] });
                  }} ariaLabel="Invite a teammate" align="left" />
                )}
                <button type="button" className="tc-secondary" onClick={() => set({ attendees: people.map((p) => p.email.toLowerCase()) })} disabled={!attendeeOptions.length}><UsersRound size={14} /> Invite whole team</button>
              </div>
            </div>

            <div className="tc-field-grid">
              <label className="tc-field">
                <span>Location or Teams link</span>
                <input value={form.location} placeholder="e.g. Microsoft Teams, Room 4B" onChange={(e) => set({ location: e.target.value })} />
              </label>
              <div className="tc-field">
                <span>Reminder</span>
                <Select allowClear={false} value={labelFor(REMINDERS, Number(form.reminder))} options={REMINDERS.map(([, l]) => l)} onChange={(e) => set({ reminder: valueFor(REMINDERS, e.target.value) })} ariaLabel="Reminder" align="left" />
              </div>
            </div>
            <label className="tc-field">
              <span>Notes</span>
              <textarea rows={3} value={form.description} placeholder="Agenda, links or task details" onChange={(e) => set({ description: e.target.value })} />
            </label>
          </div>
          <footer>
            {editor.mode === 'edit' ? (
              <button type="button" className="tc-danger" onClick={() => (editor.scope === 'single' ? setConfirmDelete(editor.occ) : doDelete(editor.occ, editor.scope))}><Trash2 size={15} /> {editor.scope === 'series' ? 'Delete series' : 'Delete'}</button>
            ) : <span />}
            <div>
              {error && <small className="tc-missing">{error}</small>}
              <button type="button" className="tc-secondary" onClick={() => setEditor(null)}>Cancel</button>
              <button type="submit" className={`tc-primary${error ? '' : ' is-ready'}`} disabled={Boolean(error)}>{editor.mode === 'create' ? 'Save to team calendar' : 'Save changes'}</button>
            </div>
          </footer>
        </form>
      </div>
    );
  };

  const renderScopePrompt = () => {
    if (!scopePrompt) return null;
    const { occ, action } = scopePrompt;
    const verb = action === 'edit' ? 'Edit' : 'Delete';
    return (
      <div className="tc-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setScopePrompt(null); }}>
        <div className="tc-modal tc-small-modal" role="dialog" aria-label={`${verb} recurring event`}>
          <h2><Repeat size={18} /> {verb} recurring event</h2>
          <p>&ldquo;{occ.title}&rdquo; repeats. What would you like to {action}?</p>
          <div className="tc-small-actions">
            <button type="button" className="tc-secondary" onClick={() => setScopePrompt(null)}>Cancel</button>
            <button type="button" className="tc-secondary" onClick={() => (action === 'edit' ? beginEdit(occ, 'occurrence') : doDelete(occ, 'occurrence'))}>This event only</button>
            <button type="button" className={action === 'edit' ? 'tc-primary is-ready' : 'tc-danger solid'} onClick={() => (action === 'edit' ? beginEdit(occ, 'series') : doDelete(occ, 'series'))}>The entire series</button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmDelete = () => {
    if (!confirmDelete) return null;
    return (
      <div className="tc-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
        <div className="tc-modal tc-small-modal" role="alertdialog" aria-label="Delete event">
          <h2><Trash2 size={18} /> Delete event?</h2>
          <p>&ldquo;{confirmDelete.title}&rdquo; will be removed from the team calendar for everyone.</p>
          <div className="tc-small-actions">
            <button type="button" className="tc-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button type="button" className="tc-danger solid" onClick={() => doDelete(confirmDelete, 'single')}>Delete</button>
          </div>
        </div>
      </div>
    );
  };

  const toggleSection = (key) => setCollapsed((current) => {
    const next = { ...current, [key]: !current[key] };
    localStorage.setItem('comms-hub-cal-collapsed', JSON.stringify(next));
    return next;
  });
  const sectionToggle = (key, label) => (
    <button type="button" className="tc-collapse" onClick={() => toggleSection(key)} aria-expanded={!collapsed[key]} aria-label={`${collapsed[key] ? 'Expand' : 'Collapse'} ${label}`} title={collapsed[key] ? 'Expand' : 'Collapse'}>
      {collapsed[key] ? <Plus size={13} strokeWidth={2.6} /> : <Minus size={13} strokeWidth={2.6} />}
    </button>
  );
  const shownPeople = people.filter((p) => !hiddenPeople.has(p.email.toLowerCase())).length;
  const allCategories = [...CATEGORIES, DRAFT_CATEGORY];
  const shownCategories = allCategories.filter((c) => !hiddenCategories.has(c.name)).length;

  const allPeopleShown = hiddenPeople.size === 0;
  const onlyMe = people.length > 1 && people.every((p) => (p.email.toLowerCase() === me) !== hiddenPeople.has(p.email.toLowerCase()));

  return (
    <main className="team-calendar-page">
      <div className="tc-shell">
        <aside className="tc-sidebar">
          <button type="button" className="tc-new" onClick={() => openCreate()}>
            <span className="tc-new-icon"><Plus size={16} strokeWidth={2.5} /></span>
            <span className="tc-new-text"><strong>New event</strong><small>Meeting, task or deadline</small></span>
          </button>
          <MiniMonth cursor={cursor} range={range} onPick={(day) => setCursor(day)} />

          <section className="tc-side-section">
            <header>
              <div className="tc-side-title">
                {sectionToggle('people', 'team calendars')}
                <strong>Team calendars</strong>
                {collapsed.people && <span className="tc-side-count">{shownPeople}/{people.length}</span>}
              </div>
              <div className="tc-side-links">
                <button type="button" className={allPeopleShown ? 'active' : ''} onClick={() => setHiddenPeople(new Set())}>All</button>
                <button type="button" className={onlyMe ? 'active' : ''} onClick={() => setHiddenPeople(new Set(people.map((p) => p.email.toLowerCase()).filter((e) => e !== me)))}>Only me</button>
              </div>
            </header>
            {!collapsed.people && <div className="tc-people">
              {people.map((p) => {
                const email = p.email.toLowerCase();
                const on = !hiddenPeople.has(email);
                return (
                  <label key={email} className={`tc-check${on ? '' : ' is-off'}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleSet(setHiddenPeople, email)} />
                    <span className="tc-avatar">{initials(p.name)}</span>
                    <span className="tc-check-label">{email === me ? `${p.name} (you)` : p.name}</span>
                  </label>
                );
              })}
            </div>}
          </section>

          <section className="tc-side-section">
            <header>
              <div className="tc-side-title">
                {sectionToggle('categories', 'categories')}
                <strong>Categories</strong>
                {collapsed.categories && <span className="tc-side-count">{shownCategories}/{allCategories.length}</span>}
              </div>
            </header>
            {!collapsed.categories && allCategories.map((c) => (
              <label key={c.name} className={`tc-check${hiddenCategories.has(c.name) ? ' is-off' : ''}`} style={{ '--chk': c.color }}>
                <input type="checkbox" checked={!hiddenCategories.has(c.name)} onChange={() => toggleSet(setHiddenCategories, c.name)} />
                <span className="tc-check-label">{c.name}</span>
              </label>
            ))}
          </section>

          <section className={`tc-sync ${provider.kind}`}>
            {provider.kind === 'graph' ? <Cloud size={16} /> : <HardDrive size={16} />}
            <div>
              <strong>{provider.label}</strong>
              <small>{status.syncedAt ? `Updated ${fmtTime(status.syncedAt)}` : 'Connecting…'}</small>
            </div>
            <button type="button" className="tc-icon-button" onClick={() => setRefreshTick((t) => t + 1)} aria-label="Refresh"><RefreshCw size={14} className={status.loading ? 'spin' : ''} /></button>
          </section>
          {provider.kind === 'local' && <p className="tc-sync-note">Changes appear instantly in every open Comms Hub tab. Connect Microsoft 365 to share them with everyone&apos;s devices.</p>}
          {notifyPermission === 'default' && (
            <button type="button" className="tc-secondary tc-notify" onClick={() => Notification.requestPermission().then(setNotifyPermission)}><Bell size={14} /> Turn on desktop reminders</button>
          )}
        </aside>

        <section className="tc-main">
          <div className="tc-toolbar">
            <div className="tc-toolbar-left">
              <button type="button" className="tc-secondary" onClick={() => setCursor(startOfDay(new Date()))}>Today</button>
              <div className="tc-arrows">
                <button type="button" className="tc-icon-button" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={18} /></button>
                <button type="button" className="tc-icon-button" onClick={() => step(1)} aria-label="Next"><ChevronRight size={18} /></button>
              </div>
              <h1>{rangeLabel(view, cursor, range)}</h1>
            </div>
            <div className="tc-toolbar-right">
              <label className="tc-search">
                <Search size={15} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events" aria-label="Search events" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={13} /></button>}
              </label>
              <div className="tc-views" role="tablist" aria-label="Calendar view">
                {VIEWS.map(([value, label]) => (
                  <button type="button" role="tab" aria-selected={view === value} key={value} className={view === value ? 'active' : ''} onClick={() => setView(value)}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          {status.error && (
            <div className="tc-error" role="alert">
              <span>{status.error}</span>
              <button type="button" onClick={() => { setStatus((s) => ({ ...s, error: '' })); setRefreshTick((t) => t + 1); }}>Try again</button>
            </div>
          )}

          <div className={`tc-body view-${view}`}>
            {status.loading && !occurrences.length && !status.syncedAt ? (
              <div className="tc-skeleton">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>
            ) : view === 'month' ? renderMonth() : view === 'agenda' ? renderAgenda() : renderTimeGrid()}
          </div>
        </section>
      </div>

      {renderPeek()}
      {renderEditor()}
      {renderScopePrompt()}
      {renderConfirmDelete()}
      {notice && <div className="tc-toast" role="status"><CheckCircle2 size={16} /> {notice}</div>}
    </main>
  );
}

// Watches for upcoming events you own or were invited to and pops Outlook-style reminders on any page.
export function CalendarReminders({ currentUser }) {
  const [due, setDue] = useState([]);
  useEffect(() => {
    const me = currentUser?.email?.toLowerCase();
    if (!me) return undefined;
    let stopped = false;
    const check = async () => {
      try {
        const now = new Date();
        const list = await getCalendarProvider().load(addMinutes(now, -120), addDays(now, 2));
        let fired = [];
        try {
          fired = JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]');
        } catch {
          fired = [];
        }
        const firedSet = new Set(fired);
        const fresh = list.filter((o) => o.reminder >= 0
          && [o.owner, ...(o.attendees || [])].some((p) => p?.toLowerCase() === me)
          && new Date(o.start).getTime() - o.reminder * 60000 <= now.getTime()
          && new Date(o.end) > now
          && !firedSet.has(`${o.occurrenceId}@${o.start}`));
        if (!fresh.length || stopped) return;
        fresh.forEach((o) => firedSet.add(`${o.occurrenceId}@${o.start}`));
        localStorage.setItem(REMINDER_KEY, JSON.stringify([...firedSet].slice(-300)));
        setDue((cur) => [...cur, ...fresh]);
        if ('Notification' in window && Notification.permission === 'granted') {
          fresh.forEach((o) => new Notification(o.title, { body: `${formatWhen(o)}${o.location ? ` · ${o.location}` : ''}` }));
        }
      } catch {
        // Reminders are best-effort; the calendar page shows load errors.
      }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [currentUser]);

  if (!due.length) return null;
  return (
    <div className="tc-reminders" role="status" aria-live="polite">
      {due.slice(-3).map((o) => (
        <div className="tc-reminder" key={`${o.occurrenceId}@${o.start}`} style={{ '--ev': categoryColor(o.category) }}>
          <Bell size={16} />
          <div>
            <strong>{o.title}</strong>
            <span>{new Date(o.start) <= new Date() ? 'Now' : `Starts ${fmtTime(new Date(o.start))}`} · {formatWhen(o)}</span>
            {o.location && <small>{o.location}</small>}
          </div>
          <button type="button" onClick={() => setDue((cur) => cur.filter((x) => x !== o))} aria-label="Dismiss reminder"><X size={14} /></button>
        </div>
      ))}
      {due.length > 1 && <button type="button" className="tc-dismiss-all" onClick={() => setDue([])}>Dismiss all ({due.length})</button>}
    </div>
  );
}
