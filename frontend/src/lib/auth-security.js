/**
 * Enterprise-grade client-side authentication security utilities.
 * Defends against XSS, SQLi/NoSQLi, ReDoS, Brute-Force, and Timing Attacks.
 */

// 1. Threat Detection Patterns (bounded non-backtracking regex)
const SQLI_PATTERNS = [
  /(\b(SELECT|UNION|INSERT|DELETE|UPDATE|DROP|CREATE|ALTER|EXEC|TRUNCATE)\b)/i,
  /(--|#|\/\*|\*\/)/,
  /('|"|`)\s*(OR|AND)\s*('|"|`|\d)\s*=\s*('|"|`|\d)/i,
  /('|"|`)\s*(OR|AND)\s+1\s*=\s*1/i,
  /admin'\s*--/i,
  /;\s*(DROP|SHUTDOWN|SELECT|INSERT)/i
];

const NOSQLI_PATTERNS = [
  /(\$gt|\$gte|\$lt|\$lte|\$ne|\$in|\$nin|\$regex|\$where|\$or|\$and)/i,
  /\{.*\$(gt|ne|where|regex).*\}/i
];

const XSS_PATTERNS = [
  /<[^>]*script/i,
  /<[^>]*iframe/i,
  /<[^>]*object/i,
  /<[^>]*embed/i,
  /<[^>]*svg[^>]*onload/i,
  /<[^>]*img[^>]*onerror/i,
  /(javascript|vbscript|data):/i,
  /on(load|error|click|mouseover|focus|blur|change|submit)\s*=/i,
  /eval\s*\(/i,
  /alert\s*\(/i
];

const TRAVERSAL_PATTERNS = [
  /\.\.[\/\\]/,
  /[\/\\]etc[\/\\]passwd/i,
  /[\/\\]windows[\/\\]system32/i
];

/**
 * Strips dangerous HTML tags, null bytes, and control characters.
 * Truncates string to avoid memory exhaustion attacks.
 */
export function sanitizeString(val, maxLength = 64) {
  if (typeof val !== 'string') return '';
  
  // Remove null bytes and invisible control characters (ASCII 0-31 except tab/newline)
  let clean = val.replace(/\0/g, '').replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Strip potential HTML tags
  clean = clean.replace(/<[^>]*>?/gm, '');
  
  // Strip javascript: pseudo-protocols
  clean = clean.replace(/javascript:/gi, '');
  
  // Trim whitespace
  clean = clean.trim();
  
  // Truncate to safe length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  
  return clean;
}

/**
 * Checks if the given input contains known malicious injection signatures (SQLi, NoSQLi, XSS, Path Traversal).
 * @param {string} input 
 * @returns {{ isMalicious: boolean, threatType: string | null, reason: string | null }}
 */
export function detectSecurityThreats(input) {
  if (!input || typeof input !== 'string') {
    return { isMalicious: false, threatType: null, reason: null };
  }

  // 1. Check for SQL Injection
  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'SQL_INJECTION',
        reason: 'Input contains prohibited SQL query syntax.'
      };
    }
  }

  // 2. Check for NoSQL Injection
  for (const pattern of NOSQLI_PATTERNS) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'NOSQL_INJECTION',
        reason: 'Input contains prohibited query operators.'
      };
    }
  }

  // 3. Check for XSS Injection
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'XSS_INJECTION',
        reason: 'Input contains prohibited script or executable HTML tags.'
      };
    }
  }

  // 4. Check for Path Traversal
  for (const pattern of TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      return {
        isMalicious: true,
        threatType: 'PATH_TRAVERSAL',
        reason: 'Input contains prohibited directory navigation characters.'
      };
    }
  }

  return { isMalicious: false, threatType: null, reason: null };
}

/**
 * Validates student PRN format.
 * PRNs are alphanumeric identifiers e.g., 24UAD019, 2XUAD001, 22UCS101.
 * Length must be between 4 and 25 characters.
 */
export function validatePrn(prn) {
  if (!prn || typeof prn !== 'string') {
    return { valid: false, error: 'Student PRN / Roll number is required.' };
  }

  const cleaned = prn.trim();
  
  if (cleaned.length < 4 || cleaned.length > 25) {
    return { valid: false, error: 'PRN must be between 4 and 25 alphanumeric characters.' };
  }

  // Strictly alphanumeric, allowing hyphen or underscore only
  const prnRegex = /^[a-zA-Z0-9_-]{4,25}$/;
  if (!prnRegex.test(cleaned)) {
    return { valid: false, error: 'PRN may only contain letters, numbers, and dashes.' };
  }

  const threat = detectSecurityThreats(cleaned);
  if (threat.isMalicious) {
    return { valid: false, error: 'Invalid characters detected in PRN.' };
  }

  return { valid: true, sanitized: cleaned };
}

/**
 * Validates date of birth against DD-MM-YYYY format and realistic calendar boundaries.
 */
