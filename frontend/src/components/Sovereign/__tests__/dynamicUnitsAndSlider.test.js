import { normalizeUnitNum, normalizeUnit } from '../../../lib/noteUtils.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log('--- 1. Testing normalizeUnitNum & normalizeUnit ---');
assert(normalizeUnitNum('Unit 1') === 1, 'Unit 1 -> 1');
assert(normalizeUnitNum('UNIT 01') === 1, 'UNIT 01 -> 1');
assert(normalizeUnitNum('unit 02') === 2, 'unit 02 -> 2');
assert(normalizeUnitNum('Unit 3') === 3, 'Unit 3 -> 3');
assert(normalizeUnitNum('UNIT 04') === 4, 'UNIT 04 -> 4');
assert(normalizeUnitNum('Unit V') === 5, 'Unit V -> 5 (Roman)');
assert(normalizeUnitNum('UNIT VI') === 6, 'UNIT VI -> 6 (Roman)');
assert(normalizeUnitNum('Unit II') === 2, 'Unit II -> 2 (Roman)');
assert(normalizeUnitNum('Unit III') === 3, 'Unit III -> 3 (Roman)');
assert(normalizeUnitNum('Unit IV') === 4, 'Unit IV -> 4 (Roman)');
assert(normalizeUnitNum('General') === null, 'General -> null');
assert(normalizeUnitNum('') === null, 'empty -> null');
assert(normalizeUnitNum(null) === null, 'null -> null');

assert(normalizeUnit('UNIT 01') === normalizeUnit('Unit 1'), 'UNIT 01 matches Unit 1');
assert(normalizeUnit('UNIT 03') === normalizeUnit('unit 3'), 'UNIT 03 matches unit 3');
assert(normalizeUnit('UNIT 02') !== normalizeUnit('UNIT 04'), 'UNIT 02 does not match UNIT 04');
assert(normalizeUnitNum('Unit 1 - Chapter 4') === 1, 'Unit 1 - Chapter 4 -> 1 (prioritized unit token)');
assert(normalizeUnitNum('Unit 1 - Section 5') === 1, 'Unit 1 - Section 5 -> 1 (prioritized unit token)');
assert(normalizeUnitNum('Unit 1 (Rev 2)') === 1, 'Unit 1 (Rev 2) -> 1 (prioritized unit token)');
assert(normalizeUnitNum('Module 03 - Part 1') === 3, 'Module 03 - Part 1 -> 3');

console.log('--- 2. Testing Dynamic Units 1-6 Availability Logic ---');
const mockNotes = [
  { id: 'n1', subjectId: 'CS101', unit: 'Unit 1', title: 'Intro' },
  { id: 'n2', subjectId: 'CS101', unit: 'UNIT 01', title: 'Basics Part 2' },
  { id: 'n3', subjectId: 'CS101', unit: 'Unit 3', title: 'Trees and Graphs' },
  { id: 'n4', subjectId: 'CS101', unit: 'General', title: 'Syllabus Copy' },
  { id: 'n5', subjectId: 'CS102', unit: 'Unit 2', title: 'Process Scheduling' },
  { id: 'n6', subjectId: 'CS102', unit: 'UNIT 05', title: 'File Systems' },
];

function deriveAvailableUnits(subjectId, notesList) {
  const subNotes = notesList.filter(n => n.subjectId === subjectId);
  const unitSet = new Set();
  subNotes.forEach(note => {
    const uNum = normalizeUnitNum(note.unit);
    if (uNum !== null && uNum >= 1 && uNum <= 6) {
      unitSet.add(uNum);
    }
  });
  return Array.from(unitSet).sort((a, b) => a - b);
}

const cs101Units = deriveAvailableUnits('CS101', mockNotes);
assert(cs101Units.length === 2, 'CS101 has exactly 2 available units');
assert(cs101Units.includes(1) && cs101Units.includes(3), 'CS101 includes Unit 1 and Unit 3');
assert(!cs101Units.includes(2), 'CS101 does NOT include empty Unit 2');
assert(!cs101Units.includes(4), 'CS101 does NOT include empty Unit 4');
assert(!cs101Units.includes(5), 'CS101 does NOT include empty Unit 5');
assert(!cs101Units.includes(6), 'CS101 does NOT include empty Unit 6');

const cs102Units = deriveAvailableUnits('CS102', mockNotes);
assert(cs102Units.length === 2, 'CS102 has exactly 2 available units');
assert(cs102Units.includes(2) && cs102Units.includes(5), 'CS102 includes Unit 2 and Unit 5');
assert(!cs102Units.includes(1), 'CS102 does NOT include empty Unit 1');

const emptySubjectUnits = deriveAvailableUnits('EMPTY_SUB', mockNotes);
assert(emptySubjectUnits.length === 0, 'Subject with no notes returns empty available units list');

console.log('--- 3. Testing Strict Subject and Unit Note Filtering ---');
function filterNotes(notesList, selectedSubject, selectedUnit) {
  return notesList.filter(note => {
    if (note.subjectId !== selectedSubject) return false;
    if (selectedUnit !== 'all') {
      const selNum = normalizeUnitNum(selectedUnit);
      const noteNum = normalizeUnitNum(note.unit);
      if (selNum !== null && noteNum !== null) {
        if (selNum !== noteNum) return false;
      } else if (normalizeUnit(note.unit) !== normalizeUnit(selectedUnit)) {
        return false;
      }
    }
    return true;
  });
}

const cs101All = filterNotes(mockNotes, 'CS101', 'all');
assert(cs101All.length === 4, 'CS101 all units returns 4 notes');

const cs101Unit1 = filterNotes(mockNotes, 'CS101', 'UNIT 01');
assert(cs101Unit1.length === 2, 'CS101 Unit 1 returns exactly 2 notes');
assert(cs101Unit1.every(n => normalizeUnitNum(n.unit) === 1), 'All returned notes are Unit 1');

const cs101Unit3 = filterNotes(mockNotes, 'CS101', 'Unit 3');
assert(cs101Unit3.length === 1 && cs101Unit3[0].id === 'n3', 'CS101 Unit 3 returns note n3');

const cs101EmptyUnit2 = filterNotes(mockNotes, 'CS101', 'UNIT 02');
assert(cs101EmptyUnit2.length === 0, 'CS101 Unit 2 returns 0 notes (empty)');

console.log('--- 4. Testing AI Length Slider Modes & Calculations ---');
const AI_LENGTH_MODES = [
  { id: 'min', label: 'Min', wordRange: '80-100', requiresPasscode: false },
  { id: 'high', label: 'High', wordRange: '100-120', requiresPasscode: false },
  { id: 'max', label: 'Max', wordRange: '150-180', requiresPasscode: true },
  { id: 'ultra', label: 'Ultra', wordRange: '220-250', requiresPasscode: true },
];
assert(AI_LENGTH_MODES.length === 4, 'AI_LENGTH_MODES has 4 modes');
assert(AI_LENGTH_MODES[0].id === 'min' && AI_LENGTH_MODES[0].requiresPasscode === false, 'min mode is public');
assert(AI_LENGTH_MODES[1].id === 'high' && AI_LENGTH_MODES[1].requiresPasscode === false, 'high mode is public');
assert(AI_LENGTH_MODES[2].id === 'max' && AI_LENGTH_MODES[2].requiresPasscode === true, 'max mode requires passcode');
assert(AI_LENGTH_MODES[3].id === 'ultra' && AI_LENGTH_MODES[3].requiresPasscode === true, 'ultra mode requires passcode');

console.log('All Dynamic Units, Filtering, and AI Slider tests passed successfully!');
