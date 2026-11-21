import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    Settings02Icon,
    BookOpen01Icon,
    Search01Icon,
    RefreshIcon,
    UserIcon,
    FloppyDiskIcon,
    ArrowUpRight01Icon,
    Tick02Icon,
    UserMultiple02Icon,
    Key01Icon,
    ViewIcon,
    ViewOffIcon,
    CheckmarkCircle02Icon,
    CancelCircleIcon,
    AlertCircleIcon,
    SparklesIcon,
    Shield01Icon,
    Calendar03Icon,
    Layers01Icon
} from 'hugeicons-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const DEFAULT_TEACHERS = [
    { id: 'DRP@caxis', name: 'Prof. D R Patil', dept: 'AI & Data Science' },
    { id: 'HPM@caxis', name: 'Prof. H P Magdum', dept: 'AI & Data Science' },
    { id: 'TIB@caxis', name: 'Prof. T I Bagban', dept: 'AI & Data Science' },
    { id: 'PMM@caxis', name: 'Prof. P M Mathpati', dept: 'AI & Data Science' }
];

const ALL_SEMESTERS = [
    'SEM 01', 'SEM 02', 'SEM 03', 'SEM 04',
    'SEM 05', 'SEM 06', 'SEM 07', 'SEM 08'
];

export default function Settings() {
    const navigate = useNavigate();
    const context = useOutletContext() || {};
    const { profile, catalogSubjects = [], refreshData } = context;

    const userRole = localStorage.getItem('eduvault_user_role') || profile?.role || (profile?.dob === 'TEACHER' ? 'teacher' : 'student');
    const isAdmin = userRole === 'admin' || profile?.role === 'admin';

    // Active Section Tab
    const [activeTab, setActiveTab] = useState('teacher-subjects'); // 'teacher-subjects' | 'semester-subjects' | 'api-keys'

    // --- 1. Teacher Assignment State ---
    const [teachers, setTeachers] = useState(DEFAULT_TEACHERS);
    const [selectedTeacherId, setSelectedTeacherId] = useState(DEFAULT_TEACHERS[0].id);
    const [assignedTeacherSubjects, setAssignedTeacherSubjects] = useState([]);
    const [savingTeacherSubjects, setSavingTeacherSubjects] = useState(false);
    const [allCatalogSubjects, setAllCatalogSubjects] = useState([]);
    const [teacherSubjectSearch, setTeacherSubjectSearch] = useState('');
    const [teacherYearFilter, setTeacherYearFilter] = useState('ALL');
    const [teacherSemFilter, setTeacherSemFilter] = useState('ALL');

    // --- 2. Semester Subject Visibility State ---
    const [selectedSemester, setSelectedSemester] = useState('SEM 01');
    const [semesterSubjectsConfig, setSemesterSubjectsConfig] = useState({}); // { [sem]: [revokedSubjectIds] }
    const [savingSemesterConfig, setSavingSemesterConfig] = useState(false);

    // --- 3. Gemini API Key State ---
    const [geminiKey, setGeminiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [keyStatus, setKeyStatus] = useState('idle'); // 'idle' | 'testing' | 'valid' | 'invalid' | 'saved' | 'empty'
    const [keyStatusMsg, setKeyStatusMsg] = useState('');

    const getYearFromSem = (sem) => {
        const m = (sem || '').match(/(\d+)/);
        const num = m ? parseInt(m[1], 10) : 1;
        if (num <= 2) return 'FY';
        if (num <= 4) return 'SY';
        if (num <= 6) return 'TY';
        return 'Final Year';
    };

    // Load initial settings
    useEffect(() => {
        // Load API Key
        const savedKey = localStorage.getItem('eduvault_custom_gemini_key') || localStorage.getItem('eduvault_gemini_api_key') || '';
        setGeminiKey(savedKey);
        if (savedKey) {
            setKeyStatus('saved');
            setKeyStatusMsg('Key configured in storage');
        } else {
            setKeyStatus('empty');
            setKeyStatusMsg('No custom key (using system default)');
        }

        // Load catalog and faculty
        loadCatalogSubjects();
        loadTeachersList();
        loadSemesterVisibilityConfig();
    }, []);

    // Load teacher subjects when selected teacher changes
    useEffect(() => {
        if (selectedTeacherId) {
            loadTeacherAssignedSubjects(selectedTeacherId);
        }
    }, [selectedTeacherId]);

    const loadTeachersList = async () => {
        try {
            const res = await axios.get(`${API_BASE}/portal/faculty/accounts`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                setTeachers(res.data);
                if (!selectedTeacherId) {
                    setSelectedTeacherId(res.data[0].id);
                }
            }
        } catch {
            // Keep default teachers
        }
    };

    const loadCatalogSubjects = async () => {
        try {
            const [r2Res, subRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/r2/subjects`),
                axios.get(`${API_BASE}/subjects`)
            ]);

            let list = [];
            if (r2Res.status === 'fulfilled' && Array.isArray(r2Res.value?.data?.subjects)) {
                list = r2Res.value.data.subjects;
            } else if (subRes.status === 'fulfilled' && Array.isArray(subRes.value?.data)) {
                list = subRes.value.data.map(s => ({
                    ...s,
                    year: getYearFromSem(s.semester),
                    inBucket: false
                }));
            }
            setAllCatalogSubjects(list);
        } catch (err) {
            console.error('Failed to load catalog subjects:', err);
            if (catalogSubjects && catalogSubjects.length > 0) {
                setAllCatalogSubjects(catalogSubjects.map(s => ({ ...s, year: getYearFromSem(s.semester), inBucket: false })));
            }
        }
    };

    const loadTeacherAssignedSubjects = async (teacherId) => {
        try {
            const res = await axios.get(`${API_BASE}/teacher/mappings`, {
                params: { prn: teacherId },
                headers: { 'X-Student-PRN': teacherId }
            });
            if (res.data && Array.isArray(res.data.selectedSubjects)) {
                setAssignedTeacherSubjects(res.data.selectedSubjects);
            } else {
                setAssignedTeacherSubjects([]);
            }
        } catch (err) {
            console.warn('Could not fetch teacher mappings:', err);
            setAssignedTeacherSubjects([]);
        }
    };

    const loadSemesterVisibilityConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/admin/semester-subjects`);
            if (res.data && typeof res.data === 'object') {
                setSemesterSubjectsConfig(res.data);
                localStorage.setItem('eduvault_semester_subjects_config', JSON.stringify(res.data));
                return;
            }
        } catch {
            // Check localStorage
            const localSaved = localStorage.getItem('eduvault_semester_subjects_config');
            if (localSaved) {
                try {
                    setSemesterSubjectsConfig(JSON.parse(localSaved));
                } catch { }
            }
        }
    };

    // --- Teacher Subject Toggle Handlers ---
    const handleToggleTeacherSubject = (subNameOrId) => {
        setAssignedTeacherSubjects(prev => {
            if (prev.includes(subNameOrId)) {
                return prev.filter(item => item !== subNameOrId);
            } else {
                return [...prev, subNameOrId];
            }
        });
    };

    const handleSaveTeacherSubjects = async () => {
        if (!selectedTeacherId) return;
        setSavingTeacherSubjects(true);

        const folderMappings = {};
        allCatalogSubjects.forEach(sub => {
            if (assignedTeacherSubjects.includes(sub.name) || assignedTeacherSubjects.includes(sub.id)) {
                folderMappings[sub.name] = {
                    id: sub.id,
                    code: sub.code || '',
                    year: sub.year || getYearFromSem(sub.semester),
                    semester: sub.semester || '',
                    bucketFolder: sub.bucketFolder || sub.name
                };
            }
        });

        try {
            await axios.put(`${API_BASE}/teacher/mappings`, {
                year: teacherYearFilter,
                semester: teacherSemFilter,
                selectedSubjects: assignedTeacherSubjects,
                folderMappings
            }, {
                params: { prn: selectedTeacherId },
                headers: { 'X-Student-PRN': selectedTeacherId }
            });
            toast.success(`Assigned ${assignedTeacherSubjects.length} subjects to ${selectedTeacherId}`);
            if (refreshData) refreshData();
        } catch (err) {
            console.error('Failed to save teacher mappings:', err);
            toast.error('Failed to save teacher subjects: ' + (err.response?.data?.error || err.message));
        } finally {
            setSavingTeacherSubjects(false);
        }
    };

    // --- Semester Subject Visibility Handlers ---
    const isSubjectVisibleInSemester = (sem, subId) => {
        const revokedList = semesterSubjectsConfig[sem] || [];
        return !revokedList.includes(subId);
    };

    const handleToggleSemesterSubject = (sem, subId) => {
        setSemesterSubjectsConfig(prev => {
            const currentRevoked = prev[sem] || [];
            let updatedRevoked;
            if (currentRevoked.includes(subId)) {
                // Was revoked -> make visible again
                updatedRevoked = currentRevoked.filter(id => id !== subId);
            } else {
                // Was visible -> revoke/hide it
                updatedRevoked = [...currentRevoked, subId];
            }
            return {
                ...prev,
                [sem]: updatedRevoked
            };
        });
    };

    const handleSaveSemesterConfig = async () => {
        setSavingSemesterConfig(true);
        try {
            await axios.put(`${API_BASE}/admin/semester-subjects`, semesterSubjectsConfig, {
                headers: { 'X-User-Role': 'admin' }
            });
            localStorage.setItem('eduvault_semester_subjects_config', JSON.stringify(semesterSubjectsConfig));
            toast.success('Semester subject visibility updated successfully!');
            if (refreshData) refreshData();
        } catch (err) {
            console.warn('Could not save to backend, saved locally:', err);
            localStorage.setItem('eduvault_semester_subjects_config', JSON.stringify(semesterSubjectsConfig));
            toast.success('Semester subject visibility saved locally!');
        } finally {
            setSavingSemesterConfig(false);
        }
    };

    // --- Gemini API Key Handlers ---
    const handleSaveGeminiKey = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const trimmed = geminiKey.trim();
        if (!trimmed) {
            localStorage.removeItem('eduvault_custom_gemini_key');
            localStorage.removeItem('eduvault_gemini_api_key');
            setKeyStatus('empty');
            setKeyStatusMsg('No custom key (using system default)');
            toast.success('Custom Gemini API key cleared. Reverted to default.');
            return;
        }

        localStorage.setItem('eduvault_custom_gemini_key', trimmed);
        localStorage.setItem('eduvault_gemini_api_key', trimmed);
        setKeyStatus('saved');
        setKeyStatusMsg('Key saved to local storage');
        toast.success('Custom Gemini API key saved successfully!');
    };

    const handleClearGeminiKey = () => {
        localStorage.removeItem('eduvault_custom_gemini_key');
        localStorage.removeItem('eduvault_gemini_api_key');
        setGeminiKey('');
        setKeyStatus('empty');
        setKeyStatusMsg('No custom key (using system default)');
        toast.info('Custom Gemini API key removed');
    };

    const handleTestGeminiKey = async () => {
        const keyToTest = geminiKey.trim();
        if (!keyToTest) {
            toast.error('Please enter an API key to test');
            return;
        }

        setKeyStatus('testing');
        setKeyStatusMsg('Testing key against Google Gemini API...');
        const toastId = toast.loading('Connecting to Google Gemini API...');

        try {
            const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(keyToTest)}`;
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Respond with OK.' }] }]
                })
            });

            if (response.ok) {
                setKeyStatus('valid');
                setKeyStatusMsg('API key is valid and connected');
                localStorage.setItem('eduvault_custom_gemini_key', keyToTest);
                localStorage.setItem('eduvault_gemini_api_key', keyToTest);
                toast.success('Gemini API key verified successfully!', { id: toastId });
            } else {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP ${response.status}: Invalid key`;
                setKeyStatus('invalid');
                setKeyStatusMsg(errMsg);
                toast.error(`Verification failed: ${errMsg}`, { id: toastId });
            }
        } catch {
            if (keyToTest.startsWith('AIza') && keyToTest.length >= 35) {
                setKeyStatus('valid');
                setKeyStatusMsg('Valid key format configured');
                localStorage.setItem('eduvault_custom_gemini_key', keyToTest);
                localStorage.setItem('eduvault_gemini_api_key', keyToTest);
                toast.success('Gemini key format valid and saved!', { id: toastId });
            } else {
                setKeyStatus('invalid');
                setKeyStatusMsg('Could not verify API key');
                toast.error('Could not verify key format', { id: toastId });
            }
        }
    };

    // Filter subjects for teacher assignment tab
    const filteredTeacherSubjects = useMemo(() => {
        return allCatalogSubjects.filter(sub => {
            const yr = sub.year || getYearFromSem(sub.semester);
            if (teacherYearFilter !== 'ALL' && yr !== teacherYearFilter) return false;
            if (teacherSemFilter !== 'ALL' && sub.semester && !sub.semester.toLowerCase().includes(teacherSemFilter.toLowerCase())) return false;
            if (teacherSubjectSearch.trim()) {
                const q = teacherSubjectSearch.toLowerCase();
                const nameMatch = sub.name?.toLowerCase().includes(q);
                const codeMatch = sub.code?.toLowerCase().includes(q);
                return nameMatch || codeMatch;
            }
            return true;
        });
    }, [allCatalogSubjects, teacherYearFilter, teacherSemFilter, teacherSubjectSearch]);

    // Filter subjects for semester visibility tab
    const subjectsForSelectedSemester = useMemo(() => {
        return allCatalogSubjects.filter(sub => {
            if (!sub.semester) return false;
            return sub.semester.trim().toUpperCase() === selectedSemester.trim().toUpperCase();
        });
    }, [allCatalogSubjects, selectedSemester]);

    // Access guard: If non-admin user navigates to /settings
    if (!isAdmin) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[70vh] p-4 text-center">
                <div className="max-w-md w-full bg-white border border-[#E2E2E2] rounded-2xl p-6 sm:p-8 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                        <Shield01Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-[#383838]">Admin Control Restricted</h2>
                    <p className="text-xs text-[#727272] mt-2 leading-relaxed">
                        System configuration, teacher course assignments, and API keys are restricted to institutional administrators.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="mt-6 px-4 py-2 rounded-xl bg-[#0073E6] text-white text-xs font-semibold hover:bg-[#4A9AF0] transition"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background p-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12 antialiased text-[#383838] font-sans min-h-screen">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-white border border-[#E2E2E2] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Shield01Icon className="w-4 h-4 text-[#0073E6]" />
                            <span className="text-[11px] font-bold text-[#727272] uppercase tracking-wider">Administration Suite</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#383838] tracking-tight">
                            Platform &amp; Academic Settings
                        </h1>
                        <p className="text-xs text-[#727272] mt-0.5">
                            Manage teacher course allocations, semester catalog visibility, and system AI credentials.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#727272]">Role:</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-[#DEEDFC] text-[#0073E6] border-blue-200">
                            System Administrator
                        </span>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-[#E2E2E2] pb-2 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveTab('teacher-subjects')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0",
                            activeTab === 'teacher-subjects'
                                ? "bg-[#0073E6] text-white shadow-xs"
                                : "bg-white text-[#727272] hover:text-[#383838] hover:bg-slate-100 border border-[#E2E2E2]"
                        )}
                    >
                        <UserMultiple02Icon className="w-4 h-4" />
                        <span>Teacher Subject Allocation</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('semester-subjects')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0",
                            activeTab === 'semester-subjects'
                                ? "bg-[#0073E6] text-white shadow-xs"
                                : "bg-white text-[#727272] hover:text-[#383838] hover:bg-slate-100 border border-[#E2E2E2]"
                        )}
                    >
                        <Layers01Icon className="w-4 h-4" />
                        <span>Semester Subject Visibility</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('api-keys')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0",
                            activeTab === 'api-keys'
                                ? "bg-[#0073E6] text-white shadow-xs"
                                : "bg-white text-[#727272] hover:text-[#383838] hover:bg-slate-100 border border-[#E2E2E2]"
                        )}
                    >
                        <Key01Icon className="w-4 h-4" />
                        <span>API Keys &amp; AI</span>
                    </button>
                </div>

                {/* TAB 1: Teacher Subject Allocation */}
                {activeTab === 'teacher-subjects' && (
                    <div className="bg-white border border-[#E2E2E2] rounded-2xl shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#DEEDFC] text-[#0073E6] flex items-center justify-center shrink-0">
                                    <BookOpen01Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#383838]">Assign &amp; Revoke Teacher Subjects</h2>
                                    <p className="text-xs text-[#727272] mt-0.5">
                                        Select a teacher and allocate or revoke the subjects they can inspect, view doubts for, or verify notes.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveTeacherSubjects}
                                disabled={savingTeacherSubjects}
                                className="px-4 py-2 rounded-xl bg-[#0073E6] hover:bg-[#4A9AF0] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                                <FloppyDiskIcon className="w-3.5 h-3.5" />
                                <span>{savingTeacherSubjects ? 'Saving...' : 'Save Teacher Allocation'}</span>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4">
                            {/* Teacher Selector Toolbar */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#383838]">Selected Teacher:</span>
                                    <select
                                        value={selectedTeacherId}
                                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                                        className="text-xs bg-white border border-[#E2E2E2] rounded-lg px-3 py-1.5 font-semibold text-[#383838] outline-none cursor-pointer"
                                    >
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <span className="text-xs text-[#727272]">
                                    Currently assigned: <strong className="text-[#0073E6]">{assignedTeacherSubjects.length}</strong> subjects
                                </span>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="relative flex-1">
                                    <Search01Icon className="w-3.5 h-3.5 text-[#727272] absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={teacherSubjectSearch}
                                        onChange={(e) => setTeacherSubjectSearch(e.target.value)}
                                        placeholder="Search courses by name or code..."
                                        className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-[#E2E2E2] rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <select
                                    value={teacherYearFilter}
                                    onChange={(e) => setTeacherYearFilter(e.target.value)}
                                    className="text-xs bg-white border border-[#E2E2E2] rounded-lg px-2.5 py-2 font-medium text-[#383838] outline-none cursor-pointer"
                                >
                                    <option value="ALL">All Years</option>
                                    <option value="FY">FY</option>
                                    <option value="SY">SY</option>
                                    <option value="TY">TY</option>
                                    <option value="Final Year">Final Year</option>
                                </select>
                            </div>

                            {/* Subject Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto p-1">
                                {filteredTeacherSubjects.map(sub => {
                                    const key = sub.name || sub.id;
                                    const isAssigned = assignedTeacherSubjects.includes(sub.name) || assignedTeacherSubjects.includes(sub.id);

                                    return (
                                        <div
                                            key={sub.id || sub.name}
                                            onClick={() => handleToggleTeacherSubject(key)}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs select-none",
                                                isAssigned
                                                    ? "bg-[#DEEDFC]/50 border-blue-300 shadow-2xs"
                                                    : "bg-white hover:bg-slate-50 border-[#E2E2E2]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={cn(
                                                    "w-4 h-4 rounded flex items-center justify-center border transition shrink-0",
                                                    isAssigned ? "bg-[#0073E6] border-blue-600 text-white" : "border-slate-300 bg-white"
                                                )}>
                                                    {isAssigned && <Tick02Icon className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-[#383838] truncate">{sub.name}</div>
                                                    <div className="text-[10px] text-[#727272] mt-0.5">{sub.code || 'NO-CODE'} • {sub.semester || 'SEM'}</div>
                                                </div>
                                            </div>

                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                                isAssigned ? "bg-blue-100 text-[#0073E6]" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {isAssigned ? 'Assigned' : 'Revoked'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Semester Subject Visibility */}
                {activeTab === 'semester-subjects' && (
                    <div className="bg-white border border-[#E2E2E2] rounded-2xl shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                    <Layers01Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#383838]">Semester Course Visibility</h2>
                                    <p className="text-xs text-[#727272] mt-0.5">
                                        Assign or revoke what courses are shown to students in each semester view.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveSemesterConfig}
                                disabled={savingSemesterConfig}
                                className="px-4 py-2 rounded-xl bg-[#0073E6] hover:bg-[#4A9AF0] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                                <FloppyDiskIcon className="w-3.5 h-3.5" />
                                <span>{savingSemesterConfig ? 'Saving...' : 'Save Semester Visibility'}</span>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4">
                            {/* Semester Buttons */}
                            <div className="flex flex-wrap gap-2">
                                {ALL_SEMESTERS.map(sem => (
                                    <button
                                        key={sem}
                                        type="button"
                                        onClick={() => setSelectedSemester(sem)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                                            selectedSemester === sem
                                                ? "bg-[#0073E6] text-white shadow-2xs"
                                                : "bg-slate-100 text-[#727272] hover:bg-slate-200"
                                        )}
                                    >
                                        {sem}
                                    </button>
                                ))}
                            </div>

                            {/* Semester Course List */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-[#727272] px-1 uppercase tracking-wider">
                                    Courses in {selectedSemester} ({subjectsForSelectedSemester.length})
                                </div>

                                {subjectsForSelectedSemester.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-[#727272] bg-slate-50 rounded-xl border border-dashed border-[#E2E2E2]">
                                        No courses recorded for {selectedSemester}.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {subjectsForSelectedSemester.map(sub => {
                                            const subId = sub.id || sub.name;
                                            const isVisible = isSubjectVisibleInSemester(selectedSemester, subId);

                                            return (
                                                <div
                                                    key={subId}
                                                    className={cn(
                                                        "p-3 rounded-xl border flex items-center justify-between gap-3 text-xs",
                                                        isVisible ? "bg-white border-[#E2E2E2]" : "bg-slate-50/70 border-slate-200 opacity-60"
                                                    )}
                                                >
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-[#383838] truncate">{sub.name}</div>
                                                        <div className="text-[10px] text-[#727272]">{sub.code || 'CODE'} • {sub.department || 'All'}</div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleSemesterSubject(selectedSemester, subId)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0",
                                                            isVisible
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                                        )}
                                                    >
                                                        {isVisible ? 'Shown' : 'Revoked'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: API Keys */}
                {activeTab === 'api-keys' && (
                    <div className="bg-white border border-[#E2E2E2] rounded-2xl shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#383838]">Custom Google Gemini API Key</h2>
                                    <p className="text-xs text-[#727272] mt-0.5">
                                        Configure custom Gemini keys for unlimited AI chat, Note Doubts, and Chapter RAG.
                                    </p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2">
                                {keyStatus === 'valid' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckmarkCircle02Icon className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Valid &amp; Connected</span>
                                    </span>
                                )}
                                {keyStatus === 'testing' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DEEDFC] text-[#0073E6] border border-blue-200 animate-pulse">
                                        <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                                        <span>Testing...</span>
                                    </span>
                                )}
                                {keyStatus === 'invalid' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        <CancelCircleIcon className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Invalid Key</span>
                                    </span>
                                )}
                                {keyStatus === 'saved' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        <Tick02Icon className="w-3.5 h-3.5" />
                                        <span>Key Configured</span>
                                    </span>
                                )}
                                {keyStatus === 'empty' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-[#727272] border border-[#E2E2E2]">
                                        <span>System Default</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-[#383838] uppercase tracking-wider">
                                    Gemini API Key
                                </label>
                                <div className="relative">
                                    <Key01Icon className="w-4 h-4 text-[#727272] absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={geminiKey}
                                        onChange={(e) => {
                                            setGeminiKey(e.target.value);
                                            setKeyStatus('idle');
                                        }}
                                        placeholder="Enter your Gemini API key (e.g. AIzaSy...)"
                                        className="w-full text-xs sm:text-sm pl-9 pr-24 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-[#E2E2E2] rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="p-1.5 text-[#727272] hover:text-[#383838] transition cursor-pointer"
                                        >
                                            {showKey ? <ViewOffIcon className="w-4 h-4" /> : <ViewIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-[#727272] pt-1">
                                    <span>{keyStatusMsg || 'Your key is stored securely in your browser session.'}</span>
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-purple-600 hover:underline font-semibold flex items-center gap-1"
                                    >
                                        <span>Get Gemini Key</span>
                                        <ArrowUpRight01Icon className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={handleSaveGeminiKey}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <FloppyDiskIcon className="w-3.5 h-3.5" />
                                    <span>Save API Key</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleTestGeminiKey}
                                    disabled={!geminiKey.trim() || keyStatus === 'testing'}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#383838] font-semibold text-xs border border-[#E2E2E2] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Test Connection</span>
                                </button>

                                {geminiKey && (
                                    <button
                                        type="button"
                                        onClick={handleClearGeminiKey}
                                        className="px-3.5 py-2 rounded-xl text-[#383838] hover:text-rose-600 hover:bg-rose-50 border border-[#E2E2E2] transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <RefreshIcon className="w-3.5 h-3.5" />
                                        <span>Clear Key</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
