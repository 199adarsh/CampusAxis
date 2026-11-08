import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Shield01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  Loading03Icon,
  UserIcon,
  EyeIcon,
  ArrowRight01Icon,
  Logout01Icon,
  LockIcon
} from 'hugeicons-react';
import {
  sanitizeString,
  detectSecurityThreats,
  validatePrn,
  validateDob,
  validateFacultyId,
  timingSafeEqual,
  enforceConstantTimeDelay,
  rateLimiter,
  getSafeErrorMessage
} from '../../lib/auth-security';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const FACULTY_LIST = [
  { id: 'DRP@Eduvault', name: 'D R Patil', dept: 'AI & Data Science' },
  { id: 'HPM@Eduvault', name: 'H P Magdum', dept: 'AI & Data Science' },
  { id: 'TIB@Eduvault', name: 'T I Bagban', dept: 'AI & Data Science' },
  { id: 'PMM@Eduvault', name: 'P M Mathpati', dept: 'AI & Data Science' }
];




export default function CampusAuthSwapForm({ onAuthSuccess, className = '' }) {
  const navigate = useNavigate();

  // Mode: true for Student, false for Faculty
  const [isStudentMode, setIsStudentMode] = useState(true);

  // Student Form State
  const [prn, setPrn] = useState(() => {
    try {
      const saved = localStorage.getItem('eduvault_saved_creds');
      if (saved) {
        const decoded = JSON.parse(atob(saved));
        return decoded?.prn || '';
      }
    } catch { }
    return '';
  });

  const [dob, setDob] = useState(() => {
    try {
      const saved = localStorage.getItem('eduvault_saved_creds');
      if (saved) {
        const decoded = JSON.parse(atob(saved));
        return decoded?.dob || '';
      }
    } catch { }
    return '';
  });

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('eduvault_save_creds') === 'true';
  });

  const [showDob, setShowDob] = useState(false);

  // Faculty Form State
  const [facultyId, setFacultyId] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [showFacultyPassword, setShowFacultyPassword] = useState(false);

  // Existing Session State
  const [activeSession, setActiveSession] = useState(null);

  // Status & Progress State
  const [status, setStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const [syncStep, setSyncStep] = useState(1);
  const [syncStage, setSyncStage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [threatWarning, setThreatWarning] = useState('');

  // Rate Limiting & Cooldown
  const [lockoutSec, setLockoutSec] = useState(0);

  // Check rate limit status on mount and countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const lock = rateLimiter.getLockoutStatus();
      setLockoutSec(lock.isLocked ? lock.remainingSeconds : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check existing session
  const checkActiveSession = () => {
    try {
      const savedProfile = localStorage.getItem('eduvault_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.name && parsed?.prn) {
          setActiveSession(parsed);
          return;
        }
      }
    } catch { }
    setActiveSession(null);
  };

  useEffect(() => {
    checkActiveSession();
    const handleAuthChange = () => checkActiveSession();
    window.addEventListener('eduvault-auth-change', handleAuthChange);
    return () => window.removeEventListener('eduvault-auth-change', handleAuthChange);
  }, []);

  // Real-time threat detection on input change
  const handlePrnChange = (val) => {
    const threat = detectSecurityThreats(val);
    if (threat.isMalicious) {
      setThreatWarning(`Prohibited pattern blocked (${threat.threatType})`);
    } else {
      setThreatWarning('');
    }
    setPrn(val.replace(/\s+/g, '').slice(0, 25));
    if (errorMessage) setErrorMessage('');
  };

  const handleDobChange = (val) => {
    const threat = detectSecurityThreats(val);
    if (threat.isMalicious) {
      setThreatWarning(`Prohibited pattern blocked (${threat.threatType})`);
    } else {
      setThreatWarning('');
    }
    setDob(val.replace(/\s+/g, '').slice(0, 10));
    if (errorMessage) setErrorMessage('');
  };

  const handleFacultyIdChange = (val) => {
    const threat = detectSecurityThreats(val);
    if (threat.isMalicious) {
      setThreatWarning(`Prohibited pattern blocked (${threat.threatType})`);
    } else {
      setThreatWarning('');
    }
    setFacultyId(val.replace(/\s+/g, '').slice(0, 32));
    if (errorMessage) setErrorMessage('');
  };

  const handleFacultyPasswordChange = (val) => {
    setFacultyPassword(val.slice(0, 64));
    if (errorMessage) setErrorMessage('');
  };

  // Quick Demo Filler
  const fillStudentDemo = () => {
    setPrn('24uad019');
    setDob('15-08-2005');
    setErrorMessage('');
    setThreatWarning('');
  };

  const fillFacultyDemo = (acc) => {
    setFacultyId(acc.id);
    setFacultyPassword(acc.pass);
    setErrorMessage('');
    setThreatWarning('');
  };

  // Student Login Handler
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (status === 'syncing') return;

    // 1. Rate Limiting Check
    const lock = rateLimiter.getLockoutStatus();
    if (lock.isLocked) {
      setErrorMessage(`Too many failed attempts. Please wait ${lock.remainingSeconds}s before trying again.`);
      return;
    }

    // 2. Input Sanitization & Threat Check
    const cleanPrn = sanitizeString(prn, 25);
    const cleanDob = sanitizeString(dob, 10);

    const prnThreat = detectSecurityThreats(cleanPrn);
    const dobThreat = detectSecurityThreats(cleanDob);
    if (prnThreat.isMalicious || dobThreat.isMalicious) {
      rateLimiter.recordFailure();
      setErrorMessage('Security Alert: Malicious injection attempt detected and logged.');
      return;
    }

    // 3. Validation Format & Bounds
    const prnCheck = validatePrn(cleanPrn);
    if (!prnCheck.valid) {
      setErrorMessage(prnCheck.error);
      return;
    }

    const dobCheck = validateDob(cleanDob);
    if (!dobCheck.valid) {
      setErrorMessage(dobCheck.error);
      return;
    }

    // 4. Begin Authentication Workflow
    const startTime = performance.now();
    setStatus('syncing');
    setSyncStep(1);
    setSyncStage('Verifying university portal credentials...');
    setErrorMessage('');

    try {
      let studentProfile = null;
      let studentSubjects = [];

      // Check if user is using mock student credentials
      const isMockDemo = cleanPrn.toLowerCase() === '24uad019' && cleanDob === '15-08-2005';

      let portalSuccess = false;

      // Attempt live portal scrape first

      setSyncStep(2);
      setSyncStage('Connecting to DKTE examination portal...');
      const portalRes = await axios.post(`${API_BASE}/portal/dashboard`, {
        prn: cleanPrn,
        dob: cleanDob
      }, { timeout: 8000 });

      if (portalRes.data) {
        studentProfile = {
          ...(portalRes.data.profile || {}),
          prn: cleanPrn,
          dob: cleanDob,
          role: 'student'
        };
        studentSubjects = portalRes.data.subjects || [];
        portalSuccess = true;
      }


      if (!portalSuccess || !studentProfile) {
        throw new Error('Invalid credentials');
      }

      setSyncStep(3);
      setSyncStage('Synchronizing courses, attendance, and CIE marks...');

      // Enforce constant-time timing delay to prevent user enumeration
      await enforceConstantTimeDelay(startTime, 600);

      // Persist session
      localStorage.setItem('eduvault_user_role', 'student');
      localStorage.setItem('eduvault_profile', JSON.stringify(studentProfile));
      localStorage.setItem('eduvault_subjects', JSON.stringify(studentSubjects));
      localStorage.setItem('eduvault_last_synced', Date.now().toString());

      if (rememberMe) {
        localStorage.setItem('eduvault_saved_creds', btoa(JSON.stringify({ prn: cleanPrn, dob: cleanDob })));
        localStorage.setItem('eduvault_save_creds', 'true');
      } else {
        localStorage.removeItem('eduvault_saved_creds');
        localStorage.setItem('eduvault_save_creds', 'false');
      }

      rateLimiter.recordSuccess();
      window.dispatchEvent(new Event('eduvault-auth-change'));

      setStatus('success');
      setSyncStage('Welcome back! Redirecting to dashboard...');

      if (onAuthSuccess) {
        onAuthSuccess(studentProfile);
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 700);

    } catch (err) {
      await enforceConstantTimeDelay(startTime, 500);
      const lockStatus = rateLimiter.recordFailure();
      setStatus('error');
      const safeMsg = getSafeErrorMessage(err, 'Invalid PRN or Date of Birth. Please check your credentials or use the demo account.');
      setErrorMessage(lockStatus.isLocked ? `Too many failed attempts. Locked for ${lockStatus.remainingSeconds}s.` : safeMsg);
    }
  };

  // Faculty Login Handler
  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (status === 'syncing') return;

    // 1. Rate Limiting Check
    const lock = rateLimiter.getLockoutStatus();
    if (lock.isLocked) {
      setErrorMessage(`Too many failed attempts. Please wait ${lock.remainingSeconds}s before trying again.`);
      return;
    }

    // 2. Input Sanitization & Threat Check
    const cleanId = sanitizeString(facultyId, 32);
    const cleanPass = facultyPassword.slice(0, 64);

    const idThreat = detectSecurityThreats(cleanId);
    if (idThreat.isMalicious) {
      rateLimiter.recordFailure();
      setErrorMessage('Security Alert: Malicious injection attempt detected.');
      return;
    }

    // 3. Format Validation
    const idCheck = validateFacultyId(cleanId);
    if (!idCheck.valid) {
      setErrorMessage(idCheck.error);
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Faculty password is required.');
      return;
    }

    const startTime = performance.now();
    setStatus('syncing');
    setSyncStep(1);
    setSyncStage('Authenticating faculty credentials...');
    setErrorMessage('');

    try {
      // Timing-safe account lookup
      let matchedAccount = null;
      for (const acc of TEACHER_ACCOUNTS) {
        const idMatches = timingSafeEqual(acc.id.toLowerCase(), cleanId.toLowerCase());
        const passMatches = timingSafeEqual(acc.pass, cleanPass);
        if (idMatches && passMatches) {
          matchedAccount = acc;
        }
      }

      // Enforce uniform timing defense
      await enforceConstantTimeDelay(startTime, 550);

      if (!matchedAccount) {
        throw new Error('Invalid credentials');
      }

      setSyncStep(2);
      setSyncStage(`Setting up faculty workspace for Prof. ${matchedAccount.name}...`);

      const teacherProfile = {
        name: matchedAccount.name,
        prn: matchedAccount.id,
        dob: 'TEACHER',
        department: matchedAccount.dept,
        role: 'teacher'
      };

      // Store in localStorage
      localStorage.setItem('eduvault_user_role', 'teacher');
      localStorage.setItem('eduvault_teacher_id', matchedAccount.id);
      localStorage.setItem('eduvault_teacher_name', matchedAccount.name);
      localStorage.setItem('eduvault_profile', JSON.stringify(teacherProfile));
      localStorage.setItem('eduvault_subjects', JSON.stringify([]));

      try {
        await axios.post(`${API_BASE}/profile`, teacherProfile);
      } catch (backendErr) {
        console.warn('Backend profile sync skipped:', backendErr);
      }

      rateLimiter.recordSuccess();
      window.dispatchEvent(new Event('eduvault-auth-change'));

      setStatus('success');
      setSyncStage(`Welcome, Prof. ${matchedAccount.name}! Loading dashboard...`);

      if (onAuthSuccess) {
        onAuthSuccess(teacherProfile);
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 700);

    } catch (err) {
      await enforceConstantTimeDelay(startTime, 500);
      const lockStatus = rateLimiter.recordFailure();
      setStatus('error');
      setErrorMessage(lockStatus.isLocked ? `Too many failed attempts. Locked for ${lockStatus.remainingSeconds}s.` : 'Invalid Faculty ID or Password.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setActiveSession(null);
    setStatus('idle');
    setErrorMessage('');
    window.dispatchEvent(new Event('eduvault-auth-change'));
  };

  // Watermelon Transition Variants
  const cardVariants = {
    initial: {
      opacity: 0,
      y: -24,
      scale: 0.98,
      filter: 'blur(4px)'
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)'
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.98,
      filter: 'blur(4px)'
    }
  };

  // If already logged in, show the active session card
  if (activeSession) {
    return (
      <div className={`w-full max-w-md bg-[#F6F5FA] dark:bg-zinc-900 shadow-2xl rounded-[32px] overflow-hidden border border-[#E6E6EF] dark:border-zinc-800 ${className}`}>
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-950 rounded-[28px] border-b border-[#E6E6EF] dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {activeSession.name?.charAt(0) || 'U'}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                {activeSession.role === 'teacher' ? 'Faculty Active' : 'Student Active'}
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{activeSession.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{activeSession.prn} · {activeSession.department || 'CampusAxis'}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            You are securely authenticated. Your attendance records, courses, and syllabus are synchronized.
          </p>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md text-sm cursor-pointer"
          >
            <span>Open Dashboard</span>
            <ArrowRight01Icon size={16} />
          </button>
        </div>

        <div className="bg-[#F6F5FA] dark:bg-zinc-900 py-3.5 px-6 flex items-center justify-between text-xs">
          <span className="text-slate-500">Need to switch account?</span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
          >
            <Logout01Icon size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isStudentMode ? 'student-auth' : 'faculty-auth'}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ ease: 'easeOut', duration: 0.28 }}
          className="w-full bg-[#F6F5FA] dark:bg-zinc-900 shadow-[0_12px_32px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden border border-[#E6E6EF] dark:border-zinc-800 transition-colors"
        >
          {/* Main Top Card */}
          <div className="p-6 sm:p-8 pb-7 bg-white dark:bg-zinc-950 rounded-[28px] border-b border-[#E6E6EF] dark:border-zinc-800 transition-colors">

            {/* Header with Mode Badge */}
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${isStudentMode
                ? 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900'
                }`}>
                <Shield01Icon size={13} />
                {isStudentMode ? 'Student Portal' : 'Faculty Access'}
              </span>

              {lockoutSec > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <LockIcon size={12} /> {lockoutSec}s lock
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              {isStudentMode ? 'Student Sign In' : 'Faculty Sign In'}
            </h2>

            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 mb-5">
              {isStudentMode
                ? 'Sync your attendance, CIE marks, and timetable live from the college ERP.'
                : 'Access student records, course oversight, and faculty administration tools.'}
            </p>

            {/* Quick Demo Pill Helper */}
            {isStudentMode ? (
              <div className="mb-5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Demo student credentials:</span>
                <button
                  type="button"
                  onClick={fillStudentDemo}
                  className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Auto-fill verified demo PRN and DOB"
                >
                  Fill 24uad019
                </button>
              </div>
            ) : (
              <div className="mb-5 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block">Select Faculty Account:</span>
                <div className="flex flex-wrap gap-1">
                  {FACULTY_LIST.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => fillFacultyDemo(acc)}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-[10px] font-semibold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real-time Threat Warning Banner */}
            {threatWarning && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <Alert02Icon size={16} className="shrink-0 text-red-600" />
                <span>{threatWarning}</span>
              </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <Alert02Icon size={16} className="shrink-0 text-amber-600" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Syncing / Loading State */}
            {status === 'syncing' ? (
              <div className="py-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Loading03Icon size={20} className="animate-spin text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{syncStage}</h4>
                    <p className="text-[11px] text-slate-400">Step {syncStep} of 3 · Protecting transmission</p>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    initial={{ width: '15%' }}
                    animate={{ width: syncStep === 1 ? '35%' : syncStep === 2 ? '70%' : '100%' }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            ) : isStudentMode ? (
              /* STUDENT FORM */
              <form onSubmit={handleStudentSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="student-prn-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5">
                    College PRN / Roll No
                  </label>
                  <input
                    id="student-prn-input"
                    type="text"
                    autoComplete="username"
                    maxLength={25}
                    value={prn}
                    onChange={(e) => handlePrnChange(e.target.value)}
                    placeholder="e.g. 24uad019 or 2XUAD0XX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    required
                    disabled={lockoutSec > 0}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="student-dob-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Date of Birth
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">DD-MM-YYYY</span>
                  </div>
                  <div className="relative">
                    <input
                      id="student-dob-input"
                      type={showDob ? 'text' : 'password'}
                      autoComplete="current-password"
                      maxLength={10}
                      value={dob}
                      onChange={(e) => handleDobChange(e.target.value)}
                      placeholder="15-08-2005"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                      required
                      disabled={lockoutSec > 0}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDob(!showDob)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      title={showDob ? 'Hide Date of Birth' : 'Show Date of Birth'}
                      tabIndex={-1}
                    >
                      <EyeIcon size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
                    />
                    <span>Remember credentials</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={lockoutSec > 0}
                  className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  <span>Sign In as Student</span>
                  <ArrowRight01Icon size={16} />
                </button>
              </form>
            ) : (
              /* FACULTY FORM */
              <form onSubmit={handleFacultySubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="faculty-id-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5">
                    Faculty ID / Email
                  </label>
                  <input
                    id="faculty-id-input"
                    type="text"
                    autoComplete="username"
                    maxLength={32}
                    value={facultyId}
                    onChange={(e) => handleFacultyIdChange(e.target.value)}
                    placeholder="e.g. Name@Campusaxis"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    required
                    disabled={lockoutSec > 0}
                  />
                </div>

                <div>
                  <label htmlFor="faculty-password-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5">
                    Faculty Password
                  </label>
                  <div className="relative">
                    <input
                      id="faculty-password-input"
                      type={showFacultyPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      maxLength={64}
                      value={facultyPassword}
                      onChange={(e) => handleFacultyPasswordChange(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      required
                      disabled={lockoutSec > 0}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFacultyPassword(!showFacultyPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      title={showFacultyPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <EyeIcon size={16} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={lockoutSec > 0}
                  className="w-full py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150 shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  <span>Sign In as Faculty</span>
                  <ArrowRight01Icon size={16} />
                </button>
              </form>
            )}
          </div>

          {/* Watermelon-style Footer Switch Band */}
          <div className="bg-[#F6F5FA] dark:bg-zinc-900 py-3.5 px-6 text-center">
            <p className="text-slate-500 dark:text-zinc-400 text-xs">
              {isStudentMode ? 'Are you a faculty member?' : 'Are you a college student?'}
              <button
                type="button"
                onClick={() => {
                  setIsStudentMode(!isStudentMode);
                  setErrorMessage('');
                  setThreatWarning('');
                }}
                className="ml-1.5 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer underline underline-offset-2"
              >
                {isStudentMode ? 'Switch to Faculty Sign In' : 'Switch to Student Sign In'}
              </button>
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
