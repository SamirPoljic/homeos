export function HouseIllustration() {
  return (
    <svg
      viewBox="0 0 900 600"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      preserveAspectRatio="xMidYMax slice"
    >
      {/* nebo/pozadina */}
      <rect x="0" y="0" width="900" height="600" fill="#14120f" />

      {/* sunce */}
      <circle cx="720" cy="110" r="70" fill="#ff7a00" opacity="0.12" />
      <circle cx="720" cy="110" r="40" fill="#ff7a00" opacity="0.18" />

      {/* daleko brdo */}
      <path d="M0,380 Q200,320 450,360 T900,340 L900,600 L0,600 Z" fill="#1e1b18" />

      {/* travnjak / dvorište */}
      <path d="M0,430 Q250,400 450,420 T900,410 L900,600 L0,600 Z" fill="#201d19" />

      {/* staza do kuće */}
      <path d="M430,600 L470,420 L520,420 L500,600 Z" fill="#262220" />

      {/* drvo lijevo */}
      <circle cx="140" cy="360" r="55" fill="#2c2723" />
      <circle cx="100" cy="385" r="40" fill="#262220" />
      <rect x="130" y="400" width="16" height="70" fill="#262220" />

      {/* drvo desno */}
      <circle cx="800" cy="380" r="45" fill="#262220" />
      <rect x="792" y="410" width="14" height="60" fill="#201d19" />

      {/* kuća - tijelo */}
      <rect x="330" y="290" width="260" height="180" fill="#242220" stroke="#322d29" strokeWidth="2" />

      {/* krov */}
      <polygon points="310,300 460,190 610,300" fill="#1a1815" stroke="#322d29" strokeWidth="2" />
      {/* akcenat na sljemenu krova */}
      <polygon points="455,192 460,190 465,192 460,205" fill="#ff7a00" opacity="0.6" />

      {/* dimnjak */}
      <rect x="540" y="220" width="26" height="60" fill="#1a1815" stroke="#322d29" strokeWidth="1.5" />

      {/* vrata */}
      <rect x="435" y="380" width="52" height="90" rx="3" fill="#322d29" />
      <circle cx="475" cy="428" r="3" fill="#ff9433" />

      {/* prozor lijevo - svijetli toplo */}
      <rect x="360" y="330" width="46" height="46" rx="2" fill="#ff7a00" opacity="0.35" stroke="#423b35" strokeWidth="2" />
      <line x1="383" y1="330" x2="383" y2="376" stroke="#423b35" strokeWidth="2" />
      <line x1="360" y1="353" x2="406" y2="353" stroke="#423b35" strokeWidth="2" />

      {/* prozor desno */}
      <rect x="515" y="330" width="46" height="46" rx="2" fill="#ff7a00" opacity="0.35" stroke="#423b35" strokeWidth="2" />
      <line x1="538" y1="330" x2="538" y2="376" stroke="#423b35" strokeWidth="2" />
      <line x1="515" y1="353" x2="561" y2="353" stroke="#423b35" strokeWidth="2" />

      {/* ograda dvorišta */}
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={i} x={60 + i * 22} y={440} width="4" height="26" fill="#322d29" />
      ))}
      <line x1="60" y1="446" x2="366" y2="446" stroke="#322d29" strokeWidth="3" />

      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={`r${i}`} x={600 + i * 22} y={440} width="4" height="26" fill="#322d29" />
      ))}
      <line x1="600" y1="446" x2="852" y2="446" stroke="#322d29" strokeWidth="3" />
    </svg>
  );
}
