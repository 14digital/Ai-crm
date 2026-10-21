interface LogoProps {
  size?: number;
  width?: number;
  height?: number;
  variant?: "icon" | "full";
  className?: string;
  style?: React.CSSProperties;
}

export function AssistedPulseLogo({
  size = 40,
  width,
  height,
  variant = "icon",
  className,
  style,
}: LogoProps) {
  if (variant === "full") {
    const h = height || size;
    return (
      <img
        src="/logo.png"
        alt="Assisted Pulse"
        style={{ height: h, width: width || "auto", objectFit: "contain", ...style }}
        className={className}
      />
    );
  }

  const dim = size;
  return (
    <img
      src="/icon.png"
      alt="Assisted Pulse"
      width={dim}
      height={dim}
      style={{ width: dim, height: dim, objectFit: "contain", ...style }}
      className={className}
    />
  );
}

