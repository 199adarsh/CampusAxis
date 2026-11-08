"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  GraduationCap,
  Briefcase,
  Lock,
  User,
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  LogOut,
  CheckCircle2
} from "lucide-react";
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
} from "../../lib/auth-security";

/*  TYPES  */

export interface SwapFormTexts {
  studentTitle: string;
  studentSubtitle: string;
  studentButton: string;
  facultyTitle: string;
  facultySubtitle: string;
  facultyButton: string;
  footerStudentText: string;
  footerStudentCta: string;
  footerFacultyText: string;
  footerFacultyCta: string;
}

export interface SwapFormProps {
  initialMode?: "student" | "faculty";
  isFaculty?: boolean;
  onModeChange?: (isFaculty: boolean) => void;
  texts?: Partial<SwapFormTexts>;
  className?: string;
  onSuccess?: (profile: any) => void;
}

/*  DEFAULT TEXTS  */

const DEFAULT_TEXTS: SwapFormTexts = {
  studentTitle: "Student Sign In",
  studentSubtitle: "Sync attendance, CIE marks & courses from your university portal",
  studentButton: "Sign In as Student",
  facultyTitle: "Faculty Sign In",
  facultySubtitle: "Sign in with your Faculty ID & departmental password",
  facultyButton: "Sign In as Faculty",
  footerStudentText: "Are you a faculty member?",
  footerStudentCta: "Switch to Faculty Sign In",
  footerFacultyText: "Are you a college student?",
  footerFacultyCta: "Switch to Student Sign In",
};

/*  AUTHORIZED FACULTY ACCOUNTS  */

const TEACHER_ACCOUNTS = [
  { id: "DRP@Eduvault", name: "Prof. D R Patil", pass: "DRP@Eduvault2026", dept: "AI & Data Science" },
  { id: "HPM@Eduvault", name: "Prof. H P Magdum", pass: "HPM@Eduvault2026", dept: "AI & Data Science" },
  { id: "TIB@Eduvault", name: "Prof. T I Bagban", pass: "TIB@Eduvault2026", dept: "AI & Data Science" },
  { id: "PMM@Eduvault", name: "Prof. P M Mathpati", pass: "PMM@Eduvault2026", dept: "AI & Data Science" },
  { id: "FAC001", name: "Dr. Sarah Mitchell", pass: "teach123", dept: "Computer Science & Engineering" },
];

/*  VERIFIED MOCK FALLBACK  */

const MOCK_STUDENT_PROFILE = {
  name: "Adarsh Patil",
  prn: "24uad019",
  dob: "15-08-2005",
  rollNo: "24uad019",
  branch: "Artificial Intelligence & Data Science",
  department: "Artificial Intelligence & Data Science",
  semester: "SEM 04",
  section: "A",
  college: "DKTE Society's Textile and Engineering Institute",
  role: "student",
  attendancePct: "88.4%",
  creditsEarned: 74,
};

const MOCK_STUDENT_SUBJECTS = [
  { code: "AIDS401", name: "Machine Learning", attendance: 88, cie: 22, maxCie: 25, totalConducted: 40, totalAttended: 35, totalScheduled: 50, stillToGo: 10, credit: 4, lecturesPerWeek: 4 },
  { code: "AIDS402", name: "Database Management Systems", attendance: 78, cie: 20, maxCie: 25, totalConducted: 36, totalAttended: 28, totalScheduled: 46, stillToGo: 10, credit: 3, lecturesPerWeek: 3 },
  { code: "AIDS403", name: "Operating Systems", attendance: 82, cie: 21, maxCie: 25, totalConducted: 38, totalAttended: 31, totalScheduled: 48, stillToGo: 10, credit: 3, lecturesPerWeek: 3 },
  { code: "AIDS404", name: "Computer Networks", attendance: 74, cie: 19, maxCie: 25, totalConducted: 35, totalAttended: 26, totalScheduled: 45, stillToGo: 10, credit: 3, lecturesPerWeek: 3 },
];

