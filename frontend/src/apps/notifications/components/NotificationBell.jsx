import { useEffect, useRef, useState } from 'react';
import { notificationsApi } from '../api';

export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function load() {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data);
    } catch {
      // tiho - zvono nije kritično ako padne
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // osvježi svakih 60s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markRead(id);
      await load();
    } catch {
      // ignoriši
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      await load();
    } catch {
      // ignoriši
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="btn btn-ghost"
        style={{ position: 'relative', padding: '8px 10px' }}
        onClick={() => setOpen((o) => !o)}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: 'var(--accent)',
              color: '#14120f',
              borderRadius: '50%',
              width: 16,
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'var(--bg-surface-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: 10,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Notifikacije</span>
            {unreadCount > 0 && (
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={handleMarkAllRead}>
                Označi sve pročitano
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nema notifikacija.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && handleMarkRead(n.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: n.read_at ? 'transparent' : 'var(--accent-dim)',
                    cursor: n.read_at ? 'default' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  {n.body && <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{n.body}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
