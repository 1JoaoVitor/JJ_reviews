/**
 * CSV Parser Utility
 * Handles parsing of CSV files with Letterboxd format support
 */

export interface CsvParseOptions {
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;
  headers?: string[];
}

export interface CsvParseResult<T> {
  headers: string[];
  rows: T[];
  errors: string[];
}

/**
 * Generic CSV parser that handles Letterboxd format
 * Supports quoted fields, escaped quotes, etc.
 */
export function parseCsv(
  content: string,
  options: CsvParseOptions = {}
): CsvParseResult<Record<string, string>> {
  const { skipEmptyRows = true } = options;

  const lines = splitCsvRows(content).map((line) => line.replace(/\r$/, ""));
  const errors: string[] = [];

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ["CSV file is empty"] };
  }

  // Find header row (skip metadata rows like "Letterboxd list export v7")
  let headerLineIndex = 0;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("Letterboxd")) continue;

    headers = parseCSVLine(line);
    if (headers.length > 0) {
      headerLineIndex = i;
      break;
    }
  }

  if (headers.length === 0) {
    return { headers: [], rows: [], errors: ["No valid header row found in CSV"] };
  }

  // Parse data rows
  const rows: Record<string, string>[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty rows if option is set
    if (skipEmptyRows && !line.trim()) continue;

    const values = parseCSVLine(line);

    // Handle row with fewer columns than headers
    if (values.length === 0 && !line.trim()) continue;

    if (values.length > 0) {
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        let value = values[index] || "";
        value = value.trim();
        row[header] = value;
      });

      rows.push(row);
    } else if (line.trim()) {
      errors.push(`Line ${i + 1}: Could not parse row`);
    }
  }

  return { headers, rows, errors };
}

function splitCsvRows(content: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      current += char;

      if (inQuotes && nextChar === '"') {
        current += nextChar;
        i++;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      rows.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || content.endsWith("\n") || content.endsWith("\r")) {
    rows.push(current);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 * Letterboxd format: "value1","value2",...
 * Also supports unquoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator (outside quotes)
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result.map((field) => field.trim());
}

/**
 * Validate CSV headers against expected headers
 * Returns list of missing/extra headers
 */
export function validateHeaders(
  actual: string[],
  expected: string[]
): {
  valid: boolean;
  missing: string[];
  extra: string[];
} {
  const actualLC = actual.map((h) => h.toLowerCase());
  const expectedLC = expected.map((h) => h.toLowerCase());

  const missing = expectedLC.filter((h) => !actualLC.includes(h)).map((h) => {
    // Find original case from expected
    const idx = expectedLC.indexOf(h);
    return expected[idx];
  });

  const extra = actual.filter((h) => !expectedLC.includes(h.toLowerCase()));

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}

/**
 * Extract required field from row, with optional validation
 */
export function getField(
  row: Record<string, string>,
  fieldName: string,
  options: {
    required?: boolean;
    trim?: boolean;
    validate?: (value: string) => boolean;
    errorMessage?: string;
  } = {}
): { value: string | null; error?: string } {
  const { required = false, trim = true, validate, errorMessage } = options;

  // Try exact match first
  let value = row[fieldName];

  // Try case-insensitive match
  if (!value) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === fieldName.toLowerCase());
    value = key ? row[key] : "";
  }

  if (trim && value) {
    value = value.trim();
  }

  if (!value) {
    if (required) {
      return {
        value: null,
        error: errorMessage || `Required field missing: ${fieldName}`,
      };
    }
    return { value: null };
  }

  if (validate && !validate(value)) {
    return {
      value: null,
      error: errorMessage || `Invalid value for ${fieldName}: ${value}`,
    };
  }

  return { value };
}

/**
 * Parse a numeric field with validation
 */
export function getNumericField(
  row: Record<string, string>,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
): { value: number | null; error?: string } {
  const { required = false, min, max, errorMessage } = options;

  const { value, error } = getField(row, fieldName, { required, trim: true });

  if (error) return { value: null, error };
  if (!value && !required) return { value: null };

  const num = parseFloat(value!);

  if (isNaN(num)) {
    return {
      value: null,
      error: errorMessage || `Invalid number for ${fieldName}: ${value}`,
    };
  }

  if (min !== undefined && num < min) {
    return {
      value: null,
      error: errorMessage || `${fieldName} must be >= ${min}`,
    };
  }

  if (max !== undefined && num > max) {
    return {
      value: null,
      error: errorMessage || `${fieldName} must be <= ${max}`,
    };
  }

  return { value: num };
}

/**
 * Parse a date field (supports multiple formats)
 */
export function getDateField(
  row: Record<string, string>,
  fieldName: string,
  options: {
    required?: boolean;
    fallback?: string;
    errorMessage?: string;
  } = {}
): { value: string; error?: string } {
  const { required = false, fallback = new Date().toISOString(), errorMessage } = options;

  const { value, error } = getField(row, fieldName, { required, trim: true });

  if (error) {
    if (!required) {
      return { value: fallback };
    }
    return { value: "", error };
  }

  if (!value) {
    return { value: fallback };
  }

  // Try parsing various date formats
  const date = parseFlexibleDate(value);

  if (!date) {
    return {
      value: "",
      error: errorMessage || `Invalid date format for ${fieldName}: ${value}`,
    };
  }

  return { value: date.toISOString() };
}

/**
 * Parse flexible date formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
 */
function parseFlexibleDate(dateString: string): Date | null {
  // Try ISO format first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  const parts = dateString.split(/[-/]/);
  if (parts.length === 3) {
    const year = parseInt(parts[2], 10);
    let month = parseInt(parts[0], 10);
    let day = parseInt(parts[1], 10);

    // If first part > 12, assume DD/MM/YYYY
    if (parts[0].length === 2 && parseInt(parts[0], 10) > 12) {
      [day, month] = [month, day];
    }

    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/**
 * Get boolean field (handles various truthy strings)
 */
export function getBooleanField(
  row: Record<string, string>,
  fieldName: string,
  options: { required?: boolean; errorMessage?: string } = {}
): { value: boolean | null; error?: string } {
  const { value, error } = getField(row, fieldName, { required: options.required });

  if (error) {
    return { value: null, error };
  }

  if (!value) {
    return { value: null };
  }

  const truthy = ["yes", "true", "1", "sim", "s", "y"];
  return { value: truthy.includes(value.toLowerCase()) };
}
