export const QUICK_NC_COMMENTS = [
  'Verified with medical certificate',
  'Approved for institutional / academic duty',
  'Approved per department attendance policy',
  'Proof document missing or unclear'
];

export const getDepartmentName = (deptCode) => {
  if (!deptCode) return "";
  const code = deptCode.toUpperCase();
  if (code.includes('UAD')) return 'AI & Data Science';
  if (code.includes('UAM')) return 'CSE (AI & ML)';
  if (code.includes('UCS')) return 'Computer Science & Engineering';
  if (code.includes('UME')) return 'Mechanical Engineering';
  if (code.includes('UET')) return 'Electronics & Telecom';
  if (code.includes('UCE')) return 'Civil Engineering';
  if (code.includes('UEE')) return 'Electrical Engineering';
  return deptCode;
};

export const formatName = (fullName) => {
  if (!fullName) return "Student";
  const trimmed = fullName.trim();
  if (!trimmed) return "Student";
  return trimmed.split(/\s+/).map(word => {
    if (word.length <= 2 && word.toUpperCase() === word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

export const getInitials = (fullName) => {
  if (!fullName) return "ST";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[1][0] + parts[0][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
};

export const getSubjectIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('data') || lower.includes('dbms')) return 'database';
  if (lower.includes('machine') || lower.includes('ai') || lower.includes('intelligence')) return 'psychology';
  if (lower.includes('network') || lower.includes('security')) return 'shield';
  if (lower.includes('entrepreneur') || lower.includes('manage')) return 'lightbulb';
  if (lower.includes('web') || lower.includes('software')) return 'code';
  return 'menu_book';
};

export const isCiePending = (cie) => {
  if (cie === null || cie === undefined) return true;
  const s = String(cie).trim();
  return s === '' || s === '-' || s === 'NA' || s === 'N/A' || isNaN(parseFloat(s));
};

export const getSubjectMaxCie = (sub, registry = []) => {
  if (sub?.maxCie) return sub.maxCie;
  const score = parseFloat(sub?.cie);
  if (!isNaN(score) && score > 50) return 75;

  const code = (sub?.code || '').toLowerCase();
  const name = (sub?.name || '').toLowerCase();
  const isPractical = code.endsWith('-p') ||
    code.includes('-p') ||
    name.includes(' lab') ||
    name.includes('practical') ||
    name.includes('mini-project') ||
    name.includes('mini project') ||
    name.includes('project');

  if (isPractical) return 50;

  const hasAnyAbove50 = registry.some(s => {
    const v = parseFloat(s?.cie);
    return !isNaN(v) && v > 50;
  });

  return hasAnyAbove50 ? 75 : 50;
};
