import { useState, useRef, useEffect } from 'react';
import { useHousehold } from './HouseholdContext';

export function HouseholdSwitcher() {
  const { households, currentHousehold, switchHousehold } = useHousehold();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!currentHousehold) {
    return <div className="household-switcher-empty">Nema domaćinstva</div>;
  }

  return (
    <div className="household-switcher" ref={ref}>
      <button className="household-switcher-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="household-switcher-name">{currentHousehold.name}</span>
        <span className="household-switcher-caret">▾</span>
      </button>

      {open && (
        <div className="household-switcher-menu">
          {households.map((h) => (
            <button
              key={h.id}
              className={`household-switcher-item${h.id === currentHousehold.id ? ' household-switcher-item-active' : ''}`}
              onClick={() => {
                switchHousehold(h.id);
                setOpen(false);
              }}
            >
              {h.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
