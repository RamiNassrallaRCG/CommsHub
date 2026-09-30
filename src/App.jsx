import { Fragment, useEffect, useRef, useState } from 'react';
import royalLogoWhite from './assets/royal-logo-white.png';
import { getAccountEmails, initMicrosoftSignIn, isEntraConfigured, startMicrosoftSignIn, startMicrosoftSignOut } from './authConfig';
import TeamCalendar, { CalendarReminders } from './TeamCalendar';
import { buildDraftDueEvent, removeDraftDueDate, syncDraftDueDate } from './calendarStore';
import {
  AlertTriangle,
  Archive,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock3,
  ClipboardList,
  Columns2,
  Eraser,
  FastForward,
  FileText,
  Flag,
  Heading1,
  Heading2,
  Highlighter,
  Hourglass,
  Image,
  Indent,
  Italic,
  Link,
  List,
  ListOrdered,
  Lock,
  LifeBuoy,
  LogOut,
  MoonStar,
  Minus,
  Outdent,
  Palette,
  Paperclip,
  PenLine,
  Plus,
  Quote,
  RotateCcw,
  Save,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Strikethrough,
  Subscript,
  SunMedium,
  Superscript,
  Tag,
  Table2,
  Trash2,
  Type,
  Underline,
  Undo2,
  Unlink,
  Redo2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';

const brands = ['Royal Caribbean', 'Celebrity Cruises', 'Silversea'];
const draftSections = [
  'Copilot Edit', 'Subject Line', 'Reason Statement', 'Change Statement', 'Grid', 'Your Day in Port/At Sea',
  'Refund Comp Language', 'Links', 'Phone Numbers/Chat', 'Signature', 'Cross-Referenced Itinerary',
];
const documentTypes = ['Email', 'Itinerary', 'Web content', 'Printed collateral', 'Onboard signage'];
const errorTypes = ['Typo or grammar', 'Incorrect information', 'Brand compliance', 'Missing approval', 'Formatting'];
const directory = [
  { name: 'Heidi McCord', email: 'hmccord@rccl.com', title: 'Sr. Analyst, External Communications', role: 'User' },
  { name: 'Mateo Gomez', email: 'mgomez@rccl.com', title: 'Sr. Specialist, External Communications', role: 'User' },
  { name: 'Nelson Frau', email: 'nfrau@rccl.com', title: 'Manager, Customer Experience Service', role: 'Manager' },
  { name: 'Bianca Lopez', email: 'blopez@celebrity.com', title: 'Sr. Manager, External Communications', role: 'Manager' },
  { name: 'Shirin Castro', email: 'shirincastro@rccl.com', title: 'Analyst, External Communications', role: 'User' },
  { name: 'Erick Weidmann', email: 'eweidmann@rccl.com', title: 'Analyst, External Communications', role: 'User' },
  { name: 'Colin Rourke', email: 'crourke@rccl.com', title: 'Lead, External Communications', role: 'Manager' },
  { name: 'Marilyn Robleto', email: 'mrobleto@rccl.com', title: 'Analyst, External Communications', role: 'User' },
  { name: 'Jennifer Navas', email: 'jennifernavas@rccl.com', title: 'Analyst, External Communications', role: 'User' },
  { name: 'Alex Wilkison', email: 'awilkison@celebrity.com', title: 'Lead, External Communications', role: 'Manager' },
  { name: 'Zoe Pendas', email: 'zpendas@silversea.com', title: 'Analyst, External Communications', role: 'User' },
  { name: 'Stephanie Kirby', email: 'stephaniekirby@silversea.com', title: 'Manager, External Communications', role: 'User' },
  { name: 'Laly Yera-Rodriguez', email: 'ayera-rodriguez@rccl.com', title: 'VP, Guest Experience', role: 'Manager' },
  { name: 'Vincent Spada', email: 'vspada@rccl.com', title: 'Manager, Business Intelligence', role: 'Manager' },
  { name: 'Sarah Kremer', email: 'skremer@rccl.com', title: 'Assoc. Manager, Business Intelligence', role: 'Manager' },
  { name: 'Rami Nassralla', email: 'raminassralla@celebrity.com', title: 'Sr. Analyst, Business Intelligence', role: 'Manager' },
];

const ADMIN_EMAIL = 'raminassralla@celebrity.com';
const ACCESS_STORAGE_KEY = 'comms-hub-access-v1';
const accessTypes = ['User', 'Manager'];
// Every page in the app and which view types include it by default.
// Admins can switch individual pages off per user (stored as `blockedPages`).
const pageCatalog = [
  { name: 'Log', description: 'Log a communication', views: ['User', 'Manager'] },
  { name: 'History', description: 'Review history table', views: ['User', 'Manager'] },
  { name: 'Dashboard', description: 'Team dashboard', views: ['Manager'] },
  { name: 'Team Calendar', description: 'Shared team calendar & tasks', views: ['User', 'Manager'] },
  { name: 'Templates', description: 'Drafts & review workflow', views: ['Manager'] },
  { name: 'My Stats', description: 'Personal stats', views: ['User', 'Manager'] },
];
const getAllowedPages = (person) => {
  if (!person) return [];
  if (person.email?.toLowerCase() === ADMIN_EMAIL) return [...pageCatalog.map((page) => page.name), 'Admin'];
  const blocked = person.blockedPages || [];
  return pageCatalog.filter((page) => page.views.includes(person.view) && !blocked.includes(page.name)).map((page) => page.name);
};
const initialAccess = directory.map(({ name, email, title, role }) => ({
  name, email, title, view: role === 'Manager' ? 'Manager' : 'User', status: 'Allowed', blockedPages: [],
}));

const loadAccess = () => {
  const saved = localStorage.getItem(ACCESS_STORAGE_KEY);
  if (!saved) return initialAccess;
  try {
    const entries = JSON.parse(saved);
    if (!Array.isArray(entries) || !entries.every((entry) =>
      typeof entry.name === 'string' && typeof entry.email === 'string'
      && accessTypes.includes(entry.view) && ['Allowed', 'Denied'].includes(entry.status)
    )) throw new Error('Invalid access list');
    const unique = new Set(entries.map((entry) => entry.email.toLowerCase()));
    if (unique.size !== entries.length) throw new Error('Duplicate email addresses');
    return [
      ...entries.filter((entry) => entry.email.toLowerCase() !== ADMIN_EMAIL).map((entry) => ({
        ...entry,
        name: entry.email.toLowerCase() === 'skremer@rccl.com' && entry.name === 'Srakren Kremer'
          ? 'Sarah Kremer' : entry.name,
        title: typeof entry.title === 'string' ? entry.title : directory.find((person) => person.email === entry.email)?.title || 'Team member',
        blockedPages: Array.isArray(entry.blockedPages)
          ? entry.blockedPages.filter((page) => pageCatalog.some((item) => item.name === page)) : [],
      })),
      initialAccess.find((entry) => entry.email === ADMIN_EMAIL),
    ];
  } catch (error) {
    console.error('Could not load the saved access list.', error);
    return initialAccess;
  }
};

const getInitials = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'U';

const getPresenceStatus = (person, currentUser) => {
  if (currentUser && person.email === currentUser.email) return 'active';
  const seed = person.email.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seed % 3 === 0 ? 'away' : 'active';
};

const historyState = (state) => ({ source: 'comms-hub', ...state });

const initialForm = {
  brand: '',
  documentType: '',
  errorType: '',
  copywriter: '',
  reviewerOne: '',
  reviewerTwo: '',
  manager: '',
  requestSubmitted: '',
  finalReviewDate: '2026-09-18',
  notes: '',
};

const emptyNewDraftForm = {
  title: '',
  brand: '',
  documentType: '',
  reviewerOne: '',
  reviewerTwo: '',
  priority: 'Normal',
  dueDate: '',
  notes: '',
  screenshots: [],
};

const stageOrder = ['Copywriter', 'Review 1', 'Review 2', 'Review 3', 'Manager'];
const stageAssigneeFields = { Copywriter: 'copywriter', 'Review 1': 'reviewerOne', 'Review 2': 'reviewerTwo', 'Review 3': 'reviewerThree', Manager: 'manager' };
const getDraftStage = (draft) => {
  if (draft.currentStage) return draft.currentStage;
  if (draft.type === 'Manager') return 'Manager';
  if (draft.type === 'Review 2') return 'Review 2';
  if (draft.type === 'Review 3') return 'Review 3';
  if (draft.type === 'Review 1') return 'Review 1';
  if (draft.type === 'Proofing') return 'Review 1';
  return 'Copywriter';
};
const getDraftStages = (draft) => draft.reviewTwoReview?.extraReview || draft.currentStage === 'Review 3'
  || draft.versions?.some((version) => version.stage === 'Review 3')
  ? stageOrder : stageOrder.filter((stage) => stage !== 'Review 3');

const priorityRank = { Urgent: 0, High: 1, Normal: 2, Low: 3 };

const draftSortGroups = [
  {
    label: 'Time on current stage',
    options: [
      { value: 'stuckLongest', label: 'Stuck longest (top)' },
      { value: 'justMoved', label: 'Just moved (top)' },
    ],
  },
  {
    label: 'Priority & updates',
    options: [
      { value: 'priorityFirst', label: 'Priority (high first)' },
      { value: 'recentlyUpdated', label: 'Recently updated' },
      { value: 'oldestUpdated', label: 'Oldest updated' },
    ],
  },
  {
    label: 'Title',
    options: [
      { value: 'titleAZ', label: 'Title A → Z' },
      { value: 'titleZA', label: 'Title Z → A' },
    ],
  },
];

// Compact duration for a single role's timer chip, e.g. "36s", "14h 06m", "14d 09h".
const formatChipDuration = (rawSeconds) => {
  const seconds = Math.max(0, Math.floor(rawSeconds));
  if (seconds < 60) return `${seconds}s`;
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  const totalHours = Math.floor(seconds / 3600);
  if (totalHours < 24) return `${totalHours}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}m`;
  const days = Math.floor(seconds / 86400);
  return `${days}d ${String(Math.floor((seconds % 86400) / 3600)).padStart(2, '0')}h`;
};

// Longer duration for the card's total "Elapsed" summary, e.g. "14d 23h 08m".
const formatTotalElapsed = (rawSeconds) => {
  const seconds = Math.max(0, Math.floor(rawSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  return `${seconds}s`;
};

// Word-level diff (LCS). Each token keeps its trailing whitespace so line breaks survive rendering.
const diffWords = (before = '', after = '') => {
  const tokenize = (text) => (text.match(/\S+\s*/g) || []).map((raw) => ({ word: raw.trim(), raw }));
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length * b.length > 4000000) {
    return [...a.map((token) => ({ type: 'removed', ...token })), ...b.map((token) => ({ type: 'added', ...token }))];
  }
  const cols = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * cols);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i * cols + j] = a[i].word === b[j].word
        ? lcs[(i + 1) * cols + j + 1] + 1
        : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1]);
    }
  }
  const parts = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].word === b[j].word) { parts.push({ type: 'equal', ...b[j] }); i += 1; j += 1; }
    else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) { parts.push({ type: 'removed', ...a[i] }); i += 1; }
    else { parts.push({ type: 'added', ...b[j] }); j += 1; }
  }
  while (i < a.length) { parts.push({ type: 'removed', ...a[i] }); i += 1; }
  while (j < b.length) { parts.push({ type: 'added', ...b[j] }); j += 1; }
  return parts;
};

const getRoleForStage = (draft, stage) => {
  switch (stage) {
    case 'Copywriter': return draft.copywriter;
    case 'Review 1': return draft.reviewerOne;
    case 'Review 2': return draft.reviewerTwo;
    case 'Review 3': return draft.reviewerThree;
    case 'Manager': return draft.manager;
    default: return 'Unassigned';
  }
};