export function validateDob(dob) {
  if (!dob || typeof dob !== 'string') {
    return { valid: false, error: 'Date of birth is required.' };
  }

  const cleaned = dob.trim();
  
  // Format check: DD-MM-YYYY
  const dobRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = cleaned.match(dobRegex);
  
  if (!match) {
    return { valid: false, error: 'Date of birth must be in DD-MM-YYYY format (e.g. 15-08-2005).' };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Month boundary
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Invalid month in date of birth.' };
  }

  // Days in month validation (accounting for leap years)
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (day < 1 || day > daysInMonth[month - 1]) {
    return { valid: false, error: `Invalid day ${day} for the specified month.` };
  }

  // Realistic college student birth year range (1970 to current year - 12)
  const currentYear = new Date().getFullYear();
  if (year < 1970 || year > currentYear - 13) {
    return { valid: false, error: 'Birth year is outside the acceptable student range.' };
  }

  return { valid: true, sanitized: cleaned };
}

/**
 * Validates faculty/teacher ID format.
 * Examples: DRP@Eduvault, HPM@Eduvault, prof.smith@domain.com
 */
export function validateFacultyId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Faculty ID is required.' };
  }

  const cleaned = id.trim();
  if (cleaned.length < 3 || cleaned.length > 32) {
    return { valid: false, error: 'Faculty ID must be between 3 and 32 characters.' };
  }

  const facultyRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/;
  const simpleFacultyRegex = /^[a-zA-Z0-9@._-]{3,32}$/;
  if (!facultyRegex.test(cleaned) && !simpleFacultyRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid Faculty ID format (e.g. DRP@Eduvault).' };
  }

  const threat = detectSecurityThreats(cleaned);
  if (threat.isMalicious) {
    return { valid: false, error: 'Prohibited characters detected in Faculty ID.' };
  }

  return { valid: true, sanitized: cleaned };
}

/**
 * Constant-time string comparison to defend against side-channel timing attacks.
 * Never short-circuits on mismatch.
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  let diff = a.length ^ b.length;
  const maxLen = Math.max(a.length, b.length);

  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    diff |= (charA ^ charB);
  }

  return diff === 0;
}

/**
 * Artificially delays response to normalize execution time across valid and invalid attempts.
 * Prevents timing attacks determining user existence.
 */
export async function enforceConstantTimeDelay(startTimeMs, targetMs = 420) {
  const elapsed = performance.now() - startTimeMs;
  const remaining = targetMs - elapsed;
  // Add subtle jitter (±30ms) to prevent deterministic statistical analysis
  const jitter = Math.floor(Math.random() * 60) - 30;
  const delay = Math.max(50, remaining + jitter);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Session-persistent Rate Limiter to mitigate brute-force and credential stuffing attacks.
 */
const RATE_LIMIT_STORAGE_KEY = 'eduvault_auth_rate_limit';

class AuthRateLimiter {
  constructor() {
    this.memoryState = null;
  }

  _getState() {
    try {
      const stored = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // sessionStorage unavailable or corrupted
    }
    return {
      failedAttempts: 0,
      lockedUntil: 0,
      lastAttempt: 0
    };
  }

  _saveState(state) {
    try {
      sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      this.memoryState = state;
    }
  }

  /**
   * Checks if user is currently locked out.
   * @returns {{ isLocked: boolean, remainingSeconds: number, attempts: number }}
   */
  getLockoutStatus() {
    const state = this._getState();
    const now = Date.now();

    if (state.lockedUntil > now) {
      const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        attempts: state.failedAttempts
      };
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      attempts: state.failedAttempts
    };
  }

  /**
   * Records a failed authentication attempt and calculates lockout period if threshold exceeded.
   */
  recordFailure() {
    const state = this._getState();
    state.failedAttempts += 1;
    state.lastAttempt = Date.now();

    // Lockout ladder:
    // 5 failures  -> 30 seconds
    // 8 failures  -> 60 seconds
    // 10 failures -> 300 seconds (5 minutes)
    if (state.failedAttempts >= 10) {
      state.lockedUntil = Date.now() + 300 * 1000;
    } else if (state.failedAttempts >= 8) {
      state.lockedUntil = Date.now() + 60 * 1000;
    } else if (state.failedAttempts >= 5) {
      state.lockedUntil = Date.now() + 30 * 1000;
    }

    this._saveState(state);
    return this.getLockoutStatus();
  }

  /**
   * Resets rate limiter counter upon successful authentication.
   */
  recordSuccess() {
    this._saveState({
      failedAttempts: 0,
      lockedUntil: 0,
      lastAttempt: Date.now()
    });
  }
}

export const rateLimiter = new AuthRateLimiter();

/**
 * Sanitizes error messages to prevent sensitive information leakage or system enumeration.
 */
export function getSafeErrorMessage(error, defaultMsg = 'Invalid credentials. Please verify your details.') {
  if (!error) return defaultMsg;

  // Mask database / backend specific errors
  const rawMsg = typeof error === 'string' ? error : error?.message || error?.response?.data?.error || '';
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes('syntax error') ||
    lower.includes('sql') ||
    lower.includes('database') ||
    lower.includes('column') ||
    lower.includes('exception') ||
    lower.includes('nullpointer') ||
    lower.includes('stacktrace')
  ) {
    return 'Authentication service error. Please try again later.';
  }

  if (lower.includes('timeout') || lower.includes('network') || lower.includes('econnrefused')) {
    return 'Unable to reach the college portal server. Please try again shortly or use demo credentials.';
  }

  if (lower.includes('invalid credentials') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'Invalid credentials. Please check your PRN / ID and password.';
  }

  return rawMsg && rawMsg.length < 120 ? rawMsg : defaultMsg;
}
