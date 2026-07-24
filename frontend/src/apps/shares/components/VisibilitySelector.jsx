const VISIBILITY_OPTIONS = [
  { value: 'household', label: 'Zajedničko (svi vide)' },
  { value: 'private', label: 'Privatno (samo ja)' },
  { value: 'specific', label: 'Određene osobe' },
];

export function VisibilitySelector({ visibility, onVisibilityChange, members, selectedProfileIds, onToggleProfile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select className="input" value={visibility} onChange={(e) => onVisibilityChange(e.target.value)}>
        {VISIBILITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {visibility === 'specific' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '8px 10px',
            background: 'var(--bg-surface-raised)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {members.map((m) => (
            <label
              key={m.profiles.id}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={selectedProfileIds.includes(m.profiles.id)}
                onChange={() => onToggleProfile(m.profiles.id)}
              />
              {m.profiles.full_name || m.profiles.email}
            </label>
          ))}
          {members.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nema drugih članova.</span>}
        </div>
      )}
    </div>
  );
}
