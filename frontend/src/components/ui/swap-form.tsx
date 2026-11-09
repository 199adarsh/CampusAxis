"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  GraduationScrollIcon,
  Briefcase01Icon,
  UserIcon,
  Calendar03Icon,
  ViewIcon,
  ViewOffIcon,
  ArrowRight01Icon,
  AlertCircleIcon,
  Logout01Icon,
  Loading03Icon,
  LockPasswordIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
} from "hugeicons-react";
import {
  sanitizeString,
  validatePrn,
  validateDob,
  enforceConstantTimeDelay,
  rateLimiter,
} from "../../lib/auth-security";

function parsePrnDetails(rawPrn: string) {
  const prn = (rawPrn || "").trim().toUpperCase();
  const match = prn.match(/^(\d{2})([A-Z]{2,4})(\d{2,4})$/);

  const deptMap: Record<string, string> = {
    UAD: "B.Tech AI & Data Science",
    AD: "B.Tech AI & Data Science",
    UCS: "B.Tech Computer Science",
    CS: "B.Tech Computer Science",
    CSE: "B.Tech Computer Science",
    UIT: "B.Tech Information Tech",
    IT: "B.Tech Information Tech",
    UEC: "B.Tech Electronics & Telecom",
    ETC: "B.Tech Electronics & Telecom",
    EC: "B.Tech Electronics & Telecom",
    UME: "B.Tech Mechanical Eng",
    ME: "B.Tech Mechanical Eng",
    UCE: "B.Tech Civil Engineering",
    CE: "B.Tech Civil Engineering",
    UEE: "B.Tech Electrical Eng",
    EE: "B.Tech Electrical Eng",
    TEXT: "B.Tech Textile Tech",
  };

  if (!match) {
    return {
      batch: "",
      department: "Engineering Scholar",
      rollNo: "",
    };
  }

  const [, yearPrefix, deptCode, roll] = match;
  const dept = deptMap[deptCode] || `${deptCode} Engineering`;
  const year = 2000 + parseInt(yearPrefix, 10);

  return {
    batch: `Batch '${yearPrefix} (${year}–${year + 4})`,
    department: dept,
    rollNo: `Roll #${parseInt(roll, 10)}`,
  };
}

export interface SwapFormProps {
  initialMode?: "student" | "faculty";
  className?: string;
  onSuccess?: (profile: any) => void;
  onClose?: () => void;
}

