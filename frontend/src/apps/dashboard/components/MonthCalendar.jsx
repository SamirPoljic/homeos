import { useState } from 'react';

const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MonthCalendar({ tasksByDate, selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  // pomjeri tako da Ponedjeljak bude prvi (JS default: 0=Nedjelja)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayKey = toDateKey(new Date());

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));

  function changeMonth(delta) {
    const next = new Date(year, month + delta, 1);
    setViewDate(next);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button className="btn btn-ghost" onClick={() => changeMonth(-1)}>‹</button>
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button className="btn btn-ghost" onClick={() => changeMonth(1)}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {WEEKDAYS.map((wd) => (
          <div key={wd} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            {wd}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />;
          const key = toDateKey(date);
          const hasTasks = (tasksByDate[key]?.length ?? 0) > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(key)}
              style={{
                aspectRatio: '1',
                border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: isSelected ? 'var(--accent-dim)' : isToday ? 'var(--bg-hover)' : 'var(--bg-surface-raised)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: isToday ? 700 : 400,
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {date.getDate()}
              {hasTasks && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { toDateKey };
