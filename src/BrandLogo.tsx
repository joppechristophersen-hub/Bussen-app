type BrandLogoProps = { small?: boolean; icon?: string };

export default function BrandLogo({ small = false, icon = "🚌" }: BrandLogoProps) {
  return (
    <div className={small ? "bb-brand-mark" : "bb-brand-mark bb-brand-mark-home"}>
      <div className={small ? "logo small-logo" : "logo"} aria-hidden="true">{icon}</div>
      {small && <span className="bb-brand-name">BusBende</span>}
    </div>
  );
}
