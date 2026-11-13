export const isLinkNote = (note) => {
    if (!note) return false;
    const raw = (note.fileUrl || note.sourceUrl || '').trim();
    if (!raw) return (note.category || '').toLowerCase() === 'link';
    const hasDocExt = raw.match(/\.(pdf|docx?|pptx?|xlsx?|txt|zip)(\?.*)?$/i);
    if (hasDocExt) return false;
    return raw.startsWith('http') || raw.includes('/') || (note.category || '').toLowerCase() === 'link';
};

export const getNoteBadge = (note) => {
    if (isLinkNote(note)) return 'LINK';
    const raw = note.fileUrl || '';
    const parts = raw.split('.');
    if (parts.length > 1) {
        const ext = parts.pop().split(/[?#]/)[0].toUpperCase();
        if (ext.length <= 5) return ext;
    }
    return 'PDF';
};

export const cleanSubjectName = (str) => {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/\([a-z0-9\s_-]+\)/gi, '')
        .replace(/^[0-9]{1,2}[a-z]{2,6}[0-9]{2,4}[a-z]?\s*/gi, '')
        .replace(/[0-9]{2}[a-z]{2,6}[0-9]{3,4}[a-z]?/gi, '')
        .replace(/\b(ai\s*&\s*ds|ai\s+and\s+ds|aids)\b/gi, 'artificial intelligence and data science')
        .replace(/\b(laboratory|practical)\b/gi, 'lab')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const isSubjectNameMatch = (nameA, nameB) => {
    if (!nameA || !nameB) return false;
    const ca = cleanSubjectName(nameA);
    const cb = cleanSubjectName(nameB);
    if (!ca || !cb) return false;

    const isLabA = /\b(lab)\b/.test(ca);
    const isLabB = /\b(lab)\b/.test(cb);
    if (isLabA !== isLabB) return false;
    return ca === cb || ca.includes(cb) || cb.includes(ca);
};

export const getCleanTitle = (title) => {
    if (!title) return 'Study Material';
    let clean = title;
    if (title.includes('/') && !title.includes(' ')) {
        const last = title.split('/').filter(Boolean).pop();
        if (last) clean = last;
    }
    if (clean.includes('_')) {
        return clean.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).replace(/\.([a-z])/g, (_, c) => '.' + c.toUpperCase())).join(' ');
    }
    return clean.replace(/\.pdf$/i, '').trim();
};