/*  COMPONENT  */

export const SwapForm: React.FC<SwapFormProps> = ({
  initialMode = "student",
  isFaculty: controlledIsFaculty,
  onModeChange,
  texts = {},
  className = "",
  onSuccess,
}) => {
  const navigate = useNavigate();
  const mergedTexts = { ...DEFAULT_TEXTS, ...texts };

  // Internal mode state if not controlled
  const [internalFaculty, setInternalFaculty] = useState<boolean>(initialMode === "faculty");
  const isFaculty = controlledIsFaculty !== undefined ? controlledIsFaculty : internalFaculty;

  // Student credentials
  const [studentPrn, setStudentPrn] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("eduvault_saved_creds");
      if (saved) {
        const decoded = JSON.parse(atob(saved));
        if (decoded?.dob !== "TEACHER" && decoded?.prn) return decoded.prn;
      }
    } catch {}
    return "24uad019";
  });

  const [studentDob, setStudentDob] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("eduvault_saved_creds");
      if (saved) {
        const decoded = JSON.parse(atob(saved));
        if (decoded?.dob !== "TEACHER" && decoded?.dob) return decoded.dob;
      }
    } catch {}
    return "15-08-2005";
  });

  // Faculty credentials
  const [facultyId, setFacultyId] = useState<string>("DRP@Eduvault");
  const [facultyPassword, setFacultyPassword] = useState<string>("DRP@Eduvault2026");

  // UI state
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncStage, setSyncStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [threatWarning, setThreatWarning] = useState<string | null>(null);

  // Rate Limiting & Cooldown
  const [lockoutSec, setLockoutSec] = useState<number>(0);

  // Existing Session State
  const [activeSession, setActiveSession] = useState<any>(null);

  // Check rate limit timer
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
      const savedProfile = localStorage.getItem("eduvault_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.name && parsed?.prn) {
          setActiveSession(parsed);
          return;
        }
      }
    } catch {}
    setActiveSession(null);
  };

  useEffect(() => {
    checkActiveSession();
    const handleAuthChange = () => checkActiveSession();
    window.addEventListener("eduvault-auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("eduvault-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const setMode = (toFaculty: boolean) => {
    setError(null);
    setThreatWarning(null);
    setShowPassword(false);
    if (onModeChange) {
      onModeChange(toFaculty);
    } else {
      setInternalFaculty(toFaculty);
    }
  };

  // Real-time threat detection handlers
  const handlePrnInput = (val: string) => {
    const threat = detectSecurityThreats(val);
    if (threat.isMalicious) {
      setThreatWarning(`Prohibited pattern detected (${threat.threatType})`);
    } else {
      setThreatWarning(null);
    }
    setStudentPrn(val.replace(/\s+/g, "").slice(0, 25));
    if (error) setError(null);
  };

  const handleDobInput = (val: string) => {
    const threat = detectSecurityThreats(val);
    if (threat.isMalicious) {
      setThreatWarning(`Prohibited pattern detected (${threat.threatType})`);
    } else {
      setThreatWarning(null);
    }
    setStudentDob(val.replace(/\s+/g, "").slice(0, 10));
    if (error) setError(null);
  };

  const handleFacultyIdInput = (val: string) => {
    const threat = detectSecurityThreats(val);
    if (threat.isMalicious) {
      setThreatWarning(`Prohibited pattern detected (${threat.threatType})`);
    } else {
      setThreatWarning(null);
    }
    setFacultyId(val.replace(/\s+/g, "").slice(0, 32));
    if (error) setError(null);
  };

  const handleFacultyPasswordInput = (val: string) => {
    setFacultyPassword(val.slice(0, 64));
    if (error) setError(null);
  };

  /* Animations per watermelon swap-form spec */
  const variants: Variants = {
    initial: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      filter: "blur(4px)",
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.98,
      filter: "blur(4px)",
    },
  };

  const handleNavigate = () => {
    try {
      navigate("/dashboard");
    } catch {
      window.location.href = "/dashboard";
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    setActiveSession(null);
    toast.success("Signed out successfully");
    window.dispatchEvent(new Event("eduvault-auth-change"));
  };

  // Student Login Handler with Security Mitigations
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // 1. Rate Limiting Check
    const lock = rateLimiter.getLockoutStatus();
    if (lock.isLocked) {
      const msg = `Too many failed attempts. Security cooldown active: ${lock.remainingSeconds}s.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    // 2. Input Sanitization & Threat Check
    const prn = sanitizeString(studentPrn, 25);
    const dob = sanitizeString(studentDob, 10);

    const prnThreat = detectSecurityThreats(prn);
    const dobThreat = detectSecurityThreats(dob);
    if (prnThreat.isMalicious || dobThreat.isMalicious) {
      rateLimiter.recordFailure();
      const msg = "Security Alert: Malicious injection payload blocked and logged.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // 3. Strict Format Validation
    const prnCheck = validatePrn(prn);
    if (!prnCheck.valid) {
      setError(prnCheck.error || "Invalid PRN format");
      return;
    }

    const dobCheck = validateDob(dob);
    if (!dobCheck.valid) {
      setError(dobCheck.error || "Invalid Date of Birth format");
      return;
    }

    const startTime = performance.now();
    setLoading(true);
    setSyncStage("Connecting to university portal...");
    setError(null);
    setThreatWarning(null);

    const API_BASE = import.meta.env.VITE_API_BASE || "/api";
    let studentProfile: any = null;
    let studentSubjects: any[] = [];
    let portalSuccess = false;

    const isKnownMock = prn.toLowerCase() === "24uad019" && dob === "15-08-2005";

    // Attempt live portal scrape first
    try {
      setSyncStage("Verifying credentials & fetching attendance...");
      const portalRes = await axios.post(
        `${API_BASE}/portal/dashboard`,
        { prn, dob },
        { timeout: 7500 }
      );

      if (portalRes.data) {
        studentProfile = {
          ...(portalRes.data?.profile || {}),
          prn,
          dob,
          role: "student",
        };
        studentSubjects = portalRes.data?.subjects || [];
        portalSuccess = true;
      }
    } catch (scrapeErr) {
      // If portal scrape fails but user has verified mock credentials, fallback smoothly
      if (isKnownMock) {
        studentProfile = {
          ...MOCK_STUDENT_PROFILE,
          prn,
          dob,
        };
        studentSubjects = MOCK_STUDENT_SUBJECTS;
        portalSuccess = true;
      }
    }

    // Timing attack mitigation delay
    await enforceConstantTimeDelay(startTime, 500);

    if (!portalSuccess || !studentProfile) {
      const lockStatus = rateLimiter.recordFailure();
      setLoading(false);
      const safeMsg = getSafeErrorMessage(null, "Invalid Student credentials. Try PRN: 24uad019 / DOB: 15-08-2005");
      const finalMsg = lockStatus.isLocked ? `Too many failed attempts. Locked for ${lockStatus.remainingSeconds}s.` : safeMsg;
      setError(finalMsg);
      toast.error(finalMsg);
      return;
    }

    try {
      // Persist isolated student session locally
      localStorage.setItem("eduvault_user_role", "student");
      localStorage.setItem("eduvault_profile", JSON.stringify(studentProfile));
      localStorage.setItem("eduvault_saved_creds", btoa(JSON.stringify({ prn, dob })));
      localStorage.setItem("eduvault_save_creds", "true");
      if (studentSubjects.length > 0) {
        localStorage.setItem("eduvault_subjects", JSON.stringify(studentSubjects));
      }
      localStorage.setItem("eduvault_last_synced", Date.now().toString());

      rateLimiter.recordSuccess();

      // Sync profile to backend asynchronously
      try {
        await axios.post(`${API_BASE}/profile`, studentProfile);
      } catch {
        // Backend optional sync warning ignored
      }

      window.dispatchEvent(new Event("eduvault-auth-change"));
      toast.success(`Welcome, ${studentProfile.name || "Student"}!`);
      if (onSuccess) onSuccess(studentProfile);
      handleNavigate();
    } catch (err: any) {
      setError(getSafeErrorMessage(err, "Failed to initialize student session"));
      toast.error("Session initialization failed");
    } finally {
      setLoading(false);
    }
  };

  // Faculty Login Handler with Security Mitigations
  const handleFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // 1. Rate Limiting Check
    const lock = rateLimiter.getLockoutStatus();
    if (lock.isLocked) {
      const msg = `Too many failed attempts. Security cooldown active: ${lock.remainingSeconds}s.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    // 2. Input Sanitization & Threat Check
    const id = sanitizeString(facultyId, 32);
    const pass = facultyPassword.slice(0, 64);

    const idThreat = detectSecurityThreats(id);
    if (idThreat.isMalicious) {
      rateLimiter.recordFailure();
      const msg = "Security Alert: Malicious injection attempt blocked.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // 3. Format Validation
    const idCheck = validateFacultyId(id);
    if (!idCheck.valid) {
      setError(idCheck.error || "Invalid Faculty ID format");
      return;
    }

    if (!pass) {
      setError("Please enter your password.");
      return;
    }

    const startTime = performance.now();
    setLoading(true);
    setSyncStage("Verifying faculty credentials...");
    setError(null);
    setThreatWarning(null);

    // Constant-time lookup against authorized faculty accounts
    let matchedAccount: (typeof TEACHER_ACCOUNTS)[0] | null = null;
    for (const acc of TEACHER_ACCOUNTS) {
      const idMatches = timingSafeEqual(acc.id.toLowerCase(), id.toLowerCase());
      const passMatches = timingSafeEqual(acc.pass, pass);
      if (idMatches && passMatches) {
        matchedAccount = acc;
      }
    }

    // Uniform timing delay defense
    await enforceConstantTimeDelay(startTime, 500);

    if (!matchedAccount) {
      const lockStatus = rateLimiter.recordFailure();
      setLoading(false);
      const safeMsg = "Invalid Faculty ID or Password. Select an authorized account above.";
      const finalMsg = lockStatus.isLocked ? `Too many failed attempts. Locked for ${lockStatus.remainingSeconds}s.` : safeMsg;
      setError(finalMsg);
      toast.error(finalMsg);
      return;
    }

    try {
      const teacherProfile = {
        name: matchedAccount.name,
        prn: matchedAccount.id,
        dob: "TEACHER",
        department: matchedAccount.dept,
        role: "teacher",
      };

      localStorage.setItem("eduvault_user_role", "teacher");
      localStorage.setItem("eduvault_teacher_id", matchedAccount.id);
      localStorage.setItem("eduvault_teacher_name", matchedAccount.name);
      localStorage.setItem("eduvault_profile", JSON.stringify(teacherProfile));
      localStorage.setItem("eduvault_subjects", JSON.stringify([]));
      localStorage.setItem("eduvault_saved_creds", btoa(JSON.stringify({ prn: matchedAccount.id, dob: "TEACHER" })));
      localStorage.setItem("eduvault_save_creds", "true");
      localStorage.setItem("eduvault_last_synced", Date.now().toString());

      rateLimiter.recordSuccess();

      const API_BASE = import.meta.env.VITE_API_BASE || "/api";
      try {
        await axios.post(`${API_BASE}/profile`, teacherProfile);
      } catch {
        // Backend optional sync warning ignored
      }

      window.dispatchEvent(new Event("eduvault-auth-change"));
      toast.success(`Welcome, ${matchedAccount.name}!`);
      if (onSuccess) onSuccess(teacherProfile);
      handleNavigate();
    } catch (err: any) {
      setError(getSafeErrorMessage(err, "Failed to initialize faculty session"));
      toast.error("Faculty login failed");
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, show the active session card
  if (activeSession) {
    return (
      <div className={`w-full max-w-[430px] mx-auto select-none ${className}`}>
        <div className="w-full bg-[#F6F5FA] dark:bg-zinc-900 shadow-[0_12px_32px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden border-[1.5px] border-[#E6E6EF] dark:border-zinc-800 transition-colors">
          <div className="p-6 sm:p-7 pb-7 sm:pb-8 bg-[#FEFEFE] dark:bg-zinc-950 rounded-[28px] border-b-[1.2px] border-[#E6E6EF] dark:border-zinc-800 transition-colors">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                {activeSession.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>{activeSession.role === "teacher" ? "Faculty Active" : "Student Active"}</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">{activeSession.name}</h3>
                <p className="text-xs text-zinc-500 font-mono truncate">{activeSession.prn} · {activeSession.department || "CampusAxis"}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              You are currently authenticated. Your attendance statistics, examination scores, and syllabus materials are synchronized.
            </p>

            <motion.button
              type="button"
              onClick={handleNavigate}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="bg-[#F6F5FA] dark:bg-zinc-900 py-3.5 px-6 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Need to switch account?</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[430px] mx-auto select-none ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isFaculty ? "faculty" : "student"}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: 0.28,
            ease: "easeInOut",
          }}
          className="w-full bg-[#F6F5FA] dark:bg-zinc-900 shadow-[0_12px_32px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden border-[1.5px] border-[#E6E6EF] dark:border-zinc-800 transition-colors"
        >
          {/* Top / Inner White Card */}
          <div className="p-6 sm:p-7 pb-7 sm:pb-8 border-b-[1.2px] bg-[#FEFEFE] dark:bg-zinc-950 rounded-[28px] border-[#E6E6EF] dark:border-zinc-800 transition-colors">
            {/* Header Badge & Title */}
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                {isFaculty ? (
                  <>
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Faculty Access</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                    <span>Student Portal</span>
                  </>
                )}
              </div>

              {lockoutSec > 0 ? (
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  <Lock className="w-3 h-3" />
                  <span>{lockoutSec}s Lock</span>
                </div>
              ) : (
                /* Demo quick-fill chip */
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setThreatWarning(null);
                    if (isFaculty) {
                      setFacultyId("DRP@Eduvault");
                      setFacultyPassword("DRP@Eduvault2026");
                      toast.info("Filled Prof. D R Patil credentials");
                    } else {
                      setStudentPrn("24uad019");
                      setStudentDob("15-08-2005");
                      toast.info("Filled 24uad019 / 15-08-2005");
                    }
                  }}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900 transition-colors cursor-pointer"
                  title="Click to auto-fill sample credentials"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Demo Fill</span>
                </button>
              )}
            </div>

            <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#191919] dark:text-zinc-100 mb-1">
              {isFaculty ? mergedTexts.facultyTitle : mergedTexts.studentTitle}
            </h2>

            <p className="text-[#888891] dark:text-zinc-400 text-[13px] leading-relaxed mb-4">
              {isFaculty ? mergedTexts.facultySubtitle : mergedTexts.studentSubtitle}
            </p>

            {/* Faculty Quick Selector Pills */}
            {isFaculty && (
              <div className="mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                  Select Faculty Account:
                </span>
                <div className="flex flex-wrap gap-1">
                  {TEACHER_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setFacultyId(acc.id);
                        setFacultyPassword(acc.pass);
                        setError(null);
                        setThreatWarning(null);
                      }}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-[10px] font-semibold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real-time Threat Warning */}
            {threatWarning && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{threatWarning}</span>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Form */}
            {isFaculty ? (
              <form onSubmit={handleFacultySubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="swap-faculty-id"
                    className="block text-xs font-semibold text-[#222] dark:text-zinc-300 uppercase tracking-wider mb-1.5"
                  >
                    Faculty ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <input
                      id="swap-faculty-id"
                      type="text"
                      autoComplete="username"
                      maxLength={32}
                      value={facultyId}
                      onChange={(e) => handleFacultyIdInput(e.target.value)}
                      placeholder="e.g. DRP@Eduvault"
                      required
                      disabled={loading || lockoutSec > 0}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-400 shadow-sm text-sm sm:text-[15px] transition-all disabled:opacity-60 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="swap-faculty-pass"
                    className="block text-xs font-semibold text-[#222] dark:text-zinc-300 uppercase tracking-wider mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="swap-faculty-pass"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      maxLength={64}
                      value={facultyPassword}
                      onChange={(e) => handleFacultyPasswordInput(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      disabled={loading || lockoutSec > 0}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-400 shadow-sm text-sm sm:text-[15px] transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || lockoutSec > 0}
                  whileHover={{ scale: loading || lockoutSec > 0 ? 1 : 1.015 }}
                  whileTap={{ scale: loading || lockoutSec > 0 ? 1 : 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-full mt-2 py-3 sm:py-3.5 bg-[#030303] hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-[#FAFAFA] dark:text-zinc-900 rounded-xl font-semibold shadow-md text-sm sm:text-[15px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{syncStage || "Authenticating..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{mergedTexts.facultyButton}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleStudentSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="swap-student-prn"
                    className="block text-xs font-semibold text-[#222] dark:text-zinc-300 uppercase tracking-wider mb-1.5"
                  >
                    PRN / Roll Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="swap-student-prn"
                      type="text"
                      autoComplete="username"
                      maxLength={25}
                      value={studentPrn}
                      onChange={(e) => handlePrnInput(e.target.value)}
                      placeholder="e.g. 24uad019"
                      required
                      disabled={loading || lockoutSec > 0}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-400 shadow-sm text-sm sm:text-[15px] transition-all disabled:opacity-60 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="swap-student-dob"
                      className="block text-xs font-semibold text-[#222] dark:text-zinc-300 uppercase tracking-wider"
                    >
                      DOB / ERP PIN
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">Format: DD-MM-YYYY</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="swap-student-dob"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      maxLength={10}
                      value={studentDob}
                      onChange={(e) => handleDobInput(e.target.value)}
                      placeholder="15-08-2005"
                      required
                      disabled={loading || lockoutSec > 0}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border-[1.2px] border-[#E7E7E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-400 shadow-sm text-sm sm:text-[15px] transition-all disabled:opacity-60 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || lockoutSec > 0}
                  whileHover={{ scale: loading || lockoutSec > 0 ? 1 : 1.015 }}
                  whileTap={{ scale: loading || lockoutSec > 0 ? 1 : 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="w-full mt-2 py-3 sm:py-3.5 bg-[#030303] hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-[#FAFAFA] dark:text-zinc-900 rounded-xl font-semibold shadow-md text-sm sm:text-[15px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{syncStage || "Connecting to Portal..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{mergedTexts.studentButton}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </div>

          {/* Bottom Contrast Footer with Mode Switch */}
          <div className="bg-[#F6F5FA] dark:bg-zinc-900 py-3.5 sm:py-4 px-6 text-center">
            <p className="text-[#888891] dark:text-zinc-400 text-[13px] sm:text-[14px]">
              {isFaculty ? mergedTexts.footerFacultyText : mergedTexts.footerStudentText}
              <button
                type="button"
                onClick={() => setMode(!isFaculty)}
                className="ml-1.5 font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer focus:outline-none transition-colors"
              >
                {isFaculty ? mergedTexts.footerFacultyCta : mergedTexts.footerStudentCta}
              </button>
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SwapForm;
