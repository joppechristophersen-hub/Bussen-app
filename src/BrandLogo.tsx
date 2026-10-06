type BrandLogoProps = { small?: boolean; icon?: string };

export function BusEmblem() {
  return (
    <svg className="bb-bus-emblem" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {/* A pair of playing cards riding behind a cheerful little bus. */}
      <g transform="rotate(-18 31 37)">
        <rect x="16" y="13" width="29" height="42" rx="5" fill="#fffaf0" stroke="#24251f" strokeWidth="2.5" />
        <path d="M26 23c-5-6-12 2 0 10 12-8 5-16 0-10Z" fill="#c8182b" />
      </g>
      <g transform="rotate(14 67 33)">
        <rect x="53" y="11" width="29" height="42" rx="5" fill="#fffaf0" stroke="#24251f" strokeWidth="2.5" />
        <path d="m68 19-7 9 7 9 7-9-7-9Z" fill="#24251f" />
      </g>
      <path d="M23 47c0-6 5-11 11-11h33c7 0 12 5 12 12v23c0 5-4 9-9 9H32c-5 0-9-4-9-9V47Z" fill="#f6c945" stroke="#24251f" strokeWidth="3" />
      <rect x="29" y="43" width="44" height="19" rx="5" fill="#193f36" />
      <path d="M45 44v17m13-17v17" stroke="#fffaf0" strokeWidth="2" />
      <path d="m34 47-3 8m9-8-3 8" stroke="#8bbdaf" strokeWidth="2" strokeLinecap="round" />
      <circle cx="31" cy="69" r="3" fill="#fffaf0" />
      <circle cx="71" cy="69" r="3" fill="#fffaf0" />
      <path d="M44 69q7 7 14 0" stroke="#24251f" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="29" y="77" width="10" height="9" rx="4" fill="#24251f" />
      <rect x="63" y="77" width="10" height="9" rx="4" fill="#24251f" />
      <path d="m85 33 2-5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fffaf0" />
    </svg>
  );
}

export default function BrandLogo({ small = false, icon }: BrandLogoProps) {
  return (
    <div className={small ? "bb-brand-mark" : "bb-brand-mark bb-brand-mark-home"}>
      <div className={small ? "logo small-logo" : "logo"} aria-hidden="true">
        {icon && icon !== "🚌" ? icon : <BusEmblem />}
      </div>
      {small && <span className="bb-brand-name">BusBende</span>}
    </div>
  );
}