export const normalizeUnitNum = (u) => {
    if (!u) return null;
    const str = String(u).trim().toLowerCase();

    // 1. Explicit 'unit' or 'module' prefix: e.g. 'unit 1', 'unit-02', 'module 3', 'unit vi'
    const unitMatch = str.match(/\b(?:unit|module|mod|u)[-:\s#]*([0-9]+|[ivx]+)\b/i);
    const token = unitMatch ? unitMatch[1] : str;

    const romanMap = { vi: 6, v: 5, iv: 4, iii: 3, ii: 2, i: 1 };
    if (romanMap[token]) return romanMap[token];

    const parsed = parseInt(token.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) return parsed;

    // 2. Fallback: match standalone Roman numerals or single digit 1-6
    for (const [r, n] of Object.entries(romanMap)) {
        if (new RegExp('\\b' + r + '\\b', 'i').test(str)) return n;
    }
    const digitMatch = str.match(/\b([1-6])\b/);
    if (digitMatch) return parseInt(digitMatch[1], 10);

    return null;
};

export const normalizeUnit = (u) => {
    const num = normalizeUnitNum(u);
    return num !== null ? String(num) : (u || '').toString().toLowerCase().trim();
};

export const getSemesterNumber = (semester) => {
    if (!semester) return 999;
    const str = String(semester).trim();
    const match = str.match(/\b([1-8])\b/) || str.match(/sem(?:ester)?\s*([1-8])/i) || str.match(/s([1-8])/i);
    if (match) return parseInt(match[1], 10);
    const romanMatch = str.match(/\b(VIII|VII|VI|IV|V|III|II|I)\b/i);
    if (romanMatch) {
        const r = romanMatch[1].toUpperCase();
        const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
        if (map[r]) return map[r];
    }
    return 999;
};

export const getYearOrder = (subjectOrSem) => {
    if (!subjectOrSem) return 999;
    const semValue = typeof subjectOrSem === 'object'
        ? (subjectOrSem.semester || subjectOrSem.sem || subjectOrSem.year || '')
        : subjectOrSem;
    const s = String(semValue).toUpperCase().trim();
    if (s.includes('FY') || s.includes('FIRST') || s === '1' || s === '2') return 1;
    if (s.includes('SY') || s.includes('SECOND') || s === '3' || s === '4') return 2;
    if (s.includes('TY') || s.includes('THIRD') || s === '5' || s === '6') return 3;
    if (s.includes('FINAL') || s.includes('BTECH') || s.includes('B.TECH') || s.includes('FOURTH') || s.includes('BE') || s === '7' || s === '8') return 4;

    const semNum = getSemesterNumber(semValue);
    if (semNum <= 2) return 1;
    if (semNum <= 4) return 2;
    if (semNum <= 6) return 3;
    if (semNum <= 8) return 4;
    return 999;
};

export const getYearLabel = (subjectOrSem) => {
    const order = getYearOrder(subjectOrSem);
    switch (order) {
        case 1: return 'First Year (FY)';
        case 2: return 'Second Year (SY)';
        case 3: return 'Third Year (TY)';
        case 4: return 'Final Year (B.Tech)';
        default: return 'Other';
    }
};

export const sortSubjectsByYear = (subjects = []) => {
    if (!Array.isArray(subjects)) return [];
    return [...subjects].sort((a, b) => {
        const orderA = getYearOrder(a);
        const orderB = getYearOrder(b);
        if (orderA !== orderB) return orderA - orderB;

        const semA = getSemesterNumber(a?.semester || a?.sem);
        const semB = getSemesterNumber(b?.semester || b?.sem);
        if (semA !== semB) return semA - semB;

        const nameA = (a?.name || a?.code || '').toLowerCase();
        const nameB = (b?.name || b?.code || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
};

export const unpackAiAnswer = (raw) => {
    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'object') {
        if (typeof raw.answer === 'string') return unpackAiAnswer(raw.answer);
        if (typeof raw.text === 'string') return unpackAiAnswer(raw.text);
        if (typeof raw.content === 'string') return unpackAiAnswer(raw.content);
        return JSON.stringify(raw);
    }
    let text = typeof raw === 'string' ? raw.trim() : String(raw);
    if (!text) return '';

    // Strip markdown code fences if wrapped in ```json ... ``` or ``` ... ```
    if (text.startsWith('```json') || text.startsWith('```')) {
        const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        if ((stripped.startsWith('{') && stripped.endsWith('}')) || stripped.includes('"answer"')) {
            text = stripped;
        }
    }

    if (text.startsWith('{') || (text.includes('"answer"') && text.includes('{'))) {
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end > start) {
                const sub = text.slice(start, end + 1);
                const parsed = JSON.parse(sub);
                if (parsed && typeof parsed.answer === 'string') {
                    return unpackAiAnswer(parsed.answer);
                }
                if (parsed && typeof parsed.text === 'string') {
                    return unpackAiAnswer(parsed.text);
                }
                if (parsed && typeof parsed.content === 'string') {
                    return unpackAiAnswer(parsed.content);
                }
            }
        } catch (e) {
            const match = text.match(/"answer"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"confidence"|\s*})/);
            if (match && match[1]) {
                const unescaped = match[1]
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\t/g, '\t')
                    .replace(/\\r/g, '\r');
                return unpackAiAnswer(unescaped);
            }
        }
    }
    return text;
};

