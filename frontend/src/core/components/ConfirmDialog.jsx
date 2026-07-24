export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 340, boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ fontSize: 14, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm}>
            Da, obriši
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            Otkaži
          </button>
        </div>
      </div>
    </div>
  );
}
