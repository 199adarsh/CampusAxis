import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  Search01Icon,
  Notification01Icon,
  Clock01Icon,
  CheckmarkBadge01Icon,
  AlertCircleIcon,
  Calendar03Icon,
  Calendar03Icon as CalendarIcon,
  BarChartIcon,
  Megaphone01Icon,
  ArrowRight01Icon,
  Task01Icon,
  Download01Icon,
  File01Icon,
  Cancel01Icon,
  BookOpen01Icon
} from 'hugeicons-react';
import HackathonsFeed from './HackathonsFeed';
import DeadlinesPopover from './DeadlinesPopover';
import { TetrisLoader } from '../ui/loader-tetris';

// Modularized Dashboard Subcomponents (React.memo isolated renders)
import AttendanceRadarSection from './dashboard/AttendanceRadarSection';
import TimelineSection from './dashboard/TimelineSection';
import AnnouncementsSection from './dashboard/AnnouncementsSection';
import CiePerformanceSection from './dashboard/CiePerformanceSection';
import FacultyNcSection from './dashboard/FacultyNcSection';
import CieBreakdownModal from './dashboard/CieBreakdownModal';
import {
  formatName,
  getDepartmentName,
  getInitials,
  isCiePending,
  getSubjectMaxCie
} from './dashboard/dashboardUtils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const HomeDashboard = () => {
  const { profile, subjects, notes, loading, refreshData, onOpenDeveloper } = useOutletContext() || {};
  const [announcements, setAnnouncements] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [ciePopupOpen, setCiePopupOpen] = useState(false);
  const [exportingCie, setExportingCie] = useState(false);
  const [showHomeCalendar, setShowHomeCalendar] = useState(false);
  const [showHeaderCalendar, setShowHeaderCalendar] = useState(false);
  const cieCardRef = useRef(null);
  const cieExportRef = useRef(null);
  const homeCalendarRef = useRef(null);
  const topHeaderCalendarRef = useRef(null);

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Smoothly redirect unauthenticated visitors to landing page where login is hosted
  useEffect(() => {
    if (!loading && (!profile || !profile.prn || !profile.dob)) {
      navigate('/', { replace: true });
    }
  }, [loading, profile, navigate]);

  const fetchData = async () => {
    try {
      const [annoRes, timeRes] = await Promise.all([
        axios.get(`${API_BASE}/announcements/recent`),
        axios.get(`${API_BASE}/timeline`)
      ]);
      setAnnouncements(Array.isArray(annoRes.data) ? annoRes.data : []);
      setTimeline(Array.isArray(timeRes.data) ? timeRes.data : []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isTeacher = (localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER');

  const teacherSubjects = useMemo(() => {
    try {
      const saved = localStorage.getItem('eduvault_teacher_subjects');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse teacher subjects', e);
    }
    return profile?.selectedSubjects || profile?.subjectIds || [];
  }, [profile]);

  const [facultyNcRequests, setFacultyNcRequests] = useState([]);
  const [facultyNcLoading, setFacultyNcLoading] = useState(false);
  const [ncFilterStatus, setNcFilterStatus] = useState('ALL');
  const [ncSearchQuery, setNcSearchQuery] = useState('');
  const [reviewingReq, setReviewingReq] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);
  const [docPreviewName, setDocPreviewName] = useState('');

  const fetchFacultyNc = useCallback(async () => {
    if (!isTeacher) return;
    setFacultyNcLoading(true);
    try {
      const subjectHeader = (teacherSubjects || []).map(s => typeof s === 'string' ? s : s?.name || s?.id || '').join(',');
      const res = await axios.get(`${API_BASE}/nc/requests`, {
        headers: {
          'X-User-Role': 'teacher',
          'X-Teacher-Subjects': subjectHeader
        }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      if (!teacherSubjects || teacherSubjects.length === 0) {
        setFacultyNcRequests([]);
      } else {
        const normalized = teacherSubjects.map(s => (typeof s === 'string' ? s : s?.name || s?.id || '').toLowerCase().trim());
        const scoped = data.filter(req =>
          (req.missedSubjects || []).some(ms => {
            const subName = (ms.subjectName || '').toLowerCase().trim();
            const subId = (ms.subjectId || '').toLowerCase().trim();
            const subCode = (ms.subjectCode || '').toLowerCase().trim();
            return normalized.some(s => s && (s === subName || s === subId || s === subCode || (subName.length > 3 && (subName.includes(s) || s.includes(subName)))));
          })
        );
        setFacultyNcRequests(scoped);
      }
    } catch (err) {
      console.error('Failed to load NC requests for faculty', err);
    } finally {
      setFacultyNcLoading(false);
    }
  }, [isTeacher, teacherSubjects]);

  useEffect(() => {
    if (isTeacher) {
      fetchFacultyNc();
    }
  }, [isTeacher, fetchFacultyNc]);

  const getNcProofUrl = useCallback((req) => {
    if (!req) return '';
    if (req.proofFileKey) {
      return `${API_BASE}/nc/proofs/${encodeURIComponent(req.proofFileKey)}`;
    }
    return req.proofPresignedUrl || '';
  }, []);

  const handleTeacherReview = useCallback(async (e) => {
    e?.preventDefault();
    if (!reviewingReq) return;
    setIsSubmittingReview(true);
    try {
      await axios.put(`${API_BASE}/nc/requests/${reviewingReq.id}/review`, {
        status: reviewDecision,
        comment: reviewComment,
        reviewerName: profile?.name || localStorage.getItem('eduvault_teacher_name') || 'Faculty'
      });
      toast.success(`Request marked as ${reviewDecision.toLowerCase()}`);
      setReviewingReq(null);
      setReviewComment('');
      fetchFacultyNc();
      if (refreshData) refreshData();
    } catch (err) {
      console.error('Failed to review NC request', err);
      toast.error('Failed to save review decision');
    } finally {
      setIsSubmittingReview(false);
    }
  }, [reviewingReq, reviewDecision, reviewComment, profile, refreshData, fetchFacultyNc]);

  const ncStats = useMemo(() => {
    const total = facultyNcRequests.length;
    const pending = facultyNcRequests.filter(r => r.status === 'PENDING').length;
    const approved = facultyNcRequests.filter(r => r.status === 'APPROVED').length;
    const rejected = facultyNcRequests.filter(r => r.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [facultyNcRequests]);

  const filteredFacultyNc = useMemo(() => {
    return facultyNcRequests.filter(r => {
      if (ncFilterStatus !== 'ALL' && r.status !== ncFilterStatus) return false;
      if (ncSearchQuery.trim()) {
        const q = ncSearchQuery.toLowerCase();
        const nameMatch = r.studentName?.toLowerCase().includes(q);
        const prnMatch = r.studentPrn?.toLowerCase().includes(q);
        const subMatch = r.missedSubjects?.some(ms => ms.subjectName?.toLowerCase().includes(q));
        return nameMatch || prnMatch || subMatch;
      }
      return true;
    });
  }, [facultyNcRequests, ncFilterStatus, ncSearchQuery]);

  const annoDeadlinesList = useMemo(() => {
    return (announcements || [])
      .filter(a => a && (a.deadline || a.dueDate || a.meta?.deadline))
      .map(a => ({
        ...a,
        deadline: a.deadline || a.dueDate || a.meta?.deadline
      }))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [announcements]);

  const combinedTimeline = useMemo(() => {
    const annoDeadlines = (announcements || [])
      .filter(a => a.deadline)
      .map(a => ({
        id: `ann-${a.id}`,
        title: a.title,
        description: a.description || `Notice: ${a.type || 'Academic'}`,
        date: a.deadline,
        isAnnouncement: true
      }));

    const all = [...(timeline || []), ...annoDeadlines];
    all.sort((a, b) => new Date(a.date) - new Date(b.date));
    return all;
  }, [timeline, announcements]);

  const { stats, subjectRegistry, totalSessionsRecorded } = useMemo(() => {
    const saved = localStorage.getItem('eduvault_excluded_subjects');
    const excludedIds = saved ? JSON.parse(saved) : [];
    const active = (subjects || []).filter(s => !excludedIds.includes(s.id));

    const getPrecisePct = (s) => {
      const direct = parseFloat(s.attendance);
      if (!isNaN(direct) && direct > 0) return direct;
      const conducted = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
      const present = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
      if (conducted === 0) return !isNaN(direct) ? direct : 0;
      return parseFloat(((present / conducted) * 100).toFixed(2));
    };

    const hasAttendance = (s) => {
      if (s.totalConducted > 0) return true;
      if (s.detailedAttendance && s.detailedAttendance.length > 0) return true;
      const direct = parseFloat(s.attendance);
      return !isNaN(direct) && direct > 0;
    };

    const getAverage = (subs) => {
      let totalAttended = 0;
      let totalConducted = 0;
      (subs || []).forEach(s => {
        const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
        totalConducted += cond;
        totalAttended += att;
      });
      if (totalConducted > 0) {
        return ((totalAttended / totalConducted) * 100).toFixed(2);
      }
      const valid = (subs || []).filter(hasAttendance);
      if (valid.length === 0) return "0.00";
      const sum = valid.reduce((acc, s) => acc + getPrecisePct(s), 0);
      return (sum / valid.length).toFixed(2);
    };

    let totalSessions = 0;
    active.forEach(s => {
      const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
      totalSessions += cond;
    });

    const registry = active.map(sub => {
      const a = sub.totalAttended > 0 ? sub.totalAttended : (sub.detailedAttendance?.filter(r => r.status === 'Present').length || parseInt(sub.attended) || 0);
      const h = sub.totalConducted > 0 ? sub.totalConducted : (sub.detailedAttendance?.length || parseInt(sub.held) || 0);
      const target = 0.75;
      const currentPct = h > 0 ? a / h : 0;
      let Skips = 0;
      let mustAttend = 0;
      if (currentPct >= target) {
        Skips = Math.floor(a / target - h);
      } else {
        mustAttend = Math.ceil((target * h - a) / (1 - target));
      }
      return {
        ...sub,
        preciseAttendance: getPrecisePct(sub),
        Skips,
        mustAttend,
        isAtRisk: currentPct < target
      };
    });

    return {
      stats: {
        overall: getAverage(active),
        totalDocs: notes?.length || 0,
        riskCount: active.filter(s => hasAttendance(s) && getPrecisePct(s) < 75).length
      },
      subjectRegistry: registry,
      totalSessionsRecorded: totalSessions
    };
  }, [subjects, notes]);

  const displayCieList = useMemo(() => {
    if (subjectRegistry && subjectRegistry.length > 0) {
      return [...subjectRegistry].sort((a, b) => {
        const aCie = parseFloat(a.cie) || 0;
        const bCie = parseFloat(b.cie) || 0;
        if (aCie > 0 && bCie === 0) return -1;
        if (bCie > 0 && aCie === 0) return 1;
        return bCie - aCie;
      });
    }
    return [];
  }, [subjectRegistry]);

  const cieStats = useMemo(() => {
    if (!subjectRegistry || subjectRegistry.length === 0) {
      return { evaluatedCount: 0, pendingCount: 0, totalMarks: 0, totalMax: 0, percentage: null, highScorers: 0, avgMarks: 0 };
    }

    let totalMarks = 0;
    let totalMax = 0;
    let evaluatedCount = 0;
    let pendingCount = 0;
    let highScorers = 0;

    subjectRegistry.forEach(sub => {
      if (isCiePending(sub.cie)) {
        pendingCount++;
        return;
      }
      const score = parseFloat(sub.cie);
      const max = getSubjectMaxCie(sub, subjectRegistry);
      totalMarks += score;
      totalMax += max;
      evaluatedCount++;
      const pct = (score / max) * 100;
      if (pct >= 80) highScorers++;
    });

    const percentage = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : null;
    const avgMarks = evaluatedCount > 0 ? (totalMarks / evaluatedCount).toFixed(1) : 0;

    return {
      evaluatedCount,
      pendingCount,
      totalMarks,
      totalMax,
      avgMarks,
      percentage,
      highScorers
    };
  }, [subjectRegistry]);

  const cieAverage = cieStats.percentage;

  // L-1: Dynamic import of html-to-image
  const handleExportCie = useCallback(async () => {
    const targetEl = cieExportRef.current || cieCardRef.current;
    if (!targetEl) return;
    setExportingCie(true);
    const toastId = toast.loading('Rendering high-res CIE image...');
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(targetEl, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const studentPrn = profile?.prn || profile?.rollNo || 'Student';
      const filename = `CIE_Performance_${studentPrn}_${new Date().toISOString().slice(0, 10)}.png`;

      // Try Web Share API (mobile/desktop browsers supporting file sharing)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `CIE Performance - ${formatName(profile?.name)}`,
              text: `Continuous Internal Evaluation (CIE) Performance Card for ${formatName(profile?.name)} (${studentPrn})`
            });
            toast.success('Shared successfully!', { id: toastId });
            return;
          }
        } catch (shareErr) {
          if (shareErr.name !== 'AbortError') {
            console.warn('Native share failed, falling back to download:', shareErr);
          } else {
            toast.dismiss(toastId);
            return;
          }
        }
      }

      // Direct download fallback
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success('CIE image downloaded!', { id: toastId });
    } catch (err) {
      console.error('Failed to export CIE image:', err);
      toast.error('Failed to generate image. Please try again.', { id: toastId });
    } finally {
      setExportingCie(false);
    }
  }, [profile]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/notes?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [navigate, searchQuery]);

  const handleAddMilestone = useCallback(async () => {
    if (!newMilestone.title.trim()) return;
    const item = { ...newMilestone, id: Date.now() };
    setTimeline(prev => [item, ...prev]);
    setNewMilestone({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowAddForm(false);
    try {
      await axios.post(`${API_BASE}/timeline`, item);
    } catch (e) {
      console.warn("Failed saving milestone to server:", e);
    }
  }, [newMilestone]);

  const handleDeleteMilestone = useCallback(async (index, id) => {
    setTimeline(prev => prev.filter((_, idx) => idx !== index));
    if (id) {
      try {
        await axios.delete(`${API_BASE}/timeline/${id}`);
      } catch (e) {
        console.warn("Failed deleting milestone on server:", e);
      }
    }
  }, []);

  const handleStartReview = useCallback((req) => {
    setReviewingReq(req);
    setReviewDecision(req.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
    setReviewComment(req.reviewComment || '');
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewingReq(null);
  }, []);

  const handleViewProof = useCallback((url, name) => {
    setDocPreviewUrl(url);
    setDocPreviewName(name);
  }, []);

  const handleNavigateAnnouncements = useCallback(() => {
    navigate('/announcements');
  }, [navigate]);

  const handleNavigateAttendance = useCallback(() => {
    navigate('/attendance');
  }, [navigate]);

  const handleOpenCiePopup = useCallback(() => {
    setCiePopupOpen(true);
  }, []);

  const handleCloseCiePopup = useCallback(() => {
    setCiePopupOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] gap-3 bg-canvas-bg text-text-primary">
        <TetrisLoader columns={8} rows={14} cellSize={4} gap={1.5} speed={35} label="Loading dashboard..." />
        <span className="text-xs font-semibold text-text-secondary tracking-wide">Loading dashboard...</span>
      </div>
    );
  }

  if (!profile || !profile.prn || !profile.dob) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 bg-canvas-bg text-text-primary">
        <TetrisLoader columns={8} rows={14} cellSize={4} gap={1.5} speed={35} label="Redirecting..." />
        <span className="text-xs font-semibold text-text-secondary tracking-wide">Please sign in from the landing page. Redirecting...</span>
      </div>
    );
  }

  const latestAnnouncement = announcements[0];

  return (
    <div className="flex flex-col min-h-screen bg-canvas-bg text-text-primary w-full max-w-full overflow-x-hidden min-w-0">
      {/* Top Header - Unstop Pill Style */}
      <header className="hidden md:flex sticky top-0 z-40 h-16 bg-[#FFFFFF] px-6 lg:px-8 items-center justify-between border-b border-[#E2E2E2] shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search01Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727272]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-[#FFFFFF] border border-[#E2E2E2] text-[#383838] placeholder:text-[#727272] text-sm focus:outline-none focus:border-[#0073E6] focus:ring-1 focus:ring-[#0073E6] transition-all font-normal"
              placeholder="Search courses, roadmaps, notices..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!(localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER') && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9ECFF] text-[#174073] text-xs font-semibold tabular-nums border border-[#D9ECFF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0073E6]"></span>
              Attendance {stats.overall}%
            </span>
          )}
          <div className="relative" ref={topHeaderCalendarRef}>
            <button
              type="button"
              onClick={() => setShowHeaderCalendar(prev => !prev)}
              className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${showHeaderCalendar
                ? 'bg-[#D9ECFF] border-[#0073E6] text-[#0073E6]'
                : 'bg-[#FFFFFF] hover:bg-[#DEEDFC]/40 border-[#E2E2E2] text-[#383838]'
                }`}
              title="Deadlines Calendar"
              aria-label="Upcoming Deadlines Calendar"
              aria-expanded={showHeaderCalendar}
            >
              <CalendarIcon className="w-4 h-4 text-[#174073]" />
              {annoDeadlinesList.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E11D48] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {annoDeadlinesList.length}
                </span>
              )}
            </button>
            {showHeaderCalendar && (
              <DeadlinesPopover
                isOpen={showHeaderCalendar}
                deadlines={annoDeadlinesList}
                onClose={() => setShowHeaderCalendar(false)}
                anchorRef={topHeaderCalendarRef}
              />
            )}
          </div>

          <button
            onClick={handleNavigateAnnouncements}
            className="relative w-9 h-9 rounded-full bg-[#FFFFFF] hover:bg-[#DEEDFC]/40 border border-[#E2E2E2] flex items-center justify-center text-[#383838] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Notification01Icon size={19} className="text-[#174073]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0073E6]"></span>
          </button>
          <div className="flex items-center gap-2.5 pl-3 border-l border-[#E2E2E2]">
            {profile?.image ? (
              <img
                src={profile.image}
                alt={formatName(profile?.name)}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#D9ECFF]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div className={`w-9 h-9 rounded-full bg-[#0073E6] text-white items-center justify-center font-bold text-xs ring-2 ring-[#D9ECFF] ${profile?.image ? 'hidden' : 'flex'}`}>
              {getInitials(profile?.name)}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#383838] leading-tight">{formatName(profile?.name)}</span>
              <span className="text-[11px] text-[#727272] leading-tight mt-0.5 font-medium">
                {[profile?.rollNo || profile?.prn, getDepartmentName(profile?.department), profile?.semester ? `Sem ${profile.semester}` : null].filter(Boolean).join(' • ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative py-3 sm:py-6 px-3.5 sm:px-6 lg:px-8 pb-28 md:pb-12 flex-1 w-full max-w-7xl mx-auto space-y-4 sm:space-y-5 min-w-0 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5 min-w-0">
          {/* Student Profile & Hero Area */}
          <section className="bg-white rounded-[12px] border border-[#E2E2E2] p-4 sm:p-5 w-full min-w-0">
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  {profile?.image ? (
                    <img
                      src={profile.image}
                      alt={formatName(profile?.name)}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-full object-cover ring-1 ring-[#E2E2E2]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`w-12 h-12 rounded-full bg-[#0073E6] text-white items-center justify-center font-bold text-sm ring-1 ring-[#E2E2E2] ${profile?.image ? 'hidden' : 'flex'}`}>
                    {getInitials(profile?.name)}
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-semibold text-[#383838] tracking-normal leading-tight truncate">
                      Welcome, <span className="text-[#0073E6] font-bold">{formatName(profile?.name)}</span>
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#727272] mt-1 flex-wrap">
                    {(profile?.rollNo || profile?.prn) && (
                      <span className="font-mono text-[#174073] font-medium">
                        {(localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER') ? `ID: ${profile?.prn}` : (profile?.rollNo || profile?.prn)}
                      </span>
                    )}
                    {getDepartmentName(profile?.department) && (
                      <>
                        <span className="text-[#E2E2E2]">•</span>
                        <span>{getDepartmentName(profile?.department).toUpperCase()}</span>
                      </>
                    )}
                    {!(localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER') && (profile?.semester || profile?.section) && (
                      <>
                        <span className="text-[#E2E2E2]">•</span>
                        <span>{[profile?.semester ? `${profile.semester.toUpperCase()}` : null].filter(Boolean).join(' ')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Key Metrics */}
              {isTeacher ? (
                <div className="flex items-center gap-2 lg:ml-auto shrink-0 flex-wrap sm:flex-nowrap">
                  <div
                    onClick={handleNavigateAttendance}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F5F7] border border-[#E5E5EA] transition-colors cursor-pointer shadow-xs"
                  >
                    <Clock01Icon size={15} className={ncStats.pending > 0 ? "text-[#FF9F0A]" : "text-[#8E8E93]"} />
                    <span className="text-xs font-semibold text-[#1D1D1F] tabular-nums">{ncStats.pending}</span>
                    <span className="text-[11px] text-[#6E6E73]">Pending Requests</span>
                  </div>

                  <div
                    onClick={handleNavigateAttendance}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F5F7] border border-[#E5E5EA] transition-colors cursor-pointer shadow-xs"
                  >
                    <CheckmarkBadge01Icon size={15} className="text-[#34C759]" />
                    <span className="text-xs font-semibold text-[#1D1D1F] tabular-nums">{ncStats.approved}</span>
                    <span className="text-[11px] text-[#6E6E73]">Approved</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNavigateAttendance}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071E3] hover:bg-[#005BB5] text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Attendance Desk</span>
                    <ArrowRight01Icon size={13} />
                  </button>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-2 ml-auto shrink-0">
                  <div
                    onClick={handleNavigateAttendance}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-white hover:bg-[#DEEDFC]/30 border border-[#E2E2E2] transition-colors cursor-pointer"
                  >
                    <CheckmarkBadge01Icon size={16} className="text-[#0073E6]" />
                    <span className="text-xs font-bold text-[#383838] tabular-nums">{stats.overall}%</span>
                    <span className="text-[11px] text-[#727272]">Attendance</span>
                  </div>

                  <div
                    onClick={handleNavigateAttendance}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-white hover:bg-rose-50/40 border border-[#E2E2E2] hover:border-[#E11D48]/30 transition-colors cursor-pointer"
                  >
                    <AlertCircleIcon size={16} className="text-[#E11D48]" />
                    <span className="text-xs font-bold text-[#E11D48] tabular-nums">{stats.riskCount}</span>
                    <span className="text-[11px] text-[#727272]">At-Risk</span>
                  </div>
                </div>
              )}
            </div>

            {/* Native Mobile Metric Cards Grid */}
            {isTeacher ? (
              <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#E5E5EA] lg:hidden">
                <div
                  onClick={handleNavigateAttendance}
                  className="flex flex-col bg-white rounded-lg p-2.5 border border-[#E5E5EA] active:bg-[#F5F5F7] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">Pending NC</span>
                    <Clock01Icon size={14} className={ncStats.pending > 0 ? "text-[#FF9F0A]" : "text-[#8E8E93]"} />
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className={cn("text-base font-bold leading-none tabular-nums", ncStats.pending > 0 ? "text-[#FF9F0A]" : "text-[#1D1D1F]")}>
                      {ncStats.pending}
                    </span>
                  </div>
                </div>
                <div
                  onClick={handleNavigateAttendance}
                  className="flex flex-col bg-white rounded-lg p-2.5 border border-[#E5E5EA] active:bg-[#F5F5F7] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">Approved</span>
                    <CheckmarkBadge01Icon size={14} className="text-[#34C759]" />
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-base font-bold text-[#1D1D1F] leading-none tabular-nums">{ncStats.approved}</span>
                  </div>
                </div>
                <div
                  onClick={handleNavigateAnnouncements}
                  className="flex flex-col bg-white rounded-lg p-2.5 border border-[#E5E5EA] active:bg-[#F5F5F7] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">Notices</span>
                    <Megaphone01Icon size={14} className="text-[#0071E3]" />
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-base font-bold text-[#1D1D1F] leading-none tabular-nums">{announcements?.length || 0}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#E2E2E2] lg:hidden">
                <div
                  onClick={handleNavigateAttendance}
                  className="flex flex-col bg-white rounded-lg p-2.5 border border-[#E2E2E2] active:bg-[#DEEDFC]/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-normal text-[#727272]">Attendance</span>
                    <Calendar03Icon size={15} className="text-[#0073E6]" />
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-base font-bold text-[#0073E6] leading-none tabular-nums">{stats.overall}%</span>
                  </div>
                </div>
                <div
                  onClick={handleNavigateAttendance}
                  className="flex flex-col bg-white rounded-lg p-2.5 border border-[#E2E2E2] active:bg-rose-50/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-normal text-[#727272]">Below 75%</span>
                    <AlertCircleIcon size={15} className="text-[#E11D48]" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-base font-bold text-[#E11D48] leading-none tabular-nums">{stats.riskCount}</span>
                    <span className="text-[10px] text-[#727272]">Subs</span>
                  </div>
                </div>
                <div
                  onClick={handleOpenCiePopup}
                  className="flex flex-col bg-white rounded-lg p-2.5 border border-[#E2E2E2] active:bg-[#DEEDFC]/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-normal text-[#727272]">CIE Avg</span>
                    <BarChartIcon size={15} className="text-[#174073]" />
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-base font-bold text-[#383838] leading-none tabular-nums">{cieAverage ? `${cieAverage}%` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Urgent Broadcast Notification Banner */}
          {latestAnnouncement && (
            <div className="lg:hidden bg-white rounded-xl p-3 border border-[#E2E2E2] flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-[#D9ECFF] text-[#0073E6] flex items-center justify-center shrink-0">
                  <Megaphone01Icon size={17} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0073E6]" />
                    <span className="text-[9px] font-bold text-[#0073E6] uppercase tracking-wide">Notice</span>
                  </div>
                  <span className="text-xs font-semibold text-[#383838] font-sans leading-snug line-clamp-1 truncate mt-0.5">{latestAnnouncement.title}</span>
                  <span className="text-[10px] text-[#727272] truncate">
                    {latestAnnouncement.type || 'Notice'} • {latestAnnouncement.createdAt ? new Date(latestAnnouncement.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleNavigateAnnouncements}
                className="px-3.5 py-1 rounded-full bg-[#0073E6] hover:bg-[#4A9AF0] text-white font-medium text-xs shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View</span>
                <ArrowRight01Icon size={13} />
              </button>
            </div>
          )}

          {/* Core Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Core Academics & Tracking (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Section 1: Attendance Activity Heatmap OR Faculty NC Management */}
              {isTeacher ? (
                <FacultyNcSection
                  facultyNcRequests={facultyNcRequests}
                  facultyNcLoading={facultyNcLoading}
                  ncStats={ncStats}
                  ncFilterStatus={ncFilterStatus}
                  setNcFilterStatus={setNcFilterStatus}
                  ncSearchQuery={ncSearchQuery}
                  setNcSearchQuery={setNcSearchQuery}
                  filteredFacultyNc={filteredFacultyNc}
                  fetchFacultyNc={fetchFacultyNc}
                  reviewingReq={reviewingReq}
                  reviewDecision={reviewDecision}
                  setReviewDecision={setReviewDecision}
                  reviewComment={reviewComment}
                  setReviewComment={setReviewComment}
                  isSubmittingReview={isSubmittingReview}
                  onStartReview={handleStartReview}
                  onCloseReview={handleCloseReview}
                  onSaveDecision={handleTeacherReview}
                  onViewProof={handleViewProof}
                  getNcProofUrl={getNcProofUrl}
                />
              ) : (
                <AttendanceRadarSection
                  subjects={subjects}
                  totalSessionsRecorded={totalSessionsRecorded}
                />
              )}

              {/* Section 2: Brabble.ai Hackathons Feed */}
              {!isTeacher && <HackathonsFeed />}

              {/* Section 3: Milestones & Deadlines Timeline */}
              <TimelineSection
                combinedTimeline={combinedTimeline}
                annoDeadlinesList={annoDeadlinesList}
                showHomeCalendar={showHomeCalendar}
                setShowHomeCalendar={setShowHomeCalendar}
                homeCalendarRef={homeCalendarRef}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                newMilestone={newMilestone}
                setNewMilestone={setNewMilestone}
                handleAddMilestone={handleAddMilestone}
                handleDeleteMilestone={handleDeleteMilestone}
              />
            </div>

            {/* Right Column: Broadcasts & CIE Scores (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Section 4: Campus Announcements Feed */}
              <AnnouncementsSection
                announcements={announcements}
                onNavigateAnnouncements={handleNavigateAnnouncements}
              />

              {/* Section 5: CIE Scores (Student) OR Faculty Operations Hub (Teacher) */}
              {isTeacher ? (
                <section className="bg-white rounded-xl p-5 border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full min-w-0">
                  <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#E5E5EA]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] flex items-center justify-center shrink-0">
                        <Task01Icon size={17} />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F]">
                          Faculty Operations
                        </h2>
                        <p className="text-[11px] text-[#6E6E73]">Quick management shortcuts &amp; tools</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleNavigateAnnouncements}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] hover:border-[#D2D2D7] text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0071E3]/8 text-[#0071E3] flex items-center justify-center shrink-0 mt-0.5">
                        <Megaphone01Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors">Post Notice</span>
                          <ArrowRight01Icon size={12} className="text-[#8E8E93] group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-[#6E6E73] mt-0.5 leading-snug">Publish department notices and exam circulars</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleNavigateAttendance}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] hover:border-[#D2D2D7] text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 text-[#34C759] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckmarkBadge01Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors">Attendance Desk</span>
                          <ArrowRight01Icon size={12} className="text-[#8E8E93] group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-[#6E6E73] mt-0.5 leading-snug">Full class attendance logs and leave records</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/notes')}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] hover:border-[#D2D2D7] text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen01Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors">Course Notes</span>
                          <ArrowRight01Icon size={12} className="text-[#8E8E93] group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-[#6E6E73] mt-0.5 leading-snug">Upload subject modules, slides and question banks</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/roadmaps')}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] hover:border-[#D2D2D7] text-left transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar03Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors">Curriculum Tracks</span>
                          <ArrowRight01Icon size={12} className="text-[#8E8E93] group-hover:text-[#0071E3] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-[#6E6E73] mt-0.5 leading-snug">Academic pathways and prerequisite maps</p>
                      </div>
                    </button>
                  </div>
                </section>
              ) : (
                <CiePerformanceSection
                  displayCieList={displayCieList}
                  subjectRegistry={subjectRegistry}
                  profile={profile}
                  onOpenCiePopup={handleOpenCiePopup}
                />
              )}
            </div>
          </div>

          {/* Platform Footer */}
          <footer className="mt-12 pt-6 pb-8 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8E8E93]">
            <div className="flex items-center gap-2">
              <span>© 2026 CampusAxis • Academic Intelligence</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenDeveloper}
                className="hover:text-[#0071E3] transition-colors cursor-pointer font-medium"
              >
                Meet Developer
              </button>
            </div>
          </footer>
        </div>
      </main>

      {/* CIE Breakdown Popup Modal */}
      <CieBreakdownModal
        isOpen={!isTeacher && ciePopupOpen}
        onClose={handleCloseCiePopup}
        profile={profile}
        subjectRegistry={subjectRegistry}
        cieStats={cieStats}
        cieCardRef={cieCardRef}
        cieExportRef={cieExportRef}
        onExportCie={handleExportCie}
        exportingCie={exportingCie}
      />

      {/* Document Preview Modal */}
      {docPreviewUrl && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <File01Icon size={18} className="text-primary" />
                <span className="font-bold text-xs sm:text-sm text-slate-900">{docPreviewName}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={docPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={docPreviewName}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                  title="Download Document"
                >
                  <Download01Icon size={18} />
                </a>
                <button
                  onClick={() => setDocPreviewUrl(null)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                >
                  <Cancel01Icon size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 overflow-auto flex items-center justify-center bg-slate-100 min-h-[350px]">
              {docPreviewUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={docPreviewUrl}
                  title="NC Proof Preview"
                  className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={docPreviewUrl}
                  alt={docPreviewName}
                  className="max-h-[60vh] object-contain rounded-xl border border-slate-200 shadow-xs"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                  }}
                />
              )}
              <div className="hidden text-center p-6 text-slate-500">
                <AlertCircleIcon size={32} className="text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-semibold">Document cannot be previewed directly in frame.</p>
                <a
                  href={docPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
                >
                  Download &amp; View File
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeDashboard;
