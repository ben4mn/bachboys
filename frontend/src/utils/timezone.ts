// All event times are in Las Vegas (Pacific Time)
const VEGAS_TZ = 'America/Los_Angeles';

/**
 * Format a UTC date string to Vegas local time.
 * Uses Intl.DateTimeFormat for reliable timezone conversion.
 */
function vegasFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: VEGAS_TZ });
}

/** "4:00 PM" */
export function formatTimeVegas(dateString: string): string {
  const date = new Date(dateString);
  return vegasFormatter({ hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

/** "Friday, Apr 3" */
export function formatDateShortVegas(dateString: string): string {
  const date = new Date(dateString);
  return vegasFormatter({ weekday: 'long', month: 'short', day: 'numeric' }).format(date);
}

/** "Friday, April 3" */
export function formatDateLongVegas(dateString: string): string {
  const date = new Date(dateString);
  return vegasFormatter({ weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

/** "Fri, Apr 3 @ 4:00 PM" */
export function formatDateTimeVegas(dateString: string): string {
  const date = new Date(dateString);
  const datePart = vegasFormatter({ weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  const timePart = vegasFormatter({ hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${datePart} @ ${timePart}`;
}

/** "Apr 3" */
export function formatMonthDayVegas(dateString: string): string {
  const date = new Date(dateString);
  return vegasFormatter({ month: 'short', day: 'numeric' }).format(date);
}

/** "Apr 3, 2026 · 4:00 PM" */
export function formatFullDateTimeVegas(dateString: string): string {
  const date = new Date(dateString);
  const datePart = vegasFormatter({ month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  const timePart = vegasFormatter({ hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${datePart} · ${timePart}`;
}

/** "Apr 3, 2026 @ 4:00 PM" */
export function formatDateTimeFullVegas(dateString: string): string {
  const date = new Date(dateString);
  const datePart = vegasFormatter({ month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  const timePart = vegasFormatter({ hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${datePart} @ ${timePart}`;
}

/** "Fri, Apr 3 @ 4:00 PM" for attendee flight info */
export function formatFlightDateTimeVegas(dateString: string): string {
  return formatDateTimeVegas(dateString);
}

/** Get the Vegas-local date string "yyyy-MM-dd" for grouping */
export function getVegasDateKey(dateString: string): string {
  const date = new Date(dateString);
  const parts = vegasFormatter({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

/** Check if a date is today in Vegas timezone */
export function isVegasToday(dateString: string): boolean {
  return getVegasDateKey(dateString) === getVegasDateKey(new Date().toISOString());
}

/** Check if a date is tomorrow in Vegas timezone */
export function isVegasTomorrow(dateString: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getVegasDateKey(dateString) === getVegasDateKey(tomorrow.toISOString());
}

/** Format event date with Today/Tomorrow labels */
export function formatEventDateVegas(dateString: string): string {
  if (isVegasToday(dateString)) return 'Today';
  if (isVegasTomorrow(dateString)) return 'Tomorrow';
  return formatDateShortVegas(dateString);
}

/**
 * Convert a Vegas-local date + time input to UTC ISO string.
 * Used when admin creates/edits events — inputs are Vegas time.
 */
export function vegasToUTC(dateStr: string, timeStr: string): string {
  // Build an ISO-ish string and let the browser parse it
  // Then adjust: we need to figure out the Vegas offset for that date/time
  const naiveDate = new Date(`${dateStr}T${timeStr}`);
  
  // Get what the browser thinks this time is in UTC
  const browserUtc = naiveDate.getTime();
  
  // Get the browser's offset and Vegas's offset for this timestamp
  
  // Get Vegas offset by comparing formatted Vegas time
  const vegasParts = new Intl.DateTimeFormat('en-US', {
    timeZone: VEGAS_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(naiveDate);
  
  const vYear = +vegasParts.find(p => p.type === 'year')!.value;
  const vMonth = +vegasParts.find(p => p.type === 'month')!.value - 1;
  const vDay = +vegasParts.find(p => p.type === 'day')!.value;
  const vHour = +vegasParts.find(p => p.type === 'hour')!.value;
  const vMinute = +vegasParts.find(p => p.type === 'minute')!.value;
  const vSecond = +vegasParts.find(p => p.type === 'second')!.value;
  
  // The Vegas local time when the browser thinks it's naiveDate
  const vegasAsUtc = Date.UTC(vYear, vMonth, vDay, vHour, vMinute, vSecond);
  // Actually simpler: we want the UTC time such that when converted to Vegas, it equals dateStr + timeStr
  
  
  // Let me think differently. We want:
  // result_utc such that toVegas(result_utc) = dateStr + timeStr
  // We know: toVegas(browserUtc) = vegasParts (vYear, vMonth, etc.)
  // The difference between what we want (dateStr+timeStr) and what Vegas shows (vegasParts) 
  // tells us how much to adjust.
  
  const wantedParts = { year: +dateStr.slice(0,4), month: +dateStr.slice(5,7)-1, day: +dateStr.slice(8,10), hour: +timeStr.slice(0,2), minute: +timeStr.slice(3,5) };
  const wantedAsUtc = Date.UTC(wantedParts.year, wantedParts.month, wantedParts.day, wantedParts.hour, wantedParts.minute, 0);
  
  // The adjustment needed
  const adjustMs = wantedAsUtc - vegasAsUtc;
  
  return new Date(browserUtc + adjustMs).toISOString();
}

/**
 * Extract Vegas-local date and time strings from a UTC ISO string.
 * Used to populate admin form fields when editing an event.
 */
export function utcToVegasInputs(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VEGAS_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  let hour = parts.find(p => p.type === 'hour')!.value;
  const minute = parts.find(p => p.type === 'minute')!.value;
  
  // Intl with hour12:false can return "24" for midnight
  if (hour === '24') hour = '00';

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}
