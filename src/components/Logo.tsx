import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative inline-grid place-items-center rounded-[28%] bg-panel"
      style={{
        width: size,
        height: size,
        boxShadow: "0 0 18px -4px rgb(165 180 252 / 0.6), inset 0 0 0 1px rgb(165 180 252 / 0.55)",
      }}
    >
      <span className="text-gradient font-black" style={{ fontSize: size * 0.56, lineHeight: 1 }}>
        N
      </span>
      <span
        className="absolute rounded-full bg-lime"
        style={{ width: size * 0.18, height: size * 0.18, top: size * 0.12, right: size * 0.12 }}
      />
    </span>
  );
}

export function Logo({ product = "Pulse" }: { product?: string }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <LogoMark />
      <span className="flex items-baseline gap-2">
        <span className="text-[15px] font-black tracking-tight">
          <span className="text-ink">NEON</span>
          <span className="text-gradient">DEV</span>
        </span>
        <span className="hud text-muted!">{product}</span>
      </span>
    </Link>
  );
}
