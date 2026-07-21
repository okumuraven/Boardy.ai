import { useState } from "react";
import { dateKeyFromDate } from "./dateKey";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A real, navigable month grid - `eventDates` is a Set of "YYYY-MM-DD"
// keys derived from actual confirmed/proposed schedule data (see
// CalendarView), never illustrative placeholder dates. Clicking a day
// filters the agenda list below to that date instead of trying to cram
// a text label into a 24px cell - `onSelectDate`/`selectedDate` drive
// that filter from the parent.
export default function MiniCalendar({ eventDates, selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayKey = dateKeyFromDate(today);

  const cells = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, faded: true, key: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, faded: false, key: dateKeyFromDate(new Date(year, month, d)) });
  }
  let nextMonthDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextMonthDay++, faded: true, key: null });
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <h2>{MONTH_NAMES[month]} {year}</h2>
        <div className="mini-cal-nav">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} aria-label="Next month">›</button>
        </div>
      </div>
      <div className="mini-cal-grid">
        {DOW.map((d, i) => (
          <span className="dow" key={i}>{d}</span>
        ))}
        {cells.map((cell, i) => (
          <button
            key={i}
            type="button"
            disabled={cell.faded}
            onClick={() => cell.key && onSelectDate?.(cell.key === selectedDate ? null : cell.key)}
            className={[
              "day",
              cell.faded ? "faded" : "",
              cell.key === todayKey ? "today" : "",
              cell.key && eventDates.has(cell.key) ? "has-event" : "",
              cell.key && cell.key === selectedDate ? "selected" : "",
            ].filter(Boolean).join(" ")}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>
  );
}
