import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  BarChart3,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  ClipboardList,
  FileText,
  Flag,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  LifeBuoy,
  LogOut,
  MoonStar,
  Paperclip,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Strikethrough,
  SunMedium,
  Tag,
  Table2,
  Underline,
  Undo2,
  Redo2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';

const brands = ['Royal Caribbean', 'Celebrity Cruises', 'Silversea'];
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
  { name: 'Srakren Kremer', email: 'skremer@rccl.com', title: 'Assoc. Manager, Business Intelligence', role: 'Manager' },
  { name: 'Rami Nassralla', email: 'raminassralla@celebrity.com', title: 'Sr. Analyst, Business Intelligence', role: 'Manager' },
];

const people = directory
  .map((person) => person.name)
  .sort((a, b) => a.localeCompare(b));

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
    due: '5d 14h',
    updated: 'Sep 15, 2026',
    hours: { copywriter: '0.6h', reviewerOne: '1h', reviewerTwo: '0.5h', manager: '2h' },
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
    due: '2h 19m',
    updated: 'Sep 14, 2026',
    hours: { copywriter: '0h', reviewerOne: '0m', reviewerTwo: '0m', manager: '0h' },
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
    due: '2h 19m',
    updated: 'Sep 10, 2026',
    hours: { copywriter: '1h', reviewerOne: '0h', reviewerTwo: '0h', manager: '0h' },
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
    due: '4h 38m',
    updated: 'Sep 10, 2026',
    hours: { copywriter: '1h', reviewerOne: '0h', reviewerTwo: '0h', manager: '0h' },
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
    due: '2h 19m',
    updated: 'Sep 20, 2026',
    hours: { copywriter: '0h', reviewerOne: '0h', reviewerTwo: '0h', manager: '0h' },
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
    due: '1d 2h',
    updated: 'Sep 09, 2026',
    hours: { copywriter: '0h', reviewerOne: '0h', reviewerTwo: '0h', manager: '0h' },
  },
];

