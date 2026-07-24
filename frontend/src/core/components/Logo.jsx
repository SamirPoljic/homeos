export function Logo({ size = 'md' }) {
  const fontSize = size === 'lg' ? 32 : size === 'md' ? 20 : 16;
  const badgePadding = size === 'lg' ? '4px 10px' : size === 'md' ? '2px 7px' : '1px 5px';
  const gap = size === 'lg' ? 8 : 5;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize,
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}
    >
      Home
      <span
        style={{
          background: 'var(--accent)',
          color: 'var(--bg-void)',
          borderRadius: 6,
          padding: badgePadding,
          fontWeight: 800,
          letterSpacing: 0.5,
        }}
      >
        OS
      </span>
    </span>
  );
}
