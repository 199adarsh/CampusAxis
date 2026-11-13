import { isSubjectNameMatch, normalizeUnitNum, unpackAiAnswer } from "../../lib/noteUtils";
import { cn } from "@/lib/utils";
import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import { useOutletContext, useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    SparklesIcon,
    Copy01Icon,
    Tick02Icon,
    RefreshIcon,
    Book02Icon,
    BookOpen01Icon,
    Layers01Icon,
    CheckmarkCircle02Icon,
    ArrowUp02Icon,
    Search01Icon,
    File01Icon,
    Attachment01Icon,
    Cancel01Icon,
    Upload01Icon,
    Loading01Icon,
} from "hugeicons-react";
import AiMascotInput from "@/components/ui/ai-mascot-input";
import { AiLengthSlider, getSavedAiMode } from "@/components/AiLengthSlider";

class AIAssistantErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("AIAssistant caught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-white">
                    <div className="max-w-md w-full bg-white dark:bg-[#1C1C1E] border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-xs text-center">
                        <h3 className="text-sm font-bold text-red-600 mb-2">Notice in AI Assistant</h3>
                        <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mb-4">
                            {String(this.state.error?.message || this.state.error)}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                window.location.href = '/ai-assistant';
                            }}
                            className="px-4 py-2 bg-[#0071E3] text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-[#005BB5] transition-colors"
                        >
                            Reset Conversation
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const formatName = (fullName) => {
    if (!fullName) return "Scholar";
    const trimmed = fullName.trim();
    if (!trimmed) return "Scholar";
    return trimmed
        .split(/\s+/)
        .map((word) => {
            if (word.length <= 2 && word.toUpperCase() === word) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
};

const AIAssistant = () => {
    const {
        profile,
        subjects = [],
        catalogSubjects = [],
        notes = [],
        loading = false,
    } = useOutletContext() || {};
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedUnit, setSelectedUnit] = useState("all");
    const [selectedUnits, setSelectedUnits] = useState(["all"]);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [aiMode, setAiMode] = useState(() => getSavedAiMode());

    const location = useLocation();
    const [isAttachingSubjectNotes, setIsAttachingSubjectNotes] = useState(false);

    // Notes Library Selection Modal for Multi-File RAG
    const [isNotesPickerOpen, setIsNotesPickerOpen] = useState(false);
    const [pickerSubjectId, setPickerSubjectId] = useState("all");
    const [pickerSelectedNoteIds, setPickerSelectedNoteIds] = useState(new Set());

    // Multi-File RAG State
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const sessionId = useMemo(() => {
        let sid = sessionStorage.getItem('eduvault_rag_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 11);
            sessionStorage.setItem('eduvault_rag_session_id', sid);
        }
        return sid;
    }, []);

    const isTeacher = profile?.role === 'teacher';

    // Filter subject selector strictly to enrolled / my subjects
    const allKnownSubjects = useMemo(() => {
        let list = (subjects && subjects.length > 0) ? subjects : [];
        if (list.length === 0) {
            try {
                if (isTeacher) {
                    const savedTeacher = localStorage.getItem('eduvault_teacher_subjects');
                    if (savedTeacher) {
                        const parsed = JSON.parse(savedTeacher);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            list = (catalogSubjects || []).filter(s =>
                                parsed.includes(s.id) || parsed.includes(s.name) || parsed.includes(s.code)
                            );
                        }
                    }
                } else {
                    const saved = localStorage.getItem('eduvault_subjects');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
                    }
                }
            } catch {
                /* ignore */
            }
        }

        // Fallback strictly matching user's enrolled department & semester, NEVER global un-scoped catalog
        if ((!list || list.length === 0) && profile?.department && profile?.semester && catalogSubjects?.length > 0) {
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
            list = (catalogSubjects || []).filter(cs =>
                normDept(cs.department) === normDept(profile.department) &&
                normSem(cs.semester) === normSem(profile.semester)
            );
        } else if ((!list || list.length === 0) && isTeacher) {
            list = catalogSubjects || [];
        }

        // Filter out excluded subjects if any
        try {
            const savedExcluded = localStorage.getItem('eduvault_excluded_subjects');
            if (savedExcluded) {
                const excludedIds = JSON.parse(savedExcluded);
                if (Array.isArray(excludedIds) && excludedIds.length > 0) {
                    list = list.filter(s => s && !excludedIds.includes(s.id));
                }
            }
        } catch {
            /* ignore */
        }

        const map = new Map();
        (list || []).forEach(s => {
            if (s && s.id && !map.has(s.id)) {
                map.set(s.id, s);
            }
        });
        return Array.from(map.values()).filter(Boolean);
    }, [subjects, isTeacher, catalogSubjects]);

    const selectedSubject = searchParams.get("subjectId") || "all";
    const setSelectedSubject = useCallback(
        (val) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    if (val && val !== "all") {
                        next.set("subjectId", val);
                    } else {
                        next.delete("subjectId");
                    }
                    return next;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const activeSubject = useMemo(() => {
        if (!selectedSubject || selectedSubject === "all") return null;
        const found = allKnownSubjects.find((s) => {
            if (!s) return false;
            if (typeof s === "string") return s.toLowerCase() === selectedSubject.toLowerCase();
            return (
                String(s.id) === String(selectedSubject) ||
                (s.code && String(s.code).toLowerCase() === String(selectedSubject).toLowerCase()) ||
                (s.name && String(s.name).toLowerCase() === String(selectedSubject).toLowerCase())
            );
        });
        if (found) return typeof found === "string" ? { id: found, name: found } : found;
        return null;
    }, [allKnownSubjects, selectedSubject]);

    const isInvalidSubject = useMemo(() => {
        return Boolean(
            selectedSubject &&
            selectedSubject !== "all" &&
            allKnownSubjects.length > 0 &&
            !activeSubject
        );
    }, [selectedSubject, allKnownSubjects, activeSubject]);

    const subjectNotes = useMemo(() => {
        if (!notes) return [];
        if (!activeSubject) {
            // When 'all' is selected, include all notes
            return notes.filter(Boolean);
        }
        return (notes || []).filter((n) => {
            if (!n) return false;
            if (String(n.subjectId) === String(activeSubject.id)) return true;
            if (activeSubject.code && String(n.subjectId).toLowerCase() === String(activeSubject.code).toLowerCase()) return true;
            if (n.subject && (String(n.subject) === String(activeSubject.id) || String(n.subject) === String(activeSubject.name))) return true;
            if (n.subjectName && activeSubject.name && isSubjectNameMatch(n.subjectName, activeSubject.name)) return true;
            if (n.r2ObjectKey) {
                const folder = n.r2ObjectKey.split('/')[0];
                if (activeSubject.code && activeSubject.code.length > 2 && folder.toUpperCase().includes(activeSubject.code.toUpperCase())) return true;
                if (activeSubject.name && isSubjectNameMatch(folder, activeSubject.name)) return true;
            }
            return false;
        });
    }, [activeSubject, notes]);

    // Available units strictly derived from notes that actually exist for the active subject
    const availableUnits = useMemo(() => {
        if (!subjectNotes || subjectNotes.length === 0) return [];
        const set = new Set();
        subjectNotes.forEach(n => {
            const uNum = normalizeUnitNum(n.unit);
            if (uNum !== null && uNum >= 1 && uNum <= 6) {
                set.add(uNum);
            }
        });
        return Array.from(set).sort((a, b) => a - b);
    }, [subjectNotes]);

    // Auto-reset selectedUnits if not in availableUnits
    useEffect(() => {
        if (!selectedUnits || selectedUnits.includes("all")) return;
        const validUnits = selectedUnits.filter(u => {
            const uNum = normalizeUnitNum(u);
            return uNum !== null && availableUnits.includes(uNum);
        });
        if (validUnits.length === 0) {
            setSelectedUnits(["all"]);
        } else if (validUnits.length !== selectedUnits.length) {
            setSelectedUnits(validUnits);
        }
    }, [selectedSubject, availableUnits, selectedUnits]);

    const compiledCount = useMemo(() => {
        return (subjectNotes || []).filter((n) => n && n.okfStatus === "PROCESSED").length;
    }, [subjectNotes]);

    const pendingCount = useMemo(() => {
        return (subjectNotes || []).filter((n) => n && (n.okfStatus === "PENDING" || !n.okfStatus)).length;
    }, [subjectNotes]);

    const hasCompiledOkf = compiledCount > 0;

    // Notes filtered strictly to selected subject and selected units
    const activeSelectedNotes = useMemo(() => {
        if (!subjectNotes || subjectNotes.length === 0) return [];
        if (!selectedUnits || selectedUnits.length === 0 || selectedUnits.includes("all")) {
            return subjectNotes;
        }
        const unitNums = new Set(selectedUnits.map(normalizeUnitNum).filter(n => n !== null));
        return subjectNotes.filter(n => {
            const uNum = normalizeUnitNum(n.unit);
            return uNum !== null && unitNums.has(uNum);
        });
    }, [subjectNotes, selectedUnits]);

    const defaultInitialMessage = {
        role: "ai",
        content: `Hello ${profile?.name ? formatName(profile.name) : "Scholar"}. I am your academic study assistant. Select your subject and units to get grounded answers with citations. How can I assist your study session today?`,
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };

    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('eduvault_ai_tutor_messages');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse saved ai chat:', e);
        }
        return [defaultInitialMessage];
    });

    useEffect(() => {
        try {
            if (messages && messages.length > 0) {
                localStorage.setItem('eduvault_ai_tutor_messages', JSON.stringify(messages));
            }
        } catch (e) {
            console.error('Failed to save ai chat:', e);
        }
    }, [messages]);

    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleClearChat = () => {
        const fresh = [
            {
                role: "ai",
                content: "Chat cleared. Ask any question across your uploaded files, courses, or exam archives.",
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            },
        ];
        setMessages(fresh);
        localStorage.setItem('eduvault_ai_tutor_messages', JSON.stringify(fresh));
        toast.success("Chat history cleared");
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // Multi-File upload handler
    const handleFileUpload = async (filesToUpload) => {
        if (!filesToUpload || filesToUpload.length === 0) return;
        setIsUploadingFiles(true);
        const formData = new FormData();
        for (let i = 0; i < filesToUpload.length; i++) {
            formData.append('files', filesToUpload[i]);
        }
        formData.append('sessionId', sessionId);

        try {
            const res = await axios.post(`${API_BASE}/ai/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data?.success && Array.isArray(res.data.files)) {
                setAttachedFiles(prev => {
                    const existingIds = new Set(prev.map(f => f.id));
                    const next = [...prev];
                    res.data.files.forEach(f => {
                        if (!existingIds.has(f.id)) next.push(f);
                    });
                    return next;
                });
                toast.success(`Attached ${res.data.files.length} document(s) for multi-file RAG query`);
            }
        } catch (err) {
            console.error("Multi-file upload error:", err);
            toast.error(err?.response?.data?.error || "Failed to upload files for RAG.");
        } finally {
            setIsUploadingFiles(false);
        }
    };

    const handleRemoveFile = async (fileId) => {
        try {
            await axios.delete(`${API_BASE}/ai/files/${fileId}`);
        } catch { /* ignore */ }
        setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
        toast.info("Document removed from query context");
    };

    const handleClearAllFiles = async () => {
        try {
            await axios.post(`${API_BASE}/ai/files/clear`, { sessionId });
        } catch { /* ignore */ }
        setAttachedFiles([]);
        toast.info("All attached files cleared");
    };

    // Auto-attach notes belonging to the selected subject & units to RAG session
    useEffect(() => {
        if (!activeSubject || activeSelectedNotes.length === 0) {
            setAttachedFiles([]);
            return;
        }

        const noteIdsToAttach = activeSelectedNotes.map(n => n.id);
        setIsAttachingSubjectNotes(true);
        axios.post(`${API_BASE}/ai/attach-notes`, {
            noteIds: noteIdsToAttach,
            sessionId
        }).then(res => {
            if (res.data?.success && Array.isArray(res.data.files)) {
                setAttachedFiles(res.data.files);
            }
        }).catch(err => {
            console.warn("Failed to attach subject unit notes:", err);
        }).finally(() => {
            setIsAttachingSubjectNotes(false);
        });
    }, [activeSubject, activeSelectedNotes, sessionId]);

    // Sync picker state whenever modal opens
    useEffect(() => {
        if (isNotesPickerOpen) {
            setPickerSelectedNoteIds(new Set(attachedFiles.map(f => f.id)));
            if (selectedSubject && selectedSubject !== "all") {
                setPickerSubjectId(selectedSubject);
            }
        }
    }, [isNotesPickerOpen, attachedFiles, selectedSubject]);

    const pickerNotes = useMemo(() => {
        if (!notes || notes.length === 0) return [];
        if (pickerSubjectId === "all") {
            const enrolledIds = new Set(allKnownSubjects.map(s => s.id));
            const enrolledCodes = new Set(allKnownSubjects.map(s => s.code?.toLowerCase()).filter(Boolean));
            return notes.filter(n => {
                if (!n) return false;
                if (enrolledIds.has(n.subjectId)) return true;
                if (n.subjectId && enrolledCodes.has(n.subjectId.toLowerCase())) return true;
                return allKnownSubjects.some(s => s.name && isSubjectNameMatch(n.subjectName, s.name));
            });
        }
        const targetSub = allKnownSubjects.find(s => s.id === pickerSubjectId || s.code === pickerSubjectId);
        return notes.filter(n => {
            if (!n) return false;
            if (String(n.subjectId) === String(pickerSubjectId)) return true;
            if (targetSub?.code && String(n.subjectId).toLowerCase() === String(targetSub.code).toLowerCase()) return true;
            if (targetSub?.name && isSubjectNameMatch(n.subjectName, targetSub.name)) return true;
            if (n.r2ObjectKey && targetSub?.code && n.r2ObjectKey.toUpperCase().includes(targetSub.code.toUpperCase())) return true;
            return false;
        });
    }, [notes, pickerSubjectId, allKnownSubjects]);

    const pickerNotesByUnit = useMemo(() => {
        const groups = {};
        pickerNotes.forEach(note => {
            const uNum = normalizeUnitNum(note.unit);
            const key = uNum ? `Unit ${uNum}` : (note.unit && note.unit.trim() ? note.unit : 'General / Other');
            if (!groups[key]) groups[key] = [];
            groups[key].push(note);
        });
        return groups;
    }, [pickerNotes]);

    const isAllCurrentUnitsSelected = useMemo(() => {
        if (pickerNotes.length === 0) return false;
        return pickerNotes.every(n => pickerSelectedNoteIds.has(n.id));
    }, [pickerNotes, pickerSelectedNoteIds]);

    const handleToggleSelectAllUnits = useCallback(() => {
        setPickerSelectedNoteIds(prev => {
            const next = new Set(prev);
            if (isAllCurrentUnitsSelected) {
                pickerNotes.forEach(n => next.delete(n.id));
            } else {
                pickerNotes.forEach(n => next.add(n.id));
            }
            return next;
        });
    }, [isAllCurrentUnitsSelected, pickerNotes]);

    const handleToggleUnit = useCallback((unitNotes) => {
        setPickerSelectedNoteIds(prev => {
            const next = new Set(prev);
            const allInUnitSelected = unitNotes.every(n => next.has(n.id));
            if (allInUnitSelected) {
                unitNotes.forEach(n => next.delete(n.id));
            } else {
                unitNotes.forEach(n => next.add(n.id));
            }
            return next;
        });
    }, []);

    const handleToggleNote = useCallback((noteId) => {
        setPickerSelectedNoteIds(prev => {
            const next = new Set(prev);
            if (next.has(noteId)) {
                next.delete(noteId);
            } else {
                next.add(noteId);
            }
            return next;
        });
    }, []);

    const handleConfirmAttachSelected = async () => {
        const ids = Array.from(pickerSelectedNoteIds);
        if (ids.length === 0) {
            setAttachedFiles([]);
            setIsNotesPickerOpen(false);
            return;
        }
        setIsAttachingSubjectNotes(true);
        try {
            const res = await axios.post(`${API_BASE}/ai/attach-notes`, {
                noteIds: ids,
                sessionId
            });
            if (res.data?.success && Array.isArray(res.data.files)) {
                setAttachedFiles(res.data.files);
                toast.success(`Attached ${res.data.files.length} note(s) across units for Multi-File RAG`);
                setIsNotesPickerOpen(false);
            }
        } catch {
            toast.error("Failed to attach selected notes");
        } finally {
            setIsAttachingSubjectNotes(false);
        }
    };

    // Attach all units / notes for the active subject directly
    const handleAttachAllSubjectNotes = async () => {
        if (!subjectNotes || subjectNotes.length === 0) {
            toast.info("No notes found for this subject to attach");
            return;
        }
        setIsAttachingSubjectNotes(true);
        try {
            const noteIds = subjectNotes.map(n => n.id);
            const res = await axios.post(`${API_BASE}/ai/attach-notes`, {
                noteIds,
                sessionId
            });
            if (res.data?.success && Array.isArray(res.data.files)) {
                setAttachedFiles(prev => {
                    const existing = new Set(prev.map(f => f.id));
                    const next = [...prev];
                    res.data.files.forEach(f => {
                        if (!existing.has(f.id)) next.push(f);
                    });
                    return next;
                });
                toast.success(`Attached all units (${res.data.files.length} notes) for Multi-File RAG`);
            }
        } catch {
            toast.error("Failed to attach subject notes for RAG");
        } finally {
            setIsAttachingSubjectNotes(false);
        }
    };

    // Drag-and-drop file upload
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const sendMessage = async (promptText) => {
        const queryText = (promptText || input).trim();
        if (!queryText) return;

        const isMultiFileQuery = attachedFiles.length > 0;
        const noteIds = activeSelectedNotes.map(n => n.id);

        const userMessage = {
            role: "user",
            content: queryText,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
            attachedFiles: isMultiFileQuery ? attachedFiles.map(f => f.name) : undefined,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        let answer = null;
        let confidence = 0.95;
        let source = null;
        let sources = null;
        let retrievedCount = 0;

        const customApiKey =
            localStorage.getItem("eduvault_custom_gemini_key") ||
            localStorage.getItem("eduvault_gemini_api_key");

        const currentSubjectId =
            activeSubject && selectedSubject && selectedSubject !== "all"
                ? activeSubject.id
                : undefined;
        const currentUnit =
            selectedUnits && !selectedUnits.includes("all") && selectedUnits.length === 1
                ? selectedUnits[0]
                : (selectedUnit && selectedUnit !== "all" ? selectedUnit : undefined);

        try {
            const requestPayload = {
                question: queryText,
                prn: profile?.prn,
                subjectId: currentSubjectId,
                unit: currentUnit,
                lengthMode: aiMode,
                mode: aiMode,
                customApiKey: customApiKey || undefined,
                apiKey: customApiKey || undefined,
            };

            if (isMultiFileQuery || noteIds.length > 0) {
                const targetIds = isMultiFileQuery ? attachedFiles.map(f => f.id) : noteIds;
                requestPayload.fileIds = targetIds;
                requestPayload.noteIds = targetIds;
                requestPayload.sessionId = sessionId;
            }

            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(customApiKey ? { "X-Gemini-Api-Key": customApiKey } : {}),
                },
                body: JSON.stringify(requestPayload),
            });

            if (response.ok) {
                const data = await response.json();
                if (
                    data.answer &&
                    !data.answer.toLowerCase().includes("encountered an error") &&
                    !data.answer.toLowerCase().includes("error processing")
                ) {
                    answer = unpackAiAnswer(data.answer);
                    confidence = data.confidence || 0.95;
                    source = data.source;
                    sources = data.sources || (isMultiFileQuery ? attachedFiles.map(f => f.name) : undefined);
                    retrievedCount = data.documentsCount || data.retrievedPassages || (sources ? sources.length : 0);
                }
            }
        } catch (err) {
            console.warn("Backend AI chat error:", err);
        }

        if (!answer && customApiKey && !isMultiFileQuery) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(customApiKey)}`;
                const directRes = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: queryText }] }],
                    }),
                });
                if (directRes.ok) {
                    const directData = await directRes.json();
                    const candidate =
                        directData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (candidate) {
                        answer = unpackAiAnswer(candidate);
                        confidence = 0.98;
                        source = "GENERAL_TUTOR";
                    }
                }
            } catch (directErr) {
                console.error("Direct Gemini call failed:", directErr);
            }
        }

        if (answer) {
            const finalAnswer = unpackAiAnswer(answer);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: finalAnswer,
                    time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    confidence,
                    source,
                    sources,
                    retrievedCount,
                    subjectId: currentSubjectId,
                },
            ]);
        } else {
            const fallbackMsg =
                "Unable to synthesize response. Ensure the backend service is running or check your uploaded files.";
            toast.error(fallbackMsg);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: fallbackMsg,
                    time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    isError: true,
                },
            ]);
        }
        setIsTyping(false);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="w-5 h-5 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="flex-1 flex flex-col h-full bg-[#F5F5F7] dark:bg-black font-sans text-[#1D1D1F] dark:text-[#F5F5F7] antialiased overflow-hidden relative"
        >
            {/* Hidden Multi-File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    e.target.value = '';
                }}
                multiple
                accept=".pdf,.docx,.pptx,.txt,.md,.csv,.json"
                className="hidden"
            />

            {/* Minimal Header */}
            <header className="h-12 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#34C759]" />
                    <span className="text-xs font-semibold text-[#1D1D1F] dark:text-white">
                        AI Academic Assistant
                    </span>
                    {activeSubject ? (
                        <span className="text-[11px] font-medium text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full ml-1 truncate max-w-[200px]">
                            {activeSubject.name} {selectedUnits && !selectedUnits.includes("all") && `(${selectedUnits.join(", ")})`}
                        </span>
                    ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleClearChat}
                        className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Clear conversation"
                    >
                        <RefreshIcon size={16} />
                    </button>
                </div>
            </header>

            {/* Main Chat Canvas */}
            <main
                ref={scrollRef}
                className="flex-1 w-full overflow-y-auto select-text scroll-smooth relative"
                id="chatStream"
            >
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-6 pt-6 pb-56 md:pb-48 min-h-full">
                    {/* Empty State / Welcome Screen */}
                    {messages.length <= 1 && (
                        <div className="flex flex-col items-center justify-center my-auto py-8 text-center select-none">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#0071E3] mb-4 shadow-xs">
                                <SparklesIcon size={24} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">
                                Hello, I am Caxiee !
                            </h2>
                            <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mt-1.5 max-w-md">
                                Your academic study tutor. Select your subject and specific units below to retrieve grounded answers with direct document citations.
                            </p>
                        </div>
                    )}

                    {/* Messages Flow */}
                    {messages.map((msg, i) => {
                        const isUser = msg.role === "user";
                        const renderedContent = !isUser ? unpackAiAnswer(msg.content) : (typeof msg.content === "string" ? msg.content : String(msg.content || ""));
                        return (
                            <div key={i} className="flex flex-col">
                                {isUser ? (
                                    <div className="self-end max-w-[85%] sm:max-w-[75%]">
                                        <div className="bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-3xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap select-text">
                                            {renderedContent}
                                        </div>
                                        {Array.isArray(msg.attachedFiles) && msg.attachedFiles.length > 0 && (
                                            <div className="flex items-center gap-1 justify-end mt-1 text-[10px] text-[#8E8E93]">
                                                <File01Icon size={11} />
                                                <span>Queried across: {msg.attachedFiles.join(", ")}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 w-full group">
                                        <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#0071E3] shrink-0 mt-0.5 select-none shadow-xs">
                                            <SparklesIcon size={14} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] select-text">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({ node, ...rest }) => (
                                                            <p className="mb-3 last:mb-0 leading-relaxed" {...rest} />
                                                        ),
                                                        ul: ({ node, ...rest }) => (
                                                            <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...rest} />
                                                        ),
                                                        ol: ({ node, ...rest }) => (
                                                            <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...rest} />
                                                        ),
                                                        li: ({ node, ...rest }) => (
                                                            <li className="leading-relaxed" {...rest} />
                                                        ),
                                                        h1: ({ node, ...rest }) => (
                                                            <h1 className="text-base font-bold text-[#1D1D1F] dark:text-white mt-4 mb-2" {...rest} />
                                                        ),
                                                        h2: ({ node, ...rest }) => (
                                                            <h2 className="text-sm font-bold text-[#1D1D1F] dark:text-white mt-3 mb-1.5" {...rest} />
                                                        ),
                                                        h3: ({ node, ...rest }) => (
                                                            <h3 className="text-xs font-semibold text-[#1D1D1F] dark:text-white mt-2 mb-1" {...rest} />
                                                        ),
                                                        strong: ({ node, ...rest }) => (
                                                            <strong className="font-semibold text-[#1D1D1F] dark:text-white" {...rest} />
                                                        ),
                                                        pre: ({ node, ...rest }) => (
                                                            <pre className="bg-[#1C1C1E] text-[#F5F5F7] p-3.5 rounded-xl overflow-x-auto text-xs font-mono my-3 border border-[#2C2C2E]" {...rest} />
                                                        ),
                                                        code: ({ node, className, children, ...rest }) => {
                                                            const isMultiLine = String(children).includes("\n");
                                                            if (!className && !isMultiLine) {
                                                                return (
                                                                    <code className="bg-black/5 dark:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] px-1.5 py-0.5 rounded text-xs font-mono" {...rest}>
                                                                        {children}
                                                                    </code>
                                                                );
                                                            }
                                                            return <code className={className} {...rest}>{children}</code>;
                                                        },
                                                        blockquote: ({ node, ...rest }) => (
                                                            <blockquote className="border-l-2 border-[#0071E3] pl-3 italic text-[#6E6E73] dark:text-[#AEAEB2] my-2" {...rest} />
                                                        ),
                                                        table: ({ node, ...rest }) => (
                                                            <div className="overflow-x-auto my-3">
                                                                <table className="min-w-full divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs" {...rest} />
                                                            </div>
                                                        ),
                                                        th: ({ node, ...rest }) => (
                                                            <th className="bg-[#F5F5F7] dark:bg-[#2C2C2E] px-3 py-2 text-left font-semibold text-[#1D1D1F] dark:text-white border-b border-[#E5E5EA] dark:border-[#2C2C2E]" {...rest} />
                                                        ),
                                                        td: ({ node, ...rest }) => (
                                                            <td className="px-3 py-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-[#6E6E73] dark:text-[#AEAEB2]" {...rest} />
                                                        ),
                                                    }}
                                                    children={renderedContent}
                                                />
                                            </div>

                                            {/* Multi-File RAG Source Badges */}
                                            {msg.source === "MULTI_FILE_RAG" && (
                                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/10 dark:bg-[#0A84FF]/10 px-2 py-0.5 rounded-full">
                                                        <File01Icon size={12} />
                                                        <span>Multi-File RAG Grounded</span>
                                                    </span>
                                                    {Array.isArray(msg.sources) && msg.sources.map((src, sIdx) => (
                                                        <span key={sIdx} className="text-[10px] text-[#6E6E73] dark:text-[#AEAEB2] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md font-mono truncate max-w-[180px]" title={src}>
                                                            {src}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Action Bar (Copy + Verified Syllabus Badge) */}
                                            <div className="flex items-center gap-2 mt-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(renderedContent, i)}
                                                    className="p-1 rounded text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer"
                                                    title="Copy answer"
                                                >
                                                    {copiedIndex === i ? (
                                                        <Tick02Icon size={14} className="text-[#34C759]" />
                                                    ) : (
                                                        <Copy01Icon size={14} />
                                                    )}
                                                </button>

                                                {msg.source === "OKF_KNOWLEDGE" && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-full">
                                                        <CheckmarkCircle02Icon size={12} />
                                                        <span>Verified Syllabus</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Searching / Thinking State */}
                    {isTyping && (
                        <div className="flex items-start gap-3 w-full">
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#0071E3] shrink-0 mt-0.5 shadow-xs">
                                <SparklesIcon size={14} />
                            </div>
                            <div className="flex items-center gap-2 py-1 text-xs text-[#6E6E73] dark:text-[#AEAEB2]">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-pulse" />
                                <span>
                                    {attachedFiles.length > 0
                                        ? `Searching & synthesizing across ${attachedFiles.length} uploaded files...`
                                        : "Searching notes & syllabus context..."}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Grounding & Chat Input Area (Fixed at bottom) */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/95 to-transparent dark:from-black dark:via-black/95 pt-8 pb-20 md:pb-4 z-10">
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pointer-events-auto">
                    {/* Attached Files Chips Bar */}
                    {attachedFiles.length > 0 && (
                        <div className="mb-2 p-2 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md rounded-2xl border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm animate-in fade-in">
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-white">
                                    <File01Icon size={14} className="text-[#0071E3]" />
                                    <span>Attached Query Files ({attachedFiles.length})</span>
                                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                                        Multi-File RAG Active
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearAllFiles}
                                    className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer font-medium"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                                {attachedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/5 dark:border-white/5"
                                    >
                                        <File01Icon size={12} className="text-[#0071E3] shrink-0" />
                                        <span className="truncate max-w-[140px] text-[11px] font-medium" title={file.name}>
                                            {file.name}
                                        </span>
                                        <span className="text-[9px] text-[#8E8E93]">
                                            {file.size ? `${Math.round(file.size / 1024)}KB` : ''}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(file.id)}
                                            className="text-[#8E8E93] hover:text-red-500 cursor-pointer transition-colors"
                                            title="Remove file"
                                        >
                                            <Cancel01Icon size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isUploadingFiles && (
                        <div className="mb-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-[#0071E3] text-xs rounded-xl flex items-center gap-2 border border-blue-200 dark:border-blue-800">
                            <div className="w-3.5 h-3.5 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin" />
                            <span>Processing and indexing uploaded documents for RAG...</span>
                        </div>
                    )}

                    <AiMascotInput
                        selectedSubject={selectedSubject}
                        setSelectedSubject={setSelectedSubject}
                        selectedUnit={selectedUnit}
                        setSelectedUnit={setSelectedUnit}
                        selectedUnits={selectedUnits}
                        setSelectedUnits={setSelectedUnits}
                        availableUnits={availableUnits}
                        allKnownSubjects={allKnownSubjects}
                        isInvalidSubject={isInvalidSubject}
                        hasCompiledOkf={hasCompiledOkf}
                        compiledCount={compiledCount}
                        pendingCount={pendingCount}
                        subjectNotesCount={subjectNotes.length}
                        aiMode={aiMode}
                        onAiModeChange={setAiMode}
                        placeholder={
                            activeSubject
                                ? selectedUnits && !selectedUnits.includes("all") && selectedUnits.length > 0
                                    ? `Ask anything about ${activeSubject.name} (${selectedUnits.join(", ")})...`
                                    : `Ask anything about ${activeSubject.name}...`
                                : "Select a subject and units to ask questions..."
                        }
                        onSubmit={(data) => sendMessage(data.prompt)}
                        isProcessing={isTyping}
                        disabled={isTyping || isAttachingSubjectNotes}
                    />
                </div>
            </div>

            {/* Notes Library Selection Modal for Multi-File RAG */}
            {isNotesPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-white/10 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[#0073E6]/10 text-[#0073E6] flex items-center justify-center shrink-0">
                                    <BookOpen01Icon size={18} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                                            Select Notes for Multi-File RAG
                                        </h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DEEDFC] text-[#0073E6] dark:bg-[#0073E6]/20">
                                            Library RAG
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mt-0.5">
                                        Select all units or pick specific notes from your enrolled courses for multi-document synthesis.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsNotesPickerOpen(false)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                title="Close modal"
                            >
                                <Cancel01Icon size={16} />
                            </button>
                        </div>

                        {/* Subject Filter Bar */}
                        <div className="px-5 py-2.5 bg-[#F2F7FC] dark:bg-[#252528] border-b border-[#E5E5EA] dark:border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#727272] shrink-0">
                                Subject:
                            </span>
                            <button
                                type="button"
                                onClick={() => setPickerSubjectId("all")}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                                    pickerSubjectId === "all"
                                        ? "bg-[#0073E6] text-white shadow-2xs"
                                        : "bg-white dark:bg-[#1C1C1E] text-[#383838] dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-[#E2E2E2] dark:border-white/10"
                                )}
                            >
                                All My Subjects
                            </button>
                            {allKnownSubjects.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setPickerSubjectId(s.id)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                                        pickerSubjectId === s.id
                                            ? "bg-[#0073E6] text-white shadow-2xs"
                                            : "bg-white dark:bg-[#1C1C1E] text-[#383838] dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-[#E2E2E2] dark:border-white/10"
                                    )}
                                >
                                    {s.name || s.code}
                                </button>
                            ))}
                        </div>

                        {/* Action Header: Select All Units & Counter */}
                        <div className="px-5 py-2 bg-white dark:bg-[#1C1C1E] border-b border-[#E5E5EA] dark:border-white/10 flex items-center justify-between shrink-0">
                            <button
                                type="button"
                                onClick={handleToggleSelectAllUnits}
                                disabled={pickerNotes.length === 0}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                    isAllCurrentUnitsSelected
                                        ? "bg-[#0073E6] text-white"
                                        : "bg-[#DEEDFC] text-[#0073E6] hover:bg-[#D0E5FA] border border-[#BBDCF9]"
                                )}
                                title="Toggle all units across this subject"
                            >
                                <CheckmarkCircle02Icon size={14} />
                                <span>
                                    {isAllCurrentUnitsSelected ? "Deselect All Units" : "Select All Units"} ({pickerNotes.length} notes)
                                </span>
                            </button>

                            <div className="text-xs font-semibold text-[#0073E6]">
                                {pickerSelectedNoteIds.size} note{pickerSelectedNoteIds.size !== 1 ? 's' : ''} selected
                            </div>
                        </div>

                        {/* Notes List Grouped by Unit */}
                        <div className="p-5 flex-1 overflow-y-auto space-y-4">
                            {pickerNotes.length === 0 ? (
                                <div className="py-12 text-center text-sm text-[#8E8E93]">
                                    No notes found for this subject.
                                </div>
                            ) : (
                                Object.entries(pickerNotesByUnit).map(([unitName, unitNotes]) => {
                                    const allInUnitSelected = unitNotes.every(n => pickerSelectedNoteIds.has(n.id));
                                    const someInUnitSelected = unitNotes.some(n => pickerSelectedNoteIds.has(n.id));

                                    return (
                                        <div key={unitName} className="border border-[#E5E5EA] dark:border-white/10 rounded-xl overflow-hidden">
                                            {/* Unit Header */}
                                            <div
                                                onClick={() => handleToggleUnit(unitNotes)}
                                                className="px-3.5 py-2 bg-[#F9FAFC] dark:bg-[#252528] flex items-center justify-between cursor-pointer hover:bg-[#F2F7FC] dark:hover:bg-[#2C2C2E] transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={allInUnitSelected}
                                                        ref={el => {
                                                            if (el) el.indeterminate = someInUnitSelected && !allInUnitSelected;
                                                        }}
                                                        onChange={() => handleToggleUnit(unitNotes)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="w-4 h-4 rounded text-[#0073E6] accent-[#0073E6] cursor-pointer"
                                                    />
                                                    <span className="text-xs font-bold text-[#1D1D1F] dark:text-white flex items-center gap-1.5">
                                                        <Layers01Icon size={13} className="text-[#0073E6]" />
                                                        {unitName}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-[#8E8E93] font-medium">
                                                    {unitNotes.length} note{unitNotes.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Unit Notes Cards */}
                                            <div className="p-2 space-y-1 bg-white dark:bg-[#1C1C1E]">
                                                {unitNotes.map(n => {
                                                    const isChecked = pickerSelectedNoteIds.has(n.id);
                                                    return (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => handleToggleNote(n.id)}
                                                            className={cn(
                                                                "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border",
                                                                isChecked
                                                                    ? "bg-[#DEEDFC]/40 dark:bg-[#0073E6]/10 border-[#0073E6]/40 shadow-2xs"
                                                                    : "border-transparent hover:bg-slate-50 dark:hover:bg-white/5"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleToggleNote(n.id)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="w-3.5 h-3.5 rounded text-[#0073E6] accent-[#0073E6] cursor-pointer shrink-0"
                                                                />
                                                                <File01Icon size={15} className="text-[#0073E6] shrink-0" />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-xs font-semibold text-[#1D1D1F] dark:text-zinc-200 truncate">
                                                                        {n.title || n.originalFilename || "Untitled Note"}
                                                                    </div>
                                                                    {n.subjectName && (
                                                                        <div className="text-[10px] text-[#8E8E93] truncate">
                                                                            {n.subjectName}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[#727272] shrink-0 ml-2">
                                                                {n.unit || "Note"}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 border-t border-[#E5E5EA] dark:border-white/10 bg-[#FAFBFD] dark:bg-[#202022] flex items-center justify-between shrink-0">
                            <div>
                                <span className="text-xs text-[#8E8E93]">Multi-Unit RAG Grounding</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNotesPickerOpen(false)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmAttachSelected}
                                    disabled={pickerSelectedNoteIds.size === 0 || isAttachingSubjectNotes}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs",
                                        pickerSelectedNoteIds.size > 0 && !isAttachingSubjectNotes
                                            ? "bg-[#0073E6] hover:bg-[#174073] text-white active:scale-95"
                                            : "bg-[#E2E2E2] dark:bg-[#383838] text-[#727272] cursor-not-allowed opacity-70"
                                    )}
                                >
                                    {isAttachingSubjectNotes ? (
                                        <Loading01Icon size={14} className="animate-spin text-white" />
                                    ) : (
                                        <Attachment01Icon size={14} />
                                    )}
                                    <span>Attach Selected ({pickerSelectedNoteIds.size})</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AIAssistantWrapped = (props) => <AIAssistantErrorBoundary><AIAssistant {...props} /></AIAssistantErrorBoundary>;
export default AIAssistantWrapped;
