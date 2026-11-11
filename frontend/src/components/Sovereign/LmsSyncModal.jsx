import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    X,
    RefreshCw,
    CheckCircle2,
    FileText,
    ChevronDown,
    ChevronUp,
    Lock,
    User,
    Minus,
    Maximize2,
    LogIn,
    Download,
    Search,
    Copy,
    Terminal,
    CheckSquare,
    Square,
    ArrowLeft,
    Clock,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const formatLogTime = () =>
    new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatAuditTimestamp = (iso) => {
    if (!iso) return 'Not run yet';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return 'Recently';
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Recently';
    }
};

const LmsSyncModal = ({ isOpen, onClose, onSyncComplete }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [discoveredCourses, setDiscoveredCourses] = useState(null);
    const [availabilityReport, setAvailabilityReport] = useState(null);
    const [selectedCourseIds, setSelectedCourseIds] = useState([]);
    const [courseSearch, setCourseSearch] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('all'); // 'all' | 'updates'
    const [testImport, setTestImport] = useState(false);
    const [showCredentialsEditor, setShowCredentialsEditor] = useState(false);

    const [progress, setProgress] = useState(null);
    const [logs, setLogs] = useState([]);
    const [syncResult, setSyncResult] = useState(null);
    const [showUnmatched, setShowUnmatched] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const pollingRef = useRef(null);
    const logContainerRef = useRef(null);
    const syncedBackendCountRef = useRef(0);
    const lastPolledUserRef = useRef('');

    const isBusy = isDiscovering || isAuditing || isSyncing;

    // Enrich discovered courses with latest availability report counts if present
    const mergedCourses = useMemo(() => {
        if (!Array.isArray(discoveredCourses)) return [];
        const auditMap = new Map();
        if (availabilityReport?.courses) {
            availabilityReport.courses.forEach(ac => {
                if (ac.id) auditMap.set(ac.id, ac);
            });
        }
        return discoveredCourses.map(c => {
            const audited = auditMap.get(c.id);
            if (!audited) return c;
            const moodleCount = typeof audited.moodleCount === 'number' && audited.moodleCount >= 0
                ? audited.moodleCount
                : (typeof c.moodleCount === 'number' ? c.moodleCount : -1);
            const vaultCount = typeof audited.vaultCount === 'number'
                ? audited.vaultCount
                : (typeof c.vaultCount === 'number' ? c.vaultCount : 0);
            const extraNotesCount = moodleCount >= 0 ? Math.max(0, moodleCount - vaultCount) : 0;
            return {
                ...c,
                moodleCount,
                vaultCount,
                extraNotesCount,
                hasNewNotes: moodleCount > vaultCount,
                availabilityCheckedAt: audited.availabilityCheckedAt || availabilityReport?.checkedAt
            };
        });
    }, [discoveredCourses, availabilityReport]);

    const updatedCourseIds = useMemo(
        () => mergedCourses.filter(c => c.hasNewNotes).map(c => c.id),
        [mergedCourses]
    );

    const filteredCourses = useMemo(() => {
        const q = courseSearch.trim().toLowerCase();
        return mergedCourses.filter(c => {
            if (subjectFilter === 'updates' && !c.hasNewNotes) return false;
            if (!q) return true;
            return (
                (c.fullname || '').toLowerCase().includes(q) ||
                (c.matchedSubjectName || '').toLowerCase().includes(q) ||
                (c.code || '').toLowerCase().includes(q) ||
                (c.shortname || '').toLowerCase().includes(q) ||
                String(c.id || '').toLowerCase().includes(q)
            );
        });
    }, [mergedCourses, courseSearch, subjectFilter]);

    const appendClientLog = (message) => {
        if (!message) return;
        setLogs(prev => [...prev, `[${formatLogTime()}] ${message}`]);
    };

    const mergeBackendLogs = (backendLogs) => {
        if (!Array.isArray(backendLogs) || backendLogs.length === 0) return;
        const prevCount = syncedBackendCountRef.current;
        if (backendLogs.length < prevCount) {
            syncedBackendCountRef.current = backendLogs.length;
            setLogs(prev => [...prev, ...backendLogs]);
            return;
        }
        if (backendLogs.length > prevCount) {
            const delta = backendLogs.slice(prevCount);
            syncedBackendCountRef.current = backendLogs.length;
            setLogs(prev => [...prev, ...delta]);
        }
    };

    const fetchFinalProgress = async (user) => {
        if (!user) return;
        try {
            const res = await axios.get(`${API_BASE}/lms/progress?username=${encodeURIComponent(user)}`);
            if (res.data) {
                setProgress(res.data);
                mergeBackendLogs(res.data.logs);
            }
        } catch {
            // ignore final poll failure
        }
    };

    const loadAvailabilityReport = async () => {
        try {
            const res = await axios.get(`${API_BASE}/lms/availability`);
            if (res.data) {
                setAvailabilityReport(res.data);
            }
        } catch {
            // non-fatal if report unavailable
        }
    };

    const startPolling = (user) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE}/lms/progress?username=${encodeURIComponent(user)}`);
                if (res.data) {
                    setProgress(res.data);
                    mergeBackendLogs(res.data.logs);
                }
            } catch {
                // ignore transient poll failure
            }
        }, 400);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopPolling();
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    useEffect(() => {
        if (isOpen) {
            loadAvailabilityReport();
            if (!isBusy && !syncResult) {
                setIsMinimized(false);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDiscover = async () => {
        const cleanUser = username.trim();
        const cleanPass = password.trim();
        if (!cleanUser || !cleanPass) {
            toast.error('Please enter both Moodle username and password.');
            return;
        }

        setIsDiscovering(true);
        setSyncResult(null);
        setShowCredentialsEditor(false);
        if (lastPolledUserRef.current !== cleanUser.toLowerCase()) {
            syncedBackendCountRef.current = 0;
            lastPolledUserRef.current = cleanUser.toLowerCase();
        }
        appendClientLog(`Authenticating with Moodle as ${cleanUser}...`);

        const toastId = toast.loading('Logging into Moodle & loading subjects...');
        const userRole = localStorage.getItem('eduvault_user_role') || 'teacher';
        startPolling(cleanUser);

        try {
            const [discoverRes] = await Promise.all([
                axios.post(`${API_BASE}/lms/discover`, {
                    username: cleanUser,
                    password: cleanPass
                }, {
                    headers: { 'X-User-Role': userRole }
                }),
                loadAvailabilityReport()
            ]);

            const courses = Array.isArray(discoverRes.data) ? discoverRes.data : [];
            setDiscoveredCourses(courses);
            setSelectedCourseIds([]);
            setCourseSearch('');
            setSubjectFilter('all');
            await fetchFinalProgress(cleanUser);
            appendClientLog(`Ready: ${courses.length} subjects loaded. Select subjects and click Fetch.`);
            toast.success(`Logged in! Found ${courses.length} subjects.`, { id: toastId });
        } catch (err) {
            await fetchFinalProgress(cleanUser);
            const msg = err.response?.data?.error || err.message || 'Failed to connect to Moodle portal.';
            appendClientLog(`Login error: ${msg}`);
            toast.error(msg, { id: toastId });
        } finally {
            stopPolling();
            setIsDiscovering(false);
        }
    };

    const handleRunAvailabilityCheck = async () => {
        const cleanUser = username.trim();
        const cleanPass = password.trim();
        const auditUser = cleanUser || availabilityReport?.username || '24UAD022';

        setIsAuditing(true);
        if (lastPolledUserRef.current !== auditUser.toLowerCase()) {
            syncedBackendCountRef.current = 0;
            lastPolledUserRef.current = auditUser.toLowerCase();
        }
        appendClientLog(`Checking Moodle note counts vs EduVault noteCount (${auditUser})...`);
        const toastId = toast.loading('Checking Moodle subjects for new notes...');
        const userRole = localStorage.getItem('eduvault_user_role') || 'teacher';
        startPolling(auditUser);

        try {
            const body = cleanUser && cleanPass ? { username: cleanUser, password: cleanPass } : {};
            const res = await axios.post(`${API_BASE}/lms/availability/check`, body, {
                headers: { 'X-User-Role': userRole }
            });
            setAvailabilityReport(res.data);
            if (Array.isArray(res.data?.courses) && discoveredCourses !== null) {
                setDiscoveredCourses(res.data.courses);
            }
            await fetchFinalProgress(auditUser);
            const updatedCount = res.data?.subjectsWithNewNotes || 0;
            appendClientLog(`Availability check finished: ${updatedCount} subject(s) have new notes on Moodle.`);
            toast.success(
                updatedCount > 0
                    ? `${updatedCount} subject(s) have new notes ready to fetch.`
                    : 'All checked subjects match current EduVault counts.',
                { id: toastId }
            );
        } catch (err) {
            await fetchFinalProgress(auditUser);
            const msg = err.response?.data?.error || err.message || 'Availability check failed.';
            appendClientLog(`Availability check error: ${msg}`);
            toast.error(msg, { id: toastId });
        } finally {
            stopPolling();
            setIsAuditing(false);
        }
    };

    const handleFetchSelected = async () => {
        const cleanUser = username.trim();
        const cleanPass = password.trim();
        if (!cleanUser || !cleanPass) {
            toast.error('Please enter both Moodle username and password.');
            return;
        }
        if (selectedCourseIds.length === 0) {
            toast.error('Please select at least one subject to fetch.');
            return;
        }

        setIsSyncing(true);
        setSyncResult(null);
        if (lastPolledUserRef.current !== cleanUser.toLowerCase()) {
            syncedBackendCountRef.current = 0;
            lastPolledUserRef.current = cleanUser.toLowerCase();
        }
        setProgress({
            status: 'AUTHENTICATING',
            currentStage: `Fetching ${selectedCourseIds.length} selected subject(s)...`,
            percent: 5,
            materialsFound: 0,
            importedCount: 0,
            skippedCount: 0
        });
        appendClientLog(`Starting fetch for ${selectedCourseIds.length} selected subject(s)...`);

        startPolling(cleanUser);

        try {
            const userRole = localStorage.getItem('eduvault_user_role') || 'teacher';
            const res = await axios.post(`${API_BASE}/lms/sync`, {
                username: cleanUser,
                password: cleanPass,
                testImport,
                courseIds: selectedCourseIds
            }, {
                headers: { 'X-User-Role': userRole }
            });

            await fetchFinalProgress(cleanUser);
            await loadAvailabilityReport();
            if (Array.isArray(res.data?.allDiscoveredCourses)) {
                setDiscoveredCourses(res.data.allDiscoveredCourses);
            }
            setSyncResult(res.data);
            appendClientLog(
                `Fetch finished: ${res.data.importedCount} imported, ${res.data.skippedDuplicatesCount} duplicates skipped, ${res.data.failureCount || 0} failed.`
            );
            toast.success(
                `Sync complete: ${res.data.importedCount} new notes imported (${res.data.skippedDuplicatesCount} duplicates skipped).`
            );
            if (onSyncComplete) {
                onSyncComplete();
            }
        } catch (err) {
            await fetchFinalProgress(cleanUser);
            const msg = err.response?.data?.error || err.message || 'Failed to synchronize with Moodle.';
            appendClientLog(`Sync error: ${msg}`);
            toast.error(msg);
        } finally {
            stopPolling();
            setIsSyncing(false);
        }
    };

    const toggleCourse = (courseId) => {
        if (isBusy) return;
        setSelectedCourseIds(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const selectAllVisible = () => {
        if (isBusy) return;
        const visibleIds = filteredCourses.map(c => c.id);
        setSelectedCourseIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    };

    const selectUpdatedOnly = () => {
        if (isBusy) return;
        setSelectedCourseIds(updatedCourseIds);
        if (updatedCourseIds.length > 0) {
            setSubjectFilter('updates');
        }
    };

    const clearSelection = () => {
        if (isBusy) return;
        setSelectedCourseIds([]);
    };

    const copyLogs = async () => {
        try {
            await navigator.clipboard.writeText(logs.join('\n'));
            toast.success(`Copied ${logs.length} log lines`);
        } catch {
            toast.error('Failed to copy logs');
        }
    };

    const handleCloseModal = () => {
        if (isBusy) return;
        stopPolling();
        setIsMinimized(false);
        onClose();
    };

    if (isMinimized) {
        return (
            <div
                className="fixed bottom-6 right-6 z-[120] bg-white border border-[#E5E5EA] rounded-2xl shadow-lg p-3.5 flex items-center gap-3 text-xs text-[#1D1D1F] max-w-sm"
                role="region"
                aria-label="Background Moodle Sync"
            >
                <div className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#0071E3] flex items-center justify-center shrink-0">
                    <RefreshCw className={cn('w-4 h-4', isBusy && 'animate-spin')} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1D1D1F] truncate">
                            {isBusy ? 'Syncing Moodle...' : syncResult ? 'Fetch Completed' : 'Moodle Sync'}
                        </span>
                        {isBusy && (
                            <span className="font-mono text-[11px] text-[#0071E3] font-semibold tabular-nums">
                                {progress?.percent || 5}%
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-[#6E6E73] truncate mt-0.5">
                        {isBusy
                            ? (progress?.currentStage || 'Processing courses...')
                            : syncResult
                                ? `${syncResult.importedCount} materials imported`
                                : `${mergedCourses.length} subjects ready`}
                    </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsMinimized(false)}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                        title="Expand window"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    {!isBusy && (
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                            title="Close"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const isLoggedIn = Array.isArray(discoveredCourses);
    const allFilteredSelected = filteredCourses.length > 0 && filteredCourses.every(c => selectedCourseIds.includes(c.id));
    const reportUpdatesCount = availabilityReport?.subjectsWithNewNotes || 0;
    const updatedSubjectsFromReport = (availabilityReport?.courses || []).filter(c => c.hasNewNotes);

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
            <div
                className="relative w-full max-w-2xl max-h-[92vh] bg-white border border-[#E5E5EA] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden text-[#1D1D1F]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA] bg-[#FBFBFD]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F] shrink-0">
                            <RefreshCw className={cn('w-4 h-4 text-[#0071E3]', isBusy && 'animate-spin')} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
                                    Moodle Multi-Subject Fetch
                                </h2>
                                <span className="text-[11px] font-medium text-[#0071E3] bg-[#0071E3]/8 px-2 py-0.5 rounded-md border border-[#0071E3]/20">
                                    {!isLoggedIn ? 'Step 1 · Login' : syncResult ? 'Step 3 · Complete' : 'Step 2 · Select Subjects'}
                                </span>
                            </div>
                            <p className="text-xs text-[#6E6E73] mt-0.5">
                                Login once, pick one or multiple subjects from Moodle, fetch notes, and review full logs
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                            title="Minimize to background"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer disabled:opacity-40"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Nightly 3:00 AM Audit Status Bar */}
                    {!isSyncing && !syncResult && (
                        <div className="rounded-xl border border-[#E5E5EA] bg-[#FBFBFD] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 text-xs font-medium text-[#1D1D1F]">
                                    <Clock className="w-3.5 h-3.5 text-[#6E6E73] shrink-0" />
                                    <span>Nightly Moodle Check (03:00 AM IST)</span>
                                    {availabilityReport?.checkedAt && (
                                        <span className="text-[11px] font-normal text-[#6E6E73] tabular-nums">
                                            · Last: {formatAuditTimestamp(availabilityReport.checkedAt)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-[#6E6E73]">
                                    {!availabilityReport?.checkedAt
                                        ? 'No availability check recorded yet. Run a check to compare Moodle notes against current EduVault counts.'
                                        : reportUpdatesCount > 0
                                            ? `${reportUpdatesCount} of ${availabilityReport.totalCourses} subjects have more notes on Moodle than EduVault.`
                                            : `All ${availabilityReport.totalCourses} checked subjects match current EduVault note counts.`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleRunAvailabilityCheck}
                                disabled={isBusy}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D2D2D7] bg-white hover:bg-[#F5F5F7] text-[11px] font-medium text-[#1D1D1F] transition cursor-pointer disabled:opacity-50 shrink-0"
                            >
                                <RefreshCw className={cn('w-3 h-3 text-[#0071E3]', isAuditing && 'animate-spin')} />
                                <span>{isAuditing ? 'Checking...' : 'Check New Notes'}</span>
                            </button>
                        </div>
                    )}

                    {/* Pre-login preview of subjects flagged by Nightly Check */}
                    {!isLoggedIn && !isSyncing && !syncResult && updatedSubjectsFromReport.length > 0 && (
                        <div className="rounded-xl border border-[#C6EFD2] bg-[#EAF9EE]/50 px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#1B7F37] flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                    <span>{updatedSubjectsFromReport.length} subject(s) with new notes detected</span>
                                </span>
                                <span className="text-[11px] text-[#1B7F37]/80">Login below to fetch only these</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {updatedSubjectsFromReport.map(c => (
                                    <span
                                        key={c.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#C6EFD2] text-[11px] text-[#1D1D1F] tabular-nums"
                                    >
                                        <span className="font-medium truncate max-w-[180px]">{c.matchedSubjectName || c.fullname}</span>
                                        <span className="font-semibold text-[#1B7F37]">+{c.extraNotesCount}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Login Form */}
                    {(!isLoggedIn || showCredentialsEditor) && !isSyncing && !syncResult && (
                        <div className="bg-[#FBFBFD] border border-[#E5E5EA] rounded-xl p-4 sm:p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
                                    <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                                    <span>Moodle Credentials</span>
                                </h3>
                                {isLoggedIn && (
                                    <button
                                        type="button"
                                        onClick={() => setShowCredentialsEditor(false)}
                                        className="text-[11px] font-medium text-[#0071E3] hover:underline cursor-pointer"
                                    >
                                        Cancel edit
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-[#6E6E73]">Username / PRN</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E93]" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            disabled={isBusy}
                                            placeholder="Enter Moodle username"
                                            className="w-full bg-white border border-[#E5E5EA] rounded-lg py-2 pl-9 pr-3 text-xs text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-[#0071E3] transition"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-[#6E6E73]">Moodle Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E93]" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !isBusy) {
                                                    handleDiscover();
                                                }
                                            }}
                                            disabled={isBusy}
                                            placeholder="••••••••"
                                            className="w-full bg-white border border-[#E5E5EA] rounded-lg py-2 pl-9 pr-3 text-xs text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-[#0071E3] transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleDiscover}
                                    disabled={isBusy}
                                    className="inline-flex items-center justify-center rounded-lg text-xs font-medium bg-[#0071E3] hover:bg-[#005BB5] text-white h-9 px-4 gap-2 transition cursor-pointer disabled:opacity-50"
                                >
                                    {isDiscovering ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <LogIn className="w-3.5 h-3.5" />
                                    )}
                                    <span>{isDiscovering ? 'Logging in...' : isLoggedIn ? 'Re-Login & Refresh Subjects' : 'Login & Show Subjects'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Connected Account + Multi-Subject Selection */}
                    {isLoggedIn && !isSyncing && !syncResult && (
                        <div className="space-y-3">
                            {!showCredentialsEditor && (
                                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#FBFBFD] border border-[#E5E5EA] text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2 h-2 rounded-full bg-[#34C759] shrink-0" />
                                        <span className="text-[#6E6E73]">Logged in as</span>
                                        <span className="font-semibold text-[#1D1D1F] font-mono truncate">{username.trim()}</span>
                                        <span className="text-[11px] text-[#6E6E73] tabular-nums">· {mergedCourses.length} subjects</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleDiscover}
                                            disabled={isBusy}
                                            className="text-[11px] font-medium text-[#0071E3] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        >
                                            <RefreshCw className={cn('w-3 h-3', isDiscovering && 'animate-spin')} />
                                            <span>Refresh List</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowCredentialsEditor(true)}
                                            disabled={isBusy}
                                            className="text-[11px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer disabled:opacity-50"
                                        >
                                            Switch Account
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Filter & Bulk Selection Controls */}
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E93]" />
                                        <input
                                            type="text"
                                            value={courseSearch}
                                            onChange={(e) => setCourseSearch(e.target.value)}
                                            placeholder="Search subjects by name or course code..."
                                            className="w-full bg-white border border-[#E5E5EA] rounded-lg py-1.5 pl-8 pr-3 text-xs text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-[#0071E3] transition"
                                        />
                                    </div>

                                    <div className="inline-flex rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-0.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setSubjectFilter('all')}
                                            className={cn(
                                                'px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer tabular-nums',
                                                subjectFilter === 'all'
                                                    ? 'bg-white text-[#1D1D1F] border border-[#E5E5EA]'
                                                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                                            )}
                                        >
                                            All ({mergedCourses.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSubjectFilter('updates')}
                                            className={cn(
                                                'px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer tabular-nums',
                                                subjectFilter === 'updates'
                                                    ? 'bg-white text-[#1B7F37] border border-[#E5E5EA]'
                                                    : updatedCourseIds.length > 0
                                                        ? 'text-[#1B7F37] hover:bg-white/60'
                                                        : 'text-[#6E6E73]'
                                            )}
                                        >
                                            More Available ({updatedCourseIds.length})
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {updatedCourseIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={selectUpdatedOnly}
                                                className="px-2.5 py-1.5 rounded-lg border border-[#C6EFD2] bg-[#EAF9EE] hover:bg-[#DCF5E3] text-[11px] font-medium text-[#1B7F37] transition cursor-pointer tabular-nums"
                                            >
                                                Select New Only ({updatedCourseIds.length})
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={allFilteredSelected ? clearSelection : selectAllVisible}
                                            className="px-2.5 py-1.5 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] text-[11px] font-medium text-[#1D1D1F] transition cursor-pointer tabular-nums"
                                        >
                                            {allFilteredSelected ? 'Deselect All' : `Select All (${filteredCourses.length})`}
                                        </button>
                                        {selectedCourseIds.length > 0 && !allFilteredSelected && (
                                            <button
                                                type="button"
                                                onClick={clearSelection}
                                                className="px-2.5 py-1.5 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] text-[11px] font-medium text-[#6E6E73] transition cursor-pointer"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setTestImport(v => !v)}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer',
                                            testImport
                                                ? 'border-[#0071E3] bg-[#0071E3]/8 text-[#0071E3]'
                                                : 'border-[#E5E5EA] bg-white text-[#6E6E73] hover:text-[#1D1D1F]'
                                        )}
                                        title="Limit total imported notes to 15 for quick testing"
                                    >
                                        {testImport ? '✓ Test Run (15 max)' : 'Test Run'}
                                    </button>
                                </div>
                            </div>

                            {/* Subjects Checklist */}
                            <div className="bg-white border border-[#E5E5EA] rounded-xl divide-y divide-[#E5E5EA] max-h-64 overflow-y-auto text-xs">
                                {filteredCourses.length === 0 ? (
                                    <div className="p-6 text-center text-[#6E6E73] text-xs space-y-2">
                                        <p>
                                            {subjectFilter === 'updates'
                                                ? 'No subjects currently have more notes on Moodle than their EduVault noteCount.'
                                                : mergedCourses.length === 0
                                                    ? 'No enrolled UAD courses were returned by Moodle.'
                                                    : 'No subjects match your search filter.'}
                                        </p>
                                        {subjectFilter === 'updates' && mergedCourses.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSubjectFilter('all')}
                                                className="text-[11px] font-medium text-[#0071E3] hover:underline cursor-pointer"
                                            >
                                                Show all {mergedCourses.length} subjects
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredCourses.map((c) => {
                                        const isSelected = selectedCourseIds.includes(c.id);
                                        const displayName = c.matchedSubjectName || c.fullname;
                                        const hasAudit = typeof c.moodleCount === 'number' && c.moodleCount >= 0;
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => toggleCourse(c.id)}
                                                className={cn(
                                                    'w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition cursor-pointer',
                                                    isSelected ? 'bg-[#0071E3]/5' : 'hover:bg-[#FBFBFD]'
                                                )}
                                            >
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <span className="mt-0.5 shrink-0 text-[#0071E3]">
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-[#D2D2D7]" />
                                                        )}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-[#1D1D1F] truncate">
                                                                {displayName}
                                                            </span>
                                                            {c.code && (
                                                                <span className="text-[10px] font-mono text-[#6E6E73] bg-[#F5F5F7] px-1.5 py-0.5 rounded border border-[#E5E5EA] shrink-0">
                                                                    {c.code}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-[#6E6E73] truncate mt-0.5 tabular-nums">
                                                            {hasAudit
                                                                ? `Moodle: ${c.moodleCount} · EduVault noteCount: ${c.vaultCount}`
                                                                : `EduVault noteCount: ${c.vaultCount || 0} · Moodle ID: ${c.id}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    {hasAudit && c.hasNewNotes ? (
                                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#EAF9EE] text-[#1B7F37] border border-[#C6EFD2] tabular-nums whitespace-nowrap">
                                                            +{c.extraNotesCount} new
                                                        </span>
                                                    ) : hasAudit ? (
                                                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#6E6E73] border border-[#E5E5EA] whitespace-nowrap">
                                                            Up to date
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#6E6E73] border border-[#E5E5EA] whitespace-nowrap">
                                                            {c.matchedSubjectId ? 'Mapped' : 'Auto-Map'}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Live Sync Progress */}
                    {isSyncing && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-3.5 h-3.5 text-[#0071E3] animate-spin" />
                                    <span className="text-xs font-semibold text-[#1D1D1F]">
                                        {progress?.status || 'Fetching Moodle Materials...'}
                                    </span>
                                </div>
                                <span className="text-xs font-mono font-semibold text-[#0071E3] tabular-nums">
                                    {progress?.percent || 5}%
                                </span>
                            </div>

                            <div className="w-full bg-[#F5F5F7] rounded-full h-1.5 overflow-hidden border border-[#E5E5EA]">
                                <div
                                    className="bg-[#0071E3] h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${Math.max(5, progress?.percent || 5)}%` }}
                                />
                            </div>

                            <div className="bg-[#FBFBFD] border border-[#E5E5EA] rounded-lg p-3 text-xs space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-[#6E6E73]">
                                    <span>Current Stage</span>
                                    <span className="font-mono text-[#1D1D1F] tabular-nums">
                                        {progress?.currentCourseIndex && progress?.totalCourses
                                            ? `Subject ${progress.currentCourseIndex} of ${progress.totalCourses}`
                                            : 'Connecting'}
                                    </span>
                                </div>
                                <p className="font-medium text-[#1D1D1F] truncate text-xs">
                                    {progress?.currentStage || 'Downloading Moodle documents...'}
                                </p>
                                {progress?.currentMaterial && (
                                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[#6E6E73] truncate border-t border-[#E5E5EA]/50">
                                        <FileText className="w-3 h-3 text-[#0071E3] shrink-0" />
                                        <span className="truncate font-mono">{progress.currentMaterial}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                <div className="bg-[#F5F5F7] rounded-lg p-2 border border-[#E5E5EA]">
                                    <span className="text-[11px] text-[#6E6E73] block">Discovered</span>
                                    <span className="text-sm font-semibold text-[#1D1D1F] tabular-nums">
                                        {progress?.materialsFound || 0}
                                    </span>
                                </div>
                                <div className="bg-[#EAF9EE] rounded-lg p-2 border border-[#C6EFD2]">
                                    <span className="text-[11px] text-[#1B7F37] block">Imported</span>
                                    <span className="text-sm font-semibold text-[#1B7F37] tabular-nums">
                                        {progress?.importedCount || 0}
                                    </span>
                                </div>
                                <div className="bg-[#FFF8E6] rounded-lg p-2 border border-[#FFE29A]">
                                    <span className="text-[11px] text-[#B25E00] block">Duplicates / Skipped</span>
                                    <span className="text-sm font-semibold text-[#B25E00] tabular-nums">
                                        {progress?.skippedCount || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completed Results Summary */}
                    {syncResult && !isSyncing && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#1B7F37]" />
                                    <span>Fetch Summary</span>
                                </h3>
                                <span className="text-[11px] text-[#6E6E73] tabular-nums">
                                    {syncResult.courses?.length || 0} Subject(s) Processed
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                                <div className="p-3 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl">
                                    <p className="text-[11px] text-[#6E6E73]">Materials</p>
                                    <p className="text-lg font-semibold text-[#1D1D1F] mt-0.5 tabular-nums">
                                        {syncResult.totalMaterialsFound}
                                    </p>
                                    <p className="text-[11px] text-[#6E6E73]">Found</p>
                                </div>
                                <div className="p-3 bg-white border border-[#E5E5EA] rounded-xl">
                                    <p className="text-[11px] text-[#6E6E73]">Matched</p>
                                    <p className="text-lg font-semibold text-[#0071E3] mt-0.5 tabular-nums">
                                        {syncResult.matchedCoursesCount}
                                    </p>
                                    <p className="text-[11px] text-[#6E6E73]">Subjects</p>
                                </div>
                                <div className="p-3 bg-[#EAF9EE] border border-[#C6EFD2] rounded-xl">
                                    <p className="text-[11px] text-[#1B7F37]">Imported</p>
                                    <p className="text-lg font-semibold text-[#1B7F37] mt-0.5 tabular-nums">
                                        {syncResult.importedCount}
                                    </p>
                                    <p className="text-[11px] text-[#1B7F37]">New Notes</p>
                                </div>
                                <div className="p-3 bg-[#FFF8E6] border border-[#FFE29A] rounded-xl">
                                    <p className="text-[11px] text-[#B25E00]">Skipped</p>
                                    <p className="text-lg font-semibold text-[#B25E00] mt-0.5 tabular-nums">
                                        {syncResult.skippedDuplicatesCount}
                                    </p>
                                    <p className="text-[11px] text-[#B25E00]">Duplicates</p>
                                </div>
                            </div>

                            {/* Processed Courses List */}
                            <div className="bg-white border border-[#E5E5EA] rounded-xl divide-y divide-[#E5E5EA] overflow-hidden">
                                <div className="px-4 py-2.5 bg-[#FBFBFD] flex items-center justify-between text-xs font-medium text-[#6E6E73]">
                                    <span>Processed Subjects</span>
                                    <span>Outcome</span>
                                </div>
                                {syncResult.courses?.map((c, i) => (
                                    <div key={i} className="px-4 py-3 flex items-center justify-between gap-4 text-xs">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[#1D1D1F] truncate">{c.subjectName || c.courseName}</span>
                                                {c.courseCode && (
                                                    <span className="text-[10px] font-mono text-[#6E6E73] bg-[#F5F5F7] px-1.5 py-0.5 rounded border border-[#E5E5EA]">
                                                        {c.courseCode}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[#6E6E73] mt-0.5 tabular-nums">
                                                Found: {c.materialsFound} · Imported: <span className="font-medium text-[#1B7F37]">{c.importedCount}</span> · Skipped: {c.skippedCount} · Failed: {c.failureCount}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            'text-[11px] font-medium px-2 py-0.5 rounded-md border shrink-0',
                                            c.status === 'SUCCESS'
                                                ? 'bg-[#EAF9EE] text-[#1B7F37] border-[#C6EFD2]'
                                                : 'bg-[#FDF2F2] text-[#D32F2F] border-[#F8C8C8]'
                                        )}>
                                            {c.status}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {syncResult.unmatchedCourses?.length > 0 && (
                                <div className="border border-[#E5E5EA] rounded-xl overflow-hidden text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setShowUnmatched(!showUnmatched)}
                                        className="w-full px-4 py-2.5 bg-[#FBFBFD] flex items-center justify-between text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                                    >
                                        <span>Unmatched Courses ({syncResult.unmatchedCourses.length})</span>
                                        {showUnmatched ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                    {showUnmatched && (
                                        <div className="p-3 bg-white max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-[#6E6E73] divide-y divide-[#E5E5EA]/60">
                                            {syncResult.unmatchedCourses.map((uc, i) => (
                                                <p key={i} className="py-1">{uc}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Persistent Full Activity Logs — Always Shown & Never Removed */}
                    {logs.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[#E5E5EA]">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-[#1D1D1F] flex items-center gap-1.5 tabular-nums">
                                    <Terminal className="w-3.5 h-3.5 text-[#0071E3]" />
                                    <span>All Activity Logs ({logs.length})</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={copyLogs}
                                    className="text-[11px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] flex items-center gap-1 cursor-pointer"
                                >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Logs</span>
                                </button>
                            </div>
                            <div
                                ref={logContainerRef}
                                className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3 font-mono text-[11px] text-[#1D1D1F] max-h-60 overflow-y-auto space-y-1"
                            >
                                {logs.map((log, idx) => (
                                    <div key={idx} className="leading-snug flex items-start gap-2 break-words">
                                        <span className="text-[#6E6E73] select-none tabular-nums shrink-0 w-6 text-right">
                                            {idx + 1}.
                                        </span>
                                        <span className={cn(
                                            log.includes('Saved') || log.includes('Complete') || log.includes('complete') || log.includes('Ready:') || log.includes('new note(s)')
                                                ? 'text-[#1B7F37]'
                                                : log.includes('Skipped') || log.includes('duplicate')
                                                    ? 'text-[#B25E00]'
                                                    : log.includes('Failed') || log.includes('error') || log.includes('Error')
                                                        ? 'text-[#D32F2F]'
                                                        : 'text-[#48484A]'
                                        )}>
                                            {log}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E5EA] bg-[#FBFBFD]">
                    {syncResult && !isSyncing ? (
                        <button
                            type="button"
                            onClick={() => setSyncResult(null)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#0071E3] hover:bg-[#0071E3]/5 transition cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Select More Subjects</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            disabled={isBusy}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer disabled:opacity-40"
                        >
                            Close
                        </button>
                    )}

                    <div className="flex items-center gap-2.5">
                        {isBusy && (
                            <button
                                type="button"
                                onClick={() => setIsMinimized(true)}
                                className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                            >
                                Minimize
                            </button>
                        )}

                        {syncResult && !isSyncing ? (
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-medium bg-[#1D1D1F] hover:bg-black text-white h-9 px-5 transition cursor-pointer"
                            >
                                Done
                            </button>
                        ) : isLoggedIn ? (
                            <button
                                type="button"
                                onClick={handleFetchSelected}
                                disabled={isBusy || selectedCourseIds.length === 0}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-medium bg-[#0071E3] hover:bg-[#005BB5] text-white h-9 px-4 gap-2 transition cursor-pointer disabled:opacity-50"
                            >
                                {isSyncing ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Download className="w-3.5 h-3.5" />
                                )}
                                <span>
                                    {isSyncing
                                        ? 'Fetching...'
                                        : `Fetch Selected (${selectedCourseIds.length})`}
                                </span>
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LmsSyncModal;
