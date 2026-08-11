// Pure helpers for AvailabilityPicker.jsx - no I/O, no React - kept
// separate purely to keep that file under the project's per-file line
// cap, not because this logic is reused elsewhere.
const NAIROBI_TZ = "Africa/Nairobi";
export const LOOKAHEAD_DAYS = 4;

// Coarse, tap-only time blocks for manual (non-Calendar) users - the
// same 5 blocks every day, inside the app's Africa/Nairobi business
// hours (Vokazi.Scheduling.SlotMatcher) - never a typed date/time input
// to mistype or a timezone to get wrong.
export const PRESET_BLOCKS = [
  { start: "08:00", end: "10:00" },
  { start: "10:00", end: "12:00" },
  { start: "12:00", end: "14:00" },
  { start: "14:00", end: "16:00" },
  { start: "16:00", end: "18:00" },
];

export const isClockString = (s) => /^\d{2}:\d{2}$/.test(s);

export const prettyClock = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
};

// Real Calendar free-window instants are true UTC - always read them
// back (and, for submission, convert them) in Africa/Nairobi wall-clock
// time, never the browser's own local zone and never raw UTC, so what's
// shown always matches what actually gets stored. See
// Vokazi.Scheduling.SlotMatcher.nairobi_wall_time_to_utc/2 on the
// backend - this is the frontend half of the same fixed +3h offset.
export const formatNairobiTime = (iso) => new Date(iso).toLocaleTimeString([], { timeZone: NAIROBI_TZ, hour: "numeric", minute: "2-digit" });
export const toNairobiClock = (iso) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: NAIROBI_TZ, hour: "2-digit", minute: "2-digit", hour12: false });

export const windowLabel = (w) => (isClockString(w.start) ? `${prettyClock(w.start)}–${prettyClock(w.end)}` : `${formatNairobiTime(w.start)}–${formatNairobiTime(w.end)}`);
export const windowToClock = (w) => (isClockString(w.start) ? { start: w.start, end: w.end } : { start: toNairobiClock(w.start), end: toNairobiClock(w.end) });

export const dayRangeLabel = (day) => {
  if (day.windows.length === 0) return "Busy all day";
  const first = day.windows[0];
  const last = day.windows[day.windows.length - 1];
  const start = isClockString(first.start) ? prettyClock(first.start) : formatNairobiTime(first.start);
  const end = isClockString(last.end) ? prettyClock(last.end) : formatNairobiTime(last.end);
  return `${start}–${end}`;
};

export const toDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthDay = (dateStr) => new Date(dateStr + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" });

export const formatDayLabel = (dateStr) => {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(new Date(Date.now() + 86400000));
  if (dateStr === today) return `Today · ${monthDay(dateStr)}`;
  if (dateStr === tomorrow) return `Tomorrow · ${monthDay(dateStr)}`;
  return `${new Date(dateStr + "T00:00:00").toLocaleDateString([], { weekday: "short" })} · ${monthDay(dateStr)}`;
};

export const dayPhrase = (dateStr) => {
  if (dateStr === toDateKey(new Date())) return "today";
  return new Date(dateStr + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

export const presetDays = () =>
  Array.from({ length: LOOKAHEAD_DAYS }, (_, i) => ({
    date: toDateKey(new Date(Date.now() + i * 86400000)),
    other_offered: null,
    windows: PRESET_BLOCKS,
  }));

// The window to default-select for a day: if the other side already
// offered a window on this same date, prefer wherever the two windows
// actually overlap - that's the slice of time most likely to survive
// the later mutual-intersection step, so defaulting to it saves a round
// trip instead of picking blind and hoping it overlaps. Only ever
// applies to real Calendar windows - manual/preset days always carry
// other_offered: null, so this loop is never entered for them.
export const bestDefaultWindow = (day) => {
  if (day.other_offered) {
    const otherStart = new Date(day.other_offered.start).getTime();
    const otherEnd = new Date(day.other_offered.end).getTime();
    for (const w of day.windows) {
      const start = Math.max(new Date(w.start).getTime(), otherStart);
      const end = Math.min(new Date(w.end).getTime(), otherEnd);
      if (start < end) return w;
    }
  }
  return day.windows[0];
};