export function SwapForm({
  initialMode = "student",
  className = "",
  onSuccess,
  onClose,
}: SwapFormProps) {
  const navigate = useNavigate();
  const [isFaculty, setIsFaculty] = useState<boolean>(initialMode === "faculty");
  const [studentPrn, setStudentPrn] = useState("");
  const [studentDob, setStudentDob] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [facultyPassword, setFacultyPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncStepIndex, setSyncStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [onboardingStudent, setOnboardingStudent] = useState<any>(null);

  const studentSteps = [
    "Authenticating credentials with campus server...",
    "Connecting to university examination portal...",
    "Decrypting attendance and syllabus records...",
    "Importing internal CIE evaluation scores...",
    "Cataloging enrolled courses & timetable...",
    "Finalizing your personalized sovereign vault..."
  ];

  const facultySteps = [
    "Checking faculty departmental credentials...",
    "Verifying institutional clearance...",
    "Syncing course assignments & student rosters...",
    "Initializing faculty management suite..."
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem("eduvault_profile");
      if (stored) setActiveSession(JSON.parse(stored));
    } catch { }
  }, []);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const lock = rateLimiter.getLockoutStatus();
    if (lock.isLocked) {
      const msg = `Too many attempts. Cooldown active for ${lock.remainingSeconds}s.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    const prn = sanitizeString(studentPrn, 25);
    const dob = sanitizeString(studentDob, 10);

    const prnCheck = validatePrn(prn);
    if (!prnCheck.valid) {
      setError(prnCheck.error || "Invalid PRN format");
      return;
    }

    const dobCheck = validateDob(dob);
    if (!dobCheck.valid) {
      setError(dobCheck.error || "Invalid DOB format (DD-MM-YYYY)");
      return;
    }

    setLoading(true);
    setError(null);
    setSyncStepIndex(0);

    const API_BASE = import.meta.env.VITE_API_BASE || "/api";

    // Fast probe for cached student name if known
    try {
      axios.get(`${API_BASE}/profile?prn=${encodeURIComponent(prn)}`, { timeout: 1200 })
        .then((res) => {
          if (res.data?.name) {
            setOnboardingStudent(res.data);
          }
        })
        .catch(() => {});
    } catch {}

    const interval = setInterval(() => {
      setSyncStepIndex((prev) => (prev < studentSteps.length - 1 ? prev + 1 : prev));
    }, 2800);

    try {
      const portalRes = await axios.post(
        `${API_BASE}/portal/dashboard`,
        { prn, dob },
        { timeout: 45000 }
      );

      if (!portalRes.data?.profile) {
        throw new Error(portalRes.data?.error || "Invalid PRN or Date of Birth");
      }

      const studentProfile = { ...portalRes.data.profile, prn, dob, role: "student" };
      setOnboardingStudent(studentProfile);
      setSyncStepIndex(studentSteps.length - 1);
      const studentSubjects = portalRes.data?.subjects || [];

      await enforceConstantTimeDelay(performance.now(), 700);

      rateLimiter.recordSuccess();

      localStorage.setItem("eduvault_user_role", "student");
      localStorage.setItem("eduvault_profile", JSON.stringify(studentProfile));
      if (studentSubjects.length > 0) {
        localStorage.setItem("eduvault_subjects", JSON.stringify(studentSubjects));
      }
      localStorage.setItem("eduvault_last_synced", Date.now().toString());

      window.dispatchEvent(new Event("eduvault-auth-change"));
      toast.success(`Welcome, ${studentProfile.name}!`);
      if (onSuccess) onSuccess(studentProfile);
      navigate("/dashboard");
    } catch (err: any) {
      rateLimiter.recordFailure();
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Invalid PRN or Date of Birth";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const lock = rateLimiter.getLockoutStatus();
    if (lock.isLocked) {
      const msg = `Too many attempts. Cooldown active for ${lock.remainingSeconds}s.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    const id = sanitizeString(facultyId, 32);
    const pass = facultyPassword.slice(0, 64);

    if (!id || !pass) {
      setError("Please enter Faculty ID and password");
      return;
    }

    setLoading(true);
    setError(null);
    setSyncStepIndex(0);

    const interval = setInterval(() => {
      setSyncStepIndex((prev) => (prev < facultySteps.length - 1 ? prev + 1 : prev));
    }, 2200);

    const API_BASE = import.meta.env.VITE_API_BASE || "/api";

    try {
      const facultyRes = await axios.post(
        `${API_BASE}/portal/faculty/login`,
        { facultyId: id, password: pass },
        { timeout: 25000 }
      );

      const teacherProfile = facultyRes.data;
      if (!teacherProfile || !teacherProfile.name) {
        throw new Error("Invalid Faculty ID or password");
      }

      await enforceConstantTimeDelay(performance.now(), 600);

      rateLimiter.recordSuccess();

      localStorage.setItem("eduvault_user_role", "teacher");
      localStorage.setItem("eduvault_teacher_id", teacherProfile.prn);
      localStorage.setItem("eduvault_teacher_name", teacherProfile.name);
      localStorage.setItem("eduvault_profile", JSON.stringify(teacherProfile));
      localStorage.setItem("eduvault_subjects", JSON.stringify([]));
      localStorage.setItem("eduvault_last_synced", Date.now().toString());

      window.dispatchEvent(new Event("eduvault-auth-change"));
      toast.success(`Welcome, ${teacherProfile.name}!`);
      if (onSuccess) onSuccess(teacherProfile);
      navigate("/dashboard");
    } catch (err: any) {
      rateLimiter.recordFailure();
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Invalid Faculty ID or password";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    setActiveSession(null);
    window.dispatchEvent(new Event("eduvault-auth-change"));
  };

  if (activeSession) {
    return (
      <div className={`relative w-full max-w-[400px] mx-auto text-left rounded-xl border border-[#E3EAF4] bg-white shadow-[0_18px_50px_-24px_rgba(15,35,75,0.28)] p-6 sm:p-7 ${className}`}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30 cursor-pointer"
            aria-label="Close dialog"
          >
            <Cancel01Icon className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-3.5 mb-6 pr-8">
          <div className="w-10 h-10 rounded-lg bg-[#285BE8] text-white flex items-center justify-center font-bold text-sm shrink-0">
            {activeSession.name?.charAt(0) || "U"}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#285BE8] block mb-0.5">
              {activeSession.role === "teacher" ? "Faculty Session" : "Student Session"}
            </span>
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {activeSession.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono truncate">
              {activeSession.prn}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          style={{ backgroundColor: "#285BE8", color: "#ffffff" }}
          className="w-full h-11 rounded-lg font-semibold text-sm !bg-[#285BE8] hover:!bg-[#234FCB] active:!bg-[#1D43AD] !text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-[0_4px_10px_rgba(40,91,232,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30 focus-visible:ring-offset-2"
        >
          <span style={{ color: "#ffffff" }}>Continue to Dashboard</span>
          <ArrowRight01Icon className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between text-xs pt-4 mt-5 border-t border-[#E9EEF5]">
          <span className="text-slate-500">Need to switch accounts?</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          >
            <Logout01Icon className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    const studentMeta = parsePrnDetails(studentPrn);
    const displayName =
      onboardingStudent?.name ||
      (isFaculty
        ? facultyId
          ? facultyId.split("@")[0]
          : "Faculty"
        : studentPrn
        ? studentPrn.toUpperCase()
        : "Scholar");
    const displayRole = isFaculty
      ? "Faculty Member"
      : onboardingStudent?.department || studentMeta.department;
    const steps = isFaculty ? facultySteps : studentSteps;
    const progress = Math.min(
      96,
      Math.round(((syncStepIndex + 1) / steps.length) * 100)
    );

    return (
      <div
        className={`relative w-full max-w-[400px] mx-auto text-left rounded-xl border border-[#DCE6F8] bg-gradient-to-b from-[#F7FAFF] via-white to-white shadow-[0_20px_60px_-20px_rgba(40,91,232,0.22)] p-6 sm:p-7 overflow-hidden ${className}`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-[#285BE8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header with Avatar & Live Pulse */}
        <div className="relative flex flex-col items-center text-center pt-1 pb-3">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#285BE8] via-[#3B72FF] to-[#608AF8] p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center font-bold text-xl text-[#285BE8] tracking-tight">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#EDF3FF] text-[#285BE8] border border-[#DCE8FF] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#285BE8] animate-pulse" />
            Live Portal Sync
          </span>

          <h3 className="text-[17px] font-bold text-[#172033] tracking-tight">
            Onboarding you, <br />
            <span className="text-[#285BE8] font-extrabold">{displayName}</span>
          </h3>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-[#F2F5FA] border border-[#E3EAF4] font-mono font-medium text-slate-700">
              {isFaculty ? facultyId : studentPrn.toUpperCase()}
            </span>
            {displayRole && (
              <span className="px-2 py-0.5 rounded-md bg-[#F2F5FA] border border-[#E3EAF4] font-medium text-slate-600">
                {displayRole}
              </span>
            )}
            {studentMeta.batch && !isFaculty && (
              <span className="px-2 py-0.5 rounded-md bg-[#F2F5FA] border border-[#E3EAF4] font-medium text-slate-600">
                {studentMeta.batch}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="my-3.5">
          <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 mb-1.5">
            <span>Importing university records</span>
            <span className="font-mono text-[#285BE8] font-semibold">
              {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#EBF1FA] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#285BE8] to-[#4F86F7] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist Steps */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E5EAF2] shadow-sm space-y-2 mb-3.5">
          {steps.map((step, idx) => {
            const isDone = idx < syncStepIndex;
            const isCurrent = idx === syncStepIndex;
            return (
              <div
                key={step}
                className={`flex items-center gap-2.5 text-xs transition-colors duration-300 ${
                  isDone
                    ? "text-emerald-700 font-medium"
                    : isCurrent
                    ? "text-[#285BE8] font-semibold"
                    : "text-slate-400"
                }`}
              >
                {isDone ? (
                  <CheckmarkCircle02Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Loading03Icon className="w-4 h-4 animate-spin text-[#285BE8] shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0 mx-1" />
                )}
                <span className="leading-tight text-[11px] sm:text-xs">
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[10.5px] text-center text-slate-400 leading-relaxed">
          Initial scrape securely imports live attendance & CIE marks so future logins are instant.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-[400px] mx-auto text-left rounded-xl border border-[#E3EAF4] bg-white shadow-[0_18px_50px_-24px_rgba(15,35,75,0.28)] p-6 sm:p-7 sm:pb-8 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex min-w-0 rounded-lg bg-[#F2F5FA] p-1 border border-[#E5EAF2] w-full max-w-[316px]">
          <button
            type="button"
            onClick={() => { setIsFaculty(false); setError(null); }}
            style={!isFaculty ? { backgroundColor: "#ffffff", color: "#285BE8" } : undefined}
            className={`flex-1 min-w-0 py-1.5 px-2.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30 ${!isFaculty
                ? "!bg-white !text-[#285BE8] shadow-sm ring-1 ring-inset ring-[#DCE6F8]"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
          >
            <GraduationScrollIcon className={`w-4 h-4 shrink-0 ${!isFaculty ? "!text-[#285BE8]" : "text-[#8391A5]"}`} />
            <span className="whitespace-nowrap">Student Portal</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsFaculty(true); setError(null); }}
            style={isFaculty ? { backgroundColor: "#ffffff", color: "#285BE8" } : undefined}
            className={`flex-1 min-w-0 py-1.5 px-2.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30 ${isFaculty
                ? "!bg-white !text-[#285BE8] shadow-sm ring-1 ring-inset ring-[#DCE6F8]"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
          >
            <Briefcase01Icon className={`w-4 h-4 shrink-0 ${isFaculty ? "!text-[#285BE8]" : "text-[#8391A5]"}`} />
            <span className="whitespace-nowrap">Faculty Portal</span>
          </button>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30"
            aria-label="Close dialog"
          >
            <Cancel01Icon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-[17px] font-semibold tracking-tight text-[#172033]">
          {isFaculty ? "Faculty Sign In" : "Student Sign In"}
        </h3>
        <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
          {isFaculty
            ? "Sign in with departmental credentials to manage courses."
            : "Directly sync attendance, CIE marks & semester syllabus."}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[#FFF5F5] border border-[#F5D2D2] text-[#B42318] text-xs flex items-center gap-2">
          <AlertCircleIcon className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Loading Checklist */}
      {loading && (
        <div className="mb-4 p-3.5 rounded-lg bg-[#F3F7FF] border border-[#DCE8FF] text-[#243B63] text-xs">
          <div className="flex items-center gap-2 mb-2 font-medium">
            <Loading03Icon className="w-4 h-4 animate-spin text-[#285BE8]" />
            <span>{(isFaculty ? facultySteps : studentSteps)[syncStepIndex]}</span>
          </div>
          <div className="space-y-1 pl-6">
            {(isFaculty ? facultySteps : studentSteps).map((step, idx) => (
              <div
                key={step}
                className={`flex items-center gap-1.5 text-[11px] ${idx < syncStepIndex
                    ? "text-emerald-700 font-medium"
                    : idx === syncStepIndex
                      ? "text-[#285BE8] font-semibold"
                      : "text-slate-400"
                  }`}
              >
                {idx < syncStepIndex ? (
                  <CheckmarkCircle02Icon className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms */}
      {isFaculty ? (
        <form onSubmit={handleFacultySubmit} className="space-y-[18px]" noValidate>
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5" htmlFor="sf-faculty-id">
              Faculty ID
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#8293AD] pointer-events-none flex items-center">
                <Briefcase01Icon className="w-4 h-4" />
              </span>
              <input
                id="sf-faculty-id"
                type="text"
                autoComplete="username"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                placeholder="e.g. Name@Campusaxis"
                required
                disabled={loading}
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#D7E0ED] bg-[#F7F9FD] text-[13px] sm:text-sm text-[#1F2937] placeholder:text-[#98A6B9] font-sans outline-none transition-colors focus:border-[#285BE8] focus:bg-white focus:ring-2 focus:ring-[#285BE8]/15 disabled:bg-slate-100 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5" htmlFor="sf-faculty-pass">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#8293AD] pointer-events-none flex items-center">
                <LockPasswordIcon className="w-4 h-4" />
              </span>
              <input
                id="sf-faculty-pass"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={facultyPassword}
                onChange={(e) => setFacultyPassword(e.target.value)}
                placeholder="Enter departmental password"
                required
                disabled={loading}
                className="w-full h-11 pl-10 pr-11 rounded-lg border border-[#D7E0ED] bg-[#F7F9FD] text-[13px] sm:text-sm text-[#1F2937] placeholder:text-[#98A6B9] outline-none transition-colors focus:border-[#285BE8] focus:bg-white focus:ring-2 focus:ring-[#285BE8]/15 disabled:bg-slate-100 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 inline-flex items-center justify-center rounded-md p-1 text-[#8391A5] hover:text-[#344054] hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <ViewOffIcon className="w-4 h-4" /> : <ViewIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: "#285BE8", color: "#ffffff" }}
            className="w-full h-11 mt-2 rounded-lg font-semibold text-[13px] !bg-[#285BE8] hover:!bg-[#234FCB] active:!bg-[#1D43AD] !text-white shadow-[0_4px_10px_rgba(40,91,232,0.18)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30 focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <Loading03Icon className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Sign In as Faculty</span>
                <ArrowRight01Icon className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleStudentSubmit} className="space-y-[18px]" noValidate>
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5" htmlFor="sf-prn">
              PRN / Roll Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#8293AD] pointer-events-none flex items-center">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                id="sf-prn"
                type="text"
                autoComplete="username"
                value={studentPrn}
                onChange={(e) => setStudentPrn(e.target.value)}
                placeholder="e.g. 24uad019"
                required
                disabled={loading}
                className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#D7E0ED] bg-[#F7F9FD] text-[13px] sm:text-sm text-[#1F2937] placeholder:text-[#98A6B9] font-sans outline-none transition-colors focus:border-[#285BE8] focus:bg-white focus:ring-2 focus:ring-[#285BE8]/15 disabled:bg-slate-100 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-xs font-semibold text-[#344054]" htmlFor="sf-dob">
                DOB / ERP PIN
              </label>
              <span className="text-[11px] text-[#7B8798] font-mono font-medium">Format: DD-MM-YYYY</span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#8293AD] pointer-events-none flex items-center">
                <Calendar03Icon className="w-4 h-4" />
              </span>
              <input
                id="sf-dob"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={studentDob}
                onChange={(e) => setStudentDob(e.target.value)}
                placeholder="15-08-2005"
                required
                disabled={loading}
                className="w-full h-11 pl-10 pr-11 rounded-lg border border-[#D7E0ED] bg-[#F7F9FD] text-[13px] sm:text-sm text-[#1F2937] placeholder:text-[#98A6B9] font-mono outline-none transition-colors focus:border-[#285BE8] focus:bg-white focus:ring-2 focus:ring-[#285BE8]/15 disabled:bg-slate-100 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 inline-flex items-center justify-center rounded-md p-1 text-[#8391A5] hover:text-[#344054] hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <ViewOffIcon className="w-4 h-4" /> : <ViewIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: "#285BE8", color: "#ffffff" }}
            className="w-full h-11 mt-2 rounded-lg font-semibold text-[13px] !bg-[#285BE8] hover:!bg-[#234FCB] active:!bg-[#1D43AD] !text-white shadow-[0_4px_10px_rgba(40,91,232,0.18)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#285BE8]/30 focus-visible:ring-offset-2"
          >
            {loading ? (
              <>
                <Loading03Icon className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Sign In as Student</span>
                <ArrowRight01Icon className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default SwapForm;