const initialHistoryRows = [
  { date: 'Sep 18, 2026, 10:01 AM', title: 'sdasdasd', brand: 'Silversea', type: 'Deployment', copywriter: '—', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 18, 2026, 10:01 AM', title: 'asdasdasd', brand: 'Celebrity Cruises', type: 'Talking Points', copywriter: 'Heidi McCord', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 18, 2026, 10:01 AM', title: 'Test', brand: 'Royal Caribbean', type: 'Itinerary Mod', copywriter: 'Colin Rourke', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 18, 2026, 10:01 AM', title: 'BAL', brand: 'Royal Caribbean', type: 'Talking Points', copywriter: 'Shirin Castro', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 14, 2026, 10:00 AM', title: 'test 2', brand: 'Celebrity', type: 'Talking Points', copywriter: 'Mateo Gomez', review1: 'Jennifer Navas', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'Grammar' },
  { date: 'Sep 14, 2026, 09:40 AM', title: 'air travel disruptions affecting the United Kingdom and London', brand: 'Celebrity', type: 'Talking Points', copywriter: 'Mateo Gomez', review1: 'Marilyn Robl', review2: 'Jen', review3: 'Bianca Lopez', manager: '—', status: 'Completed', total: '0h 36m', errors: 'Spelling' },
  { date: 'Sep 9, 2026, 10:31 AM', title: 'AN 09/14/26 Oversell', brand: 'Celebrity', type: 'Oversell', copywriter: '—', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 8, 2026, 04:49 PM', title: 'TEST ONE', brand: 'Silversea', type: 'Deployment', copywriter: '—', review1: '—', review2: '—', review3: '—', manager: '—', status: 'Deleted', total: '0', errors: 'None' },
  { date: 'Sep 8, 2026, 01:09 PM', title: 'TEST 1', brand: 'Celebrity', type: 'Itinerary Mod', copywriter: 'Heidi McCord', review1: 'Zoe Pendas', review2: 'Mateo Gomez', review3: 'Bianca Lopez', manager: '—', status: 'Completed', total: '1h 54m', errors: 'Grammar' },
  { date: 'Sep 4, 2026, 09:25 PM', title: 'SL: Anthem of the Seas: A Special Offer for You Cruise', brand: 'Royal Caribbean', type: 'Deployment', copywriter: 'Mateo Gomez', review1: 'Heidi McCord', review2: 'Erick Weidmann', review3: 'Nelson Frau', manager: '—', status: 'Completed', total: '0h 37m', errors: 'None' },
  { date: 'Sep 3, 2026, 04:51 PM', title: 'For Review: Your Royal Genie Package Experience Guest Copy', brand: 'Royal Caribbean', type: 'Deployment', copywriter: 'Shirin Castro', review1: 'Bianca Lopez', review2: 'Hiodette', review3: 'Bianca Lopez', manager: '—', status: 'Completed', total: '0h 55m', errors: 'Spelling • Grammar' },
];

function SelectField({ label, required = true, value, onChange, options, placeholder, icon: Icon, error }) {
  return (
    <label className="field">
      <span className="field-label">{Icon && <Icon size={15} strokeWidth={1.8} />}{label}{required && <b>*</b>}</span>
      <span className={`select-wrap ${error ? 'has-error' : ''}`}>
        <select value={value} onChange={onChange} aria-label={label}>
          <option value="">{placeholder}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
      {error && <span className="error-message">{error}</span>}
    </label>
  );
}

function CustomSelect({ value, onChange, options, disabled, placeholder = 'Unassigned' }) {
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
    <div ref={ref} className={`custom-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}>
      <button
        type="button"
        className="custom-select-button"
        onClick={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && !disabled && (
        <div className="custom-select-menu" role="listbox" aria-label="Select assignee">
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
            <span>Unassigned</span>
            {!value && <Check size={14} aria-hidden="true" />}
          </button>
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
              <span>{option}</span>
              {value === option && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ number, icon: Icon, title, description }) {
  return (
    <div className="section-header">
      <div className="eyebrow"><Icon size={16} /> <span>SECTION {number}</span></div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

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
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [drafts, setDrafts] = useState(templateDrafts);
  const [draftPage, setDraftPage] = useState(1);
  const [historyRows, setHistoryRows] = useState(initialHistoryRows);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeRibbonTab, setActiveRibbonTab] = useState('Message');
  const [showWordCount, setShowWordCount] = useState(false);
  const editorRef = useRef(null);
  const [newDraftOpen, setNewDraftOpen] = useState(false);
  const [newDraftForm, setNewDraftForm] = useState({
    title: '',
    brand: '',
    documentType: '',
    copywriter: '',
    reviewerOne: '',
    reviewerTwo: '',
    priority: 'Normal',
    dueDate: '',
    notes: '',
    screenshots: [],
  });
  const fileInput = useRef(null);

  useEffect(() => {
    localStorage.setItem('comms-hub-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!selectedDraft) {
      setElapsedSeconds(0);
      return undefined;
    }

    const currentStage = selectedDraft.currentStage || getDraftStage(selectedDraft);
    if (!selectedDraft.startedAt || currentStage !== 'Copywriter') {
      setElapsedSeconds(0);
      return undefined;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Number(selectedDraft.startedAt)) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [selectedDraft?.id, selectedDraft?.startedAt, selectedDraft?.currentStage]);

  const toggleTheme = () => setDarkMode((current) => !current);

  const handleLogin = (event) => {
    event.preventDefault();
    const normalizedEmail = login.email.trim().toLowerCase();
    if (normalizedEmail && normalizedEmail.includes('@')) {
      const matchedUser = directory.find((person) => person.email.toLowerCase() === normalizedEmail);
      setCurrentUser(matchedUser || {
        name: normalizedEmail.split('@')[0].replace(/[._-]+/g, ' '),
        email: normalizedEmail,
        title: 'External Communications',
        role: 'User',
      });
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLogin({ email: '', password: '' });
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
          <div className="login-card">
            <div className="login-header">
              <div className="brand-lockup login-brand">
                <div className="brand-mark"><Shield size={20} fill="currentColor" /></div>
                <div><strong>Comms Hub</strong><span>Quality assurance for communications</span></div>
              </div>
              <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                {darkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
                <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
              </button>
            </div>

            <div className="login-copy">
              <p className="intro-label">SECURE ACCESS</p>
              <h1>Sign in to GEM Analytics workspace</h1>
              <p>Use your work email to access communication quality reviews.</p>
            </div>

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
                  <span>Remember me</span>
                </label>
                <a href="#">Need help?</a>
              </div>

              <button type="submit" className="button primary login-button">Continue with work email</button>
              <div className="login-divider"><span>or</span></div>
              <button type="button" className="button secondary login-button">Use SSO (coming soon)</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const updateNewDraft = (key) => (event) => {
    setNewDraftForm((current) => ({ ...current, [key]: event.target.value }));
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
      copywriter: newDraftForm.copywriter || 'Unassigned',
      reviewerOne: newDraftForm.reviewerOne || 'Unassigned',
      reviewerTwo: newDraftForm.reviewerTwo || 'Unassigned',
      manager: 'Unassigned',
      due: newDraftForm.dueDate || 'No due date',
      documentType,
      priority: newDraftForm.priority,
      notes: newDraftForm.notes,
      screenshots: newDraftForm.screenshots,
      startedAt: timestamp.getTime(),
      updated: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      hours: { copywriter: '0h', reviewerOne: '0h', reviewerTwo: '0h', manager: '0h' },
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
    setSelectedDraft(newDraft);
    setElapsedSeconds(0);
    setDraftContent('');
    setDraftSaved(false);
    setNewDraftOpen(false);
    setNewDraftForm({
      title: '',
      brand: '',
      documentType: '',
      copywriter: '',
      reviewerOne: '',
      reviewerTwo: '',
      priority: 'Normal',
      dueDate: '',
      notes: '',
      screenshots: [],
    });
  };

  const onDraftScreenshots = (event) => {
    setNewDraftForm((current) => ({
      ...current,
      screenshots: Array.from(event.target.files || []).slice(0, 4),
    }));
  };

  const saveDraftContent = () => {
    setDraftSaved(true);
  };

  const formatElapsed = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (days > 0) return `${days}d ${String(hours % 24).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`;
    if (minutes > 0) return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
    return `${remainingSeconds}s`;
  };

  const updateDraftField = (field) => (event) => {
    if (!selectedDraft) return;
    const updatedDraft = { ...selectedDraft, [field]: event.target.value };
    setSelectedDraft(updatedDraft);
    setDrafts((current) => current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft));
  };

  const updateAssignment = (field) => (event) => {
    if (!selectedDraft) return;
    const updatedDraft = { ...selectedDraft, [field]: event.target.value };
    setSelectedDraft(updatedDraft);
    setDrafts((current) => current.map((draft) => draft.id === updatedDraft.id ? updatedDraft : draft));
  };

  const getDraftStage = (draft) => {
    if (draft.currentStage) return draft.currentStage;
    if (draft.type === 'Manager') return 'Manager';
    if (draft.type === 'Review 2') return 'Review 2';
    if (draft.type === 'Proofing') return 'Review 1';
    return 'Copywriter';
  };

  const openDraft = (draft) => {
    const stage = getDraftStage(draft);
    const startedAt = Number(draft.startedAt) || Date.now();
    const openedDraft = { ...draft, startedAt, currentStage: stage };
    setSelectedDraft(openedDraft);
    setDrafts((current) => current.map((item) => item.id === openedDraft.id ? openedDraft : item));
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    setDraftContent(draft.content || '');
    setDraftSaved(false);
    setActiveRibbonTab(stage === 'Copywriter' ? 'Message' : 'Format text');
  };

  const formatEditor = (command, value = null) => {
    if (!editorRef.current || selectedDraft?.status === 'Review 1') return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setDraftContent(editorRef.current.innerText);
    setDraftSaved(false);
  };

  const insertEditorContent = (content) => {
    if (!editorRef.current || selectedDraft?.status === 'Review 1') return;
    editorRef.current.focus();
    document.execCommand('insertText', false, content);
    setDraftContent(editorRef.current.innerText);
    setDraftSaved(false);
  };

  const submitDraftContent = () => {
    if (!draftContent.trim() || !selectedDraft) return;
    const lockedDraft = { ...selectedDraft, status: 'Review 1', type: 'Review 1', currentStage: 'Review 1', content: draftContent };
    setSelectedDraft(lockedDraft);
    setDrafts((current) => current.map((draft) => draft.id === lockedDraft.id ? lockedDraft : draft));
    setHistoryRows((current) => [{
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
      title: lockedDraft.title,
      brand: lockedDraft.brand,
      type: lockedDraft.documentType,
      copywriter: lockedDraft.copywriter,
      review1: lockedDraft.reviewerOne,
      review2: lockedDraft.reviewerTwo,
      review3: '—',
      manager: lockedDraft.manager,
      status: 'Submitted',
      total: lockedDraft.hours.copywriter,
      errors: 'None',
    }, ...current]);
  };

  const renderDraftWorkspace = () => {
    if (!selectedDraft) return null;
    const currentStage = getDraftStage(selectedDraft);
    const isLocked = currentStage !== 'Copywriter';
    const stageOwner = currentStage === 'Copywriter'
      ? selectedDraft.copywriter
      : currentStage === 'Review 1'
        ? selectedDraft.reviewerOne
        : currentStage === 'Review 2'
          ? selectedDraft.reviewerTwo
          : selectedDraft.manager;

    return (
      <div className="draft-workspace">
        <div className="workspace-topline">
          <button type="button" className="back-link" onClick={() => setSelectedDraft(null)}>← Back to drafts</button>
          <span className="stage-badge">Current stage: {currentStage}</span>
        </div>

        <div className="workspace-heading">
          <div>
            <span className="editorial-label">DRAFT</span>
            <h1>{selectedDraft.title}</h1>
            <div className="workspace-meta">
              <span className="meta-chip"><Building2 size={12} /> {selectedDraft.brand}</span>
              <span className="meta-chip"><Tag size={12} /> {selectedDraft.documentType}</span>
              <span className="meta-chip"><CalendarDays size={12} /> Updated {selectedDraft.updated}</span>
              <label className="meta-chip priority-chip">
                <Flag size={12} />
                <select
                  className="priority-select"
                  value={selectedDraft.priority || 'Normal'}
                  onChange={updateDraftField('priority')}
                  aria-label="Change draft priority"
                >
                  {['Urgent', 'High', 'Normal'].map((priority) => <option key={priority} value={priority}>{priority} priority</option>)}
                </select>
              </label>
              <span className="timer-chip"><Clock3 size={13} /><span><small>ELAPSED</small><strong>{formatElapsed(elapsedSeconds)}</strong></span></span>
            </div>
          </div>
        </div>

        <section className="assignment-panel">
          <div className="assignment-heading">
            <span><UsersRound size={15} /> ASSIGNMENTS &amp; TIMING</span>
            <span className="assignment-helper">Manager is chosen after the final review stage is approved</span>
          </div>
          <div className="assignment-grid">
            <div className="assignment-card copywriter-assignment">
              <small>COPYWRITER</small>
              <CustomSelect value={selectedDraft.copywriter} disabled={isLocked} options={people} onChange={updateAssignment('copywriter')} />
              <span>{isLocked ? 'Submitted original draft' : 'Writing original draft'}</span>
              <b>{isLocked ? 'LOCKED' : formatElapsed(elapsedSeconds)}</b>
            </div>
            <div className="assignment-card review-assignment">
              <small>REVIEW 1</small>
              <CustomSelect value={selectedDraft.reviewerOne} disabled={isLocked} options={people} onChange={updateAssignment('reviewerOne')} />
              <span>Assigned reviewer</span>
              <b>PENDING</b>
            </div>
            <div className="assignment-card review-assignment">
              <small>REVIEW 2</small>
              <CustomSelect value={selectedDraft.reviewerTwo} disabled={isLocked} options={people} onChange={updateAssignment('reviewerTwo')} />
              <span>Assigned reviewer</span>
              <b>PENDING</b>
            </div>
            <div className="assignment-card manager-assignment">
              <small>MANAGER</small>
              <strong>To be assigned</strong>
              <span>After Review 2 approves</span>
              <b>PENDING</b>
            </div>
          </div>
        </section>

        <div className="workflow-steps">
          <span className="active">✎ Copywriter · {selectedDraft.copywriter || 'Unassigned'}</span>
          <span>→ Review 1 · {selectedDraft.reviewerOne || 'Unassigned'}</span>
          <span>→ Review 2 · {selectedDraft.reviewerTwo || 'Unassigned'}</span>
          <span>→ Manager · TBD</span>
        </div>

        <section className="reference-panel">
          <div className="workspace-section-title"><Sparkles size={15} /><div><strong>Reference brief</strong><span>Notes and screenshots from whoever created the draft. Use these to guide your writing.</span></div></div>
          <label className="reference-notes">NOTES<textarea value={selectedDraft.notes || 'No additional notes provided.'} readOnly /></label>
          {selectedDraft.screenshots?.length > 0 && <div className="reference-files">{selectedDraft.screenshots.map((file) => <span key={file.name}><Paperclip size={12} /> {file.name}</span>)}</div>}
        </section>

        <section className="write-panel">
          <div className="write-panel-header">
            <div className="workspace-section-title"><PenLine size={15} /><div><strong>{currentStage === 'Copywriter' ? 'Write the original draft' : `${currentStage} review`}</strong><span>{currentStage === 'Copywriter' ? `Use the editor to format your email exactly how you would send it. When you submit, the draft is locked forever and moves to ${selectedDraft.reviewerOne}.` : `This draft is currently at the ${currentStage} step. The assigned owner is ${stageOwner || 'unassigned'}.`}</span></div></div>
            <button type="button" className="split-view-button">▣ Split view</button>
          </div>
          <label className="draft-form-field draft-content-field">
            <span>Draft content <b>*</b></span>
            <div className={`email-editor ${isLocked ? 'locked' : ''}`}>
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
              <div
                ref={editorRef}
                className="email-editor-body"
                contentEditable={!isLocked}
                suppressContentEditableWarning
                data-placeholder="Write the original email here..."
                onInput={(event) => { setDraftContent(event.currentTarget.innerText); setDraftSaved(false); }}
              />
            </div>
          </label>
          <div className="content-footer">
            <span>{draftContent.length} characters{showWordCount ? ` · ${draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0} words` : ''}{draftSaved ? ' · Saved' : ''}</span>
            <div><button type="button" className="button secondary" disabled={isLocked} onClick={saveDraftContent}><Save size={14} /> Save draft</button><button type="button" className="button primary" disabled={isLocked || !draftContent.trim()} onClick={submitDraftContent}><Check size={14} /> Submit &amp; lock</button></div>
          </div>
        </section>
      </div>
    );
  };

  const renderTemplatePage = () => (
    <div className="template-page">
      <div className="template-header-row">
        <div>
          <div className="editorial-label">EDITORIAL WORKFLOW</div>
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
          <input type="text" placeholder="Search by title, brand, doc type, or assignee" aria-label="Search drafts" />
        </div>
        <div className="toolbar-actions">
          <button type="button" className="toolbar-button"><span>Recently updated</span><ChevronDown size={14} /></button>
          <button type="button" className="toolbar-button" onClick={() => setFilterPanelOpen((current) => !current)}><SlidersHorizontal size={14} /><span>Filters</span></button>
        </div>
      </div>

      {filterPanelOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <div className="filter-box">
              <div className="filter-header"><PenLine className="filter-icon" size={12} /> Stage</div>
              <div className="filter-selected">All stages <ChevronDown size={14} /></div>
              <div className="filter-options">
                <label><input type="checkbox" defaultChecked /> Copywriter</label>
                <label><input type="checkbox" defaultChecked /> Review 1</label>
                <label><input type="checkbox" defaultChecked /> Review 2</label>
                <label><input type="checkbox" defaultChecked /> Review 3</label>
                <label><input type="checkbox" defaultChecked /> Manager</label>
                <label><input type="checkbox" /> Completed</label>
              </div>
            </div>

            <div className="filter-box">
              <div className="filter-header"><Building2 className="filter-icon" size={12} /> Brand</div>
              <div className="filter-selected">All brands <ChevronDown size={14} /></div>
            </div>

            <div className="filter-box">
              <div className="filter-header"><Tag className="filter-icon" size={12} /> Document type</div>
              <div className="filter-selected">All types <ChevronDown size={14} /></div>
            </div>

            <div className="filter-box">
              <div className="filter-header"><UserRound className="filter-icon" size={12} /> Assignee</div>
              <div className="filter-selected">Anyone <ChevronDown size={14} /></div>
            </div>
          </div>
          <div className="range-row">
            <div className="filter-box small-box">
              <div className="filter-header"><CalendarDays className="filter-icon" size={12} /> Updated from</div>
              <div className="date-box">mm/dd/yyyy</div>
            </div>
            <div className="filter-box small-box">
              <div className="filter-header"><CalendarDays className="filter-icon" size={12} /> Updated to</div>
              <div className="date-box">mm/dd/yyyy</div>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const draftsPerPage = 6;
        const pageCount = Math.max(1, Math.ceil(drafts.length / draftsPerPage));
        const visibleDrafts = drafts.slice((draftPage - 1) * draftsPerPage, draftPage * draftsPerPage);
        const firstDraft = drafts.length ? (draftPage - 1) * draftsPerPage + 1 : 0;
        const lastDraft = Math.min(draftPage * draftsPerPage, drafts.length);

        return (
          <>
      <div className="results-meta">Showing {firstDraft}-{lastDraft} of {drafts.length} drafts (max 6 per page)</div>

      <div className="draft-grid">
        {visibleDrafts.map((draft) => (
          <article key={draft.id} className="draft-card">
            <div className="draft-card-header">
              <div className="draft-left-meta">
                <span className="draft-brand"><FileText size={12} /> {draft.brand}</span>
                <span className="draft-title">{draft.title}</span>
              </div>
              <span className={`status-pill ${draft.typeTone}`}>{draft.type}</span>
            </div>

            <div className="draft-card-body">
              <div className="line-item">
                <span className="label">Copywriter:</span>
                <span className="value">{draft.copywriter}</span>
                <span className="time">{draft.hours.copywriter}</span>
              </div>
              <div className="line-item">
                <span className="label">Review 1:</span>
                <span className="value">{draft.reviewerOne}</span>
                <span className="time">{draft.hours.reviewerOne}</span>
              </div>
              <div className="line-item">
                <span className="label">Review 2:</span>
                <span className="value">{draft.reviewerTwo}</span>
                <span className="time">{draft.hours.reviewerTwo}</span>
              </div>
              <div className="line-item">
                <span className="label">Manager:</span>
                <span className="value">{draft.manager}</span>
                <span className="time">{draft.hours.manager}</span>
              </div>
            </div>

            <div className="draft-card-footer">
              <div className="draft-card-aux">
                <div className="meta-row"><span className={`dot ${draft.statusTone}`} /> <span>Updated {draft.updated}</span></div>
                <div className="meta-row"><span className="tiny-label">Due</span> {draft.due}</div>
              </div>
              <button type="button" className="open-button" onClick={() => openDraft(draft)}>Open</button>
            </div>
          </article>
        ))}
      </div>

      <div className="history-mini-panel">
        <div className="history-mini-header">
          <div>
            <span className="editorial-label">ACTIVITY</span>
            <h2>Recent draft history</h2>
          </div>
          <span className="history-badge">{historyRows.length} entries</span>
        </div>

        <div className="history-mini-list">
          {historyRows.slice(0, 6).map((entry, index) => (
            <div key={`${entry.title}-${index}`} className="history-mini-row">
              <div className="history-mini-time">{entry.date}</div>
              <div className="history-mini-text">
                <strong>{entry.title}</strong>
                <span>{entry.brand} • {entry.type}</span>
              </div>
              <span className={`history-mini-status ${entry.status === 'Active' ? 'active' : 'complete'}`}>{entry.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pagination">
        <span>Showing {firstDraft}-{lastDraft} of {drafts.length} drafts</span>
        <div className="page-numbers">
          <button type="button" className="page-button" disabled={draftPage === 1} onClick={() => setDraftPage((page) => Math.max(1, page - 1))} aria-label="Previous page">‹</button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
            <button type="button" key={page} className={`page-button ${draftPage === page ? 'active' : ''}`} onClick={() => setDraftPage(page)}>{page}</button>
          ))}
          <button type="button" className="page-button" disabled={draftPage === pageCount} onClick={() => setDraftPage((page) => Math.min(pageCount, page + 1))} aria-label="Next page">›</button>
        </div>
      </div>
          </>
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
                  <p>Pick the copywriter and both reviewers. The manager will be assigned later, after Review 2 approves.</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setNewDraftOpen(false)} aria-label="Close new draft form"><X size={17} /></button>
            </div>

            <form className="draft-form" onSubmit={addDraft}>
              <label className="draft-form-field full-width">
                <span>Title <b>*</b></span>
                <input autoFocus required value={newDraftForm.title} onChange={updateNewDraft('title')} placeholder="e.g. Fall Deployment Announcement" />
              </label>

              <div className="draft-form-grid">
                <label className="draft-form-field">
                  <span>Brand <b>*</b></span>
                  <select required value={newDraftForm.brand} onChange={updateNewDraft('brand')}>
                    <option value="">Select brand</option>
                    {brands.map((brand) => <option key={brand}>{brand}</option>)}
                  </select>
                </label>
                <label className="draft-form-field">
                  <span>Document type <b>*</b></span>
                  <select required value={newDraftForm.documentType} onChange={updateNewDraft('documentType')}>
                    <option value="">Select document type</option>
                    {['Deployment', 'Talking Points', 'Itinerary Mod', 'Oversell', 'Email'].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
              </div>

              <label className="draft-form-field full-width">
                <span>Copywriter (writes the original draft) <b>*</b></span>
                <select required value={newDraftForm.copywriter} onChange={updateNewDraft('copywriter')}>
                  <option value="">Select copywriter</option>
                  {people.map((person) => <option key={person}>{person}</option>)}
                </select>
              </label>

              <div className="draft-form-grid">
                <label className="draft-form-field">
                  <span>Review 1 assignee <b>*</b></span>
                  <select required value={newDraftForm.reviewerOne} onChange={updateNewDraft('reviewerOne')}>
                    <option value="">Assign Review 1</option>
                    {people.map((person) => <option key={person}>{person}</option>)}
                  </select>
                </label>
                <label className="draft-form-field">
                  <span>Review 2 assignee <b>*</b></span>
                  <select required value={newDraftForm.reviewerTwo} onChange={updateNewDraft('reviewerTwo')}>
                    <option value="">Assign Review 2</option>
                    {people.map((person) => <option key={person}>{person}</option>)}
                  </select>
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

              <label className="draft-form-field full-width">
                <span>Date due <small>optional — when this draft needs to be finished</small></span>
                <input type="date" value={newDraftForm.dueDate} onChange={updateNewDraft('dueDate')} />
              </label>

              <label className="draft-form-field full-width">
                <span>Notes for the copywriter <small>optional — briefing, tone, or anything the writer should keep in mind</small></span>
                <textarea value={newDraftForm.notes} onChange={updateNewDraft('notes')} placeholder="Type notes here..." />
              </label>

              <label className="draft-form-field full-width">
                <span>Reference screenshots <small>optional — attach images so the copywriter can see what to do</small></span>
                <input className="sr-only" type="file" id="draft-screenshots" accept=".png,.jpg,.jpeg,.gif,.webp" multiple onChange={onDraftScreenshots} />
                <label className="draft-upload" htmlFor="draft-screenshots">
                  <Paperclip size={20} />
                  <strong>{newDraftForm.screenshots.length ? `${newDraftForm.screenshots.length} screenshot${newDraftForm.screenshots.length > 1 ? 's' : ''} selected` : 'Click to upload or drag & drop screenshots here'}</strong>
                  <small>PNG, JPG, GIF, or WebP • up to 4 MB each</small>
                </label>
              </label>

              <div className="draft-modal-actions">
                <button type="button" className="button secondary" onClick={() => setNewDraftOpen(false)}>Cancel</button>
                <button type="submit" className="button primary"><Plus size={15} /> Create draft</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistoryPage = () => (
    <div className="history-page">
      <div className="history-header-row">
        <div className="history-title-wrap">
          <div className="history-history-icon"><ClipboardList size={16} /></div>
          <div>
            <div className="editorial-label">HISTORY</div>
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
            {historyRows.map((row, index) => (
              <tr key={`${row.title}-${index}`}>
                <td>{row.date}</td>
                <td><span className="table-title">{row.title}</span></td>
                <td><span className="pill brand-pill">{row.brand}</span></td>
                <td><span className="pill type-pill">{row.type}</span></td>
                <td>{row.copywriter}</td>
                <td>{row.review1}</td>
                <td>{row.review2}</td>
                <td>{row.review3}</td>
                <td>{row.manager}</td>
                <td><span className={`status-text ${row.status === 'Completed' ? 'completed' : 'deleted'}`}>
                  {row.status}
                </span></td>
                <td>{row.total}</td>
                <td>{row.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer-note">Tip: right-click any row to change its status — Completed drafts can be flooded to Deleted, and Deleted drafts can be restored back to Completed. Nothing is ever lost.</div>
    </div>
  );

  const navigationItems = currentUser?.role === 'Manager'
    ? [
      ['Log', PenLine],
      ['History', ClipboardList],
      ['Dashboard', BarChart3],
      ['Team Calendar', CalendarDays],
      ['Templates', FileText],
      ['My Stats', UserRound],
    ]
    : [
      ['Log', PenLine],
      ['History', ClipboardList],
      ['My Stats', UserRound],
    ];

  return (
    <div className={`app-shell ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Shield size={20} fill="currentColor" /></div>
          <div><strong>Comms Hub</strong><span>Quality assurance for communications</span></div>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigationItems.map(([name, Icon]) => (
            <button key={name} className={activeNav === name ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav(name)}>
              <Icon size={16} /> <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="profile-area">
          <div className="profile" title={currentUser?.title}>
            <div className="profile-identity">
              <strong>{currentUser?.name}</strong>
              <small>{currentUser?.title}</small>
            </div>
            <span>{currentUser?.role?.toUpperCase()}</span>
          </div>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button type="button" className="sign-out" onClick={handleLogout}><LogOut size={16} /> <span>Sign out</span></button>
        </div>
      </header>

      {selectedDraft ? renderDraftWorkspace() : activeNav === 'Templates' && currentUser?.role === 'Manager' ? renderTemplatePage() : activeNav === 'History' ? renderHistoryPage() : (
        <main>
          <div className="page-intro">
            <span className="intro-label">NEW ENTRY</span>
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
      <footer><span>© 2026 Comms Hub</span><span>Designed by Rami Nassralla</span></footer>
    </div>
  );
}

export default App;