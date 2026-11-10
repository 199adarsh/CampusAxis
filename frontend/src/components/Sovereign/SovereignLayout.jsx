import { cn } from '../../lib/utils';
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Outlet } from 'react-router-dom';

import { motion } from 'motion/react';

import SovereignSidebar from './SovereignSidebar';

import {
    Menu01Icon,
    Home01Icon,
    Book02Icon,
    Notification01Icon,
    MapsLocation02Icon,
    Calendar03Icon,
    SparklesIcon,
    Cancel01Icon,
    Upload01Icon,
    Logout01Icon,
    UserIcon,
} from 'hugeicons-react';

import { DiscreteTabs } from '../watermelon/discrete-tabs';
import { TetrisLoader } from '../ui/loader-tetris';

const DeveloperProfileModal = React.lazy(() => import('./DeveloperProfileModal'));

const AiCustomIcon = ({ size = 20, className = '', ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={className}
        {...props}
    >
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2">
            <path d="M14.17 20.89c4.184-.277 7.516-3.657 7.79-7.9c.053-.83.053-1.69 0-2.52c-.274-4.242-3.606-7.62-7.79-7.899a33 33 0 0 0-4.34 0c-4.184.278-7.516 3.657-7.79 7.9a20 20 0 0 0 0 2.52c.1 1.545.783 2.976 1.588 4.184c.467.845.159 1.9-.328 2.823c-.35.665-.526.997-.385 1.237c.14.24.455.248 1.084.263c1.245.03 2.084-.322 2.75-.813c.377-.279.566-.418.696-.434s.387.09.899.3c.46.19.995.307 1.485.34c1.425.094 2.914.094 4.342 0Z" />
            <path strokeLinecap="round" d="m7.5 15l1.842-5.526a.694.694 0 0 1 1.316 0L12.5 15m3-6v6m-7-2h3" />
        </g>
    </svg>
);

import axios from 'axios';

import { toast } from 'sonner';

import UploadNotesView from '../UploadNotesView';



import { useLocation, matchPath, Navigate, useNavigate } from 'react-router-dom';



const API_BASE = import.meta.env.VITE_API_BASE || '/api';



const SovereignLayout = () => {

    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);

    const [subjects, setSubjects] = useState([]);

    const [catalogSubjects, setCatalogSubjects] = useState([]);
    const [isDockMinimized, setIsDockMinimized] = useState(false);

    const [notes, setNotes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [showUpload, setShowUpload] = useState(false);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [showLogoutMenu, setShowLogoutMenu] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showDeveloperModal, setShowDeveloperModal] = useState(false);
    const handleOpenDeveloper = React.useCallback(() => setShowDeveloperModal(true), []);

    const userMenuRef = useRef(null);



    useEffect(() => {

        const handleClickOutside = (e) => {

            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {

                setShowLogoutMenu(false);

            }

        };

        if (showLogoutMenu) {

            document.addEventListener('mousedown', handleClickOutside);

            document.addEventListener('touchstart', handleClickOutside);

        }

        return () => {

            document.removeEventListener('mousedown', handleClickOutside);

            document.removeEventListener('touchstart', handleClickOutside);

        };

    }, [showLogoutMenu]);

    const location = useLocation();

    // Auto-minimize dock whenever route changes
    useEffect(() => {
        setIsDockMinimized(true);
    }, [location.pathname]);

    // Dynamic Page Titles & Clean Analytics Names per page
    useEffect(() => {
        const routeMeta = {
            '/': {
                title: 'Home | CampusAxis',
                desc: 'View attendance, internal marks, and academic updates.'
            },
            '/notes': {
                title: 'Notes & PYQs | CampusAxis',
                desc: 'Download syllabus notes and previous year question papers.'
            },
            '/ai-assistant': {
                title: 'AI Assistant | CampusAxis',
                desc: 'Ask questions and get explanations for your subjects.'
            },
            '/attendance': {
                title: 'Attendance | CampusAxis',
                desc: 'Check subject-wise attendance and minimum criteria.'
            },
            '/roadmaps': {
                title: 'Roadmaps | CampusAxis',
                desc: 'Subject-wise engineering roadmaps and learning guides.'
            },
            '/announcements': {
                title: 'Announcements | CampusAxis',
                desc: 'Latest college notices, timetables, and circulars.'
            }
        };

        const current = Object.entries(routeMeta).find(([path]) => {
            if (path === '/') return location.pathname === '/';
            return location.pathname.startsWith(path);
        });

        const meta = current ? current[1] : {
            title: 'CampusAxis',
            desc: 'Student portal for notes, attendance, and college updates.'
        };

        document.title = meta.title;
        let descTag = document.querySelector('meta[name="description"]');
        if (!descTag) {
            descTag = document.createElement('meta');
            descTag.name = 'description';
            document.head.appendChild(descTag);
        }
        descTag.setAttribute('content', meta.desc);

        // Send clean title & path to Google Analytics
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
            window.gtag('event', 'page_view', {
                page_title: meta.title,
                page_location: window.location.href,
                page_path: location.pathname
            });
        }
    }, [location.pathname]);



    // Context Detection: Identify if we are viewing a specific note

    const match = matchPath({ path: "/notes/:id" }, location.pathname);

    const activeNoteId = match?.params?.id;



    const fetchData = async (overrideProfile, overrideSubjects) => {

        try {

            // 1. Read isolated user session from localStorage

            let currentProfile = overrideProfile;

            let currentSubjects = overrideSubjects;



            if (currentProfile === undefined) {

                try {

                    const saved = localStorage.getItem('eduvault_profile');

                    currentProfile = saved ? JSON.parse(saved) : null;

                } catch (e) {

                    currentProfile = null;

                }

            }



            if (currentSubjects === undefined) {

                try {

                    const savedSubs = localStorage.getItem('eduvault_subjects');

                    currentSubjects = savedSubs ? JSON.parse(savedSubs) : [];

                } catch (e) {

                    currentSubjects = [];

                }

            }



            setProfile(currentProfile);



            // 2. Fetch full catalog subjects from backend

            const subsRes = await axios.get(`${API_BASE}/subjects`);

            const catalogSubs = Array.isArray(subsRes.data) ? subsRes.data : [];

            setCatalogSubjects(catalogSubs);



            // 3. Set enrolled subjects using canonical IDs from backend catalog

            const role = localStorage.getItem('eduvault_user_role') || (currentProfile?.dob === 'TEACHER' ? 'teacher' : 'student');

            const isTeacher = role === 'teacher' || role === 'faculty' || role === 'admin';

            let enrolledSubjects = [];



            if (isTeacher) {

                const savedTeacherSubs = localStorage.getItem('eduvault_teacher_subjects');

                if (savedTeacherSubs) {

                    try {

                        const parsed = JSON.parse(savedTeacherSubs);

                        if (Array.isArray(parsed) && parsed.length > 0) {

                            const filtered = catalogSubs.filter(cs =>

                                parsed.includes(cs.name) || parsed.includes(cs.id) || parsed.some(p => p === cs.name || p === cs.id)

                            );

                            enrolledSubjects = filtered.length > 0 ? filtered : catalogSubs;

                        } else {

                            enrolledSubjects = catalogSubs;

                        }

                    } catch (e) {

                        enrolledSubjects = catalogSubs;

                    }

                } else {

                    enrolledSubjects = catalogSubs;

                }

                setSubjects(enrolledSubjects);

            } else if (currentSubjects && currentSubjects.length > 0) {

                // Strict 3-tier canonical matching: Exact code first, canonical ID second, normalized exact name third.

                // Never generate detached subject IDs; preserve unresolved subjects explicitly.

                enrolledSubjects = currentSubjects.map(ls => {

                    let match = null;

                    if (ls.code && ls.code.trim()) {

                        const cleanCode = ls.code.trim().toUpperCase();

                        const codeMatches = catalogSubs.filter(cs => cs.code && cs.code.trim().toUpperCase() === cleanCode);

                        if (codeMatches.length === 1) match = codeMatches[0];

                    }

                    if (!match && ls.id && ls.id.trim()) {

                        const idMatches = catalogSubs.filter(cs => cs.id && cs.id.toLowerCase() === ls.id.trim().toLowerCase());

                        if (idMatches.length === 1) match = idMatches[0];

                    }

                    if (!match && ls.name && ls.name.trim()) {

                        const normLsName = ls.name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();

                        const nameMatches = catalogSubs.filter(cs => {

                            if (!cs.name) return false;

                            const normCsName = cs.name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();

                            return normLsName && normCsName && normLsName === normCsName;

                        });

                        if (nameMatches.length === 1) {

                            match = nameMatches[0];

                        } else if (nameMatches.length > 1) {

                            const deptMatches = nameMatches.filter(cs => normDept(cs.department) === normDept(currentProfile?.department));

                            const pool = deptMatches.length > 0 ? deptMatches : nameMatches;

                            match = pool.reduce((best, cur) => ((cur.noteCount || 0) > (best.noteCount || 0) ? cur : best), pool[0]);

                        }

                    }



                    const canonicalId = match ? match.id : (ls.id || null);

                    return {

                        ...ls,

                        id: canonicalId,

                        canonicalCode: match?.code || ls.code || null,

                        isUnresolved: !canonicalId,

                        department: match?.department || ls.department || currentProfile?.department || 'GENERAL',

                        semester: match?.semester || ls.semester || currentProfile?.semester || 'SEM 01'

                    };

                });

                localStorage.setItem('eduvault_subjects', JSON.stringify(enrolledSubjects));

                setSubjects(enrolledSubjects);

            } else if (currentProfile?.department && currentProfile?.semester) {

                const normDept = (d) => {

                    if (!d) return 'GENERAL';

                    const u = d.toUpperCase();

                    if (u.includes('UAD') || u.includes('AIDS') || u.includes('AI&DS') || u.includes('AI & DS') || u.includes('ARTIFICIAL')) return 'AIDS';

                    if (u.includes('CSE') || u.includes('COMPUTER')) return 'CSE';

                    return u.replace(/[^A-Z0-9]/g, '');

                };

                const normSem = (s) => {

                    if (!s) return 'S01';

                    const m = s.toString().match(/(?:sem|semester|s)?\s*0?([1-8])/i);

                    return m ? `S0${m[1]}` : s.toString().toUpperCase().trim();

                };

                const scoped = catalogSubs.filter(cs =>

                    normDept(cs.department) === normDept(currentProfile.department) &&

                    normSem(cs.semester) === normSem(currentProfile.semester)

                );

                enrolledSubjects = scoped.length > 0 ? scoped : catalogSubs;

                setSubjects(enrolledSubjects);

            } else {

                enrolledSubjects = catalogSubs;

                setSubjects(enrolledSubjects);

            }



            // 4. Fetch notes from server scoped to PRN, role, and canonical enrolled subjects

            const enrolledIds = (enrolledSubjects || []).map(s => s.id).filter(Boolean);

            const notesUrl = (currentProfile?.prn && !isTeacher)

                ? `${API_BASE}/notes?prn=${encodeURIComponent(currentProfile.prn)}`

                : `${API_BASE}/notes`;

            const notesRes = await axios.get(notesUrl, {

                headers: {

                    'X-User-Role': role,

                    'X-Student-PRN': currentProfile?.prn || '',

                    'X-Student-Subjects': enrolledIds.join(',')

                }

            });

            const fetchedNotes = Array.isArray(notesRes.data) ? notesRes.data : [];

            setNotes(fetchedNotes);

        } catch (err) {

            console.error('Error fetching data:', err);

        } finally {

            setLoading(false);

        }

    };



    useEffect(() => {

        fetchData();

    }, []);



    const overallAttendance = useMemo(() => {

        if (!subjects || subjects.length === 0) return null;

        const saved = localStorage.getItem('eduvault_excluded_subjects');

        const excludedIds = saved ? JSON.parse(saved) : [];

        const active = subjects.filter(s => !excludedIds.includes(s.id));

        if (active.length === 0) return null;



        let totalAttended = 0;

        let totalConducted = 0;

        active.forEach(s => {

            const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);

            const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);

            totalConducted += cond;

            totalAttended += att;

        });

        if (totalConducted > 0) {

            return ((totalAttended / totalConducted) * 100).toFixed(1);

        }

        return null;

    }, [subjects]);



    const handleLogout = () => {

        localStorage.clear();

        sessionStorage.clear();

        setProfile(null);

        setSubjects([]);

        window.location.replace('/');

        window.location.reload();

    };



    const navTabs = [
        { name: 'Home', path: '/dashboard', icon: Home01Icon },
        { name: 'Notes', path: '/notes', icon: Book02Icon },
        { name: 'AI Tutor', path: '/ai-assistant', icon: AiCustomIcon },
        { name: 'Notices', path: '/announcements', icon: Notification01Icon },
        { name: 'Roadmaps', path: '/roadmaps', icon: MapsLocation02Icon },
        {
            name: 'Attendance',
            path: '/attendance',
            icon: Calendar03Icon,
            badge: null
        },
    ];



    const activeDockTab = useMemo(() => {

        if (location.pathname === '/') return '/';

        const found = navTabs.find(t => t.path !== '/' && location.pathname.startsWith(t.path));

        return found ? found.path : '/';

    }, [location.pathname, navTabs]);



    const discreteTabItems = useMemo(() => {

        return navTabs.map(t => {

            const Icon = t.icon;

            return {

                id: t.path,

                label: t.name,

                icon: <Icon size={17} className="shrink-0" />,

                badge: t.badge

            };

        });

    }, [navTabs, activeDockTab]);

    const outletContextValue = useMemo(() => ({
        profile,
        subjects,
        catalogSubjects,
        notes,
        refreshData: fetchData,
        setShowUpload,
        sidebarCollapsed,
        setSidebarCollapsed,
        onOpenDeveloper: handleOpenDeveloper
    }), [profile, subjects, catalogSubjects, notes, sidebarCollapsed, handleOpenDeveloper]);

    return (

        <div className="flex h-screen w-full max-w-full overflow-hidden bg-canvas-bg text-text-primary font-sans antialiased selection:bg-primary/20">

            {/* Sidebar */}

            <SovereignSidebar profile={profile} attendance={overallAttendance} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onLogout={handleLogout} collapsed={sidebarCollapsed} onOpenDeveloper={handleOpenDeveloper} />



            {/* Mobile Overlay */}

            {mobileMenuOpen && (

                <div

                    className="fixed inset-0 bg-black/40 z-[45] md:hidden backdrop-blur-xs transition-opacity"

                    onClick={() => setMobileMenuOpen(false)}

                />

            )}



            {/* Content Area */}

            <main className={cn("flex-1 flex flex-col min-w-0 w-full max-w-full h-full overflow-hidden relative transition-all duration-300", sidebarCollapsed ? "md:pl-16" : "md:pl-64")}>

                {/* Mobile Header (Single Clean App Header) */}

                <header className="md:hidden sticky top-0 inset-x-0 z-40 bg-surface-card/95 backdrop-blur-md border-b border-border-subtle pt-safe shrink-0">

                    <div className="h-14 px-3.5 flex items-center justify-between gap-2">

                        <div className="flex items-center gap-2.5 min-w-0">

                            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs shrink-0 border border-border-subtle bg-white flex items-center justify-center p-0.5" title="Campusaxis Portal">
                                <img src="/icon.svg" alt="Campusaxis" className="w-full h-full object-contain" />
                            </div>

                            <div className="flex flex-col min-w-0">

                                <div className="flex items-center gap-1.5 leading-none">

                                    <span className="font-bold text-[15px] tracking-tight text-text-primary leading-tight">Campusaxis</span>

                                    <span className="px-1 py-0.2 text-[8px] font-bold bg-blue-50 text-primary rounded border border-blue-100">Portal</span>

                                </div>

                                <span className="text-[10px] font-medium text-text-secondary truncate mt-0.5">

                                    {profile?.department || 'Student Dashboard'}

                                </span>

                            </div>

                        </div>

                        <div className="flex items-center gap-1 shrink-0">

                            <button

                                onClick={() => navigate('/announcements')}

                                aria-label="Notifications"

                                className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-slate-100 transition-colors"

                            >

                                <Notification01Icon size={20} className="text-[#8E8E93]" />

                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>

                            </button>

                            <div className="relative" ref={userMenuRef}>

                                <button

                                    onClick={() => setShowLogoutMenu(!showLogoutMenu)}

                                    className="w-8 h-8 rounded-full bg-[#DEEDFC] border border-[#D9ECFF] flex items-center justify-center text-[#0073E6] font-bold text-xs ml-0.5 cursor-pointer shadow-2xs active:scale-95 transition-transform"

                                    aria-label="Profile actions"

                                >

                                    {profile?.name ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('') : <UserIcon size={16} className="text-[#0073E6]" />}

                                </button>



                                {showLogoutMenu && (

                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E2E2E2] rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                                        <div className="px-2.5 py-1.5 border-b border-[#E2E2E2] mb-1">

                                            <p className="text-xs font-bold text-[#383838] truncate">{profile?.name || 'Student'}</p>

                                            <p className="text-[10px] text-[#727272] truncate">{profile?.prn || profile?.rollNo || 'Academic Vault'}</p>

                                        </div>

                                        <button

                                            onClick={() => {

                                                setShowLogoutMenu(false);

                                                handleLogout();

                                            }}

                                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"

                                        >

                                            <Logout01Icon size={16} />

                                            <span>Logout</span>

                                        </button>

                                    </div>

                                )}

                            </div>

                        </div>

                    </div>

                </header>



                {/* Page Content */}

                <div className={`flex-1 w-full max-w-full min-w-0 relative ${location.pathname === '/ai-assistant' || location.pathname.startsWith('/notes/') ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden pb-24 md:pb-0'}`}>

                    {loading ? (

                        <div className="h-full min-h-[60vh] flex flex-col items-center justify-center gap-3">

                            <TetrisLoader columns={8} rows={14} cellSize={4} gap={1.5} speed={35} label="Loading CampusAxis..." />

                            <p className="text-xs font-bold uppercase tracking-widest text-[#727272]">Loading CampusAxis...</p>

                        </div>

                    ) : (!profile || !profile.prn || !profile.dob) && location.pathname !== '/dashboard' && location.pathname !== '/settings' ? (

                        <Navigate to="/dashboard" replace />

                    ) : (

                        <Outlet context={outletContextValue} />

                    )}

                </div>



                {/* Upload Modal Overlay */}

                {showUpload && (

                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">

                        <div className="bg-white  rounded-2xl border border-border-subtle max-w-4xl w-full shadow-2xl relative overflow-hidden">

                            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border-subtle">

                                <div className="flex items-center gap-2.5">

                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">

                                        <Upload01Icon size={16} className="text-[#0071E3]" />

                                    </div>

                                    <div>

                                        <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">Upload Notes</h2>

                                        <span className="text-[11px] font-medium text-text-secondary">Share study material for your current courses</span>

                                    </div>

                                </div>

                                <button

                                    onClick={() => setShowUpload(false)}

                                    className="w-8 h-8 rounded-lg hover:bg-slate-100  text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"

                                >

                                    <Cancel01Icon size={18} />

                                </button>

                            </div>

                            <div className="p-3.5 sm:p-5 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">

                                <UploadNotesView

                                    profile={profile}

                                    subjects={subjects && subjects.length > 0 ? subjects : catalogSubjects}

                                    onSuccess={() => {

                                        fetchData();

                                        setShowUpload(false);

                                    }}

                                />

                            </div>

                        </div>

                    </div>

                )}



                {/* Floating AI Assistant Quick Access (Adjusted fixed positioning and clearance) */}




                {/* Mobile Floating Bottom Navigation Dock (Collapsible, never overlays notes detail) */}
                {!mobileMenuOpen && !(location.pathname.startsWith('/notes/') && location.pathname !== '/notes') && (
                    <div className="fixed bottom-3 inset-x-0 z-30 md:hidden flex justify-center pointer-events-none px-3">
                        {isDockMinimized ? (
                            <button
                                type="button"
                                onClick={() => setIsDockMinimized(false)}
                                className="pointer-events-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-full px-3.5 py-1.5 shadow-lg flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-white cursor-pointer active:scale-95 transition-all shadow-black/10"
                                title="Expand navigation"
                            >
                                <Menu01Icon size={16} className="text-[#0071E3]" />
                                <span>Menu</span>
                            </button>
                        ) : (
                            <nav
                                aria-label="Mobile Navigation"
                                className="pointer-events-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-full p-1 shadow-lg shadow-black/8 w-auto max-w-[330px] mx-auto flex items-center justify-between gap-0.5"
                            >
                                <DiscreteTabs
                                    tabs={discreteTabItems}
                                    activeTab={activeDockTab}
                                    onTabChange={(path) => {
                                        navigate(path);
                                        setIsDockMinimized(true);
                                    }}
                                    className="h-9 py-0 px-0.5 flex-1 justify-between gap-0.5"
                                    itemClassName="h-8 px-1.5"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsDockMinimized(true)}
                                    className="w-6 h-6 rounded-full text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shrink-0 ml-0.5 mr-0.5 cursor-pointer transition-colors"
                                    title="Minimize navigation bar"
                                >
                                    <Cancel01Icon size={13} />
                                </button>
                            </nav>
                        )}
                    </div>
                )}

                {/* Meet Developer Modal */}
                {showDeveloperModal && (
                    <React.Suspense fallback={null}>
                        <DeveloperProfileModal
                            isOpen={showDeveloperModal}
                            onClose={() => setShowDeveloperModal(false)}
                        />
                    </React.Suspense>
                )}

            </main>

        </div>

    );

};



export default SovereignLayout;

