import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ChevronDown,
  Search,
  BookOpen,
  Layers,
  Sparkles,
  Loader2,
  GraduationCap
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Custom High-Reliability Dropdown Component
 * Compact styling for mobile ergonomics
 */
const CustomSelect = ({ label, icon: Icon, value, options, onChange, placeholder, searchable = false, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="flex flex-col gap-1 relative w-full" ref={dropdownRef}>
      <label className="text-[11px] font-bold text-slate-700 dark:text-white px-0.5 flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-slate-400 dark:text-slate-300" />}
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg transition-all text-left outline-none cursor-pointer ${
          isOpen ? 'ring-1 ring-blue-500 border-blue-500' : 'hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate flex-1 font-medium ${!selectedOption ? 'text-slate-400 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={13} className={`text-slate-400 dark:text-slate-300 transition-transform duration-200 shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[200] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden">
          {searchable && (
            <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Filter subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1 pl-7 pr-2.5 rounded-md outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}
          <div className="max-h-44 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md transition-colors text-left cursor-pointer ${
                    value === opt.value
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${value === opt.value ? 'bg-blue-600' : 'bg-transparent'}`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            ) : (
              <div className="p-2.5 text-center text-xs text-slate-400">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const UploadNotesView = ({ subjects, onSuccess, profile }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unit, setUnit] = useState('Unit 1');
  const [category, setCategory] = useState('Notes');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const normalizeDept = (dept) => {
    if (!dept) return 'AIDS';
    const upper = dept.toUpperCase();
    if (upper.includes('UAD') || upper.includes('AIDS') || upper.includes('AI&DS') || upper.includes('AI & DS') || upper.includes('ARTIFICIAL')) return 'AIDS';
    if (upper.includes('CSE') || upper.includes('COMPUTER')) return 'CSE';
    if (upper.includes('ECE') || upper.includes('ELECTRONIC')) return 'ECE';
    if (upper.includes('MECH')) return 'MECH';
    if (upper.includes('CIVIL')) return 'CIVIL';
    return upper.replace(/[^A-Z0-9]/g, '');
  };

  const normalizeSem = (sem) => {
    if (!sem) return 'S05';
    const m = sem.toString().match(/(?:sem|semester|s)?\s*0?([1-8])/i);
    return m ? `S0${m[1]}` : sem.toString().toUpperCase().trim();
  };

  const currentDept = normalizeDept(profile?.department) || 'AIDS';
  const currentSem = profile?.semester || 'SEM 05';

  const [catalogList, setCatalogList] = useState(subjects || []);

  useEffect(() => {
    if (subjects && subjects.length > 0) {
      setCatalogList(subjects);
    } else {
      axios.get(`${API_BASE}/subjects`)
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setCatalogList(res.data);
          }
        })
        .catch(err => console.warn('Could not fetch catalog subjects in upload view:', err));
    }
  }, [subjects]);

  // Restrict strictly to CURRENT semester and enrolled/department subjects
  const sourceSubjects = (subjects && subjects.length > 0) ? subjects : catalogList;
  const filteredSubjects = (sourceSubjects || []).filter(s => {
    const sMatch = !s.semester || normalizeSem(s.semester) === normalizeSem(currentSem);
    const dMatch = !s.department || normalizeDept(s.department) === currentDept || s.department.toUpperCase() === 'GENERAL';
    return sMatch && dMatch;
  });

  const activeSubjects = filteredSubjects.length > 0 ? filteredSubjects : sourceSubjects;

  const subjectOptions = activeSubjects.map(s => ({
    label: s.code ? `${s.name} (${s.code})` : s.name,
    value: s.id
  }));

  const unitOptions = Array.from({ length: 10 }, (_, i) => ({ label: `Unit ${i + 1}`, value: `Unit ${i + 1}` }));

  const categoryOptions = [
    { label: 'Notes', value: 'Notes' },
    { label: 'PYQ', value: 'PYQ' },
    { label: 'Syllabus', value: 'Syllabus' },
    { label: 'Lab Manual', value: 'Lab Manual' },
    { label: 'Lecture Plan', value: 'Lecture Plan' }
  ];

  // Auto-align subject to first valid subject
  useEffect(() => {
    if (activeSubjects.length > 0) {
      if (!activeSubjects.some(s => s.id === subjectId)) {
        setSubjectId(activeSubjects[0].id);
      }
    } else {
      setSubjectId('');
    }
  }, [activeSubjects, subjectId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: acceptedFiles => {
      if (acceptedFiles?.length > 0) {
        const selectedFile = acceptedFiles[0];
        if (selectedFile.size > 50 * 1024 * 1024) {
          toast.error('File size exceeds 50MB limit.');
          return;
        }
        setFile(selectedFile);
        if (!title) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
        }
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    maxFiles: 1
  });

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!file || !title || !subjectId) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subjectId', subjectId);
    formData.append('department', currentDept);
    formData.append('semester', currentSem);
    formData.append('unit', unit);
    formData.append('category', category);
    formData.append('tags', JSON.stringify(tags));
    formData.append('uploaderName', profile?.name || 'Academic Administration');

    try {
      await axios.post(`${API_BASE}/notes/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });
      toast.success("Upload successful! Document added.");
      setFile(null);
      setTitle('');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Upload failed. Connection error.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Target Current Semester & Dept Scope Badge */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-300 min-w-0">
          <GraduationCap size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-semibold">{currentSem}</span>
          <span className="text-blue-300 dark:text-blue-700">•</span>
          <span className="truncate">{profile?.department || currentDept}</span>
        </div>
        <span className="text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/60 px-1.5 py-0.5 rounded shrink-0">
          CURRENT COURSES
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Compact Dropzone */}
        <div className="lg:col-span-2">
          <div
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-all overflow-hidden ${
              isDragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 hover:border-slate-400'
            } ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'} ${
              file ? 'min-h-[70px] sm:min-h-[100px] lg:h-full' : 'min-h-[85px] sm:min-h-[110px] lg:h-full'
            }`}
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2.5 w-full">
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 relative border border-blue-200 dark:border-blue-800">
                  <FileText size={18} />
                  <div className="absolute -top-1 -right-1 bg-emerald-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={9} />
                  </div>
                </div>
                <div className="min-w-0 text-left sm:text-center flex-1">
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex sm:flex-col items-center justify-center gap-2.5 text-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                  <UploadCloud size={18} />
                </div>
                <div className="text-left sm:text-center">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Tap or drag document here</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">PDF, DOCX, PPTX (max 50MB)</p>
                </div>
              </div>
            )}

            {isUploading && (
              <div className="absolute bottom-0 left-0 w-full p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Uploading note...</span>
                  <span className="text-[10px] font-bold text-blue-600 font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Metadata Form */}
        <div className="lg:col-span-3 space-y-2.5">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-white px-0.5">Note Title</label>
              <div className="relative">
                <Sparkles size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unit 1 Introduction Notes"
                  disabled={isUploading}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs pl-7 pr-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                />
              </div>
            </div>

            <CustomSelect
              label="Subject (Current Semester)"
              icon={BookOpen}
              value={subjectId}
              options={subjectOptions}
              onChange={setSubjectId}
              placeholder={activeSubjects.length > 0 ? "Select Subject..." : "No subjects available"}
              searchable={true}
              disabled={isUploading || activeSubjects.length === 0}
            />

            <div className="grid grid-cols-2 gap-2">
              <CustomSelect
                label="Unit"
                icon={Layers}
                value={unit}
                options={unitOptions}
                onChange={setUnit}
                placeholder="Unit..."
                disabled={isUploading}
              />

              <CustomSelect
                label="Category"
                icon={FileText}
                value={category}
                options={categoryOptions}
                onChange={setCategory}
                placeholder="Category..."
                disabled={isUploading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-white px-0.5">Tags</label>
              <div className="space-y-1.5">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag and press Enter"
                  disabled={isUploading}
                  onKeyDown={handleAddTag}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] rounded border border-blue-200 dark:border-blue-800">
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => removeTag(tag)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleUpload}
                disabled={!file || !title || !subjectId || isUploading}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  !file || !title || !subjectId || isUploading
                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : 'Upload Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadNotesView;