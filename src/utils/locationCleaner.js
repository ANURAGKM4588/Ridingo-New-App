/**
 * Universal Location Cleaner
 * Strips location codes, resident association codes (e.g. ARRA-99, TRA-45),
 * house/plot/door/ward/flat numbers, plus codes, and coordinate pins
 * so only the clean, human-readable location name is shown across all User & Driver apps.
 */

// Highway & Expressway prefixes that should NOT be stripped
const HIGHWAY_PREFIX_REGEX = /^(NH|SH|NE|AH)\b/i;

/**
 * Checks if a string segment is just a location/building/association code
 * e.g. "ARRA-99", "TC 12/104", "KP-VI/24", "Plot No. 4", "99", "12/344-A"
 */
export function isLocationCode(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Don't treat highways as codes
  if (HIGHWAY_PREFIX_REGEX.test(trimmed)) return false;

  // Plus codes
  if (/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}$/i.test(trimmed)) return true;
  if (/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,}$/i.test(trimmed)) return true;

  // Association / locality codes with numbers: e.g. "ARRA-99", "ARRA 99", "TC 12/104", "KP-VI/24"
  if (/^[A-Za-z]{2,6}[-\s/][A-Za-z0-9/-]*\d+[A-Za-z0-9/-]*$/i.test(trimmed)) return true;
  if (/^[A-Za-z]{2,6}[-\s/]?\d+[A-Za-z0-9/-]*$/i.test(trimmed)) return true;

  // Building / Plot / Door / Ward prefixes: e.g. "Plot No. 4", "H.No. 12", "Ward 14", "No. 45"
  if (/^(Plot|Door|H\.?\s*No\.?|House|Flat|Bldg|Building|Ward|Room|Shop|Unit|Villa|No|No\.)\s*(No\.?|Number|#)?\s*[:#-]?\s*[A-Za-z0-9/-]+$/i.test(trimmed)) return true;

  // Pure numbers or slash/hyphen numbers: e.g. "99", "12/344-A", "104-B"
  if (/^\d+([/-][A-Za-z0-9]+)*$/i.test(trimmed)) return true;

  return false;
}

/**
 * Strips location codes from any address string.
 * Example inputs and outputs:
 * - "ARRA-99, Cheranalloor Rd, near SBI Branch" -> "Cheranalloor Rd, near SBI Branch"
 * - "ARRA-99 Cheranalloor Rd" -> "Cheranalloor Rd"
 * - "7JW7+52, ARRA-99, Cheranalloor Rd" -> "Cheranalloor Rd"
 * - "TC 12/104, Kowdiar, Thiruvananthapuram" -> "Kowdiar, Thiruvananthapuram"
 * - "KP-VI/24, Kakkanad, Kochi" -> "Kakkanad, Kochi"
 * - "Plot No. 4, MG Road, Ernakulam" -> "MG Road, Ernakulam"
 * - "H.No. 4-12, Palarivattom" -> "Palarivattom"
 * - "NH-66, Edappally" -> "NH-66, Edappally" (Highways preserved)
 */
export function cleanLocationName(loc) {
  if (!loc || typeof loc !== 'string') return '';
  let str = loc.trim();
  if (!str) return '';

  // 1. Remove Google Plus Codes anywhere in string (e.g. "8V5X+XX, ", "7M52+G67", "378M+Q3R")
  str = str.replace(/\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}\b[,\s]*/gi, '');
  str = str.replace(/\b[A-Z0-9]{4,8}\+[A-Z0-9]{2,}\b[,\s]*/gi, '');
  str = str.replace(/\b\+[A-Z0-9]+\b[,\s]*/gi, '');

  // 2. Remove coordinate/GPS tags e.g. "Location (10.0275, 76.3080)" or "Pin (10.0275, 76.3080)"
  str = str.replace(/\b(Pin|Location|GPS)\s*\([^)]*\)[,\s]*/gi, '');

  // Run multi-pass cleaning in case address has chained codes e.g. "7JW7+52, ARRA-99, Cheranalloor Rd"
  let prev;
  for (let iter = 0; iter < 4; iter++) {
    prev = str;

    // 3. Remove leading building/house/plot/door/ward prefixes with codes
    // e.g. "Plot No. 4, ", "Door No. 12, ", "H.No. 4-12, ", "Flat No. 302, ", "Bldg No. 5, ", "Ward 14, ", "No. 45, "
    str = str.replace(/^(Plot|Door|H\.?\s*No\.?|House|Flat|Bldg|Building|Ward|Room|Shop|Unit|Villa|No|No\.)\s*(No\.?|Number|#)?\s*[:#-]?\s*[A-Za-z0-9/-]+\s*(,\s*|\s+)/i, '');

    // 4. Remove leading association/locality codes with comma:
    // e.g. "ARRA-99, ", "ARRA 99, ", "TRA-45, ", "TC 12/104, ", "CC-4/56, ", "KP-VI/24, "
    // (Preserves highways like NH-66, SH-1, etc.)
    str = str.replace(/^(?!(NH|SH|NE|AH)\b)[A-Za-z]{2,6}[-\s/][A-Za-z0-9/-]*\d+[A-Za-z0-9/-]*\s*,\s*/i, '');
    str = str.replace(/^(?!(NH|SH|NE|AH)\b)[A-Za-z]{2,6}[-\s/]?\d+[A-Za-z0-9/-]*\s*,\s*/i, '');

    // 5. Remove leading association codes with hyphen even without comma:
    // e.g. "ARRA-99 Cheranalloor Rd" -> "Cheranalloor Rd"
    str = str.replace(/^(?!(NH|SH|NE|AH)\b)[A-Za-z]{2,6}-\d+[A-Za-z0-9/-]*\s+/i, '');

    // 6. Remove leading pure numbers or slash-separated numbers followed by comma
    // e.g. "99, Cheranalloor Rd", "12/344-A, Cheranalloor Rd"
    str = str.replace(/^\d+([/-][A-Za-z0-9]+)*\s*,\s*/, '');

    // 7. Clean leading/trailing punctuation & whitespace
    str = str.replace(/^[,-\s/]+/, '').trim();

    if (str === prev) break;
  }

  // 8. Strip trailing punctuation
  str = str.replace(/[,-\s]+$/, '').trim();

  // If entire string was stripped (e.g. user literally typed "ARRA-99"), return original
  return str || loc;
}

// Export cleanPlusCode alias for backward compatibility across modules
export const cleanPlusCode = cleanLocationName;

/**
 * Extracts and displays the location name up to the first comma of the address.
 * Strips any leading house/door/plot/association/plus codes first so the true place
 * name is extracted cleanly.
 *
 * Examples:
 * - "Kannur, Kerala" -> "Kannur"
 * - "Kozhikode railway station, Link Road, Kozhikode" -> "Kozhikode railway station"
 * - "Edappally Toll, Kochi, Kerala" -> "Edappally Toll"
 * - "ARRA-99, Cheranalloor Rd, Kochi" -> "Cheranalloor Rd"
 */
export function getLocationUpToFirstComma(addr, fallback = 'Location') {
  if (!addr || typeof addr !== 'string') return fallback;
  const clean = cleanLocationName(addr);
  const strippedPrefix = clean.replace(/^(pickup|drop|from|to|destination|loc)[:\s-]*/i, '').trim();
  if (!strippedPrefix) return fallback;

  // Split by first comma
  const commaIdx = strippedPrefix.indexOf(',');
  const firstSegment = commaIdx !== -1 ? strippedPrefix.slice(0, commaIdx).trim() : strippedPrefix.trim();

  // Clean any trailing punctuation
  const cleanSegment = firstSegment.replace(/[,–—\-/:]+$/, '').trim();
  return cleanSegment || fallback;
}

export default cleanLocationName;

