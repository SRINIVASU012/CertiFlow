import xlsx from 'xlsx';
import { z } from 'zod';
import logger from '../utils/logger.js';

// Expected spreadsheet header mappings (case-insensitive and tolerant to spacing)
const REQUIRED_HEADERS = [
  'candidate name',
  'candidate email',
  'mobile number',
  'course name',
  'training completion date',
  'candidate identifier'
];

/**
 * Validates and parses an uploaded candidate spreadsheet using XLSX.
 * 
 * Enforces strict atomic all-or-nothing validation:
 * - Exact row number reporting
 * - Field-level error messages
 * - Duplicate identifier checks
 * - Date format verification
 * - Email and phone regex validation
 */
export async function parseAndValidateSpreadsheet(buffer) {
  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    return {
      isValid: false,
      errors: [{ row: 1, field: 'File', message: 'Invalid Excel spreadsheet file format.' }]
    };
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      isValid: false,
      errors: [{ row: 1, field: 'Sheet', message: 'Spreadsheet has no sheets.' }]
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '', raw: false });

  if (!rawRows || rawRows.length === 0) {
    return {
      isValid: false,
      errors: [{ row: 1, field: 'Rows', message: 'Spreadsheet contains no candidate data rows.' }]
    };
  }

  // Validate headers in row 1
  const firstRow = rawRows[0];
  const normalizedRowKeys = Object.keys(firstRow).map(k => k.trim().toLowerCase());

  const missingHeaders = REQUIRED_HEADERS.filter(h => !normalizedRowKeys.includes(h));
  if (missingHeaders.length > 0) {
    return {
      isValid: false,
      errors: [
        {
          row: 1,
          field: 'Headers',
          message: `Missing required column headers: ${missingHeaders.join(', ')}. Expected: Candidate Name, Candidate Email, Mobile Number, Course Name, Training Completion Date, Candidate Identifier.`
        }
      ]
    };
  }

  // Find actual keys corresponding to normalized names
  const getKey = (row, target) => {
    return Object.keys(row).find(k => k.trim().toLowerCase() === target.toLowerCase());
  };

  const errors = [];
  const validCandidates = [];
  const seenIdentifiersInFile = new Set();
  const seenEmailsInFile = new Set();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const mobileRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Excel row index (1-based, row 1 is header)

    const nameKey = getKey(row, 'candidate name');
    const emailKey = getKey(row, 'candidate email');
    const mobileKey = getKey(row, 'mobile number');
    const courseKey = getKey(row, 'course name');
    const dateKey = getKey(row, 'training completion date');
    const idKey = getKey(row, 'candidate identifier');

    const name = String(row[nameKey] || '').trim();
    const email = String(row[emailKey] || '').trim().toLowerCase();
    const mobile = String(row[mobileKey] || '').trim().replace(/\s+/g, '');
    const course = String(row[courseKey] || '').trim();
    const dateVal = row[dateKey];
    const candidateId = String(row[idKey] || '').trim();

    // 1. Candidate Name Validation
    if (!name) {
      errors.push({
        row: rowNum,
        field: 'Candidate Name',
        message: 'Candidate Name is required and cannot be blank.',
        value: ''
      });
    }

    // 2. Candidate Identifier Validation
    if (!candidateId) {
      errors.push({
        row: rowNum,
        field: 'Candidate Identifier',
        message: 'Candidate Identifier (e.g. CAND-001) is required.',
        value: ''
      });
    } else if (seenIdentifiersInFile.has(candidateId)) {
      errors.push({
        row: rowNum,
        field: 'Candidate Identifier',
        message: `Duplicate Candidate Identifier '${candidateId}' found in this spreadsheet.`,
        value: candidateId
      });
    } else {
      seenIdentifiersInFile.add(candidateId);
    }

    // 3. Email Validation
    if (!email) {
      errors.push({
        row: rowNum,
        field: 'Candidate Email',
        message: 'Candidate Email is required.',
        value: ''
      });
    } else if (!emailRegex.test(email)) {
      errors.push({
        row: rowNum,
        field: 'Candidate Email',
        message: `Invalid email address format: '${email}'. Must be a valid email.`,
        value: email
      });
    } else if (seenEmailsInFile.has(email)) {
      errors.push({
        row: rowNum,
        field: 'Candidate Email',
        message: `Duplicate email '${email}' found in this spreadsheet.`,
        value: email
      });
    } else {
      seenEmailsInFile.add(email);
    }

    // 4. Mobile Number Validation
    if (!mobile) {
      errors.push({
        row: rowNum,
        field: 'Mobile Number',
        message: 'Mobile Number is required for WhatsApp certificate delivery.',
        value: ''
      });
    } else if (!mobileRegex.test(mobile)) {
      errors.push({
        row: rowNum,
        field: 'Mobile Number',
        message: `Invalid mobile number: '${mobile}'. Must be a valid 10-digit Indian phone number (or with +91).`,
        value: mobile
      });
    }

    // 5. Course Name Validation
    if (!course) {
      errors.push({
        row: rowNum,
        field: 'Course Name',
        message: 'Course Name is required.',
        value: ''
      });
    }

    // 6. Training Completion Date Validation
    let parsedDate = null;
    if (!dateVal) {
      errors.push({
        row: rowNum,
        field: 'Training Completion Date',
        message: 'Training Completion Date is required.',
        value: ''
      });
    } else {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) {
        errors.push({
          row: rowNum,
          field: 'Training Completion Date',
          message: `Invalid date format: '${dateVal}'. Expected YYYY-MM-DD or valid Excel date.`,
          value: String(dateVal)
        });
      } else {
        parsedDate = d;
      }
    }

    if (errors.length === 0 || !errors.some(e => e.row === rowNum)) {
      validCandidates.push({
        candidateIdentifier: candidateId,
        name,
        email,
        mobileNumber: mobile.startsWith('+91') ? mobile : `+91${mobile.slice(-10)}`,
        courseName: course,
        completionDate: parsedDate
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    candidates: errors.length === 0 ? validCandidates : []
  };
}

export default parseAndValidateSpreadsheet;
