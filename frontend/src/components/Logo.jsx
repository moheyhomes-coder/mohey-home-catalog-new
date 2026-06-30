const LOGO_SRC = "https://customer-assets.emergentagent.com/job_live-stock-tracker-8/artifacts/vtn77pnw_Primary%20logo-01.png";

export function Logo({ size = 44, withWordmark = true, dark = false, className = "", tagline = "Premium Textiles" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="brand-logo">
      <img
        src={LOGO_SRC}
        alt="Mohey Home"
        className="object-contain shrink-0 drop-shadow-sm"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <div className="leading-none">
          <p className={`font-display font-black tracking-[0.18em] uppercase ${size >= 56 ? "text-lg" : "text-sm sm:text-base"} ${dark ? "text-white" : "text-[#0A0A0A]"}`}>
            Mohey Home
          </p>
          {tagline && (
            <p className={`text-[9px] tracking-[0.3em] uppercase mt-1 ${dark ? "text-white/50" : "text-[#0A0A0A]/60"}`}>
              {tagline}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function LogoMark({ size = 24, className = "" }) {
  return (
    <img src={LOGO_SRC} alt="Mohey Home" className={`object-contain ${className}`} style={{ width: size, height: size }} />
  );
}

export const LOGO_URL = LOGO_SRC;
