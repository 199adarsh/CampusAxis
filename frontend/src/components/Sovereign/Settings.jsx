import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
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
    Layers01Icon,
    Add01Icon,
    Delete02Icon
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

const YEAR_GROUPS = [
    { year: 'FY', label: 'First Year (FY)', semesters: ['SEM 01', 'SEM 02'] },
    { year: 'SY', label: 'Second Year (SY)', semesters: ['SEM 03', 'SEM 04'] },
    { year: 'TY', label: 'Third Year (TY)', semesters: ['SEM 05', 'SEM 06'] },
    { year: 'LY', label: 'Last Year (LY)', semesters: ['SEM 07', 'SEM 08'] },
];

const ALL_SEMESTERS = [
    'SEM 01', 'SEM 02', 'SEM 03', 'SEM 04',
    'SEM 05', 'SEM 06', 'SEM 07', 'SEM 08'
];

export default function Settings() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const context = useOutletContext() || {};
    const { profile, catalogSubjects = [], refreshData } = context;

    const userRole = localStorage.getItem('eduvault_user_role') || profile?.role || (profile?.dob === 'TEACHER' ? 'teacher' : 'student');
    const isAdmin = userRole === 'admin' || profile?.role === 'admin';

    // Active Section Tab (synced with URL for sidebar navigation)
    const queryTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(
        queryTab && ['teacher-subjects', 'semester-subjects', 'subject-visibility', 'api-keys'].includes(queryTab)
            ? (queryTab === 'semester-subjects' ? 'subject-visibility' : queryTab)
            : 'teacher-subjects'
    );

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && ['teacher-subjects', 'semester-subjects', 'subject-visibility', 'api-keys'].includes(t)) {
            setActiveTab(t === 'semester-subjects' ? 'subject-visibility' : t);
        }
    }, [searchParams]);

    const handleTabChange = (tabKey) => {
        const normalized = tabKey === 'semester-subjects' ? 'subject-visibility' : tabKey;
        setActiveTab(normalized);
        setSearchParams({ tab: normalized });
    };

    // --- 1. Teacher Assignment State ---
    const [teachers, setTeachers] = useState(DEFAULT_TEACHERS);
    const [selectedTeacherId, setSelectedTeacherId] = useState(DEFAULT_TEACHERS[0].id);
    const [assignedTeacherSubjects, setAssignedTeacherSubjects] = useState([]);
    const [savingTeacherSubjects, setSavingTeacherSubjects] = useState(false);
    const [allCatalogSubjects, setAllCatalogSubjects] = useState([]);
    const [teacherSubjectSearch, setTeacherSubjectSearch] = useState('');
    const [teacherYearFilter, setTeacherYearFilter] = useState('ALL');
    const [teacherSemFilter, setTeacherSemFilter] = useState('ALL');

    // --- 2. Subject Visibility & Custom Courses State ---
    const [visibilityConfig, setVisibilityConfig] = useState({
        shownSubjectIds: null,
        hiddenSubjectIds: [],
        customSubjects: []
    });
    const [savingVisibilityConfig, setSavingVisibilityConfig] = useState(false);
    const [visibilitySearch, setVisibilitySearch] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'shown' | 'hidden'
    const [visibilityYearFilter, setVisibilityYearFilter] = useState('ALL'); // 'ALL' | 'FY' | 'SY' | 'TY' | 'LY'
    const [visibilityDeptFilter, setVisibilityDeptFilter] = useState('ALL');
    const [showAddCustomModal, setShowAddCustomModal] = useState(false);
    const [newCustomName, setNewCustomName] = useState('');
    const [newCustomCode, setNewCustomCode] = useState('');
    const [newCustomDept, setNewCustomDept] = useState('AI & Data Science');
    const [newCustomYear, setNewCustomYear] = useState('FY');

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
        return 'LY';
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

            const seen = new Set();
            const deduped = [];
            for (const item of list) {
                const normName = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const sem = (item.semester || '').toUpperCase().trim();
                const key = `${normName}_${sem}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    deduped.push(item);
                }
            }
            setAllCatalogSubjects(deduped);
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

    const handleAssignAllFiltered = () => {
        const ids = filteredTeacherSubjects.map(s => s.name || s.id);
        setAssignedTeacherSubjects(prev => Array.from(new Set([...prev, ...ids])));
        toast.info(`Assigned all ${ids.length} filtered subjects`);
    };

    const handleRevokeAllFiltered = () => {
        const ids = new Set(filteredTeacherSubjects.map(s => s.name || s.id));
        setAssignedTeacherSubjects(prev => prev.filter(k => !ids.has(k)));
        toast.info(`Cleared filtered subjects for selected teacher`);
    };

    const loadSemesterVisibilityConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/admin/semester-subjects`);
            if (res.data && typeof res.data === 'object') {
                const data = res.data;
                const shown = Array.isArray(data.shownSubjectIds) ? data.shownSubjectIds : null;
                const hidden = Array.isArray(data.hiddenSubjectIds) ? data.hiddenSubjectIds : [];
                const custom = Array.isArray(data.customSubjects) ? data.customSubjects : [];
                setVisibilityConfig({
                    shownSubjectIds: shown,
                    hiddenSubjectIds: hidden,
                    customSubjects: custom
                });
                localStorage.setItem('eduvault_semester_subjects_config', JSON.stringify(data));
                return;
            }
        } catch {
            const localSaved = localStorage.getItem('eduvault_semester_subjects_config');
            if (localSaved) {
                try {
                    const data = JSON.parse(localSaved);
                    setVisibilityConfig({
                        shownSubjectIds: Array.isArray(data.shownSubjectIds) ? data.shownSubjectIds : null,
                        hiddenSubjectIds: Array.isArray(data.hiddenSubjectIds) ? data.hiddenSubjectIds : [],
                        customSubjects: Array.isArray(data.customSubjects) ? data.customSubjects : []
                    });
                } catch { }
            }
        }
    };

    // Helper to determine if a subject is visible/shown to students
    const isSubjectShown = (sub) => {
        const subKey = sub.id || sub.name;
        if (Array.isArray(visibilityConfig.shownSubjectIds)) {
            const shown = visibilityConfig.shownSubjectIds.includes(subKey) ||
                          visibilityConfig.shownSubjectIds.includes(sub.name) ||
                          (sub.code && visibilityConfig.shownSubjectIds.includes(sub.code));
            const hidden = Array.isArray(visibilityConfig.hiddenSubjectIds) &&
                           (visibilityConfig.hiddenSubjectIds.includes(subKey) || visibilityConfig.hiddenSubjectIds.includes(sub.name));
            return shown && !hidden;
        }
        if (Array.isArray(visibilityConfig.hiddenSubjectIds)) {
            return !visibilityConfig.hiddenSubjectIds.includes(subKey) &&
                   !visibilityConfig.hiddenSubjectIds.includes(sub.name);
        }
        return true;
    };

    const handleToggleSubjectVisibility = (sub) => {
        const subKey = sub.id || sub.name;
        const currentlyShown = isSubjectShown(sub);

        setVisibilityConfig(prev => {
            const baseShown = Array.isArray(prev.shownSubjectIds)
                ? [...prev.shownSubjectIds]
                : allAvailableSubjects.filter(s => isSubjectShown(s)).map(s => s.id || s.name);

            let nextShown;
            let nextHidden = Array.isArray(prev.hiddenSubjectIds) ? [...prev.hiddenSubjectIds] : [];

            if (currentlyShown) {
                // Set to Hidden
                nextShown = baseShown.filter(k => k !== subKey && k !== sub.name && k !== sub.code);
                if (!nextHidden.includes(subKey)) nextHidden.push(subKey);
            } else {
                // Set to Shown
                nextShown = Array.from(new Set([...baseShown, subKey, sub.name]));
                nextHidden = nextHidden.filter(k => k !== subKey && k !== sub.name && k !== sub.code);
            }

            return {
                ...prev,
                shownSubjectIds: nextShown,
                hiddenSubjectIds: nextHidden
            };
        });
    };

    const handleShowAllFiltered = () => {
        const keysToShow = filteredVisibilitySubjects.map(s => s.id || s.name);
        setVisibilityConfig(prev => {
            const baseShown = Array.isArray(prev.shownSubjectIds)
                ? [...prev.shownSubjectIds]
                : allAvailableSubjects.filter(s => isSubjectShown(s)).map(s => s.id || s.name);
            const nextShown = Array.from(new Set([...baseShown, ...keysToShow]));
            const nextHidden = (prev.hiddenSubjectIds || []).filter(k => !keysToShow.includes(k));
            return {
                ...prev,
                shownSubjectIds: nextShown,
                hiddenSubjectIds: nextHidden
            };
        });
        toast.success(`Marked ${keysToShow.length} subjects as Shown to students`);
    };

    const handleHideAllFiltered = () => {
        const keysToHide = new Set(filteredVisibilitySubjects.map(s => s.id || s.name));
        setVisibilityConfig(prev => {
            const baseShown = Array.isArray(prev.shownSubjectIds)
                ? [...prev.shownSubjectIds]
                : allAvailableSubjects.filter(s => isSubjectShown(s)).map(s => s.id || s.name);
            const nextShown = baseShown.filter(k => !keysToHide.has(k));
            const nextHidden = Array.from(new Set([...(prev.hiddenSubjectIds || []), ...keysToHide]));
            return {
                ...prev,
                shownSubjectIds: nextShown,
                hiddenSubjectIds: nextHidden
            };
        });
        toast.info(`Marked ${keysToHide.size} subjects as Hidden`);
    };

    const handleAddCustomSubject = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const trimmedName = newCustomName.trim();
        if (!trimmedName) {
            toast.error('Subject name is required');
            return;
        }

        const newId = `custom_${Date.now()}_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const newSub = {
            id: newId,
            name: trimmedName,
            code: newCustomCode.trim() || 'CUSTOM',
            department: newCustomDept.trim() || 'AI & Data Science',
            year: newCustomYear || 'FY',
            isCustom: true
        };

        setVisibilityConfig(prev => {
            const baseShown = Array.isArray(prev.shownSubjectIds)
                ? [...prev.shownSubjectIds]
                : allAvailableSubjects.filter(s => isSubjectShown(s)).map(s => s.id || s.name);
            return {
                ...prev,
                customSubjects: [...(prev.customSubjects || []), newSub],
                shownSubjectIds: Array.from(new Set([...baseShown, newId, trimmedName]))
            };
        });

        setNewCustomName('');
        setNewCustomCode('');
        setShowAddCustomModal(false);
        toast.success(`Added "${trimmedName}" as active course`);
    };

    const handleDeleteCustomSubject = (subId, subName) => {
        setVisibilityConfig(prev => ({
            ...prev,
            customSubjects: (prev.customSubjects || []).filter(s => s.id !== subId),
            shownSubjectIds: (prev.shownSubjectIds || []).filter(k => k !== subId && k !== subName),
            hiddenSubjectIds: (prev.hiddenSubjectIds || []).filter(k => k !== subId && k !== subName)
        }));
        toast.info(`Removed custom subject "${subName}"`);
    };

    const handleSaveVisibilityConfig = async () => {
        setSavingVisibilityConfig(true);
        const payload = {
            shownSubjectIds: visibilityConfig.shownSubjectIds || allAvailableSubjects.filter(s => isSubjectShown(s)).map(s => s.id || s.name),
            hiddenSubjectIds: visibilityConfig.hiddenSubjectIds || [],
            customSubjects: visibilityConfig.customSubjects || []
        };
        try {
            await axios.put(`${API_BASE}/admin/semester-subjects`, payload, {
                headers: { 'X-User-Role': 'admin' }
            });
            localStorage.setItem('eduvault_semester_subjects_config', JSON.stringify(payload));
            toast.success('Subject visibility updated successfully!');
            if (refreshData) refreshData();
        } catch (err) {
            console.warn('Could not save to backend, saved locally:', err);
            localStorage.setItem('eduvault_semester_subjects_config', JSON.stringify(payload));
            toast.success('Subject visibility saved locally!');
        } finally {
            setSavingVisibilityConfig(false);
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

    // All available subjects including any custom subjects added by admin
    const allAvailableSubjects = useMemo(() => {
        const list = allCatalogSubjects.map(s => ({
            ...s,
            year: s.year || getYearFromSem(s.semester) || 'FY'
        }));
        const custom = visibilityConfig.customSubjects || [];
        for (const cs of custom) {
            if (!list.some(s => s.id === cs.id || s.name === cs.name)) {
                list.push({
                    ...cs,
                    year: cs.year || 'FY',
                    isCustom: true
                });
            }
        }
        return list;
    }, [allCatalogSubjects, visibilityConfig.customSubjects]);

    // Unique departments extracted dynamically from catalog
    const availableDepartments = useMemo(() => {
        const depts = new Set();
        allAvailableSubjects.forEach(s => {
            if (s.department && s.department.trim()) {
                depts.add(s.department.trim());
            }
        });
        return Array.from(depts).sort();
    }, [allAvailableSubjects]);

    // Filtered subjects for Subject Visibility tab
    const filteredVisibilitySubjects = useMemo(() => {
        return allAvailableSubjects.filter(sub => {
            if (visibilitySearch.trim()) {
                const q = visibilitySearch.toLowerCase();
                const nameMatch = sub.name?.toLowerCase().includes(q);
                const codeMatch = sub.code?.toLowerCase().includes(q);
                const deptMatch = sub.department?.toLowerCase().includes(q);
                if (!nameMatch && !codeMatch && !deptMatch) return false;
            }
            const shown = isSubjectShown(sub);
            if (visibilityFilter === 'shown' && !shown) return false;
            if (visibilityFilter === 'hidden' && shown) return false;

            if (visibilityYearFilter !== 'ALL' && sub.year !== visibilityYearFilter) {
                return false;
            }

            if (visibilityDeptFilter !== 'ALL' && sub.department !== visibilityDeptFilter) {
                return false;
            }

            return true;
        });
    }, [allAvailableSubjects, visibilitySearch, visibilityFilter, visibilityYearFilter, visibilityDeptFilter, visibilityConfig]);

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
                        onClick={() => handleTabChange('teacher-subjects')}
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
                        onClick={() => handleTabChange('subject-visibility')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0",
                            (activeTab === 'subject-visibility' || activeTab === 'semester-subjects')
                                ? "bg-[#0073E6] text-white shadow-xs"
                                : "bg-white text-[#727272] hover:text-[#383838] hover:bg-slate-100 border border-[#E2E2E2]"
                        )}
                    >
                        <Layers01Icon className="w-4 h-4" />
                        <span>Subject Visibility</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('api-keys')}
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
                                    <option value="LY">LY</option>
                                </select>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleAssignAllFiltered}
                                        className="px-2.5 py-2 rounded-lg border border-[#E2E2E2] bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                                        title="Assign all currently visible subjects to this teacher"
                                    >
                                        Assign All ({filteredTeacherSubjects.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRevokeAllFiltered}
                                        className="px-2.5 py-2 rounded-lg border border-[#E2E2E2] bg-white hover:bg-slate-50 text-[11px] font-semibold text-rose-600 transition cursor-pointer"
                                        title="Revoke all currently visible subjects for this teacher"
                                    >
                                        Clear All
                                    </button>
                                </div>
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

                {/* TAB 2: Subject Visibility & Custom Courses */}
                {(activeTab === 'subject-visibility' || activeTab === 'semester-subjects') && (
                    <div className="bg-white border border-[#E2E2E2] rounded-2xl shadow-xs overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                    <Layers01Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[#383838]">Subject Visibility &amp; Course Selection</h2>
                                    <p className="text-xs text-[#727272] mt-0.5">
                                        Choose which subjects are shown to students, or introduce new custom courses for this term.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowAddCustomModal(true)}
                                    className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                                >
                                    <Add01Icon className="w-3.5 h-3.5" />
                                    <span>Add Custom Course</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSaveVisibilityConfig}
                                    disabled={savingVisibilityConfig}
                                    className="px-4 py-2 rounded-xl bg-[#0073E6] hover:bg-[#4A9AF0] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                                >
                                    <FloppyDiskIcon className="w-3.5 h-3.5" />
                                    <span>{savingVisibilityConfig ? 'Saving...' : 'Save Visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-4">
                            {/* Inline Modal / Form to Add Custom Course */}
                            {showAddCustomModal && (
                                <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                                            <Add01Icon className="w-4 h-4 text-purple-600" />
                                            <span>Add New / Different Course</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCustomModal(false)}
                                            className="text-xs text-[#727272] hover:text-[#383838] cursor-pointer"
                                        >
                                            <CancelCircleIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleAddCustomSubject} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wider">
                                                Course Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={newCustomName}
                                                onChange={(e) => setNewCustomName(e.target.value)}
                                                placeholder="e.g. Cloud Computing"
                                                className="w-full text-xs px-3 py-2 bg-white border border-[#E2E2E2] rounded-lg outline-none focus:ring-1 focus:ring-purple-500 font-medium text-[#383838]"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wider">
                                                Course Code
                                            </label>
                                            <input
                                                type="text"
                                                value={newCustomCode}
                                                onChange={(e) => setNewCustomCode(e.target.value)}
                                                placeholder="e.g. 02ADL305"
                                                className="w-full text-xs px-3 py-2 bg-white border border-[#E2E2E2] rounded-lg outline-none focus:ring-1 focus:ring-purple-500 font-mono text-[#383838]"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wider">
                                                Department
                                            </label>
                                            <input
                                                type="text"
                                                value={newCustomDept}
                                                onChange={(e) => setNewCustomDept(e.target.value)}
                                                placeholder="e.g. AI & Data Science"
                                                className="w-full text-xs px-3 py-2 bg-white border border-[#E2E2E2] rounded-lg outline-none focus:ring-1 focus:ring-purple-500 font-medium text-[#383838]"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wider">
                                                Academic Year
                                            </label>
                                            <select
                                                value={newCustomYear}
                                                onChange={(e) => setNewCustomYear(e.target.value)}
                                                className="w-full text-xs px-3 py-2 bg-white border border-[#E2E2E2] rounded-lg outline-none focus:ring-1 focus:ring-purple-500 font-semibold text-[#383838] cursor-pointer"
                                            >
                                                <option value="FY">First Year (FY)</option>
                                                <option value="SY">Second Year (SY)</option>
                                                <option value="TY">Third Year (TY)</option>
                                                <option value="LY">Final Year (LY)</option>
                                            </select>
                                        </div>

                                        <div className="sm:col-span-4 flex items-center justify-end gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddCustomModal(false)}
                                                className="px-3 py-1.5 rounded-lg border border-[#E2E2E2] bg-white text-xs font-semibold text-[#727272] hover:bg-slate-50 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Add01Icon className="w-3.5 h-3.5" />
                                                <span>Add &amp; Make Visible</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Year & Department Filter Controls */}
                            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-[#E2E2E2] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                {/* Academic Year Selector Pills */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-[#383838] mr-1">Academic Year:</span>
                                    {[
                                        { id: 'ALL', label: 'All Years' },
                                        { id: 'FY', label: 'FY' },
                                        { id: 'SY', label: 'SY' },
                                        { id: 'TY', label: 'TY' },
                                        { id: 'LY', label: 'LY' },
                                    ].map(yr => {
                                        const count = yr.id === 'ALL'
                                            ? allAvailableSubjects.length
                                            : allAvailableSubjects.filter(s => s.year === yr.id).length;
                                        const isSelected = visibilityYearFilter === yr.id;
                                        return (
                                            <button
                                                key={yr.id}
                                                type="button"
                                                onClick={() => setVisibilityYearFilter(yr.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5",
                                                    isSelected
                                                        ? "bg-[#0073E6] text-white shadow-2xs"
                                                        : "bg-white text-[#727272] hover:text-[#383838] border border-[#E2E2E2] hover:bg-slate-100"
                                                )}
                                            >
                                                <span>{yr.label}</span>
                                                <span className="text-[10px] opacity-75">({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Department Filter Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#383838] shrink-0">Department:</span>
                                    <select
                                        value={visibilityDeptFilter}
                                        onChange={(e) => setVisibilityDeptFilter(e.target.value)}
                                        className="text-xs bg-white border border-[#E2E2E2] rounded-lg px-3 py-1.5 font-semibold text-[#383838] outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 max-w-[240px]"
                                    >
                                        <option value="ALL">All Departments ({allAvailableSubjects.length})</option>
                                        {availableDepartments.map(dept => {
                                            const count = allAvailableSubjects.filter(s => s.department === dept).length;
                                            return (
                                                <option key={dept} value={dept}>
                                                    {dept} ({count})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Search, Filter Pills, and Bulk Actions */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="relative flex-1">
                                    <Search01Icon className="w-3.5 h-3.5 text-[#727272] absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={visibilitySearch}
                                        onChange={(e) => setVisibilitySearch(e.target.value)}
                                        placeholder="Search courses by name, code, or department..."
                                        className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-[#E2E2E2] rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setVisibilityFilter('all')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5",
                                            visibilityFilter === 'all'
                                                ? "bg-[#0073E6] text-white shadow-2xs"
                                                : "bg-slate-100 text-[#727272] hover:text-[#383838] border border-[#E2E2E2]"
                                        )}
                                    >
                                        <span>All</span>
                                        <span className="text-[10px] opacity-80">({allAvailableSubjects.length})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setVisibilityFilter('shown')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5",
                                            visibilityFilter === 'shown'
                                                ? "bg-emerald-600 text-white shadow-2xs"
                                                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                                        )}
                                    >
                                        <ViewIcon className="w-3.5 h-3.5" />
                                        <span>Shown</span>
                                        <span className="text-[10px] opacity-80">
                                            ({allAvailableSubjects.filter(s => isSubjectShown(s)).length})
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setVisibilityFilter('hidden')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5",
                                            visibilityFilter === 'hidden'
                                                ? "bg-slate-700 text-white shadow-2xs"
                                                : "bg-white text-slate-600 hover:bg-slate-100 border border-[#E2E2E2]"
                                        )}
                                    >
                                        <ViewOffIcon className="w-3.5 h-3.5" />
                                        <span>Hidden</span>
                                        <span className="text-[10px] opacity-80">
                                            ({allAvailableSubjects.filter(s => !isSubjectShown(s)).length})
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E2E2E2]">
                                <span className="text-xs text-[#727272]">
                                    Showing <strong className="text-[#383838]">{filteredVisibilitySubjects.length}</strong> matching subjects
                                </span>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleShowAllFiltered}
                                        className="px-2.5 py-1.5 rounded-lg border border-[#E2E2E2] bg-white hover:bg-emerald-50 text-[11px] font-semibold text-emerald-700 transition cursor-pointer flex items-center gap-1.5"
                                        title="Show all filtered courses to students"
                                    >
                                        <ViewIcon className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Show All Filtered</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleHideAllFiltered}
                                        className="px-2.5 py-1.5 rounded-lg border border-[#E2E2E2] bg-white hover:bg-rose-50 text-[11px] font-semibold text-rose-600 transition cursor-pointer flex items-center gap-1.5"
                                        title="Hide all filtered courses"
                                    >
                                        <ViewOffIcon className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Hide All Filtered</span>
                                    </button>
                                </div>
                            </div>

                            {/* Subject Cards Grid */}
                            {filteredVisibilitySubjects.length === 0 ? (
                                <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-[#E2E2E2]">
                                    No courses found matching your criteria.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {filteredVisibilitySubjects.map(sub => {
                                        const subId = sub.id || sub.name;
                                        const shown = isSubjectShown(sub);

                                        return (
                                            <div
                                                key={subId}
                                                className={cn(
                                                    "p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs select-none",
                                                    shown
                                                        ? "bg-white border-[#E2E2E2] shadow-2xs hover:border-blue-300"
                                                        : "bg-slate-50/70 border-slate-200/90 opacity-70"
                                                )}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-semibold text-slate-900 truncate text-[13px]">{sub.name}</span>
                                                        <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold bg-[#DEEDFC] text-[#0073E6] border border-blue-200">
                                                            {sub.year || 'FY'}
                                                        </span>
                                                        {sub.isCustom && (
                                                            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                                                                Custom
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                                        <span className="font-mono font-medium">{sub.code || 'CODE'}</span>
                                                        <span>•</span>
                                                        <span className="truncate">{sub.department || 'B.Tech'}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleSubjectVisibility(sub)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer",
                                                            shown
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                                                : "bg-slate-200/80 text-slate-600 border border-slate-300 hover:bg-slate-200"
                                                        )}
                                                    >
                                                        {shown ? (
                                                            <>
                                                                <ViewIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span>Shown</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ViewOffIcon className="w-3.5 h-3.5 text-slate-500" />
                                                                <span>Hidden</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {sub.isCustom && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCustomSubject(sub.id, sub.name)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                            title="Delete custom subject"
                                                        >
                                                            <Delete02Icon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
