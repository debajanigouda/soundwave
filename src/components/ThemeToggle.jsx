import { useContext } from "react";
import { ThemeContext } from "../ThemeContext";

export default function ThemeToggle() {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  return (
    <button
      onClick={() => setDarkMode(d => !d)}
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 10,
        background: darkMode ? "#1a1a28" : "#f0f0f5",
        border: darkMode ? "1px solid #2a2a3e" : "1px solid #ddd",
        cursor: "pointer",
        color: darkMode ? "#a0a0b8" : "#555",
        fontSize: 13,
        fontFamily: "inherit",
        fontWeight: 500,
        transition: "all 0.2s",
      }}
    >
      {darkMode ? "☀️" : "🌙"}
      {darkMode ? "Light Mode" : "Dark Mode"}
    </button>
  );
}