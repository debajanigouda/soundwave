export default function Logo({ size = 36, showText = true, textSize = 20 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* Icon */}
      <div style={{
        width: size, height: size,
        background: "linear-gradient(135deg, #6c63ff 0%, #ff6b9d 100%)",
        borderRadius: size * 0.28,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        boxShadow: "0 4px 16px rgba(108,99,255,0.4)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Shine effect */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "50%",
          background: "rgba(255,255,255,0.12)", borderRadius: `${size * 0.28}px ${size * 0.28}px 0 0`,
        }} />
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
          {/* Music note */}
          <circle cx="8.5" cy="17.5" r="3.5" fill="white"/>
          <rect x="11.5" y="5" width="2.5" height="13" rx="1.25" fill="white"/>
          <rect x="11.5" y="5" width="9" height="2.5" rx="1.25" fill="white"/>
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{
            fontSize: textSize, fontWeight: 800,
            background: "linear-gradient(135deg, #6c63ff, #ff6b9d)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: -0.5,
          }}>SoundWave</span>
          <span style={{ fontSize: textSize * 0.45, color: "#6b7280", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 1 }}>Music</span>
        </div>
      )}
    </div>
  );
}