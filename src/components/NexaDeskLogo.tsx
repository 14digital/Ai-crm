interface LogoProps {
  size?: number;
  width?: number;
  height?: number;
  variant?: "icon" | "full";
  theme?: "color" | "white";
  className?: string;
  style?: React.CSSProperties;
}

export function NexaDeskLogo({
  size = 40,
  width,
  height,
  variant = "icon",
  theme = "color",
  className,
  style,
}: LogoProps) {
  if (variant === "icon") {
    const dim = size;
    return (
      <img
        src="/icon.png"
        alt="NexaDesk"
        width={dim}
        height={dim}
        style={{ width: dim, height: dim, objectFit: "contain", ...style }}
        className={className}
      />
    );
  }

  const h = height || size;
  const textColor = theme === "white" ? "#ffffff" : "#0f172a";
  return (
    <svg
      viewBox="0 0 188 40"
      height={h}
      width={width || "auto"}
      style={style}
      className={className}
      role="img"
      aria-label="NexaDesk"
    >
      <path
        d="M17 2C8.2 2 1 8.8 1 17.2c0 4.1 1.8 7.8 4.7 10.5L4 34l7.9-3.3c1.6.4 3.3.7 5.1.7 8.8 0 16-6.8 16-15.2S25.8 2 17 2z"
        fill="#2f6fed"
      />
      <circle cx="10.5" cy="17" r="2.1" fill="#ffffff" />
      <circle cx="17" cy="17" r="2.1" fill="#ffffff" />
      <circle cx="23.5" cy="17" r="2.1" fill="#ffffff" />
      <text
        x="40"
        y="27"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="800"
        fontSize="23"
        fill={textColor}
      >
        NexaDesk
      </text>
    </svg>
  );
}