// Returns a millisecond timestamp offset into the past, used to seed demo
// drafts so their live timers look realistic on first load.
const agoMs = ({ days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) =>
  Date.now() - (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;

const templateDrafts = [
  {
    id: 'tscfsh',
    brand: 'Silversea',
    title: 'Taking Points',
    type: 'Review 1',
    typeTone: 'purple',
    status: 'Open',
    statusTone: 'green',
    copywriter: 'Colin',
    reviewerOne: 'Heidi',
    reviewerTwo: 'Alex',
    manager: 'Colin',
    documentType: 'Talking Points',
    priority: 'High',
    dueDate: '2026-09-30',
    due: '5d 14h',
    updated: 'Sep 15, 2026',
    stageSeconds: { Copywriter: 36 * 60 },
    stageStartedAt: agoMs({ minutes: 45 }),
  },
  {
    id: 'TEST 2222',
    brand: 'Royal Caribbean',
    title: 'air travel disruptions affecting the United Kingdom',
    type: 'Review 2',
    typeTone: 'purple',
    status: 'Open',
    statusTone: 'green',
    copywriter: 'Marlon',
    reviewerOne: 'Miriam',
    reviewerTwo: 'Jennifer',
    manager: 'Bianca',
    documentType: 'Talking Points',
    priority: 'Urgent',
    dueDate: '2026-09-24',
    due: '2h 19m',
    updated: 'Sep 14, 2026',
    stageSeconds: { Copywriter: 20 * 60, 'Review 1': 15 * 60 },
    stageStartedAt: agoMs({ minutes: 5 }),
    versions: [
      { stage: 'Copywriter', sections: ['Subject Line', 'Reason Statement', 'Signature'], content: 'Dear Guest,\n\nWe want to let you know about air travel disruptions affecting flights to and from the United Kingdom.\n\nWe will share updates as soon as we have them.' },
      { stage: 'Review 1', sections: ['Reason Statement', 'Change Statement', 'Links'], content: 'Dear Guest,\n\nWe want to let you know about ongoing air travel disruptions affecting flights to and from the United Kingdom, including London Heathrow and Gatwick.\n\nWhat this means for you\nIf your flight is delayed or cancelled, please contact your airline directly for rebooking options. If you booked your flights through us, our team will reach out to you with next steps.\n\nWe will continue to share updates as soon as we have them. Thank you for your patience and understanding.' },
    ],
  },
  {
    id: 'asclzdasd',
    brand: 'Royal Caribbean',
    title: 'Itinerary Mod',
    type: 'Manager',
    typeTone: 'pink',
    status: 'Open',
    statusTone: 'green',
    copywriter: 'Bianca',
    reviewerOne: 'Alex',
    reviewerTwo: 'Amber',
    manager: 'Colin',
    documentType: 'Itinerary Mod',
    priority: 'High',
    dueDate: '2026-09-24',
    due: '2h 19m',
    updated: 'Sep 10, 2026',
    stageSeconds: { Copywriter: 17, 'Review 1': 36, 'Review 2': 14 * 3600 + 6 * 60 },
    stageStartedAt: agoMs({ days: 14, hours: 9 }),
  },
  {
    id: 'cefs',
    brand: 'Royal Caribbean',
    title: 'Email to crew',
    type: 'Proofing',
    typeTone: 'green',
    status: 'Open',
    statusTone: 'green',
    copywriter: 'Colin',
    reviewerOne: 'Bianca',
    reviewerTwo: 'Alex',
    manager: 'Unassigned',
    documentType: 'Email',
    priority: 'Normal',
    dueDate: '2026-09-25',
    due: '4h 38m',
    updated: 'Sep 10, 2026',
    stageSeconds: { Copywriter: 40 * 60 },
    stageStartedAt: agoMs({ minutes: 25 }),
  },
  {
    id: 'Jewel of the Seas',
    brand: 'Royal Caribbean',
    title: 'Jewel of the Seas 09/10/2026',
    type: 'Review 2',
    typeTone: 'purple',
    status: 'Open',
    statusTone: 'green',
    copywriter: 'Mateo',
    reviewerOne: 'Jennifer',
    reviewerTwo: 'Amber',
    manager: 'Unassigned',
    documentType: 'Itinerary Mod',
    priority: 'Normal',
    dueDate: '2026-09-24',
    due: '2h 19m',
    updated: 'Sep 20, 2026',
    stageSeconds: { Copywriter: 3 * 60, 'Review 1': 2 * 60 },
    stageStartedAt: agoMs({ minutes: 8 }),
    versions: [
      { stage: 'Copywriter', sections: ['Subject Line', 'Grid', 'Your Day in Port/At Sea'], content: 'Dear Guest,\n\nWe have an update to your Jewel of the Seas itinerary departing September 10, 2026.' },
      { stage: 'Review 1', sections: ['Change Statement', 'Grid', 'Cross-Referenced Itinerary'], content: 'Dear Guest,\n\nWe\'re looking forward to welcoming you onboard Jewel of the Seas!\n\nAs we continue to plan your upcoming adventure, we want to inform you about an update to your September 10, 2026, itinerary. Due to port availability, we\'ve adjusted the order of our port calls. All scheduled ports remain on your itinerary.\n\nImportant Notes\nAny shore excursions booked through us will be automatically updated to reflect the new dates. Please review your Cruise Planner for the latest details.\n\nWe look forward to sailing with you soon.' },
    ],
  },
  {
    id: 'eTQ',
    brand: 'Celebrity Cruises',
    title: 'Onboard letter',
    type: 'Review 1',
    typeTone: 'purple',
    status: 'Open',
    statusTone: 'green',
    copywriter: 'Mia',
    reviewerOne: 'Alicia',
    reviewerTwo: 'Patrick',
    manager: 'Laura',
    documentType: 'Onboard letter',
    priority: 'Low',
    dueDate: '2026-09-25',
    due: '1d 2h',
    updated: 'Sep 09, 2026',
    stageSeconds: { Copywriter: 5 * 60 },
    stageStartedAt: agoMs({ hours: 1, minutes: 10 }),
  },
];

const genieCopyVersions = [
  'Dear Guest,\n\nThank you for booking the Royal Genie package for your upcoming cruise. Your Genie will be in touch before you sail to learn about your preferences.\n\nDuring your cruise you will enjoy priority access, reserved seating and a personalized itinerary.\n\nWe look forward to welcoming you onboard.',
  'Dear Guest,\n\nThank you for booking The Key Royal Genie package for your upcoming cruise. Your personal Genie will reach out before you sail to learn about your preferences and plan every detail.\n\nDuring your cruise you will enjoy priority access, reserved seating at shows and a personalized daily itinerary.\n\nWe look forward to welcoming you onboard.',
  'Dear Guest,\n\nThank you for booking the Royal Genie package for your upcoming cruise. Your personal Genie will reach out 30 days before you sail to learn about your preferences and plan every detail.\n\nDuring your cruise you will enjoy priority access to activities, reserved seating at shows and a personalized daily itinerary delivered to your stateroom.\n\nWe look forward to welcoming you onboard.',
  'Dear Guest,\n\nThank you for booking the Royal Genie package for your upcoming cruise. Your personal Genie will reach out 30 days before you sail to learn about your preferences and plan every detail of your vacation.\n\nDuring your cruise, you will enjoy priority access to activities, reserved seating at shows and a personalized daily itinerary delivered to your stateroom.\n\nWe look forward to welcoming you onboard soon.',
];

const airTravelVersions = [
  'Dear Guest,\n\nWe want to let you know about air travel disruptions affecting flights to and from the United Kingdom.\n\nWe will share updates as soon as we have them.',
  'Dear Guest,\n\nWe want to let you know about ongoing air travel disruptions affecting flights to and from the United Kingdom, including London Heathrow.\n\nIf your flight is delayed or cancelled, please contact your airline directly.\n\nWe will share updates as soon as we have them.',
  'Dear Guest,\n\nWe want to let you know about ongoing air travel disruptions affecting flights to and from the United Kingdom, including London Heathrow and Gatwick.\n\nIf your flight is delayed or cancelled, please contact your airline directly for rebooking options. If you booked your flights through us, our team will reach out with next steps.\n\nWe will continue to share updates as soon as we have them.',
  'Dear Guest,\n\nWe want to let you know about ongoing air travel disruptions affecting flights to and from the United Kingdom, including London Heathrow and Gatwick.\n\nIf your flight is delayed or cancelled, please contact your airline directly for rebooking options. If you booked your flights through us, our team will reach out to you with next steps.\n\nWe will continue to share updates as soon as we have them. Thank you for your patience and understanding.',
];

const seedHistoryDraft = ({ id, title, brand, documentType, people, versions, finalContent, seconds, finishedAt, sections, reviewTwo, notes }) => {
  const [copywriter, reviewerOne, reviewerTwo, reviewerThree, manager] = people;
  const stages = ['Copywriter', 'Review 1', 'Review 2', 'Review 3'];
  let at = finishedAt - Object.values(seconds).reduce((sum, value) => sum + value, 0) * 1000;
  return {
    id, title, brand, documentType, copywriter, reviewerOne, reviewerTwo, reviewerThree, manager,
    priority: 'Normal', notes, startedAt: at, stageSeconds: seconds, content: finalContent,
    reviewTwoReview: { ...reviewTwo, extraReview: true },
    versions: versions.map((content, index) => {
      at += seconds[stages[index]] * 1000;
      return { stage: stages[index], content, sections: sections[index], at, by: people[index], ...(stages[index] === 'Review 2' ? { review: { reviewer: reviewerTwo, manager, ...reviewTwo } } : {}) };
    }),
    finalSections: sections[4], closedAt: finishedAt, closedBy: manager,
  };
};

const initialHistoryRows = [
  { date: 'Sep 18, 2026, 10:01 AM', title: 'sdasdasd', brand: 'Silversea', type: 'Deployment', copywriter: '—', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 18, 2026, 10:01 AM', title: 'asdasdasd', brand: 'Celebrity Cruises', type: 'Talking Points', copywriter: 'Heidi McCord', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 18, 2026, 10:01 AM', title: 'Test', brand: 'Royal Caribbean', type: 'Itinerary Mod', copywriter: 'Colin Rourke', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 18, 2026, 10:01 AM', title: 'BAL', brand: 'Royal Caribbean', type: 'Talking Points', copywriter: 'Shirin Castro', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 14, 2026, 10:00 AM', title: 'test 2', brand: 'Celebrity', type: 'Talking Points', copywriter: 'Mateo Gomez', review1: 'Jennifer Navas', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'Grammar' },
  { date: 'Sep 14, 2026, 09:40 AM', title: 'air travel disruptions affecting the United Kingdom and London', brand: 'Celebrity', type: 'Talking Points', copywriter: 'Mateo Gomez', review1: 'Marilyn Robleto', review2: 'Jennifer Navas', review3: 'Bianca Lopez', manager: 'Colin Rourke', status: 'Completed', total: '0h 36m', errors: 'Spelling', draft: seedHistoryDraft({ id: 'hist-air-travel', title: 'air travel disruptions affecting the United Kingdom and London', brand: 'Celebrity Cruises', documentType: 'Talking Points', people: ['Mateo Gomez', 'Marilyn Robleto', 'Jennifer Navas', 'Bianca Lopez', 'Colin Rourke'], versions: airTravelVersions, finalContent: airTravelVersions[3], seconds: { Copywriter: 480, 'Review 1': 540, 'Review 2': 420, 'Review 3': 360, Manager: 360 }, finishedAt: new Date(2026, 8, 14, 9, 40).getTime(), sections: [['Subject Line', 'Reason Statement'], ['Reason Statement', 'Change Statement'], ['Change Statement', 'Links'], ['Signature'], []], reviewTwo: { changeType: 'Content', errorType: 'Typo or grammar', notes: 'Added Gatwick and rebooking guidance for guests who booked air with us.' }, notes: 'Use the approved UK disruption talking points. Keep the tone calm and reassuring.' }) },
  { date: 'Sep 9, 2026, 10:31 AM', title: 'AN 09/14/26 Oversell', brand: 'Celebrity', type: 'Oversell', copywriter: '—', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 8, 2026, 04:49 PM', title: 'TEST ONE', brand: 'Silversea', type: 'Deployment', copywriter: '—', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 8, 2026, 01:09 PM', title: 'TEST 1', brand: 'Celebrity', type: 'Itinerary Mod', copywriter: 'Heidi McCord', review1: 'Zoe Pendas', review2: 'Mateo Gomez', review3: 'Bianca Lopez', manager: '—', status: 'Completed', total: '1h 54m', errors: 'Grammar' },
  { date: 'Sep 4, 2026, 09:25 PM', title: 'SL: Anthem of the Seas: A Special Offer for You Cruise', brand: 'Royal Caribbean', type: 'Deployment', copywriter: 'Mateo Gomez', review1: 'Heidi McCord', review2: 'Erick Weidmann', review3: 'Nelson Frau', manager: '—', status: 'Completed', total: '0h 37m', errors: 'None' },
  { date: 'Sep 3, 2026, 04:51 PM', title: 'For Review: Your Royal Genie Package Experience Guest Copy', brand: 'Royal Caribbean', type: 'Deployment', copywriter: 'Shirin Castro', review1: 'Bianca Lopez', review2: 'Hiodette', review3: 'Bianca Lopez', manager: 'Colin Rourke', status: 'Completed', total: '0h 55m', errors: 'Spelling • Grammar', draft: seedHistoryDraft({ id: 'hist-royal-genie', title: 'For Review: Your Royal Genie Package Experience Guest Copy', brand: 'Royal Caribbean', documentType: 'Deployment', people: ['Shirin Castro', 'Bianca Lopez', 'Hiodette', 'Bianca Lopez', 'Colin Rourke'], versions: genieCopyVersions, finalContent: genieCopyVersions[3].replace('We look forward to welcoming you onboard soon.', 'We look forward to welcoming you onboard soon.\n\nWarm regards,\nThe Royal Caribbean Team'), seconds: { Copywriter: 1080, 'Review 1': 720, 'Review 2': 600, 'Review 3': 480, Manager: 420 }, finishedAt: new Date(2026, 8, 3, 16, 51).getTime(), sections: [['Subject Line', 'Reason Statement', 'Signature'], ['Reason Statement', 'Change Statement'], ['Change Statement', 'Links'], ['Change Statement'], ['Signature']], reviewTwo: { changeType: 'Grammar', errorType: 'Incorrect information', notes: 'Removed The Key branding and added the 30-day contact window.' }, notes: 'Guest copy for the Royal Genie deployment. Confirm the 30-day outreach timing with the product team.' }) },
];

function SelectField({ label, required = true, value, onChange, options, placeholder, icon: Icon, error }) {
  return (
    <label className="field">
      <span className="field-label">{Icon && <Icon size={15} strokeWidth={1.8} />}{label}{required && <b>*</b>}</span>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        allowClear={false}
        align="left"
        ariaLabel={label}
        error={!!error}
      />
      {error && <span className="error-message">{error}</span>}
    </label>
  );
}

function CustomSelect({ value, onChange, options, disabled, placeholder = 'Unassigned', allowClear = true, align = 'center', ariaLabel = 'Select an option', error = false, triggerLabel, showDetails = false, optionDetails = directory, disabledReason }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`custom-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${align === 'left' ? 'align-left' : ''} ${error ? 'has-error' : ''}`}>
      <button
        type="button"
        className="custom-select-button"
        onClick={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        {triggerLabel && <UserRound size={11} aria-hidden="true" />}
        <span className={value ? '' : 'placeholder'}>{triggerLabel || value || placeholder}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && !disabled && (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {showDetails && <div className="assignment-menu-heading">Reassign {ariaLabel.replace('Change ', '').replace(' assignee', '')}<span>Currently: {value || 'Unassigned'}</span></div>}
          {allowClear && (
            <button
              type="button"
              className={`custom-option ${!value ? 'selected' : ''}`}
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange({ target: { value: '' } });
                setIsOpen(false);
              }}
            >
              <span>{placeholder}</span>
              {!value && <Check size={14} aria-hidden="true" />}
            </button>
          )}
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`custom-option ${value === option ? 'selected' : ''}`}
              role="option"
              aria-selected={value === option}
              onClick={() => {
                onChange({ target: { value: option } });
                setIsOpen(false);
              }}
            >
              <span>{option}{showDetails && <small>{optionDetails.find((person) => person.name === option)?.title || 'Team member'}</small>}</span>
              {value === option && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityChipSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const priorities = ['Urgent', 'High', 'Normal'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`priority-chip-select ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        className="priority-chip-button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Change draft priority"
      >
        <span>{value} priority</span>
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div className="priority-chip-menu" role="listbox" aria-label="Change draft priority">
          {priorities.map((priority) => (
            <button
              key={priority}
              type="button"
              className={`custom-option ${value === priority ? 'selected' : ''}`}
              role="option"
              aria-selected={value === priority}
              onClick={() => {
                onChange({ target: { value: priority } });
                setIsOpen(false);
              }}
            >
              <span>{priority} priority</span>
              {value === priority && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RichNotesEditor({ value, onChange, placeholder = 'Type notes here...', disabled = false, ariaLabel = 'Notes' }) {
  const editorRef = useRef(null);
  const colorInputRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
    }
    // Only seed the editor once on mount — afterwards it's uncontrolled so typing doesn't reset the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (command, commandValue = null) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleInput = (event) => {
    onChange(event.currentTarget.innerHTML);
  };

  const handleLink = () => {
    if (disabled) return;
    const url = window.prompt('Enter a URL');
    if (url) exec('createLink', url);
  };

  return (
    <div className={`notes-rich-editor ${disabled ? 'disabled' : ''}`}>
      <div className="notes-editor-toolbar">
        <div className="notes-toolbar-row">
          <select aria-label="Font" disabled={disabled} defaultValue="Aptos" onChange={(event) => exec('fontName', event.target.value)}>
            <option>Aptos</option><option>Arial</option><option>Georgia</option><option>Times New Roman</option>
          </select>
          <select aria-label="Font size" disabled={disabled} defaultValue="11" onChange={(event) => exec('fontSize', event.target.value)}>
            <option value="2">10</option><option value="3">11</option><option value="4">12</option><option value="5">14</option><option value="6">16</option>
          </select>
          <button type="button" title="Heading 1" disabled={disabled} onClick={() => exec('formatBlock', 'H1')}><Heading1 size={14} /></button>
          <button type="button" title="Heading 2" disabled={disabled} onClick={() => exec('formatBlock', 'H2')}><Heading2 size={14} /></button>
          <button type="button" title="Paragraph" disabled={disabled} onClick={() => exec('formatBlock', 'P')}><Type size={14} /></button>
          <button type="button" title="Quote" disabled={disabled} onClick={() => exec('formatBlock', 'BLOCKQUOTE')}><Quote size={14} /></button>
          <span className="notes-toolbar-spacer" />
          <button type="button" title="Undo" disabled={disabled} onClick={() => exec('undo')}><Undo2 size={14} /></button>
          <button type="button" title="Redo" disabled={disabled} onClick={() => exec('redo')}><Redo2 size={14} /></button>
        </div>
        <div className="notes-toolbar-row grouped">
          <div className="notes-toolbar-group">
            <div className="notes-toolbar-buttons">
              <button type="button" title="Bold" disabled={disabled} onClick={() => exec('bold')}><Bold size={14} /></button>
              <button type="button" title="Italic" disabled={disabled} onClick={() => exec('italic')}><Italic size={14} /></button>
              <button type="button" title="Underline" disabled={disabled} onClick={() => exec('underline')}><Underline size={14} /></button>
              <button type="button" title="Strikethrough" disabled={disabled} onClick={() => exec('strikeThrough')}><Strikethrough size={14} /></button>
              <button type="button" title="Highlight" disabled={disabled} onClick={() => exec('hiliteColor', '#fff2a8')}><Highlighter size={14} /></button>
              <button type="button" title="Text color" disabled={disabled} onClick={() => colorInputRef.current?.click()}><Palette size={14} /></button>
              <button type="button" title="Clear formatting" disabled={disabled} onClick={() => exec('removeFormat')}><Eraser size={14} /></button>
              <button type="button" title="Subscript" disabled={disabled} onClick={() => exec('subscript')}><Subscript size={14} /></button>
              <button type="button" title="Superscript" disabled={disabled} onClick={() => exec('superscript')}><Superscript size={14} /></button>
              <input ref={colorInputRef} type="color" className="notes-color-input" disabled={disabled} onChange={(event) => exec('foreColor', event.target.value)} />
            </div>
            <span className="notes-toolbar-label">Basic text</span>
          </div>
          <div className="notes-toolbar-group">
            <div className="notes-toolbar-buttons">
              <button type="button" title="Bulleted list" disabled={disabled} onClick={() => exec('insertUnorderedList')}><List size={14} /></button>
              <button type="button" title="Numbered list" disabled={disabled} onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></button>
              <button type="button" title="Decrease indent" disabled={disabled} onClick={() => exec('outdent')}><Outdent size={14} /></button>
              <button type="button" title="Increase indent" disabled={disabled} onClick={() => exec('indent')}><Indent size={14} /></button>
              <button type="button" title="Align left" disabled={disabled} onClick={() => exec('justifyLeft')}><AlignLeft size={14} /></button>
              <button type="button" title="Align center" disabled={disabled} onClick={() => exec('justifyCenter')}><AlignCenter size={14} /></button>
              <button type="button" title="Align right" disabled={disabled} onClick={() => exec('justifyRight')}><AlignRight size={14} /></button>
            </div>
            <span className="notes-toolbar-label">Paragraph</span>
          </div>
          <div className="notes-toolbar-group">
            <div className="notes-toolbar-buttons">
              <button type="button" title="Insert link" disabled={disabled} onClick={handleLink}><Link size={14} /></button>
              <button type="button" title="Remove link" disabled={disabled} onClick={() => exec('unlink')}><Unlink size={14} /></button>
            </div>
            <span className="notes-toolbar-label">Insert</span>
          </div>
        </div>
      </div>
      <div
        ref={editorRef}
        className="notes-editor-body"
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={handleInput}
      />
    </div>
  );
}

function MultiSelectFilter({ label, icon: Icon, options, selected, placeholder, onToggle, onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const selectedSet = new Set(selected);
  const buttonLabel = selected.length ? `${selected.length} selected` : placeholder;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`multi-filter ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        className="multi-filter-button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="multi-filter-label">{Icon && <Icon size={13} />}{label}</span>
        <strong>{buttonLabel}</strong>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="multi-filter-menu" role="listbox" aria-label={`${label} filter`}>
          <div className="multi-filter-menu-header">
            <span>{selected.length ? `${selected.length} selected` : 'All selected'}</span>
            {selected.length > 0 && <button type="button" onClick={onClear}>Clear</button>}
          </div>
          <div className="multi-filter-options">
            {options.map((option) => {
              const isSelected = selectedSet.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  className={`multi-filter-option ${isSelected ? 'selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onToggle(option)}
                >
                  <span className="filter-check">{isSelected && <Check size={12} />}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SortMenu({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const currentLabel = draftSortGroups
    .flatMap((group) => group.options)
    .find((option) => option.value === value)?.label || 'Sort by';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`sort-menu ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        className="toolbar-button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="sort-menu-panel" role="listbox" aria-label="Sort drafts">
          {draftSortGroups.map((group, groupIndex) => (
            <div key={group.label} className="sort-menu-group">
              {groupIndex > 0 && <div className="sort-menu-divider" />}
              <div className="sort-menu-group-title">{group.label}</div>
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`sort-menu-option ${value === option.value ? 'selected' : ''}`}
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => { onChange(option.value); setIsOpen(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const formatDateForDisplay = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function DatePickerField({ label, icon: Icon, value, onChange, placeholder = 'Any date', variant = 'filter', ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date();
  });
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openPicker = () => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      setViewDate(new Date(year, month - 1, 1));
    }
    setIsOpen((open) => !open);
  };

  const changeMonth = (delta) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDay = (date) => {
    onChange(toIsoDate(date));
    setIsOpen(false);
  };

  const today = new Date();
  const todayIso = toIsoDate(today);
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });

  return (
    <div ref={ref} className={`date-picker date-picker-${variant} ${isOpen ? 'open' : ''}`}>
      {variant === 'field' ? (
        <button type="button" className="date-picker-button field" onClick={openPicker} aria-label={ariaLabel || label}>
          <span className={`field-value ${value ? '' : 'placeholder'}`}>{value ? formatDateForDisplay(value) : placeholder}</span>
          <CalendarDays size={15} />
        </button>
      ) : (
        <button type="button" className="date-picker-button" onClick={openPicker}>
          <span className="date-picker-label">{Icon && <Icon size={13} />}{label}</span>
          <strong>{value ? formatDateForDisplay(value) : placeholder}</strong>
          <CalendarDays size={14} />
        </button>
      )}

      {isOpen && (
        <div className="date-picker-menu" role="dialog" aria-label={`${label} calendar`}>
          <div className="date-picker-nav">
            <button type="button" className="date-picker-month" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1))}>
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </button>
            <div className="date-picker-arrows">
              <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronUp size={14} /></button>
              <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronDown size={14} /></button>
            </div>
          </div>

          <div className="date-picker-weekdays">
            {weekdayLabels.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="date-picker-grid">
            {days.map((date) => {
              const iso = toIsoDate(date);
              const inMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              return (
                <button
                  type="button"
                  key={iso}
                  className={`date-picker-day ${inMonth ? '' : 'outside'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => selectDay(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-picker-footer">
            <button type="button" onClick={() => { onChange(''); setIsOpen(false); }}>Clear</button>
            <button type="button" onClick={() => selectDay(today)}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ number, icon: Icon, title, description }) {
  return (
    <div className="section-header">
      <div className="eyebrow"><Icon size={16} /> <span>Section {number}</span></div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

const navIcons = { Log: PenLine, History: ClipboardList, Dashboard: BarChart3, 'Team Calendar': CalendarDays, Templates: FileText, 'My Stats': UserRound, Admin: Shield };

function App() {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [activeNav, setActiveNav] = useState('Log');
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('comms-hub-theme');
    return savedTheme ? savedTheme === 'dark' : false;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [authBusy, setAuthBusy] = useState(isEntraConfigured);
  const [accessList, setAccessList] = useState(loadAccess);
  const [accessError, setAccessError] = useState('');
  const [accessForm, setAccessForm] = useState({ name: '', email: '', title: '', view: 'User' });
  const [accessSearch, setAccessSearch] = useState('');
  const [expandedAccessEmail, setExpandedAccessEmail] = useState(null);
  const people = accessList.filter((person) => person.status === 'Allowed')
    .map((person) => person.name).sort((a, b) => a.localeCompare(b));
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const [draftSort, setDraftSort] = useState('recentlyUpdated');
  const [draftFilters, setDraftFilters] = useState({
    stages: [],
    brands: [],
    documentTypes: [],
    assignees: [],
    priorities: [],
    dueFrom: '',
    dueTo: '',
  });
  const [drafts, setDrafts] = useState(templateDrafts);
  const [draftPage, setDraftPage] = useState(1);
  const [historyRows, setHistoryRows] = useState(initialHistoryRows);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeRibbonTab, setActiveRibbonTab] = useState('Message');
  const [showWordCount, setShowWordCount] = useState(false);
  const [splitViewOpen, setSplitViewOpen] = useState(false);
  const [splitViewTab, setSplitViewTab] = useState('notes');
  const editorRef = useRef(null);
  const [newDraftOpen, setNewDraftOpen] = useState(false);
  const [newDraftForm, setNewDraftForm] = useState(emptyNewDraftForm);
  const fileInput = useRef(null);
  const [liveTick, setLiveTick] = useState(() => Date.now());
  const [priorityMenu, setPriorityMenu] = useState(null);
  const [lockPrompt, setLockPrompt] = useState(null);
  const [sectionsPanelOpen, setSectionsPanelOpen] = useState(false);
  const [onlinePanelOpen, setOnlinePanelOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [historyHover, setHistoryHover] = useState(null);
  const [reopenStage, setReopenStage] = useState('');
  const [historyFullView, setHistoryFullView] = useState(false);
  const [historyCompareMode, setHistoryCompareMode] = useState('inline');
  const [onlineSearch, setOnlineSearch] = useState('');
  const onlinePanelRef = useRef(null);
  useEffect(() => {
    if (!onlinePanelOpen) { setOnlineSearch(''); return undefined; }
    const handlePointer = (event) => { if (onlinePanelRef.current && !onlinePanelRef.current.contains(event.target)) setOnlinePanelOpen(false); };
    const handleKey = (event) => { if (event.key === 'Escape') setOnlinePanelOpen(false); };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handlePointer); document.removeEventListener('keydown', handleKey); };
  }, [onlinePanelOpen]);

  const selectedDraftStage = selectedDraft ? getDraftStage(selectedDraft) : '';
  useEffect(() => {
    if (!selectedDraft || !currentUser?.name) return;
    const field = stageAssigneeFields[selectedDraftStage];
    if (!field || selectedDraft[field] === currentUser.name) return;
    const claimed = {
      ...selectedDraft,
      [field]: currentUser.name,
      stageClaims: { ...selectedDraft.stageClaims, [selectedDraftStage]: { name: currentUser.name, at: Date.now(), previous: selectedDraft[field] || '' } },
    };
    setSelectedDraft(claimed);
    setDrafts((current) => current.map((draft) => draft.id === claimed.id ? claimed : draft));
  }, [selectedDraft?.id, selectedDraftStage, currentUser?.name]);
  const syncedDueDates = useRef(new Map());
  const calendarSyncQueue = useRef(Promise.resolve());

  const queueCalendarSync = (task) => {
    calendarSyncQueue.current = calendarSyncQueue.current
      .then(task)
      .catch((error) => console.warn('Team calendar sync failed:', error));
  };

  useEffect(() => {
    if (!currentUser) return;
    drafts.forEach((draft) => {
      const signature = JSON.stringify(buildDraftDueEvent(draft, accessList));
      if (syncedDueDates.current.get(draft.id) === signature) return;
      syncedDueDates.current.set(draft.id, signature);
      queueCalendarSync(() => syncDraftDueDate(draft, accessList));
    });
  }, [drafts, accessList, currentUser]);

  useEffect(() => {
    localStorage.setItem('comms-hub-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!isEntraConfigured) return;
    let cancelled = false;
    initMicrosoftSignIn()
      .then((account) => {
        if (cancelled || !account) return;
        const matchedUser = findAllowedUser(getAccountEmails(account));
        if (!matchedUser || matchedUser.status === 'Denied') {
          setLoginError(`Access denied for ${account.username}. Your email is not allowed to use Comms Hub. Contact the administrator.`);
          return;
        }
        openWorkspaceFor(matchedUser);
      })
      .catch((error) => {
        if (!cancelled) setLoginError(`Microsoft sign-in failed: ${error.errorMessage || error.message || 'unknown error'}`);
      })
      .finally(() => { if (!cancelled) setAuthBusy(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(accessList));
    } catch (error) {
      console.error('Could not save the access list.', error);
      setAccessError('Changes could not be saved in this browser. Check your storage settings.');
    }
  }, [accessList]);

  useEffect(() => {
    const syncAccess = (event) => {
      if (event.key !== ACCESS_STORAGE_KEY) return;
      setAccessList(loadAccess());
    };
    window.addEventListener('storage', syncAccess);
    return () => window.removeEventListener('storage', syncAccess);
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;
    const entry = accessList.find((person) => person.email === currentUser.email);
    if (!entry || entry.status === 'Denied' || getAllowedPages(entry).length === 0) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setSelectedDraft(null);
      setActiveNav('Log');
      setLoginError('Your access has been denied. Contact the administrator.');
      window.history.replaceState(null, '', window.location.href);
    } else if (entry.view !== currentUser.view || entry.title !== currentUser.title || entry.name !== currentUser.name
      || (entry.blockedPages || []).join('|') !== (currentUser.blockedPages || []).join('|')) {
      setCurrentUser({ ...entry, role: entry.view });
      const allowed = getAllowedPages(entry);
      if (!allowed.includes(activeNav) || (selectedDraft && !allowed.includes('Templates'))) {
        const fallback = allowed[0] || 'Log';
        setSelectedDraft(null);
        setActiveNav(fallback);
        window.history.replaceState(historyState({ view: 'nav', nav: fallback }), '', window.location.href);
      }
    }
  }, [accessList, currentUser, activeNav, selectedDraft]);

  // Keeps the per-role and total elapsed timers on the drafts grid ticking live.
  useEffect(() => {
    if (!isAuthenticated || activeNav !== 'Templates' || selectedDraft) return undefined;
    const timer = window.setInterval(() => setLiveTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, activeNav, selectedDraft]);

  useEffect(() => {
    if (!selectedDraft) {
      setSplitViewOpen(false);
    }
  }, [selectedDraft]);

  useEffect(() => {
    if (!splitViewOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setSplitViewOpen(false); };
    document.body.classList.add('split-view-locked');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('split-view-locked');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [splitViewOpen]);

  useEffect(() => {
    if (!priorityMenu) return undefined;
    const closeMenu = () => setPriorityMenu(null);
    const onKeyDown = (event) => { if (event.key === 'Escape') closeMenu(); };
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [priorityMenu]);

  useEffect(() => {
    const onPopState = (event) => {
      if (!isAuthenticated || event.state?.source !== 'comms-hub') return;

      const allowedPages = getAllowedPages(currentUser);
      if (event.state.nav && !allowedPages.includes(event.state.nav)) {
        setSelectedDraft(null);
        setActiveNav(allowedPages[0] || 'Log');
        return;
      }

      if (event.state.view === 'draft' && allowedPages.includes('Templates')) {
        const draft = drafts.find((item) => item.id === event.state.draftId);
        if (draft) {
          setActiveNav(event.state.nav || 'Templates');
          setSelectedDraft(draft);
          return;
        }
      }

      setSelectedDraft(null);
      setActiveNav(event.state.nav || allowedPages[0] || 'Log');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [currentUser, drafts, isAuthenticated]);

  useEffect(() => {
    if (!selectedDraft) {
      setElapsedSeconds(0);
      return undefined;
    }

    const startedAt = Number(selectedDraft.stageStartedAt || selectedDraft.startedAt) || Date.now();
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [selectedDraft?.id, selectedDraft?.startedAt, selectedDraft?.stageStartedAt]);

  useEffect(() => {
    if (editorRef.current && selectedDraft) {
      const stage = getDraftStage(selectedDraft);
      const content = stage === 'Review 2' ? selectedDraft.reviewTwoContent || ''
        : stage === 'Review 3' ? selectedDraft.reviewThreeContent || '' : selectedDraft.content || '';
      editorRef.current.textContent = content;
      setDraftContent(content);
    }
  }, [selectedDraft?.id, selectedDraft?.currentStage]);

  const toggleTheme = () => setDarkMode((current) => !current);

  const toggleDraftFilter = (filterKey, option) => {
    setDraftPage(1);
    setDraftFilters((current) => {
      const currentValues = current[filterKey];
      const nextValues = currentValues.includes(option)
        ? currentValues.filter((value) => value !== option)
        : [...currentValues, option];
      return { ...current, [filterKey]: nextValues };
    });
  };

  const updateDraftDateFilterValue = (filterKey) => (isoDate) => {
    setDraftPage(1);
    setDraftFilters((current) => ({ ...current, [filterKey]: isoDate }));
  };

  const clearDraftFilter = (filterKey) => {
    setDraftPage(1);
    setDraftFilters((current) => ({ ...current, [filterKey]: [] }));
  };

  const clearAllDraftFilters = () => {
    setDraftPage(1);
    setDraftSearch('');
    setDraftFilters({
      stages: [],
      brands: [],
      documentTypes: [],
      assignees: [],
      priorities: [],
      dueFrom: '',
      dueTo: '',
    });
  };

  const navigateTo = (nav, { replace = false } = {}) => {
    if (!getAllowedPages(currentUser).includes(nav)) return;
    setSelectedDraft(null);
    setActiveNav(nav);
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](historyState({ view: 'nav', nav }), '', window.location.href);
  };

  const navigateToDraft = (draft, { replace = false } = {}) => {
    setSelectedDraft(draft);
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](
      historyState({ view: 'draft', nav: activeNav || 'Templates', draftId: draft.id }),
      '',
      window.location.href
    );
  };

  const backToDraftList = () => {
    if (window.history.state?.source === 'comms-hub' && window.history.state?.view === 'draft') {
      window.history.back();
      return;
    }
    setSelectedDraft(null);
  };

  const openWorkspaceFor = (matchedUser) => {
    const resolvedUser = { ...matchedUser, role: matchedUser.view };
    const allowedPages = getAllowedPages(resolvedUser);
    if (allowedPages.length === 0) {
      setLoginError('Your account has no pages enabled. Contact the administrator.');
      return;
    }
    setLoginError('');
    const startNav = allowedPages.includes('Templates') && resolvedUser.view === 'Manager' ? 'Templates' : allowedPages[0];
    setCurrentUser(resolvedUser);
    setSelectedDraft(null);
    setActiveNav(startNav);
    window.history.replaceState(historyState({ view: 'nav', nav: startNav }), '', window.location.href);
    setIsAuthenticated(true);
  };

  const findAllowedUser = (emails) => accessList.find((person) => emails.includes(person.email.toLowerCase()));

  const handleLogin = (event) => {
    event.preventDefault();
    if (isEntraConfigured) return;
    const matchedUser = findAllowedUser([login.email.trim().toLowerCase()]);
    if (!matchedUser || matchedUser.status === 'Denied') {
      setLoginError('Access denied. Your email is not allowed to use Comms Hub. Contact the administrator.');
      return;
    }
    openWorkspaceFor(matchedUser);
  };

  const handleMicrosoftSignIn = async () => {
    setLoginError('');
    setAuthBusy(true);
    try {
      await startMicrosoftSignIn();
    } catch (error) {
      setAuthBusy(false);
      setLoginError(`Microsoft sign-in failed: ${error.errorMessage || error.message || 'unknown error'}`);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLogin({ email: '', password: '' });
    setLoginError('');
    setActiveNav('Log');
    window.history.replaceState(null, '', window.location.href);
    if (isEntraConfigured) startMicrosoftSignOut();
  };

  const addAccessUser = (event) => {
    event.preventDefault();
    if (currentUser?.email !== ADMIN_EMAIL) return;
    const email = accessForm.email.trim().toLowerCase();
    const name = accessForm.name.trim();
    const title = accessForm.title.trim();
    if (!name || !title || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAccessError('Enter a name, job title, and valid email address.');
      return;
    }
    if (accessList.some((entry) => entry.email.toLowerCase() === email)) {
      setAccessError('That email is already in the access list.');
      return;
    }
    setAccessList((current) => [...current, { name, email, title, view: accessForm.view, status: 'Allowed', blockedPages: [] }]);
    setAccessForm({ name: '', email: '', title: '', view: 'User' });
    setAccessError('');
  };

  const updateAccessUser = (email, changes) => {
    if (currentUser?.email !== ADMIN_EMAIL || email === ADMIN_EMAIL) return;
    setAccessList((current) => current.map((entry) => entry.email === email ? { ...entry, ...changes } : entry));
  };

  const togglePageAccess = (email, page) => {
    if (currentUser?.email !== ADMIN_EMAIL || email === ADMIN_EMAIL) return;
    setAccessList((current) => current.map((entry) => {
      if (entry.email !== email) return entry;
      const blocked = entry.blockedPages || [];
      return { ...entry, blockedPages: blocked.includes(page) ? blocked.filter((item) => item !== page) : [...blocked, page] };
    }));
  };

  const update = (key) => (event) => {
    setSubmitted(false);
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const onFiles = (event) => {
    const selected = Array.from(event.target.files || []).slice(0, 5);
    setFiles(selected);
  };

  const reset = () => {
    setForm(initialForm);
    setFiles([]);
    setSubmitted(false);
  };

  const save = (event) => {
    event.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated) {
    return (
      <div className={`app-shell ${darkMode ? 'dark-theme' : 'light-theme'}`}>
        <div className="login-page">
          <div className="login-shell">
            <section className="login-hero" aria-label="Comms Hub overview">
              <div className="login-hero-topline">
                <div className="login-hero-mark"><Shield size={24} fill="currentColor" /></div>
                <div>
                  <strong>Comms Hub</strong>
                  <span>Guest Experience Communications</span>
                </div>
              </div>

              <div className="login-hero-copy">
                <p className="intro-label">Quality assurance workspace</p>
                <h1>Review and approve guest-facing communications with confidence.</h1>
                <p>
                  A centralized workspace for copywriters, reviewers, and managers to manage
                  brand compliance, review timing, and communication quality.
                </p>
              </div>

              <div className="login-proof-grid">
                <div>
                  <span>Active reviews</span>
                  <strong>24</strong>
                </div>
                <div>
                  <span>Avg. turnaround</span>
                  <strong>2.4h</strong>
                </div>
                <div>
                  <span>Quality score</span>
                  <strong>98%</strong>
                </div>
              </div>

              <div className="login-benefits">
                <div><Check size={16} /> Structured review workflow</div>
                <div><Check size={16} /> Reviewer collaboration</div>
                <div><Check size={16} /> Brand-ready audit history</div>
              </div>

              <div className="login-company-footer" aria-label="Royal Caribbean Group">
                <div className="company-lockup">
                  <span>Powered by</span>
                  <img className="royal-hero-logo" src={royalLogoWhite} alt="Royal Caribbean Group" />
                </div>
                <p>Design by GEM Analytics — Rami Nassralla</p>
              </div>
            </section>

            <section className="login-card" aria-label="Sign in">
              <div className="login-header">
                <div className="brand-lockup login-brand">
                  <div className="brand-mark"><Shield size={20} fill="currentColor" /></div>
                  <div><strong>Workspace sign in</strong><span>Comms Hub demo</span></div>
                </div>
                <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {darkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
                  <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
              </div>

              <div className="login-copy">
                <p className="intro-label">Authorized access only</p>
                <h2>Welcome back</h2>
                <p>{isEntraConfigured ? 'Sign in with your company Microsoft account to continue to communication quality reviews.' : 'Use your work email to continue to communication quality reviews.'}</p>
              </div>

              {isEntraConfigured ? (
                <div className="login-form">
                  <button type="button" className="button primary login-button microsoft-login-button" onClick={handleMicrosoftSignIn} disabled={authBusy}>
                    <span className="microsoft-logo" aria-hidden="true"><i /><i /><i /><i /></span>
                    {authBusy ? 'Signing in…' : 'Sign in with Microsoft'}
                  </button>
                  {loginError && <p className="access-message" role="alert">{loginError}</p>}
                </div>
              ) : (
              <form className="login-form" onSubmit={handleLogin}>
                <label className="login-field">
                  <span>Work email</span>
                  <input
                    type="email"
                    value={login.email}
                    onChange={(event) => setLogin((current) => ({ ...current, email: event.target.value }))}
                    placeholder="name@company.com"
                    required
                  />
                </label>

                <label className="login-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={login.password}
                    onChange={(event) => setLogin((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Enter your password"
                    required
                  />
                </label>

                <div className="login-actions">
                  <label className="remember-me">
                    <input type="checkbox" />
                    <span>Remember this device</span>
                  </label>
                  <a href="#">Need help?</a>
                </div>

                <button type="submit" className="button primary login-button">
                  Continue to workspace <ArrowUpRight size={16} />
                </button>
                {loginError && <p className="access-message" role="alert">{loginError}</p>}
              </form>
              )}

              <p className="login-security-note">
                {isEntraConfigured
                  ? 'Use your company Microsoft account. Only emails approved by the administrator can open the workspace.'
                  : 'Demo sign-in only. Company authentication is not yet connected.'}
              </p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const updateNewDraft = (key) => (event) => {
    setNewDraftForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const updateNewDraftNotes = (html) => {
    setNewDraftForm((current) => ({ ...current, notes: html }));
  };

  const creatorName = currentUser?.name || 'Unassigned';

  const resetNewDraftForm = () => {
    setNewDraftForm(emptyNewDraftForm);
  };

  const addDraft = (event) => {
    event.preventDefault();
    const timestamp = new Date();
    const title = newDraftForm.title.trim() || `New draft ${drafts.length + 1}`;
    const brand = newDraftForm.brand || 'Royal Caribbean';
    const documentType = newDraftForm.documentType || 'Email';
    const newDraft = {
      id: `draft-${Date.now()}`,
      brand,
      title,
      type: 'Review 1',
      typeTone: 'purple',
      status: 'Open',
      statusTone: 'green',
      currentStage: 'Copywriter',
      copywriter: creatorName,
      createdBy: creatorName,
      createdByEmail: currentUser?.email || '',
      copywriterLocked: true,
      reviewerOne: newDraftForm.reviewerOne || 'Unassigned',
      reviewerTwo: newDraftForm.reviewerTwo || 'Unassigned',
      manager: 'Unassigned',
      due: newDraftForm.dueDate || 'No due date',
      documentType,
      priority: newDraftForm.priority,
      dueDate: newDraftForm.dueDate,
      notes: newDraftForm.notes,
      screenshots: newDraftForm.screenshots,
      startedAt: timestamp.getTime(),
      stageStartedAt: timestamp.getTime(),
      stageSeconds: {},
      updated: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const newActivity = {
      date: timestamp.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
      }),
      title: newDraft.title,
      brand: newDraft.brand,
      type: documentType,
      copywriter: newDraft.copywriter,
      review1: newDraft.reviewerOne,
      review2: newDraft.reviewerTwo,
      review3: '—',
      manager: newDraft.manager,
      status: 'Active',
      total: '0h',
      errors: 'None',
    };

    setDrafts((current) => [newDraft, ...current]);
    setDraftPage(1);
    setHistoryRows((current) => [newActivity, ...current]);
    navigateToDraft(newDraft);
    setElapsedSeconds(0);
    setDraftContent('');
    setDraftSaved(false);
    setNewDraftOpen(false);
    resetNewDraftForm();
  };

  const onDraftScreenshots = (event) => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, 4);
    setNewDraftForm((current) => ({
      ...current,
      screenshots: selectedFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: URL.createObjectURL(file),
      })),
    }));
    event.target.value = '';
  };

  const saveDraftContent = () => {
    if (!selectedDraft || !stageOrder.includes(getDraftStage(selectedDraft))) return;
    const field = getDraftStage(selectedDraft) === 'Review 2' ? 'reviewTwoContent'
      : getDraftStage(selectedDraft) === 'Review 3' ? 'reviewThreeContent' : 'content';
    const updatedDraft = { ...selectedDraft, [field]: draftContent };
    setSelectedDraft(updatedDraft);
    setDrafts((current) => current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft));
    setDraftSaved(true);
  };

  const updateDraftField = (field) => (event) => {
    if (!selectedDraft) return;
    const updatedDraft = { ...selectedDraft, [field]: event.target.value };
    setSelectedDraft(updatedDraft);
    setDrafts((current) => current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft));
  };

  const updateReviewTwoField = (field) => (event) => {
    if (!selectedDraft || getDraftStage(selectedDraft) !== 'Review 2') return;
    const updatedDraft = {
      ...selectedDraft,
      reviewTwoReview: {
        ...selectedDraft.reviewTwoReview,
        [field]: event.target.value,
        ...(field === 'extraReview' && event.target.value ? { directToManager: false } : {}),
        ...(field === 'directToManager' && event.target.value ? { extraReview: false } : {}),
      },
    };
    setSelectedDraft(updatedDraft);
    setDrafts((current) => current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft));
  };

  const openPriorityMenu = (draft) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 220;
    const menuHeight = 230;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 12);
    setPriorityMenu({ draftId: draft.id, x, y });
  };

  const setDraftPriority = (draftId, priority) => {
    setDrafts((current) => current.map((draft) => draft.id === draftId ? { ...draft, priority } : draft));
    setSelectedDraft((current) => current && current.id === draftId ? { ...current, priority } : current);
    setPriorityMenu(null);
  };

  const deleteDraft = (draft) => {
    setDrafts((current) => current.filter((item) => item.id !== draft.id));
    syncedDueDates.current.delete(draft.id);
    queueCalendarSync(() => removeDraftDueDate(draft.id));
    setHistoryRows((current) => [{
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
      title: draft.title,
      brand: draft.brand,
      type: draft.documentType,
      copywriter: draft.copywriter,
      review1: draft.reviewerOne,
      review2: draft.reviewerTwo,
      review3: '—',
      manager: draft.manager,
      status: 'Deleted',
      total: '0',
      errors: 'None',
      draft: { ...draft, closedAt: Date.now(), closedBy: currentUser?.name },
    }, ...current]);
    setPriorityMenu(null);
    if (selectedDraft?.id === draft.id) setSelectedDraft(null);
  };

  const updateAssignment = (field) => (event) => {
    if (!selectedDraft) return;
    if (field === 'copywriter' && selectedDraft.copywriterLocked) return;
    const stages = getDraftStages(selectedDraft);
    const fieldStage = Object.keys(stageAssigneeFields).find((stage) => stageAssigneeFields[stage] === field);
    const stageIndex = stages.indexOf(fieldStage);
    if (stageIndex < 0 || stageIndex <= stages.indexOf(getDraftStage(selectedDraft))) return;
    const updatedDraft = { ...selectedDraft, [field]: event.target.value };
    setSelectedDraft(updatedDraft);
    setDrafts((current) => current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft));
  };

  const getDraftDocumentType = (draft) => draft.documentType || draft.templateType || draft.category || 'General communication';

  const openDraft = (draft) => {
    const stage = getDraftStage(draft);
    const startedAt = Number(draft.startedAt) || Date.now();
    const openedDraft = { ...draft, startedAt, currentStage: stage };
    navigateToDraft(openedDraft);
    setDrafts((current) => current.map((item) => item.id === openedDraft.id ? openedDraft : item));
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Number(openedDraft.stageStartedAt || startedAt)) / 1000)));
    setDraftContent(stage === 'Review 2' ? draft.reviewTwoContent || '' : stage === 'Review 3' ? draft.reviewThreeContent || '' : draft.content || '');
    setDraftSaved(false);
    setActiveRibbonTab(stage === 'Copywriter' ? 'Message' : 'Format text');
  };

  const formatEditor = (command, value = null) => {
    if (!editorRef.current || !selectedDraft || !['Copywriter', 'Review 1', 'Review 2', 'Review 3'].includes(getDraftStage(selectedDraft))) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setDraftContent(editorRef.current.innerText);
    setDraftSaved(false);
  };

  const insertEditorContent = (content) => {
    if (!editorRef.current || !selectedDraft || !['Copywriter', 'Review 1', 'Review 2', 'Review 3'].includes(getDraftStage(selectedDraft))) return;
    editorRef.current.focus();
    document.execCommand('insertText', false, content);
    setDraftContent(editorRef.current.innerText);
    setDraftSaved(false);
  };

  const completeDraft = (sections = []) => {
    const draft = selectedDraft;
    const managerSeconds = Math.max(0, Math.floor((Date.now() - Number(draft.stageStartedAt || draft.startedAt)) / 1000));
    const stageSeconds = { ...draft.stageSeconds, Manager: (Number(draft.stageSeconds?.Manager) || 0) + managerSeconds };
    const totalSeconds = Object.values(stageSeconds).reduce((sum, value) => sum + (Number(value) || 0), 0);
    setDrafts((current) => current.filter((item) => item.id !== draft.id));
    syncedDueDates.current.delete(draft.id);
    queueCalendarSync(() => removeDraftDueDate(draft.id));
    setHistoryRows((current) => [{
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
      title: draft.title,
      brand: draft.brand,
      type: draft.documentType,
      copywriter: draft.copywriter,
      review1: draft.reviewerOne,
      review2: draft.reviewerTwo,
      review3: draft.reviewerThree || '—',
      manager: draft.manager,
      status: 'Completed',
      total: formatChipDuration(totalSeconds),
      errors: 'None',
      content: draftContent,
      sections,
      draft: { ...draft, content: draftContent, stageSeconds, finalSections: sections, closedAt: Date.now(), closedBy: currentUser?.name },
    }, ...current]);
    setDraftSaved(false);
    backToDraftList();
  };

  const submitDraftContent = (sections = []) => {
    if (!draftContent.trim() || !selectedDraft) return;
    const stage = getDraftStage(selectedDraft);
    if (stage === 'Manager') {
      completeDraft(sections);
      return;
    }
    if (!['Copywriter', 'Review 1', 'Review 2', 'Review 3'].includes(stage)) return;
    const hasManager = selectedDraft.manager && selectedDraft.manager !== 'Unassigned';
    if (stage === 'Review 2' && (selectedDraft.reviewTwoReview?.extraReview ? !selectedDraft.reviewerThree : !hasManager)) return;
    if (stage === 'Review 3' && !hasManager) return;
    const nextStage = stage === 'Copywriter' ? 'Review 1' : stage === 'Review 1' ? 'Review 2'
      : stage === 'Review 2' && selectedDraft.reviewTwoReview?.extraReview ? 'Review 3' : 'Manager';
    const stageSeconds = Math.max(0, Math.floor((Date.now() - Number(selectedDraft.stageStartedAt || selectedDraft.startedAt)) / 1000));
    const lockedDraft = {
      ...selectedDraft,
      status: nextStage,
      type: nextStage,
      currentStage: nextStage,
      content: draftContent,
      sections,
      ...(stage === 'Review 1' ? { reviewTwoContent: '' } : {}),
      ...(stage === 'Review 2' && nextStage === 'Review 3' ? { reviewThreeContent: '' } : {}),
      versions: [...(selectedDraft.versions || []), {
        stage, content: draftContent, sections, at: Date.now(), by: currentUser?.name,
        ...(stage === 'Review 2' ? { review: {
          reviewer: selectedDraft.reviewerTwo,
          changeType: 'Content',
          errorType: 'None',
          ...selectedDraft.reviewTwoReview,
          manager: selectedDraft.manager,
        } } : {}),
      }],
      stageSeconds: { ...selectedDraft.stageSeconds, [stage]: stageSeconds },
      stageStartedAt: Date.now(),
    };
    setSelectedDraft(lockedDraft);
    setDrafts((current) => current.map((draft) => draft.id === lockedDraft.id ? lockedDraft : draft));
    setDraftSaved(false);
    setHistoryRows((current) => [{
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
      title: lockedDraft.title,
      brand: lockedDraft.brand,
      type: lockedDraft.documentType,
      copywriter: lockedDraft.copywriter,
      review1: lockedDraft.reviewerOne,
      review2: lockedDraft.reviewerTwo,
      review3: lockedDraft.reviewerThree || '—',
      manager: lockedDraft.manager,
      status: 'Submitted',
      total: formatChipDuration(stageSeconds),
      errors: 'None',
    }, ...current]);
  };

  const requestLock = () => {
    if (!selectedDraft || !draftContent.trim()) return;
    setLockPrompt({ draftId: selectedDraft.id, stage: getDraftStage(selectedDraft), selected: [], tried: false });
  };

  const toggleLockSection = (section) => setLockPrompt((current) => ({
    ...current,
    selected: current.selected.includes(section)
      ? current.selected.filter((item) => item !== section)
      : draftSections.filter((item) => item === section || current.selected.includes(item)),
  }));

  const confirmLock = () => {
    if (!lockPrompt?.selected.length) {
      setLockPrompt((current) => ({ ...current, tried: true }));
      return;
    }
    submitDraftContent(lockPrompt.selected);
    setLockPrompt(null);
  };

  const renderLockPrompt = () => {
    if (!lockPrompt || selectedDraft?.id !== lockPrompt.draftId) return null;
    const { stage, selected, tried } = lockPrompt;
    const ready = selected.length > 0;
    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLockPrompt(null); }}>
        <div className="lock-modal" role="dialog" aria-modal="true" aria-labelledby="lock-modal-title">
          <button type="button" className="modal-close" onClick={() => setLockPrompt(null)} aria-label="Close"><X size={17} /></button>
          <h2 id="lock-modal-title"><Lock size={19} /> {stage === 'Manager' ? 'Approve and complete this draft?' : `Lock ${stage}?`}</h2>
          <p>{stage === 'Manager' ? 'This is the final approval. The draft will be marked completed and moved to History.' : `Once submitted, this ${stage} version cannot be edited, deleted, or overwritten — by anyone.`}</p>
          <div className="lock-modal-heading">
            <strong><ClipboardList size={15} /> Which sections did you draft or update? <b>*</b></strong>
            <span>
              <button type="button" onClick={() => setLockPrompt((current) => ({ ...current, selected: [...draftSections] }))}>Select all</button>
              <i>|</i>
              <button type="button" onClick={() => setLockPrompt((current) => ({ ...current, selected: [] }))}>Clear</button>
            </span>
          </div>
          <div className="lock-modal-list" role="group" aria-label="Sections">
            {draftSections.map((section) => {
              const checked = selected.includes(section);
              return (
                <label key={section} className={`lock-section${checked ? ' checked' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleLockSection(section)} />
                  <span>{section}</span>
                  <i aria-hidden="true">{checked && <Check size={12} strokeWidth={3} />}</i>
                </label>
              );
            })}
          </div>
          <div className="lock-modal-status">
            {ready
              ? <span className="ok">{selected.length} section{selected.length === 1 ? '' : 's'} selected</span>
              : <span className={tried ? 'error' : ''}>Please check at least one section before you can submit.</span>}
          </div>
          <div className="lock-modal-actions">
            <button type="button" className="button secondary" onClick={() => setLockPrompt(null)}>Cancel</button>
            <button type="button" className={`button primary lock-confirm${ready ? ' is-ready' : ''}`} onClick={confirmLock} aria-disabled={!ready}><Check size={14} /> {stage === 'Manager' ? 'Yes, approve' : 'Yes, lock it'}</button>
          </div>
        </div>
      </div>
    );
  };

  const canReopenHistory = currentUser?.view === 'Manager' || currentUser?.email === ADMIN_EMAIL;
  const historyStageFields = { Copywriter: 'copywriter', 'Review 1': 'reviewerOne', 'Review 2': 'reviewerTwo', 'Review 3': 'reviewerThree', Manager: 'manager' };
  const historyRowFields = { Copywriter: 'copywriter', 'Review 1': 'review1', 'Review 2': 'review2', 'Review 3': 'review3', Manager: 'manager' };
  const cleanName = (name) => (name && name !== '—' && name !== 'Unassigned' ? name : '');
  const fullPersonName = (name) => {
    const clean = cleanName(name);
    if (!clean) return '';
    return (accessList.find((person) => person.name === clean) || accessList.find((person) => person.name.split(' ')[0] === clean))?.name || clean;
  };
  const formatHistoryTime = (value) => (value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '');
  const historyPerson = (row, stage) => fullPersonName(row.draft ? row.draft[historyStageFields[stage]] : row[historyRowFields[stage]]);

  const buildHistoryTimeline = (row) => {
    const draft = row.draft;
    const events = [];
    if (draft) {
      events.push({ kind: 'created', title: 'Draft created', person: fullPersonName(draft.copywriter), detail: `Assigned to ${fullPersonName(draft.copywriter) || 'the copywriter'} as copywriter` });
      const versions = draft.versions || [];
      const reopenings = draft.activity || [];
      stageOrder.filter((stage) => stage !== 'Manager' && Number(draft.stageSeconds?.[stage]) > 0 && !versions.some((version) => version.stage === stage))
        .forEach((stage) => events.push({ kind: 'submitted', title: `${stage} completed`, person: fullPersonName(draft[historyStageFields[stage]]), duration: draft.stageSeconds[stage] }));
      versions.forEach((version, index) => {
        reopenings.filter((entry) => entry.versionCount === index).forEach((entry) => events.push({ kind: 'reopened', title: `Reopened at ${entry.stage}`, person: entry.by, at: entry.at, detail: `Status changed from ${entry.from} back to ${entry.stage}` }));
        const review = version.review;
        events.push({
          kind: 'submitted',
          title: `${version.stage} submitted and locked`,
          person: fullPersonName(version.by) || fullPersonName(draft[historyStageFields[version.stage]]),
          at: version.at,
          duration: draft.stageSeconds?.[version.stage],
          sections: version.sections || [],
          detail: review && review.errorType && review.errorType !== 'None' ? `Error reported: ${review.errorType}` : '',
          content: version.content,
        });
      });
      reopenings.filter((entry) => entry.versionCount >= versions.length).forEach((entry) => events.push({ kind: 'reopened', title: `Reopened at ${entry.stage}`, person: entry.by, at: entry.at, detail: `Status changed from ${entry.from} back to ${entry.stage}` }));
    } else {
      stageOrder.forEach((stage) => {
        const person = historyPerson(row, stage);
        if (person) events.push({ kind: 'submitted', title: `${stage} completed`, person });
      });
    }
    if (row.status === 'Completed') {
      events.push({ kind: 'completed', title: 'Approved and completed', person: fullPersonName(draft?.closedBy) || historyPerson(row, 'Manager'), at: draft?.closedAt, duration: draft?.stageSeconds?.Manager, sections: draft?.finalSections || [], detail: row.total ? `Total time ${row.total}` : '' });
    } else if (row.status === 'Deleted') {
      events.push({ kind: 'deleted', title: 'Draft deleted', person: fullPersonName(draft?.closedBy), at: draft?.closedAt, detail: 'Removed from the active drafts list' });
    } else {
      events.push({ kind: 'submitted', title: row.status, detail: '' });
    }
    return events;
  };

  const openHistoryDetail = (row) => {
    setHistoryHover(null);
    const stages = row.draft ? getDraftStages(row.draft) : stageOrder.filter((stage) => stage !== 'Review 3' || cleanName(row.review3));
    setReopenStage(stages[stages.length - 1]);
    setHistoryFullView(false);
    setHistoryDetail(row);
  };

  const reopenFromHistory = (row, stage) => {
    if (!canReopenHistory || !stage) return;
    const base = row.draft || {
      id: `reopened-${Date.now()}`,
      title: row.title,
      brand: row.brand,
      documentType: row.type,
      copywriter: cleanName(row.copywriter) || 'Unassigned',
      reviewerOne: cleanName(row.review1) || 'Unassigned',
      reviewerTwo: cleanName(row.review2) || 'Unassigned',
      reviewerThree: cleanName(row.review3),
      manager: cleanName(row.manager) || 'Unassigned',
      priority: 'Normal',
      typeTone: 'purple',
      statusTone: 'green',
      stageSeconds: {},
      versions: [],
      content: row.content || '',
    };
    const { closedAt, closedBy, finalSections, ...rest } = base;
    const reopened = {
      ...rest,
      status: stage,
      type: stage,
      currentStage: stage,
      stageStartedAt: Date.now(),
      startedAt: rest.startedAt || Date.now(),
      updated: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      ...(stage === 'Review 3' ? { reviewTwoReview: { ...rest.reviewTwoReview, extraReview: true } } : {}),
      activity: [...(rest.activity || []), { kind: 'reopened', by: currentUser?.name, at: Date.now(), stage, from: row.status, versionCount: (rest.versions || []).length }],
    };
    setDrafts((current) => [reopened, ...current.filter((draft) => draft.id !== reopened.id)]);
    setHistoryRows((current) => current.filter((item) => item !== row));
    setHistoryDetail(null);
    setActiveNav('Templates');
    navigateToDraft(reopened);
  };

  const renderHistoryRow = (row, index) => {
    const statusClass = row.status === 'Completed' ? 'completed' : row.status === 'Deleted' ? 'deleted' : 'neutral';
    return (
      <tr
        key={`${row.title}-${index}`}
        className="history-row-clickable"
        tabIndex={0}
        onClick={() => openHistoryDetail(row)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openHistoryDetail(row); } }}
        onMouseEnter={(event) => setHistoryHover({ row, x: event.clientX, y: event.clientY })}
        onMouseMove={(event) => setHistoryHover((current) => (current?.row === row ? { row, x: event.clientX, y: event.clientY } : current))}
        onMouseLeave={() => setHistoryHover(null)}
      >
        <td>{row.date}</td>
        <td><span className="table-title">{row.title}</span></td>
        <td><span className="pill brand-pill">{row.brand}</span></td>
        <td><span className="pill type-pill">{row.type}</span></td>
        <td>{row.copywriter || '—'}</td>
        <td>{row.review1 || '—'}</td>
        <td>{row.review2 || '—'}</td>
        <td>{row.review3 || '—'}</td>
        <td>{row.manager || '—'}</td>
        <td><span className={`status-text ${statusClass}`}>
          {row.status === 'Completed' ? <Check size={11} /> : row.status === 'Deleted' ? <X size={11} /> : <Clock3 size={11} />} {row.status}
        </span></td>
        <td>{row.total ? <span className="total-time-cell"><Clock3 size={11} /> {row.total}</span> : '—'}</td>
        <td>{row.errors === 'None'
          ? <span className="errors-none"><Check size={12} /> None</span>
          : <span className="errors-flag">{row.errors}</span>}</td>
      </tr>
    );
  };

  const renderHistoryHover = () => {
    if (!historyHover || historyDetail) return null;
    const { row, x, y } = historyHover;
    const stages = stageOrder.map((stage) => [stage, historyPerson(row, stage)]).filter(([, person]) => person);
    const versions = row.draft?.versions || [];
    const sectionCount = new Set(versions.flatMap((version) => version.sections || []).concat(row.draft?.finalSections || [])).size;
    const excerpt = (row.draft?.content || row.content || versions[versions.length - 1]?.content || '').replace(/\s+/g, ' ').trim();
    const left = Math.min(x + 16, window.innerWidth - 336);
    const top = y + 260 > window.innerHeight ? Math.max(12, y - 250) : y + 16;
    return (
      <div className="history-hover-card" style={{ left, top }} role="tooltip">
        <div className="history-hover-head">
          <strong>{row.title}</strong>
          <span className={`status-text ${row.status === 'Completed' ? 'completed' : row.status === 'Deleted' ? 'deleted' : 'neutral'}`}>{row.status}</span>
        </div>
        <div className="history-hover-meta">{row.brand} · {row.type} · {row.date}</div>
        <div className="history-hover-stages">
          {stages.length ? stages.map(([stage, person]) => <span key={stage}><em>{stage}</em>{person}</span>) : <span><em>Stages</em>No one assigned</span>}
        </div>
        <div className="history-hover-stats">
          <span><Clock3 size={12} /> {row.total && row.total !== '0' ? row.total : '—'}</span>
          <span><ClipboardList size={12} /> {versions.length} version{versions.length === 1 ? '' : 's'}</span>
          <span><CheckCircle2 size={12} /> {sectionCount} section{sectionCount === 1 ? '' : 's'}</span>
          <span className={row.errors === 'None' ? '' : 'has-errors'}>{row.errors === 'None' ? 'No errors' : row.errors}</span>
        </div>
        {excerpt && <p className="history-hover-excerpt">{excerpt.length > 140 ? `${excerpt.slice(0, 140)}…` : excerpt}</p>}
        <small>Click to see the full activity</small>
      </div>
    );
  };

  const buildStageSnapshots = (row) => {
    const draft = row.draft;
    if (!draft) return [];
    const snapshots = (draft.versions || []).map((version) => ({
      stage: version.stage,
      person: fullPersonName(version.by) || fullPersonName(draft[historyStageFields[version.stage]]),
      at: version.at,
      content: version.content || '',
      sections: version.sections || [],
      review: version.review,
      seconds: draft.stageSeconds?.[version.stage],
    }));
    if (row.status === 'Completed') {
      snapshots.push({
        stage: 'Manager',
        person: fullPersonName(draft.closedBy) || fullPersonName(draft.manager),
        at: draft.closedAt,
        content: draft.content || row.content || '',
        sections: draft.finalSections || [],
        seconds: draft.stageSeconds?.Manager,
        final: true,
      });
    }
    return snapshots.map((snapshot, index) => {
      const previous = index > 0 ? snapshots[index - 1] : null;
      const diff = diffWords(previous?.content || '', snapshot.content);
      return {
        ...snapshot,
        previous,
        diff,
        added: diff.filter((part) => part.type === 'added').length,
        removed: diff.filter((part) => part.type === 'removed').length,
        words: (snapshot.content.match(/\S+/g) || []).length,
      };
    });
  };

  const stripHtml = (html = '') => {
    const element = document.createElement('div');
    element.innerHTML = html;
    return (element.innerText || element.textContent || '').trim();
  };

  const renderDiffText = (diff, side) => diff.map((part, index) => {
    if (side === 'before' && part.type === 'added') return null;
    if (side === 'after' && part.type === 'removed') return null;
    const trailing = !side && part.type === 'removed' ? ' ' : part.raw.slice(part.word.length);
    if (part.type === 'equal') return <span key={index}>{part.raw}</span>;
    return <span key={index}><span className={part.type === 'added' ? 'diff-added' : 'diff-removed'}>{part.word}</span>{trailing}</span>;
  });

  const renderHistoryFullReport = (row, events) => {
    const draft = row.draft;
    const snapshots = buildStageSnapshots(row);
    const stageRows = stageOrder
      .map((stage) => {
        const snapshot = [...snapshots].reverse().find((item) => item.stage === stage);
        const seconds = Number(draft?.stageSeconds?.[stage]) || Number(snapshot?.seconds) || 0;
        const person = snapshot?.person || historyPerson(row, stage);
        return { stage, person, seconds, snapshot };
      })
      .filter(({ person, seconds, snapshot }) => person || seconds || snapshot);
    const totalSeconds = stageRows.reduce((sum, item) => sum + item.seconds, 0);
    const review = snapshots.find((item) => item.review)?.review || (draft?.reviewTwoReview?.changeType ? draft.reviewTwoReview : null);
    const briefNotes = stripHtml(draft?.notes || '');
    const totalAdded = snapshots.slice(1).reduce((sum, item) => sum + item.added, 0);
    const totalRemoved = snapshots.slice(1).reduce((sum, item) => sum + item.removed, 0);
    const overview = [
      ['Status', row.status],
      ['Brand', draft?.brand || row.brand],
      ['Document type', draft?.documentType || row.type],
      ['Priority', draft?.priority || '—'],
      ['Due date', draft?.dueDate ? new Date(`${draft.dueDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'],
      ['Started', formatHistoryTime(draft?.startedAt) || '—'],
      ['Finished', formatHistoryTime(draft?.closedAt) || row.date],
      [row.status === 'Deleted' ? 'Deleted by' : 'Closed by', fullPersonName(draft?.closedBy) || '—'],
      ['Total time', totalSeconds ? formatChipDuration(totalSeconds) : row.total && row.total !== '0' ? row.total : '—'],
      ['Versions saved', String(snapshots.length)],
      ['Words changed', snapshots.length > 1 ? `+${totalAdded} / −${totalRemoved}` : '—'],
      ['Errors reported', row.errors],
    ];
    return (
      <div className="history-full">
        <section className="history-full-card">
          <h3>Overview</h3>
          <dl className="history-full-overview">
            {overview.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          {briefNotes && <div className="history-full-brief"><strong>Reference brief</strong><p>{briefNotes}</p></div>}
        </section>

        <section className="history-full-card">
          <h3>People and time by stage</h3>
          {totalSeconds > 0 && (
            <div className="history-time-bar" aria-label="Time spent by stage">
              {stageRows.filter((item) => item.seconds > 0).map((item) => (
                <span key={item.stage} className={`stage-${item.stage.replace(/\s+/g, '-').toLowerCase()}`} style={{ flexGrow: item.seconds }} title={`${item.stage}: ${formatChipDuration(item.seconds)}`}>
                  {item.seconds / totalSeconds > 0.1 ? item.stage : ''}
                </span>
              ))}
            </div>
          )}
          <div className="history-full-table-wrap">
            <table className="history-full-table">
              <thead><tr><th>Stage</th><th>Person</th><th>Time spent</th><th>Share</th><th>Submitted</th><th>Words</th><th>Changes</th><th>Sections worked on</th></tr></thead>
              <tbody>
                {stageRows.map(({ stage, person, seconds, snapshot }) => {
                  const title = accessList.find((entry) => entry.name === person)?.title;
                  return (
                    <tr key={stage}>
                      <td><span className={`history-stage-chip stage-${stage.replace(/\s+/g, '-').toLowerCase()}`}>{stage}</span></td>
                      <td><strong>{person || '—'}</strong>{title && <small>{title}</small>}</td>
                      <td>{seconds ? formatChipDuration(seconds) : '—'}</td>
                      <td>{seconds && totalSeconds ? `${Math.round((seconds / totalSeconds) * 100)}%` : '—'}</td>
                      <td>{snapshot?.at ? formatHistoryTime(snapshot.at) : '—'}</td>
                      <td>{snapshot ? snapshot.words : '—'}</td>
                      <td>{snapshot?.previous ? <span className="history-change-counts"><span className="added">+{snapshot.added}</span><span className="removed">−{snapshot.removed}</span></span> : snapshot ? 'Original' : '—'}</td>
                      <td>{snapshot?.sections?.length ? <div className="history-event-sections">{snapshot.sections.map((section) => <span key={section}>{section}</span>)}</div> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {review && (
          <section className="history-full-card">
            <h3>Review 2 feedback</h3>
            <dl className="history-full-overview">
              <div><dt>Reviewer</dt><dd>{fullPersonName(review.reviewer) || '—'}</dd></div>
              <div><dt>Change type</dt><dd>{review.changeType || '—'}</dd></div>
              <div><dt>Error type</dt><dd>{review.errorType || 'None'}</dd></div>
              <div><dt>Routing</dt><dd>{review.extraReview ? 'Sent to Review 3' : review.directToManager ? 'Sent directly to Manager' : 'Sent to Manager'}</dd></div>
              <div><dt>Approving manager</dt><dd>{fullPersonName(review.manager || draft?.manager) || '—'}</dd></div>
            </dl>
            {review.notes && <div className="history-full-brief"><strong>Reviewer notes</strong><p>{review.notes}</p></div>}
          </section>
        )}

        <section className="history-full-card">
          <div className="history-full-card-head">
            <h3>Changes between stages</h3>
            {snapshots.length > 0 && (
              <div className="history-compare-toggle" role="tablist" aria-label="Comparison layout">
                <button type="button" role="tab" aria-selected={historyCompareMode === 'inline'} className={historyCompareMode === 'inline' ? 'active' : ''} onClick={() => setHistoryCompareMode('inline')}><Highlighter size={13} /> Highlighted</button>
                <button type="button" role="tab" aria-selected={historyCompareMode === 'side'} className={historyCompareMode === 'side' ? 'active' : ''} onClick={() => setHistoryCompareMode('side')}><Columns2 size={13} /> Side by side</button>
              </div>
            )}
          </div>
          {snapshots.length === 0 ? (
            <p className="history-full-empty">No saved versions for this draft. It was closed before any stage submitted content, or it was logged before version tracking was added.</p>
          ) : (
            <div className="history-diff-list">
              {snapshots.map((snapshot, index) => {
                const unchanged = snapshot.previous && snapshot.added === 0 && snapshot.removed === 0;
                return (
                  <article key={`${snapshot.stage}-${index}`} className="history-diff-step">
                    <header>
                      <span className={`history-stage-chip stage-${snapshot.stage.replace(/\s+/g, '-').toLowerCase()}`}>{snapshot.stage}</span>
                      <strong>{snapshot.previous ? `Changes from ${snapshot.previous.stage}` : 'Original draft'}</strong>
                      <span className="history-diff-meta">
                        {snapshot.person && <span><UserRound size={12} /> {snapshot.person}</span>}
                        {snapshot.at && <span><Clock3 size={12} /> {formatHistoryTime(snapshot.at)}</span>}
                        {Number(snapshot.seconds) > 0 && <span>{formatChipDuration(snapshot.seconds)} spent</span>}
                      </span>
                      {snapshot.previous && <span className="history-change-counts"><span className="added">+{snapshot.added} added</span><span className="removed">−{snapshot.removed} removed</span></span>}
                    </header>
                    {snapshot.sections.length > 0 && <div className="history-event-sections">{snapshot.sections.map((section) => <span key={section}>{section}</span>)}</div>}
                    {!snapshot.content ? (
                      <p className="history-full-empty">No content was saved at this stage.</p>
                    ) : !snapshot.previous ? (
                      <div className="history-diff-text">{snapshot.content}</div>
                    ) : unchanged ? (
                      <p className="history-full-empty">Approved with no text changes.</p>
                    ) : historyCompareMode === 'side' ? (
                      <div className="history-diff-side">
                        <div><span>{snapshot.previous.stage}</span><div className="history-diff-text">{renderDiffText(snapshot.diff, 'before')}</div></div>
                        <div><span>{snapshot.stage}</span><div className="history-diff-text">{renderDiffText(snapshot.diff, 'after')}</div></div>
                      </div>
                    ) : (
                      <div className="history-diff-text">{renderDiffText(snapshot.diff)}</div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="history-full-card">
          <h3>Activity log</h3>
          <ol className="history-timeline">
            {events.map((event, index) => (
              <li key={index} className={`history-event ${event.kind}`}>
                <span className="history-event-dot" />
                <div>
                  <div className="history-event-title"><strong>{event.title}</strong>{event.at && <time>{formatHistoryTime(event.at)}</time>}</div>
                  <div className="history-event-sub">
                    {event.person && <span><UserRound size={12} /> {event.person}</span>}
                    {Number(event.duration) > 0 && <span><Clock3 size={12} /> {formatChipDuration(event.duration)}</span>}
                    {event.detail && <span>{event.detail}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  };

  const renderHistoryDetail = () => {
    if (!historyDetail) return null;
    const row = historyDetail;
    const events = buildHistoryTimeline(row);
    const finalContent = row.draft?.content || row.content || '';
    const stageChoices = row.draft ? getDraftStages(row.draft) : stageOrder.filter((stage) => stage !== 'Review 3' || cleanName(row.review3));
    const statusClass = row.status === 'Completed' ? 'completed' : row.status === 'Deleted' ? 'deleted' : 'neutral';
    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryDetail(null); }}>
        <div className={`history-detail ${historyFullView ? 'is-full' : ''}`} role="dialog" aria-modal="true" aria-labelledby="history-detail-title">
          <button type="button" className="modal-close" onClick={() => setHistoryDetail(null)} aria-label="Close"><X size={17} /></button>
          <div className="history-detail-head">
            <div className="history-detail-toprow">
              <span className="history-detail-readonly"><Lock size={12} /> Read only</span>
              <button type="button" className="history-full-toggle" onClick={() => setHistoryFullView((value) => !value)}>
                {historyFullView ? <><ChevronLeft size={14} /> Back to summary</> : <><FileText size={14} /> Open full details</>}
              </button>
            </div>
            <h2 id="history-detail-title">{row.title}</h2>
            <div className="history-detail-meta">
              <span className={`status-text ${statusClass}`}>{row.status}</span>
              <span className="pill brand-pill">{row.brand}</span>
              <span className="pill type-pill">{row.type}</span>
              <span><Clock3 size={12} /> {row.total && row.total !== '0' ? row.total : 'No time logged'}</span>
              <span>Finished {row.date}</span>
            </div>
          </div>

          {historyFullView ? renderHistoryFullReport(row, events) : <div className="history-detail-body">
            <section>
              <h3>Activity</h3>
              <ol className="history-timeline">
                {events.map((event, index) => (
                  <li key={index} className={`history-event ${event.kind}`}>
                    <span className="history-event-dot" />
                    <div>
                      <div className="history-event-title">
                        <strong>{event.title}</strong>
                        {event.at && <time>{formatHistoryTime(event.at)}</time>}
                      </div>
                      <div className="history-event-sub">
                        {event.person && <span><UserRound size={12} /> {event.person}</span>}
                        {Number(event.duration) > 0 && <span><Clock3 size={12} /> {formatChipDuration(event.duration)}</span>}
                        {event.detail && <span>{event.detail}</span>}
                      </div>
                      {event.sections?.length > 0 && <div className="history-event-sections">{event.sections.map((section) => <span key={section}>{section}</span>)}</div>}
                      {event.content && (
                        <details className="history-event-content">
                          <summary>View this version</summary>
                          <div>{event.content}</div>
                        </details>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h3>Final content</h3>
              <div className="history-detail-content">{finalContent || 'No content was saved for this draft.'}</div>
              <h3>Errors reported</h3>
              <div>{row.errors === 'None' ? <span className="errors-none"><Check size={12} /> None</span> : <span className="errors-flag">{row.errors}</span>}</div>
            </section>
          </div>}

          <div className="history-detail-footer">
            {canReopenHistory ? (
              <>
                <div className="history-reopen">
                  <strong><RotateCcw size={14} /> Change status</strong>
                  <span>Reopen this draft and send it back to a stage. It will leave History and show in the active drafts again.</span>
                </div>
                <div className="history-reopen-actions">
                  <CustomSelect value={reopenStage} options={stageChoices} onChange={(event) => setReopenStage(event.target.value)} allowClear={false} align="left" ariaLabel="Stage to reopen at" placeholder="Choose stage" />
                  <button type="button" className="button primary history-reopen-button" disabled={!reopenStage} onClick={() => reopenFromHistory(row, reopenStage)}><RotateCcw size={14} /> Reopen draft</button>
                </div>
              </>
            ) : (
              <span className="history-detail-note"><Lock size={13} /> This draft is closed. Only a manager can reopen it.</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getLockedPriorContent = (draft, priorStage) => {
    const findVersion = (versions) => [...(versions || [])].reverse()
      .find((version) => version.stage === priorStage && version.content?.trim());
    const seed = templateDrafts.find((item) => item.id === draft.id);
    return findVersion(draft.versions)?.content
      || findVersion(seed?.versions)?.content
      || draft.content
      || '';
  };

  const copyReviewOneVersion = () => {
    if (!selectedDraft || !['Review 2', 'Review 3'].includes(getDraftStage(selectedDraft))) return;
    const priorStage = getDraftStage(selectedDraft) === 'Review 3' ? 'Review 2' : 'Review 1';
    const content = getLockedPriorContent(selectedDraft, priorStage);
    if (!content) return;
    if (draftContent.trim() && !window.confirm(`Replace your current ${getDraftStage(selectedDraft)} working copy with the locked ${priorStage} version?`)) return;
    editorRef.current.textContent = content;
    setDraftContent(content);
    setDraftSaved(false);
    editorRef.current.focus();
  };

  const renderDraftWorkspace = () => {
    if (!selectedDraft) return null;
    const currentStage = getDraftStage(selectedDraft);
    const isLocked = !stageOrder.includes(currentStage);
    const isManagerStage = currentStage === 'Manager';
    const isFinalReview = currentStage === 'Review 2' || currentStage === 'Review 3';
    const priorReviewStage = currentStage === 'Review 3' ? 'Review 2' : 'Review 1';
    const lockedReviewContent = isFinalReview ? getLockedPriorContent(selectedDraft, priorReviewStage) : '';
    const reviewTwoReview = selectedDraft.reviewTwoReview || {};
    const managerOptions = accessList.filter((person) => person.status === 'Allowed' && person.view === 'Manager')
      .map((person) => person.name).sort((a, b) => a.localeCompare(b));
    const selectedManager = selectedDraft.manager !== 'Unassigned' ? selectedDraft.manager : '';
    const draftStages = getDraftStages(selectedDraft);
    const currentStageIndex = draftStages.indexOf(currentStage);
    const activeStageSeconds = elapsedSeconds;
    const totalStageSeconds = draftStages.slice(0, currentStageIndex)
      .reduce((sum, stage) => sum + (selectedDraft.stageSeconds?.[stage] || 0), 0) + activeStageSeconds;
    const assignmentCards = [
      { stage: 'Copywriter', field: 'copywriter', className: 'copywriter-assignment' },
      { stage: 'Review 1', field: 'reviewerOne', className: 'review-assignment review-one-assignment' },
      { stage: 'Review 2', field: 'reviewerTwo', className: 'review-assignment review-two-assignment' },
      ...(draftStages.includes('Review 3') ? [{ stage: 'Review 3', field: 'reviewerThree', className: 'review-assignment review-three-assignment' }] : []),
      { stage: 'Manager', field: 'manager', className: 'manager-assignment' },
    ];
    const stageOwner = currentStage === 'Copywriter'
      ? selectedDraft.copywriter
      : currentStage === 'Review 1'
        ? selectedDraft.reviewerOne
        : currentStage === 'Review 2'
          ? selectedDraft.reviewerTwo
          : currentStage === 'Review 3'
            ? selectedDraft.reviewerThree
          : selectedDraft.manager;

    const referenceNotesMarkup = (
      <div
        className="reference-notes-body"
        dangerouslySetInnerHTML={{
          __html: selectedDraft.notes && selectedDraft.notes.trim()
            ? selectedDraft.notes
            : '<span class="reference-notes-empty">No additional notes provided.</span>',
        }}
      />
    );

    const referenceScreenshotsMarkup = selectedDraft.screenshots?.length > 0 ? (
      <div className="reference-files">
        {selectedDraft.screenshots.map((file) => (
          <a
            key={file.id || file.name}
            href={file.previewUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="reference-file-card"
          >
            {file.previewUrl ? <img src={file.previewUrl} alt={file.name} /> : <Paperclip size={18} />}
            <span>{file.name}</span>
          </a>
        ))}
      </div>
    ) : (
      <div className="reference-files-empty">No screenshots were attached to this draft.</div>
    );

    const referencePanelMarkup = (
      <section className={`reference-panel ${splitViewOpen ? 'is-hidden-in-split' : ''}`}>
        <div className="workspace-section-title"><Sparkles size={15} /><div><strong>Reference brief</strong><span>Notes and screenshots from whoever created the draft. Use these to guide your writing.</span></div></div>
        <label className="reference-notes">
          NOTES
          {referenceNotesMarkup}
        </label>
        {selectedDraft.screenshots?.length > 0 && (
          <div className="reference-files">
            {selectedDraft.screenshots.map((file) => (
              <a
                key={file.id || file.name}
                href={file.previewUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="reference-file-card"
              >
                {file.previewUrl ? <img src={file.previewUrl} alt={file.name} /> : <Paperclip size={18} />}
                <span>{file.name}</span>
              </a>
            ))}
          </div>
        )}
      </section>
    );

    const emailEditorMarkup = (
      <div className={`email-editor ${isLocked ? 'locked' : ''}`}>
        {isFinalReview ? <div className="review-two-ribbon">
          <div className="review-two-ribbon-top">
            <select aria-label="Font" defaultValue="Aptos" onChange={(event) => formatEditor('fontName', event.target.value)}><option>Aptos</option><option>Arial</option><option>Georgia</option><option>Times New Roman</option></select>
            <select aria-label="Font size" defaultValue="3" onChange={(event) => formatEditor('fontSize', event.target.value)}><option value="2">10</option><option value="3">11</option><option value="4">12</option><option value="5">14</option><option value="6">16</option></select>
            <button type="button" title="Heading 1" onClick={() => formatEditor('formatBlock', 'h1')}><Heading1 size={15} /></button>
            <button type="button" title="Heading 2" onClick={() => formatEditor('formatBlock', 'h2')}><Heading2 size={15} /></button>
            <button type="button" title="Paragraph" onClick={() => formatEditor('formatBlock', 'p')}><Type size={15} /></button>
            <button type="button" title="Quote" onClick={() => formatEditor('formatBlock', 'blockquote')}><Quote size={15} /></button>
            <span className="review-two-ribbon-spacer" />
            <button type="button" title="Undo" onClick={() => formatEditor('undo')}><Undo2 size={15} /></button>
            <button type="button" title="Redo" onClick={() => formatEditor('redo')}><Redo2 size={15} /></button>
          </div>
          <div className="review-two-ribbon-bottom">
            <div className="review-two-ribbon-group">
              {[[Bold, 'Bold', 'bold'], [Italic, 'Italic', 'italic'], [Underline, 'Underline', 'underline'], [Strikethrough, 'Strikethrough', 'strikeThrough'], [Highlighter, 'Highlight', 'hiliteColor', '#fff2a8'], [Palette, 'Text color', 'foreColor', '#5149df'], [Eraser, 'Clear formatting', 'removeFormat'], [Subscript, 'Subscript', 'subscript'], [Superscript, 'Superscript', 'superscript']].map(([Icon, label, command, value]) => <button type="button" key={label} title={label} onClick={() => formatEditor(command, value)}><Icon size={14} /></button>)}
              <span>Basic text</span>
            </div>
            <div className="review-two-ribbon-group">
              {[[List, 'Bulleted list', 'insertUnorderedList'], [ListOrdered, 'Numbered list', 'insertOrderedList'], [Outdent, 'Decrease indent', 'outdent'], [Indent, 'Increase indent', 'indent'], [AlignLeft, 'Align left', 'justifyLeft'], [AlignCenter, 'Align center', 'justifyCenter'], [AlignRight, 'Align right', 'justifyRight']].map(([Icon, label, command]) => <button type="button" key={label} title={label} onClick={() => formatEditor(command)}><Icon size={14} /></button>)}
              <span>Paragraph</span>
            </div>
            <div className="review-two-ribbon-group">
              <button type="button" title="Insert link" onClick={() => insertEditorContent(' [link] ')}><Link size={14} /></button>
              <button type="button" title="Remove link" onClick={() => formatEditor('unlink')}><Unlink size={14} /></button>
              <span>Insert</span>
            </div>
          </div>
        </div> : <>
        <div className="outlook-ribbon">
          <div className="ribbon-tabs">
            {['Message', 'Insert', 'Format text', 'Options'].map((tab) => (
              <button type="button" key={tab} className={activeRibbonTab === tab ? 'active' : ''} onClick={() => setActiveRibbonTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="ribbon-groups">
            {activeRibbonTab === 'Message' && <div className="ribbon-group">
              <button type="button" title="Undo" disabled={isLocked} onClick={() => formatEditor('undo')}><Undo2 size={15} /></button>
              <button type="button" title="Redo" disabled={isLocked} onClick={() => formatEditor('redo')}><Redo2 size={15} /></button>
              <span className="ribbon-label">Clipboard</span>
            </div>}
            {(activeRibbonTab === 'Message' || activeRibbonTab === 'Format text') && <div className="ribbon-group">
              <select aria-label="Font" disabled={isLocked} defaultValue="Aptos" onChange={(event) => formatEditor('fontName', event.target.value)}><option>Aptos</option><option>Arial</option><option>Georgia</option><option>Times New Roman</option></select>
              <select aria-label="Font size" disabled={isLocked} defaultValue="11" onChange={(event) => formatEditor('fontSize', event.target.value)}><option value="2">10</option><option value="3">11</option><option value="4">12</option><option value="5">14</option><option value="6">16</option></select>
              <button type="button" title="Bold" disabled={isLocked} onClick={() => formatEditor('bold')}><Bold size={15} /></button>
              <button type="button" title="Italic" disabled={isLocked} onClick={() => formatEditor('italic')}><Italic size={15} /></button>
              <button type="button" title="Underline" disabled={isLocked} onClick={() => formatEditor('underline')}><Underline size={15} /></button>
              <button type="button" title="Strikethrough" disabled={isLocked} onClick={() => formatEditor('strikeThrough')}><Strikethrough size={15} /></button>
              <button type="button" title="Highlight" disabled={isLocked} onClick={() => formatEditor('hiliteColor', '#fff2a8')}><Highlighter size={15} /></button>
              <span className="ribbon-label">Basic text</span>
            </div>}
            {(activeRibbonTab === 'Message' || activeRibbonTab === 'Format text') && <div className="ribbon-group">
              <button type="button" title="Bulleted list" disabled={isLocked} onClick={() => formatEditor('insertUnorderedList')}><List size={15} /></button>
              <button type="button" title="Numbered list" disabled={isLocked} onClick={() => formatEditor('insertOrderedList')}><ListOrdered size={15} /></button>
              <button type="button" title="Align left" disabled={isLocked} onClick={() => formatEditor('justifyLeft')}><AlignLeft size={15} /></button>
              <button type="button" title="Align center" disabled={isLocked} onClick={() => formatEditor('justifyCenter')}><AlignCenter size={15} /></button>
              <button type="button" title="Align right" disabled={isLocked} onClick={() => formatEditor('justifyRight')}><AlignRight size={15} /></button>
              <span className="ribbon-label">Paragraph</span>
            </div>}
            {activeRibbonTab === 'Insert' && <div className="ribbon-group">
              <button type="button" title="Attach file" disabled={isLocked} onClick={() => insertEditorContent(' [attachment] ')}><Paperclip size={15} /></button>
              <button type="button" title="Insert link" disabled={isLocked} onClick={() => insertEditorContent(' [link] ')}><Link size={15} /></button>
              <button type="button" title="Insert image" disabled={isLocked} onClick={() => insertEditorContent(' [image] ')}><Image size={15} /></button>
              <button type="button" title="Insert table" disabled={isLocked} onClick={() => insertEditorContent('\n| Column 1 | Column 2 |\n| --- | --- |\n')}><Table2 size={15} /></button>
              <span className="ribbon-label">Insert</span>
            </div>}
            {activeRibbonTab === 'Options' && <div className="ribbon-group options-group">
              <button type="button" className={`ribbon-option ${showWordCount ? 'selected' : ''}`} onClick={() => setShowWordCount((current) => !current)}>Show word count</button>
              <button type="button" className="ribbon-option" onClick={() => setDraftSaved(false)}>Mark as needing review</button>
              <span className="ribbon-label">Draft options</span>
            </div>}
          </div>
        </div>
        </>}
        <div
          ref={editorRef}
          className="email-editor-body"
          contentEditable={!isLocked}
          suppressContentEditableWarning
          data-placeholder={isFinalReview ? `Write your ${currentStage} version here, or copy the locked ${priorReviewStage} version above...` : 'Write the original email here...'}
          onInput={(event) => { setDraftContent(event.currentTarget.innerText); setDraftSaved(false); }}
        />
      </div>
    );

    return (
      <>
      <div className="draft-workspace">
        <div className="workspace-topline">
          <button type="button" className="back-link" onClick={backToDraftList}>← Back to drafts</button>
          <span className="stage-badge">Current stage: {currentStage}</span>
        </div>

        <div className="workspace-heading">
          <div>
            <span className="editorial-label">Draft</span>
            <h1>{selectedDraft.title}</h1>
            <div className="workspace-meta">
              <span className="meta-chip"><Building2 size={12} /> {selectedDraft.brand}</span>
              <span className="meta-chip"><Tag size={12} /> {selectedDraft.documentType}</span>
              <span className="meta-chip"><CalendarDays size={12} /> Updated {selectedDraft.updated}</span>
              <label className="meta-chip priority-chip">
                <Flag size={12} />
                <PriorityChipSelect value={selectedDraft.priority || 'Normal'} onChange={updateDraftField('priority')} />
              </label>
            </div>
          </div>
        </div>

        <section className="assignment-panel">
          <div className="assignment-heading">
            <div className="assignment-heading-copy">
              <span><UsersRound size={15} /> Assignments &amp; timing</span>
              <span className="assignment-helper">Upcoming stages, including Manager, can be reassigned until they start</span>
            </div>
            <div className="assignment-total"><Clock3 size={14} /> Total <span><Clock3 size={14} /> Live so far: <strong>{formatTotalElapsed(totalStageSeconds)}</strong></span></div>
          </div>
          <div className="assignment-grid">
            {assignmentCards.map(({ stage, field, className }, index) => {
              const name = selectedDraft[field];
              const person = accessList.find((entry) => entry.name === name)
                || accessList.find((entry) => entry.name.split(' ')[0] === name);
              const isActive = index === currentStageIndex;
              const isDone = index < currentStageIndex;
              const canChange = !isDone && !isActive && (field !== 'copywriter' || !selectedDraft.copywriterLocked);
              const duration = isActive ? activeStageSeconds : selectedDraft.stageSeconds?.[stage] || 0;
              return (
                <div key={stage} className={`assignment-card ${className}`}>
                  <UserRound size={16} className="assignment-person-icon" aria-hidden="true" />
                  <div className="assignment-person">
                    <span className="assignment-role">{stage}</span>
                    <strong>{!name || name === 'Unassigned' ? 'To be assigned' : name}</strong>
                    {person && <span className="assignment-job-title">{person.title}</span>}
                  </div>
                  {!isActive && <CustomSelect
                    value={name}
                    onChange={updateAssignment(field)}
                    options={people}
                    disabled={!canChange}
                    placeholder="Choose"
                    allowClear={false}
                    ariaLabel={`Change ${stage} assignee`}
                    triggerLabel="Change"
                    showDetails
                    optionDetails={accessList}
                    disabledReason={isActive ? `${name} opened this ${stage} step, so it is locked to them.` : field === 'copywriter' && selectedDraft.copywriterLocked ? 'The creator is locked as copywriter.' : 'Completed assignments cannot be changed.'}
                  />}
                  {isActive && <span className="assignment-claimed" title={`${name} opened this ${stage} step, so it is locked to them and can't be reassigned.`}><Lock size={11} /> {name === currentUser?.name ? 'You' : 'Locked'}</span>}
                  <div className="assignment-timing">
                    <span>{isActive ? 'Running' : isDone ? 'Done' : 'Pending'}</span>
                    <strong>{isActive || isDone ? formatChipDuration(duration) : '—'}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {currentStageIndex > 0 && (() => {
          const cardFor = Object.fromEntries(assignmentCards.map((card) => [card.stage, card]));
          const columns = draftStages.map((stage, index) => {
            const version = [...(selectedDraft.versions || [])].reverse().find((item) => item.stage === stage);
            const name = selectedDraft[cardFor[stage]?.field];
            const assigned = name && name !== 'Unassigned' ? name : '';
            const person = accessList.find((entry) => entry.name === assigned) || accessList.find((entry) => entry.name.split(' ')[0] === assigned);
            return {
              stage,
              className: cardFor[stage]?.className || '',
              name: person?.name || assigned || 'To be assigned',
              done: index < currentStageIndex,
              sections: version?.sections || [],
            };
          });
          const doneColumns = columns.filter((column) => column.done);
          return (
            <section className={`sections-worked${sectionsPanelOpen ? ' open' : ''}`}>
              <button type="button" className="sections-worked-toggle" onClick={() => setSectionsPanelOpen((open) => !open)} aria-expanded={sectionsPanelOpen}>
                {sectionsPanelOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <ClipboardList size={15} />
                <strong>Sections worked on</strong>
                {!sectionsPanelOpen && <span className="sections-worked-chips">
                  {doneColumns.map((column) => <span key={column.stage} className={`sections-chip ${column.className}`}>{column.stage} · {column.sections.length}</span>)}
                </span>}
                <small>{sectionsPanelOpen ? 'Click to hide' : 'Click to expand'}</small>
              </button>
              {sectionsPanelOpen && (
                <div className="sections-worked-body">
                  <div className="sections-matrix-scroll">
                    <table className="sections-matrix">
                      <thead>
                        <tr>
                          <th scope="col">Section</th>
                          {columns.map((column) => (
                            <th key={column.stage} scope="col" className={column.className}>
                              <span>{column.done ? <CheckCircle2 size={13} /> : <UserRound size={13} />}{column.stage}</span>
                              <strong>{column.name}</strong>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {draftSections.map((section) => (
                          <tr key={section}>
                            <th scope="row">{section}</th>
                            {columns.map((column) => {
                              if (!column.done) return <td key={column.stage} className="pending">pending</td>;
                              const worked = column.sections.includes(section);
                              return (
                                <td key={column.stage} className={worked ? 'worked' : ''} title={worked ? `${column.name} worked on ${section}` : `${column.name} did not mark ${section}`}>
                                  {worked ? <span className="sections-mark"><CheckCircle2 size={13} /> {column.name.charAt(0)}</span> : <span className="sections-dot" aria-label="Not marked" />}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="sections-worked-note"><CheckCircle2 size={12} /> A green cell means that person confirmed they worked on that section. Hover a cell to see their full name.</p>
                </div>
              )}
            </section>
          );
        })()}

        <div className="workflow-steps">
          {draftStages.map((stage, index) => {
            const who = { Copywriter: selectedDraft.copywriter, 'Review 1': selectedDraft.reviewerOne, 'Review 2': selectedDraft.reviewerTwo, 'Review 3': selectedDraft.reviewerThree, Manager: selectedManager }[stage];
            const status = index < currentStageIndex ? 'done' : index === currentStageIndex ? 'active' : '';
            const marker = status === 'done' ? '✓' : status === 'active' ? '✎' : '→';
            return <span key={stage} className={status} aria-current={status === 'active' ? 'step' : undefined}>{marker} {stage} · {who || (stage === 'Manager' ? 'TBD' : 'Unassigned')}</span>;
          })}
        </div>

        {!isFinalReview && referencePanelMarkup}

        {isFinalReview && (
          <div className="review-two-toolbar">
            <div className="review-two-assignee"><UserRound size={15} /><strong>{currentStage}</strong> is assigned to <strong>{stageOwner || 'Unassigned'}</strong><span><UserRound size={13} /> {priorReviewStage}: {currentStage === 'Review 3' ? selectedDraft.reviewerTwo : selectedDraft.reviewerOne || 'Unassigned'}</span></div>
            <div className="review-two-actions">
              <button type="button" className="split-view-button" onClick={copyReviewOneVersion} disabled={!lockedReviewContent}><ClipboardList size={14} /> Copy locked {priorReviewStage} version</button>
              <button type="button" className="split-view-button" onClick={saveDraftContent}><Save size={14} /> Save draft{draftSaved ? ' · Saved' : ''}</button>
              <button type="button" className="split-view-button" onClick={() => setSplitViewOpen(true)}><Columns2 size={14} /> Split view</button>
            </div>
          </div>
        )}
        <div className={isFinalReview ? 'review-two-layout' : 'standard-editor-layout'}>
          {isFinalReview && <section className="review-two-locked" aria-label={`Locked ${priorReviewStage} version`}>
            <div className="review-two-panel-heading"><div><strong><Shield size={15} /> {priorReviewStage} — locked <CheckCircle2 size={14} /></strong><span>Read-only reference. Use “Copy locked {priorReviewStage} version” above to start from it.</span></div><span><UserRound size={13} /> {currentStage === 'Review 3' ? selectedDraft.reviewerTwo : selectedDraft.reviewerOne || 'Unassigned'}</span></div>
            {selectedDraft.sections?.length > 0 && <div className="review-two-sections"><span>Sections worked on:</span>{selectedDraft.sections.map((section) => <span className="review-two-section-tag" key={section}>{section}</span>)}</div>}
            <div className="review-two-locked-content">{lockedReviewContent || `No submitted ${priorReviewStage} version is available for this draft.`}</div>
          </section>}
        <section className={`write-panel ${splitViewOpen ? 'split-view-active' : ''}`}>
          <div className="write-panel-header">
            <div className="workspace-section-title"><PenLine size={15} /><div><strong>{currentStage === 'Copywriter' ? 'Write the original draft' : isFinalReview ? `${currentStage} editor` : `${currentStage} review`}</strong><span>{currentStage === 'Copywriter' ? `Write the original email. Submitting saves a read-only version and moves it to ${selectedDraft.reviewerOne}.` : currentStage === 'Review 1' ? `Edit the draft for ${stageOwner || 'the reviewer'}. Submitting saves a new version and moves it to ${selectedDraft.reviewerTwo || 'Review 2'}.` : isFinalReview ? 'Your own working copy. Format with the toolbar, then submit.' : isManagerStage ? `Make any final edits, then approve to complete this draft and move it to History. Assigned to ${stageOwner || 'the manager'}.` : `This draft is currently at the ${currentStage} step. The assigned owner is ${stageOwner || 'unassigned'}.`}</span></div></div>
            {!isFinalReview && <button type="button" className="split-view-button" onClick={() => setSplitViewOpen(true)}><Columns2 size={14} /> Split view</button>}
          </div>
          <div className="draft-form-field draft-content-field">
            {!isFinalReview && <span>Draft content <b>*</b></span>}
            {emailEditorMarkup}
          </div>
          {(!isFinalReview || splitViewOpen) && <div className="content-footer">
            <span>{draftContent.trim().length} characters{showWordCount ? ` · ${draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0} words` : ''}{draftSaved ? ' · Saved' : ''}</span>
            <div><button type="button" className="button secondary" disabled={isLocked} onClick={saveDraftContent}><Save size={14} /> Save draft</button>{!isFinalReview && <button type="button" className="button primary" disabled={isLocked || !draftContent.trim()} onClick={requestLock}><Check size={14} /> {currentStage === 'Review 1' ? 'Submit to Review 2' : isManagerStage ? 'Approve & complete' : 'Submit & lock'}</button>}</div>
          </div>}
        </section>
        </div>
        {currentStage === 'Review 3' && <section className="review-two-approval" aria-label="Review 3 approval"><div className="workspace-section-title"><PenLine size={15} /><div><strong>Review 3 approval</strong><span>Review your working copy, then send it to {selectedManager || 'the manager'} for final approval.</span></div></div><div className="review-two-manager"><label><strong><Shield size={14} /> Assign the manager who will give final approval</strong><CustomSelect value={selectedManager} options={managerOptions} onChange={updateDraftField('manager')} placeholder="Select manager" allowClear={false} align="left" ariaLabel="Final approving manager" /></label></div><div className="review-two-approval-footer"><span>{draftSaved ? 'Working copy saved' : `${draftContent.length} characters`}</span><button type="button" className="button secondary" onClick={saveDraftContent}><Save size={14} /> Save draft</button><button type="button" className="button primary" disabled={!draftContent.trim() || !selectedManager} title={!selectedManager ? 'Assign a manager to approve' : undefined} onClick={requestLock}><Check size={14} /> Approve &amp; lock Review 3</button></div></section>}
        {currentStage === 'Review 2' && <section className="review-two-approval" aria-label="Review 2 approval">
          <div className="workspace-section-title"><PenLine size={15} /><div><strong>What did you change?</strong><span>Categorize the change and approve when you're done. Notes are optional.</span></div></div>
          <div className="review-two-fields">
            <div className="review-two-field"><span>Reviewer <b>*</b></span><CustomSelect value={selectedDraft.reviewerTwo || ''} options={people} onChange={updateAssignment('reviewerTwo')} allowClear={false} align="left" ariaLabel="Reviewer" disabled disabledReason="Locked to the person who opened Review 2" /></div>
            <div className="review-two-field"><span>Change type <b>*</b></span><CustomSelect value={reviewTwoReview.changeType || 'Content'} options={['Content', 'Formatting', 'Grammar', 'Approval', 'No changes']} onChange={updateReviewTwoField('changeType')} allowClear={false} align="left" ariaLabel="Change type" /></div>
            <div className="review-two-field"><span>Error type</span><CustomSelect value={reviewTwoReview.errorType || 'None'} options={['None', ...errorTypes]} onChange={updateReviewTwoField('errorType')} allowClear={false} align="left" ariaLabel="Error type" /></div>
          </div>
          <label className="review-two-notes"><span className="review-two-notes-caption">Notes <small>(optional)</small></span><input type="text" value={reviewTwoReview.notes || ''} onChange={updateReviewTwoField('notes')} placeholder="Optional, e.g. fixed grammar in paragraph 2." /></label>
          <label className={`review-two-routing review-two-route-option ${reviewTwoReview.extraReview ? 'is-disabled' : ''}`}><input type="checkbox" disabled={!!reviewTwoReview.extraReview} checked={!!reviewTwoReview.directToManager} onChange={(event) => updateReviewTwoField('directToManager')({ target: { value: event.target.checked } })} /><span><strong><FastForward size={14} /> Send directly to Manager after my approval</strong><small>Skip any remaining reviewers and route this draft straight to the Manager for final approval.</small></span></label>
          <div className={`review-two-extra ${reviewTwoReview.directToManager ? 'is-disabled' : ''}`}>
            <label className="review-two-route-option"><input type="checkbox" disabled={!!reviewTwoReview.directToManager} checked={!!reviewTwoReview.extraReview} onChange={(event) => updateReviewTwoField('extraReview')({ target: { value: event.target.checked } })} /><span><strong><UsersRound size={14} /> Need an extra Review 3 before the manager?</strong><small>Tick this if the draft needs a third pair of eyes before final approval. If unchecked, the draft goes straight to the Manager after you approve.</small></span></label>
            {reviewTwoReview.extraReview && <div className="review-two-extra-assignee"><span>Review 3 assignee <b>*</b></span><CustomSelect value={selectedDraft.reviewerThree || ''} options={people} onChange={updateAssignment('reviewerThree')} placeholder="Select Review 3" allowClear={false} align="left" ariaLabel="Review 3 assignee" /></div>}
          </div>
          <div className={`review-two-manager ${reviewTwoReview.extraReview ? 'is-disabled' : ''}`}><label><strong><Shield size={14} /> Assign the manager who will give final approval</strong><CustomSelect value={reviewTwoReview.extraReview ? '' : selectedManager} options={managerOptions} onChange={updateDraftField('manager')} placeholder={reviewTwoReview.extraReview ? 'Assigned by Review 3' : 'Select manager'} allowClear={false} align="left" ariaLabel="Final approving manager" disabled={!!reviewTwoReview.extraReview} disabledReason="Review 3 will assign the manager" /></label>{reviewTwoReview.extraReview && <small>Review 3 will assign the manager after their review.</small>}</div>
          <div className="review-two-approval-footer"><button type="button" className="button primary" disabled={!draftContent.trim() || (reviewTwoReview.extraReview ? !selectedDraft.reviewerThree : !selectedManager)} title={!draftContent.trim() ? 'Write your Review 2 draft to approve' : reviewTwoReview.extraReview ? (!selectedDraft.reviewerThree ? 'Assign a Review 3 reviewer' : undefined) : !selectedManager ? 'Assign a manager to approve' : undefined} onClick={requestLock}><Check size={14} /> Approve &amp; lock Review 2</button></div>
        </section>}
        {isFinalReview && (() => {
          const changes = diffWords(lockedReviewContent, draftContent);
          const addedCount = changes.filter((part) => part.type === 'added').length;
          const removedCount = changes.filter((part) => part.type === 'removed').length;
          return (
            <section className="review-diff" aria-label="Highlighted changes">
              <div className="review-diff-header">
                <div><strong>Highlighted changes</strong><span>Text-only comparison against the locked {priorReviewStage} version.</span></div>
                <div className="review-diff-counts"><span className="added">+{addedCount} added</span><span className="removed">−{removedCount} removed</span></div>
              </div>
              <div className="review-diff-body">
                {!lockedReviewContent && !draftContent.trim()
                  ? <span className="review-diff-empty">Nothing to compare yet.</span>
                  : addedCount === 0 && removedCount === 0
                    ? <span className="review-diff-empty">No changes from the locked {priorReviewStage} version.</span>
                    : changes.map((part, index) => {
                      const trailing = part.raw.slice(part.word.length);
                      return part.type === 'equal'
                        ? <span key={index}>{part.raw}</span>
                        : <span key={index}><span className={part.type === 'added' ? 'diff-added' : 'diff-removed'}>{part.word}</span>{trailing}</span>;
                    })}
              </div>
            </section>
          );
        })()}
        {selectedDraft.versions?.length > 0 && !splitViewOpen && currentStage !== 'Review 2' && (
          <section className="draft-versions" aria-label="Submitted versions">
            <h2>Submitted versions</h2>
            {selectedDraft.versions.map((version, index) => (
              <details key={`${version.stage}-${index}`}>
                <summary>{version.stage} · Version {index + 1}</summary>
                <div className="draft-version-content">{version.content}</div>
              </details>
            ))}
          </section>
        )}
      </div>

      {splitViewOpen && (
        <div className="split-view-scrim">
          <div className="split-view-header">
            <div className="split-view-title"><Columns2 size={16} /> Split view <span className="split-view-divider">·</span> {currentStage} <span className="split-view-divider">·</span> {selectedDraft.title}</div>
            <button type="button" className="split-view-close" onClick={() => setSplitViewOpen(false)}><X size={14} /> Close</button>
          </div>
          <div className="split-view-reference-pane">
            <div className="split-pane-tabs">
              <button
                type="button"
                className={splitViewTab === 'screenshots' ? 'active' : ''}
                onClick={() => setSplitViewTab('screenshots')}
              >
                <Paperclip size={13} /> Screenshots ({selectedDraft.screenshots?.length || 0})
              </button>
              <button
                type="button"
                className={splitViewTab === 'notes' ? 'active' : ''}
                onClick={() => setSplitViewTab('notes')}
              >
                <PenLine size={13} /> Notes
              </button>
            </div>
            <div className="split-pane-scroll">
              {splitViewTab === 'notes' ? referenceNotesMarkup : referenceScreenshotsMarkup}
            </div>
          </div>
        </div>
      )}
    </>
    );
  };

  const renderTemplatePage = () => {
    const getUniqueValues = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const stageOptions = getUniqueValues(drafts.map((draft) => getDraftStage(draft)));
    const brandOptions = getUniqueValues(drafts.map((draft) => draft.brand));
    const documentTypeOptions = getUniqueValues(drafts.map((draft) => getDraftDocumentType(draft)));
    const priorityOptions = getUniqueValues(drafts.map((draft) => draft.priority || 'Normal'));
    const assigneeOptions = getUniqueValues(drafts.flatMap((draft) => [
      draft.copywriter,
      draft.reviewerOne,
      draft.reviewerTwo,
      draft.manager,
    ]).filter((value) => value && value !== 'Unassigned'));
    const normalizedSearch = draftSearch.trim().toLowerCase();
    const activeFilterCount = draftFilters.stages.length
      + draftFilters.brands.length
      + draftFilters.documentTypes.length
      + draftFilters.assignees.length
      + draftFilters.priorities.length
      + (draftFilters.dueFrom ? 1 : 0)
      + (draftFilters.dueTo ? 1 : 0);
    const filteredDrafts = drafts.filter((draft) => {
      const stage = getDraftStage(draft);
      const documentType = getDraftDocumentType(draft);
      const priority = draft.priority || 'Normal';
      const assignees = [draft.copywriter, draft.reviewerOne, draft.reviewerTwo, draft.manager].filter(Boolean);
      const dueDate = draft.dueDate || '';
      const matchesSearch = !normalizedSearch || [
        draft.title,
        draft.brand,
        documentType,
        stage,
        priority,
        ...assignees,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      return matchesSearch
        && (!draftFilters.stages.length || draftFilters.stages.includes(stage))
        && (!draftFilters.brands.length || draftFilters.brands.includes(draft.brand))
        && (!draftFilters.documentTypes.length || draftFilters.documentTypes.includes(documentType))
        && (!draftFilters.assignees.length || assignees.some((assignee) => draftFilters.assignees.includes(assignee)))
        && (!draftFilters.priorities.length || draftFilters.priorities.includes(priority))
        && (!draftFilters.dueFrom || (dueDate && dueDate >= draftFilters.dueFrom))
        && (!draftFilters.dueTo || (dueDate && dueDate <= draftFilters.dueTo));
    });
    const sortedDrafts = [...filteredDrafts].sort((a, b) => {
      switch (draftSort) {
        case 'stuckLongest':
          return (a.stageStartedAt || 0) - (b.stageStartedAt || 0);
        case 'justMoved':
          return (b.stageStartedAt || 0) - (a.stageStartedAt || 0);
        case 'priorityFirst':
          return (priorityRank[a.priority || 'Normal'] ?? 2) - (priorityRank[b.priority || 'Normal'] ?? 2);
        case 'oldestUpdated':
          return new Date(a.updated) - new Date(b.updated);
        case 'titleAZ':
          return a.title.localeCompare(b.title);
        case 'titleZA':
          return b.title.localeCompare(a.title);
        case 'recentlyUpdated':
        default:
          return new Date(b.updated) - new Date(a.updated);
      }
    });

    return (
    <div className="template-page">
      <div className="template-header-row">
        <div>
          <div className="editorial-label">Editorial workflow</div>
          <h1>Email drafts</h1>
        </div>
        <div className="template-actions">
          <button type="button" className="template-button neutral"><RotateCcw size={15} /> Sync to Drafts translations</button>
          <button type="button" className="template-button primary" onClick={() => setNewDraftOpen(true)}><Plus size={15} /> New draft</button>
        </div>
      </div>

      <div className="template-subtext">
        Copywriter drafts <span>→</span> Review 1 <span>→</span> Review 2 <span>→</span> Optional review 3 <span>→</span> Manager approval. Every submitted stage is logged forever.
      </div>

      <div className="template-toolbar">
        <div className="search-box">
          <Search size={15} />
          <input
            type="text"
            value={draftSearch}
            onChange={(event) => {
              setDraftSearch(event.target.value);
              setDraftPage(1);
            }}
            placeholder="Search by title, brand, doc type, or assignee"
            aria-label="Search drafts"
          />
        </div>
        <div className="toolbar-actions">
          <SortMenu value={draftSort} onChange={(next) => { setDraftSort(next); setDraftPage(1); }} />
          <button type="button" className={`toolbar-button ${filterPanelOpen ? 'active' : ''}`} onClick={() => setFilterPanelOpen((current) => !current)}>
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {filterPanelOpen && (
        <div className="filter-panel">
          <div className="filter-panel-header">
            <div>
              <strong>Filter email drafts</strong>
              <span>Select more than one option in each dropdown. Cards update immediately.</span>
            </div>
            {(activeFilterCount > 0 || draftSearch) && <button type="button" onClick={clearAllDraftFilters}>Clear all</button>}
          </div>
          <div className="filter-dropdown-grid">
            <MultiSelectFilter
              label="Stage"
              icon={PenLine}
              options={stageOptions}
              selected={draftFilters.stages}
              placeholder="All stages"
              onToggle={(option) => toggleDraftFilter('stages', option)}
              onClear={() => clearDraftFilter('stages')}
            />
            <MultiSelectFilter
              label="Brand"
              icon={Building2}
              options={brandOptions}
              selected={draftFilters.brands}
              placeholder="All brands"
              onToggle={(option) => toggleDraftFilter('brands', option)}
              onClear={() => clearDraftFilter('brands')}
            />
            <MultiSelectFilter
              label="Document type"
              icon={Tag}
              options={documentTypeOptions}
              selected={draftFilters.documentTypes}
              placeholder="All types"
              onToggle={(option) => toggleDraftFilter('documentTypes', option)}
              onClear={() => clearDraftFilter('documentTypes')}
            />
            <MultiSelectFilter
              label="Assignee"
              icon={UserRound}
              options={assigneeOptions}
              selected={draftFilters.assignees}
              placeholder="Anyone"
              onToggle={(option) => toggleDraftFilter('assignees', option)}
              onClear={() => clearDraftFilter('assignees')}
            />
            <MultiSelectFilter
              label="Priority"
              icon={Flag}
              options={priorityOptions}
              selected={draftFilters.priorities}
              placeholder="All priorities"
              onToggle={(option) => toggleDraftFilter('priorities', option)}
              onClear={() => clearDraftFilter('priorities')}
            />
            <DatePickerField
              label="Due from"
              icon={CalendarDays}
              value={draftFilters.dueFrom}
              onChange={updateDraftDateFilterValue('dueFrom')}
              placeholder="Any date"
            />
            <DatePickerField
              label="Due to"
              icon={CalendarDays}
              value={draftFilters.dueTo}
              onChange={updateDraftDateFilterValue('dueTo')}
              placeholder="Any date"
            />
          </div>
        </div>
      )}

      {(() => {
        const draftsPerPage = 6;
        const pageCount = Math.max(1, Math.ceil(sortedDrafts.length / draftsPerPage));
        const safeDraftPage = Math.min(draftPage, pageCount);
        const visibleDrafts = sortedDrafts.slice((safeDraftPage - 1) * draftsPerPage, safeDraftPage * draftsPerPage);
        const firstDraft = sortedDrafts.length ? (safeDraftPage - 1) * draftsPerPage + 1 : 0;
        const lastDraft = Math.min(safeDraftPage * draftsPerPage, sortedDrafts.length);

        return (
          <>
      <div className="results-meta">Showing {firstDraft}-{lastDraft} of {sortedDrafts.length} drafts (max 6 per page)</div>

      {visibleDrafts.length > 0 ? <div className="draft-grid">
        {visibleDrafts.map((draft) => {
          const currentStage = getDraftStage(draft);
          const draftStages = getDraftStages(draft);
          const currentIndex = draftStages.indexOf(currentStage);
          const stageSeconds = draft.stageSeconds || {};
          const activeElapsed = draft.stageStartedAt
            ? Math.max(0, (liveTick - Number(draft.stageStartedAt)) / 1000)
            : 0;
          const doneTotal = draftStages
            .slice(0, currentIndex)
            .reduce((sum, stage) => sum + (stageSeconds[stage] || 0), 0);
          const totalElapsed = doneTotal + activeElapsed;

          return (
            <article
              key={draft.id}
              className="draft-card draft-card-clickable"
              onContextMenu={openPriorityMenu(draft)}
              onClick={() => openDraft(draft)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDraft(draft); } }}
            >
              <div className="draft-card-toprow">
                <div className="draft-chips">
                  <span className="chip-brand"><Building2 size={12} /> {draft.brand}</span>
                  <span className="chip-doctype">{getDraftDocumentType(draft)}</span>
                </div>
                <span className={`status-pill ${draft.typeTone}`}>{draft.type}</span>
              </div>

              {draft.priority && draft.priority !== 'Normal' && (
                <span className={`priority-tag ${draft.priority.toLowerCase()}`}>
                  {draft.priority === 'Urgent' ? <AlertTriangle size={11} /> : draft.priority === 'High' ? <ArrowUp size={11} /> : <Minus size={11} />}
                  {draft.priority === 'Urgent' ? 'Urgent' : `${draft.priority} priority`}
                </span>
              )}

              <h3 className="draft-card-title">{draft.title}</h3>

              <div className="draft-role-list">
                {draftStages.map((stage, index) => {
                  const roleStatus = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending';
                  const roleName = getRoleForStage(draft, stage);
                  const roleSeconds = roleStatus === 'done'
                    ? (stageSeconds[stage] || 0)
                    : roleStatus === 'active'
                      ? activeElapsed
                      : null;

                  return (
                    <div key={stage} className={`role-row ${roleStatus}`}>
                      <span className={`role-check ${roleStatus}`}>
                        {roleStatus === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </span>
                      <span className="role-name"><b>{stage}:</b> {roleName || 'Unassigned'}</span>
                      {roleSeconds !== null && (
                        <span className={`role-time ${roleStatus}`}>
                          <Clock3 size={11} /> {formatChipDuration(roleSeconds)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="draft-card-elapsed">
                <span className="draft-card-elapsed-label"><Hourglass size={13} /> Elapsed</span>
                <strong className="draft-card-elapsed-value">{formatTotalElapsed(totalElapsed)}</strong>
              </div>

              <div className="draft-card-footer">
                <span className="meta-row"><Clock3 size={12} /> {draft.updated}</span>
                <button type="button" className="open-link" onClick={(event) => { event.stopPropagation(); openDraft(draft); }}>Open <ChevronRight size={14} /></button>
              </div>
            </article>
          );
        })}
      </div> : (
        <div className="empty-filter-state">
          <Search size={22} />
          <strong>No drafts match those filters</strong>
          <span>Try clearing one dropdown or searching with a different word.</span>
          <button type="button" className="toolbar-button" onClick={clearAllDraftFilters}>Clear filters</button>
        </div>
      )}

      {visibleDrafts.length > 0 && (
        <div className="pagination">
          <span>Showing {firstDraft}-{lastDraft} of {sortedDrafts.length} active drafts</span>
          <div className="page-numbers">
            <button type="button" className="page-button" disabled={safeDraftPage === 1} onClick={() => setDraftPage((page) => Math.max(1, page - 1))} aria-label="Previous page"><ChevronLeft size={14} /></button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button type="button" key={page} className={`page-button ${safeDraftPage === page ? 'active' : ''}`} onClick={() => setDraftPage(page)}>{page}</button>
            ))}
            <button type="button" className="page-button" disabled={safeDraftPage === pageCount} onClick={() => setDraftPage((page) => Math.min(pageCount, page + 1))} aria-label="Next page"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      <div className="history-panel">
        <div className="history-panel-header">
          <div className="history-panel-title">
            <span className="history-check-icon"><CheckCircle2 size={17} /></span>
            <h2>History <span className="history-badge">{historyRows.length}</span></h2>
          </div>
          <button type="button" className="history-export-btn"><FileText size={14} /> Export Excel</button>
        </div>
        <p className="history-panel-subtext">Every draft that was completed by the manager OR deleted from the top. Total time and all errors raised by any reviewer are shown per row.</p>

        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Finished</th>
                <th>Title</th>
                <th>Brand</th>
                <th>Type</th>
                <th>Copywriter</th>
                <th>Review 1</th>
                <th>Review 2</th>
                <th>Review 3</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Total time</th>
                <th>All errors reported</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map(renderHistoryRow)}
            </tbody>
          </table>
        </div>
      </div>
          </>
        );
      })()}

      {priorityMenu && (() => {
        const menuDraft = drafts.find((draft) => draft.id === priorityMenu.draftId);
        if (!menuDraft) return null;
        const currentPriority = menuDraft.priority || 'Normal';
        return (
          <div
            className="priority-menu"
            style={{ top: priorityMenu.y, left: priorityMenu.x }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="priority-menu-title">Set priority</div>
            <button type="button" className="priority-menu-item urgent" onClick={() => setDraftPriority(menuDraft.id, 'Urgent')}>
              <AlertTriangle size={14} /> Urgent
              {currentPriority === 'Urgent' && <Check size={13} className="priority-menu-check" />}
            </button>
            <button type="button" className="priority-menu-item high" onClick={() => setDraftPriority(menuDraft.id, 'High')}>
              <ArrowUp size={14} /> High priority
              {currentPriority === 'High' && <Check size={13} className="priority-menu-check" />}
            </button>
            <button type="button" className="priority-menu-item normal" onClick={() => setDraftPriority(menuDraft.id, 'Normal')}>
              <Minus size={14} /> Normal (no tag)
              {currentPriority === 'Normal' && <Check size={13} className="priority-menu-check" />}
            </button>
            <div className="priority-menu-divider" />
            <button type="button" className="priority-menu-item danger" onClick={() => deleteDraft(menuDraft)}>
              <Trash2 size={14} /> Delete draft…
            </button>
            <div className="priority-menu-tip">Tip: right-click any draft card to open this menu.</div>
          </div>
        );
      })()}

      {newDraftOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="draft-modal" role="dialog" aria-modal="true" aria-labelledby="new-draft-title">
            <div className="draft-modal-header">
              <div className="draft-modal-heading">
                <Sparkles size={17} />
                <div>
                  <h2 id="new-draft-title">New email draft</h2>
                  <p>The draft is automatically assigned to you as copywriter. Pick both reviewers; the manager will be assigned later, after Review 2 approves.</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => { setNewDraftOpen(false); resetNewDraftForm(); }} aria-label="Close new draft form"><X size={17} /></button>
            </div>

            <form className="draft-form" onSubmit={addDraft}>
              <label className="draft-form-field full-width">
                <span>Title <b>*</b></span>
                <input autoFocus required value={newDraftForm.title} onChange={updateNewDraft('title')} placeholder="e.g. Fall Deployment Announcement" />
              </label>

              <div className="draft-form-grid">
                <label className="draft-form-field">
                  <span>Brand <b>*</b></span>
                  <CustomSelect value={newDraftForm.brand} onChange={updateNewDraft('brand')} options={brands} placeholder="Select brand" allowClear={false} align="left" ariaLabel="Brand" />
                </label>
                <label className="draft-form-field">
                  <span>Document type <b>*</b></span>
                  <CustomSelect value={newDraftForm.documentType} onChange={updateNewDraft('documentType')} options={['Deployment', 'Talking Points', 'Itinerary Mod', 'Oversell', 'Email']} placeholder="Select document type" allowClear={false} align="left" ariaLabel="Document type" />
                </label>
              </div>

              <label className="draft-form-field full-width">
                <span>Copywriter (assigned to creator) <b>*</b></span>
                <input className="locked-field" type="text" value={creatorName} readOnly />
                <small className="field-helper">New drafts are automatically assigned to the person creating them and cannot be changed.</small>
              </label>

              <div className="draft-form-grid">
                <label className="draft-form-field">
                  <span>Review 1 assignee <b>*</b></span>
                  <CustomSelect value={newDraftForm.reviewerOne} onChange={updateNewDraft('reviewerOne')} options={people} placeholder="Assign Review 1" allowClear={false} align="left" ariaLabel="Review 1 assignee" />
                </label>
                <label className="draft-form-field">
                  <span>Review 2 assignee <b>*</b></span>
                  <CustomSelect value={newDraftForm.reviewerTwo} onChange={updateNewDraft('reviewerTwo')} options={people} placeholder="Assign Review 2" allowClear={false} align="left" ariaLabel="Review 2 assignee" />
                </label>
              </div>

              <fieldset className="priority-field">
                <legend><Flag size={12} /> Priority <small>optional — flag if it needs extra attention</small></legend>
                <div className="priority-options">
                  {['Urgent', 'High', 'Normal'].map((priority) => (
                    <label key={priority} className={`priority-option ${priority.toLowerCase()} ${newDraftForm.priority === priority ? 'selected' : ''}`}>
                      <input type="radio" name="priority" value={priority} checked={newDraftForm.priority === priority} onChange={updateNewDraft('priority')} />
                      <span>{priority}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="draft-form-field full-width">
                <span>Date due <small>optional — when this draft needs to be finished</small></span>
                <DatePickerField
                  variant="field"
                  value={newDraftForm.dueDate}
                  onChange={(iso) => setNewDraftForm((current) => ({ ...current, dueDate: iso }))}
                  placeholder="mm/dd/yyyy"
                  ariaLabel="Date due"
                />
              </div>

              <div className="draft-form-field full-width">
                <span>Notes for the copywriter <small>optional — briefing, tone, or anything the writer should keep in mind</small></span>
                <RichNotesEditor
                  value={newDraftForm.notes}
                  onChange={updateNewDraftNotes}
                  placeholder="Type notes here… you can format with bold, colors, lists, links, just like an email."
                  ariaLabel="Notes for the copywriter"
                />
              </div>

              <label className="draft-form-field full-width">
                <span>Reference screenshots <small>optional — attach images so the copywriter can see what to do</small></span>
                <input className="sr-only" type="file" id="draft-screenshots" accept=".png,.jpg,.jpeg,.gif,.webp" multiple onChange={onDraftScreenshots} />
                <label className="draft-upload" htmlFor="draft-screenshots">
                  <Paperclip size={20} />
                  <strong>{newDraftForm.screenshots.length ? `${newDraftForm.screenshots.length} screenshot${newDraftForm.screenshots.length > 1 ? 's' : ''} selected` : 'Click to upload or drag & drop screenshots here'}</strong>
                  <small>PNG, JPG, GIF, or WebP • up to 4 MB each</small>
                </label>
                {newDraftForm.screenshots.length > 0 && (
                  <div className="draft-preview-grid">
                    {newDraftForm.screenshots.map((file) => (
                      <a key={file.id} className="draft-preview-card" href={file.previewUrl} target="_blank" rel="noreferrer">
                        <img src={file.previewUrl} alt={file.name} />
                        <span>{file.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </label>

              <div className="draft-modal-actions">
                {(() => {
                  const missing = [
                    !newDraftForm.title.trim() && 'Title',
                    !newDraftForm.brand && 'Brand',
                    !newDraftForm.documentType && 'Document type',
                    !newDraftForm.reviewerOne && 'Review 1 assignee',
                    !newDraftForm.reviewerTwo && 'Review 2 assignee',
                  ].filter(Boolean);
                  return <>
                    {missing.length > 0 && <span className="draft-modal-missing">Still needed: {missing.join(', ')}</span>}
                    <button type="button" className="button secondary" onClick={() => { setNewDraftOpen(false); resetNewDraftForm(); }}>Cancel</button>
                    <button type="submit" className={`button primary create-draft-button ${missing.length ? '' : 'is-ready'}`} disabled={missing.length > 0} title={missing.length ? `Fill in: ${missing.join(', ')}` : 'Create this draft'}><Plus size={15} /> Create draft</button>
                  </>;
                })()}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
  };

  const renderHistoryPage = () => (
    <div className="history-page">
      <div className="history-header-row">
        <div className="history-title-wrap">
          <div className="history-history-icon"><ClipboardList size={16} /></div>
          <div>
            <div className="editorial-label">History</div>
            <h1>Finished</h1>
          </div>
        </div>
        <button type="button" className="template-button primary history-export"><FileText size={14} /> Export Excel</button>
      </div>

      <div className="history-subtext">Every draft that was completed by the manager is stored in the top log table and all errors raised by any reviewer are shown in the row.</div>

      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Finished</th>
              <th>Title</th>
              <th>Brand</th>
              <th>Type</th>
              <th>Copywriter</th>
              <th>Review 1</th>
              <th>Review 2</th>
              <th>Review 3</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Total time</th>
              <th>All errors reported</th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map(renderHistoryRow)}
          </tbody>
        </table>
      </div>

      <div className="table-footer-note">Tip: hover any row for a quick summary, or click it to see every action on that draft. Managers can reopen a completed or deleted draft from there.</div>
    </div>
  );

  const renderAdminPage = () => {
    if (currentUser?.email !== ADMIN_EMAIL) return null;
    const matchingUsers = accessList
      .filter(({ name, email, title }) => `${name} ${email} ${title}`.toLowerCase().includes(accessSearch.toLowerCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
    return (
      <main className="admin-page">
        <div className="admin-intro">
          <div><span className="editorial-label">Access management</span><h1>Admin</h1><p>Manage who can sign in and which view they see.</p></div>
          <span className="admin-count"><UsersRound size={16} /> {accessList.filter((person) => person.status === 'Allowed').length} allowed users</span>
        </div>
        <div className="admin-notice"><Shield size={17} /><span>This is a browser-local demo. Access changes are saved only in this browser; real access control requires server-side authentication and shared storage.</span></div>
        <section className="admin-card">
          <h2>Add a user</h2>
          <form className="admin-add-form" onSubmit={addAccessUser}>
            <label>Name<input required value={accessForm.name} onChange={(event) => setAccessForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" /></label>
            <label>Email ID<input required type="email" value={accessForm.email} onChange={(event) => setAccessForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" /></label>
            <label>Title<input required value={accessForm.title} onChange={(event) => setAccessForm((current) => ({ ...current, title: event.target.value }))} placeholder="Job title" /></label>
            <label>View type<select value={accessForm.view} onChange={(event) => setAccessForm((current) => ({ ...current, view: event.target.value }))}><option value="User">User</option><option value="Manager">Manager</option></select></label>
            <button type="submit" className="button primary"><Plus size={15} /> Add user</button>
          </form>
          {accessError && <p className="access-message" role="alert">{accessError}</p>}
        </section>
        <section className="admin-card">
          <div className="admin-list-header"><div><h2>People &amp; access</h2><p>Click a name to choose which pages that person can open. Denied users cannot sign in. Your admin account cannot be changed.</p></div><label className="admin-search"><Search size={15} /><input aria-label="Search users" value={accessSearch} onChange={(event) => setAccessSearch(event.target.value)} placeholder="Search name, email, or title" /></label></div>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Name</th><th>Email ID</th><th>Title</th><th>View type</th><th>Pages</th><th>Access</th></tr></thead>
            <tbody>{matchingUsers.map((person) => {
              const isOwner = person.email.toLowerCase() === ADMIN_EMAIL;
              const isExpanded = expandedAccessEmail === person.email;
              const personPages = getAllowedPages(person);
              const rolePages = isOwner ? pageCatalog : pageCatalog.filter((page) => page.views.includes(person.view));
              const blocked = person.blockedPages || [];
              return <Fragment key={person.email}><tr className={isExpanded ? 'admin-row-expanded' : undefined}>
                <td><button type="button" className="admin-name-toggle" aria-expanded={isExpanded} aria-controls={`pages-${person.email}`} onClick={() => setExpandedAccessEmail(isExpanded ? null : person.email)}>{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}<strong>{person.name}</strong></button></td>
                <td>{person.email}</td>
                <td>{isOwner ? person.title : <input className="admin-title-input" aria-label={`Title for ${person.email}`} value={person.title} onChange={(event) => updateAccessUser(person.email, { title: event.target.value })} placeholder="Job title" />}</td>
                <td>{isOwner ? <span className="admin-owner-badge">Administrator</span> : <select aria-label={`View type for ${person.email}`} value={person.view} onChange={(event) => updateAccessUser(person.email, { view: event.target.value })}><option value="User">User</option><option value="Manager">Manager</option></select>}</td>
                <td><span className="admin-page-count">{isOwner ? 'All pages' : `${personPages.length} of ${rolePages.length}`}</span></td>
                <td>{isOwner ? <span className="admin-status allowed">Allowed</span> : <button type="button" className={`admin-status ${person.status.toLowerCase()}`} onClick={() => updateAccessUser(person.email, { status: person.status === 'Allowed' ? 'Denied' : 'Allowed' })} aria-label={`${person.status === 'Allowed' ? 'Deny' : 'Allow'} ${person.email}`}>{person.status === 'Allowed' ? 'Allowed · Deny' : 'Denied · Allow'}</button>}</td>
              </tr>
              {isExpanded && <tr className="admin-pages-row" id={`pages-${person.email}`}><td colSpan={6}>
                <div className="admin-pages-panel">
                  <div className="admin-pages-heading"><strong>Page access for {person.name}</strong><span>{isOwner ? 'The administrator always has access to every page.' : `Pages available to the ${person.view} view. Switch a page off to hide it and block access.`}</span></div>
                  <div className="admin-pages-grid">
                    {rolePages.map((page) => {
                      const enabled = isOwner || !blocked.includes(page.name);
                      const Icon = navIcons[page.name];
                      return <label key={page.name} className={`admin-page-toggle ${enabled ? 'is-on' : 'is-off'} ${isOwner ? 'is-locked' : ''}`}>
                        <span className="admin-page-icon"><Icon size={15} /></span>
                        <span className="admin-page-copy"><strong>{page.name}</strong><small>{page.description}</small></span>
                        <input type="checkbox" role="switch" checked={enabled} disabled={isOwner} onChange={() => togglePageAccess(person.email, page.name)} aria-label={`${page.name} access for ${person.email}`} />
                        <span className="admin-switch" aria-hidden="true" />
                      </label>;
                    })}
                  </div>
                  {!isOwner && personPages.length === 0 && <p className="access-message" role="alert">All pages are switched off, so this person can&apos;t sign in.</p>}
                  {!isOwner && person.view === 'User' && <p className="admin-pages-note">Manager pages (Dashboard, Templates) appear here after changing the view type to Manager.</p>}
                </div>
              </td></tr>}</Fragment>;
            })}</tbody>
          </table>{matchingUsers.length === 0 && <p className="admin-empty">No users match your search.</p>}</div>
        </section>
      </main>
    );
  };

  const allowedPages = getAllowedPages(currentUser);
  const navigationItems = allowedPages.map((name) => [name, navIcons[name]]);

  const onlineUsers = currentUser
    ? [
      currentUser,
      ...accessList.filter((person) => person.status === 'Allowed')
        .filter((person) => person.email !== currentUser.email)
        .slice(0, 4),
    ]
    : [];
  const extraOnlineCount = currentUser ? Math.max(0, accessList.filter((person) => person.status === 'Allowed').length - onlineUsers.length) : 0;
  const allOnlinePeople = currentUser
    ? [currentUser, ...accessList.filter((person) => person.status === 'Allowed' && person.email !== currentUser.email)]
    : [];
  const activeOnlineCount = allOnlinePeople.filter((person) => getPresenceStatus(person, currentUser) === 'active').length;
  const awayOnlineCount = allOnlinePeople.length - activeOnlineCount;

  return (
    <div className={`app-shell ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Shield size={20} fill="currentColor" /></div>
          <div><strong>Comms Hub</strong><span>Quality assurance for communications</span></div>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigationItems.map(([name, Icon]) => (
            <button key={name} aria-label={name} title={name} className={activeNav === name ? 'nav-item active' : 'nav-item'} onClick={() => navigateTo(name)}>
              <Icon size={16} /> <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="profile-area">
          <div className="online-presence-wrap" ref={onlinePanelRef}>
          <button type="button" className={`online-presence${onlinePanelOpen ? ' open' : ''}`} aria-haspopup="dialog" aria-expanded={onlinePanelOpen} aria-label={`${onlineUsers.length + extraOnlineCount} users online, ${activeOnlineCount} active. Show who is online`} onClick={() => setOnlinePanelOpen((open) => !open)}>
            <div className="online-copy">
              <strong>Online now</strong>
              <span>{activeOnlineCount} active · {awayOnlineCount} away</span>
            </div>
            <div className="online-avatars">
              {onlineUsers.map((person) => {
                const presence = getPresenceStatus(person, currentUser);
                return (
                  <div
                    className={`online-avatar presence-${presence}`}
                    key={person.email}
                    title={`${person.name} — ${person.title || 'Team member'} — ${presence === 'active' ? 'Active now' : 'Away'}`}
                  >
                    {person.profilePhoto ? <img src={person.profilePhoto} alt={person.name} /> : <span>{getInitials(person.name)}</span>}
                  </div>
                );
              })}
              {extraOnlineCount > 0 && <div className="online-avatar more" title={`${extraOnlineCount} more online`}>+{extraOnlineCount}</div>}
            </div>
          </button>
          {onlinePanelOpen && (() => {
            const term = onlineSearch.trim().toLowerCase();
            const people = allOnlinePeople
              .map((person) => ({ ...person, presence: getPresenceStatus(person, currentUser) }))
              .filter((person) => !term || `${person.name} ${person.title || ''} ${person.email}`.toLowerCase().includes(term));
            const groups = [
              ['active', 'Active now', people.filter((person) => person.presence === 'active')],
              ['away', 'Away', people.filter((person) => person.presence !== 'active')],
            ];
            return (
              <div className="online-panel" role="dialog" aria-label="Who is online">
                <div className="online-panel-head">
                  <div>
                    <strong>Who's online</strong>
                    <span>{allOnlinePeople.length} people · {activeOnlineCount} active · {awayOnlineCount} away</span>
                  </div>
                  <button type="button" className="online-panel-close" onClick={() => setOnlinePanelOpen(false)} aria-label="Close"><X size={14} /></button>
                </div>
                <label className="online-panel-search">
                  <Search size={13} />
                  <input autoFocus value={onlineSearch} onChange={(event) => setOnlineSearch(event.target.value)} placeholder="Search people" aria-label="Search people online" />
                </label>
                <div className="online-panel-list">
                  {people.length === 0 && <p className="online-panel-empty">No one matches “{onlineSearch}”.</p>}
                  {groups.map(([key, label, members]) => members.length > 0 && (
                    <div key={key} className="online-panel-group">
                      <h4><i className={`presence-dot ${key}`} />{label} <em>{members.length}</em></h4>
                      {members.map((person) => (
                        <div key={person.email} className="online-panel-person" title={person.email}>
                          <div className={`online-avatar presence-${person.presence}`}>
                            {person.profilePhoto ? <img src={person.profilePhoto} alt="" /> : <span>{getInitials(person.name)}</span>}
                          </div>
                          <div className="online-panel-info">
                            <strong>{person.name}{person.email === currentUser?.email && <small> (you)</small>}</strong>
                            <span>{person.title || 'Team member'}</span>
                          </div>
                          <span className={`online-panel-status ${person.presence}`}>{person.presence === 'active' ? 'Active' : 'Away'}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          </div>
          <div className="profile" title={currentUser?.title}>
            <div className="profile-identity">
              <strong>{currentUser?.name}</strong>
              <small>{currentUser?.title}</small>
            </div>
            <span>{currentUser?.email === ADMIN_EMAIL ? 'Admin' : currentUser?.view}</span>
          </div>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button type="button" className="sign-out" onClick={handleLogout}><LogOut size={16} /> <span>Sign out</span></button>
        </div>
      </header>

      {!allowedPages.includes(activeNav) || (selectedDraft && !allowedPages.includes('Templates')) ? (
        <main className="admin-page"><div className="admin-empty">You don&apos;t have access to this page. Contact the administrator.</div></main>
      ) : activeNav === 'Admin' && !selectedDraft ? renderAdminPage() : selectedDraft ? renderDraftWorkspace() : activeNav === 'Templates' ? renderTemplatePage() : activeNav === 'History' ? renderHistoryPage() : activeNav === 'Team Calendar' ? (
        <TeamCalendar currentUser={currentUser} team={accessList.filter((person) => person.status === 'Allowed')} drafts={drafts} Select={CustomSelect} onOpenDraft={(draftId) => { const draft = drafts.find((item) => item.id === draftId); if (draft) navigateToDraft(draft); }} />
      ) : activeNav !== 'Log' && !allowedPages.includes('Log') ? (
        <main className="admin-page"><div className="admin-empty">{activeNav} is coming soon.</div></main>
      ) : (
        <main>
          <div className="page-intro">
            <span className="intro-label">New entry</span>
            <h1>Log a communication</h1>
            <p>Record the brand, document, error type, and full review chain for reporting.</p>
          </div>

          {submitted && <div className="success-banner"><span className="success-icon"><Check size={16} /></span><div><strong>Entry saved</strong><span>Your communication has been added to the review log.</span></div><button onClick={() => setSubmitted(false)} aria-label="Dismiss"><X size={17} /></button></div>}

          <form onSubmit={save}>
            <div className="top-sections">
              <section className="panel document-panel">
                <SectionHeader number="1" icon={FileText} title="Document" description="Brand and type of communication being reviewed." />
                <SelectField label="Brand" icon={Archive} value={form.brand} onChange={update('brand')} options={brands} placeholder="Select a brand..." />
                <SelectField label="Document type" value={form.documentType} onChange={update('documentType')} options={documentTypes} placeholder="Select a document type..." />
              </section>
              <section className="panel error-panel">
                <SectionHeader number="2" icon={AlertTriangle} title="Error" description="Category of issue identified." />
                <SelectField label="Error type" value={form.errorType} onChange={update('errorType')} options={errorTypes} placeholder="Select an error type..." />
              </section>
              <section className="panel review-panel">
                <SectionHeader number="3" icon={UsersRound} title="Review chain" description="Author and reviewers involved." />
                <SelectField label="Copywriter" icon={UserRound} value={form.copywriter} onChange={update('copywriter')} options={people} placeholder="Select copywriter..." />
                <div className="two-fields">
                  <SelectField label="Reviewer #1" icon={UsersRound} value={form.reviewerOne} onChange={update('reviewerOne')} options={people} placeholder="Select..." />
                  <SelectField label="Reviewer #2" icon={UsersRound} value={form.reviewerTwo} onChange={update('reviewerTwo')} options={people} placeholder="Select..." />
                </div>
                <SelectField label="Manager" value={form.manager} onChange={update('manager')} options={people} placeholder="Select manager..." />
              </section>
            </div>

            <section className="panel timeline-panel">
              <SectionHeader number="4" icon={CalendarDays} title="Timeline" description="When the request was submitted and the final review date." />
              <div className="two-fields timeline-fields">
                <label className="field"><span className="field-label">Request submitted <b>*</b></span><input type="date" value={form.requestSubmitted} onChange={update('requestSubmitted')} /><small>Date the request came in.</small></label>
                <label className="field"><span className="field-label">Final review date <b>*</b></span><input type="date" value={form.finalReviewDate} onChange={update('finalReviewDate')} /><small>Date the piece was finalized / signed off.</small></label>
              </div>
            </section>

            <section className="panel notes-panel">
              <div className="notes-heading"><h2>Notes & attachments</h2><p>Add context and attach the source email (.eml / .msg) or a screenshot so you can review it later.</p></div>
              <label className="notes-field"><span className="sr-only">Notes</span><textarea value={form.notes} onChange={update('notes')} placeholder="e.g. Ship name was misspelled in the third paragraph of the itinerary mod email." /></label>
              <div className="attachment-label"><span><Paperclip size={15} /> <strong>Attachments</strong> <b>*</b></span><small>At least 1 required · up to 5 files, 5 MB each. Emails (.eml, .msg) or images.</small></div>
              <input ref={fileInput} className="sr-only" type="file" multiple accept=".eml,.msg,.png,.jpg,.jpeg" onChange={onFiles} />
              <button type="button" className={`dropzone ${files.length ? 'has-files' : ''}`} onClick={() => fileInput.current?.click()}>
                <span className="paperclip-circle"><Paperclip size={18} /></span>
                {files.length ? <><strong>{files.length} file{files.length === 1 ? '' : 's'} selected</strong><span>{files.map((file) => file.name).join(', ')}</span></> : <><strong><u>Click to upload</u> or drag files here</strong><span>Screenshots (.png, .jpg) or email files (.eml, .msg)</span></>}
              </button>
              <div className="actions"><button type="button" className="button secondary" onClick={reset}><RotateCcw size={15} /> Reset</button><button type="submit" className="button primary"><Save size={15} /> Save entry</button></div>
            </section>
          </form>
        </main>
      )}
      {renderLockPrompt()}
      {renderHistoryHover()}
      {renderHistoryDetail()}
      <CalendarReminders currentUser={currentUser} />
      <footer><span>© 2026 Comms Hub</span><span>Designed by Rami Nassralla</span></footer>
    </div>
  );
}

export default App;