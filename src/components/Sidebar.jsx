const GRAD = "linear-gradient(135deg,#6c63ff,#ff6b9d)";

export default function Sidebar({ currentPage, setCurrentPage, playlists, likedCount }) {
  const navItems = [
    { id: "home",      label: "Home",         icon: <HomeIcon /> },
    { id: "search",    label: "Discover",     icon: <SearchIcon /> },
    { id: "library",   label: "Your Library", icon: <LibraryIcon /> },
    { id: "liked",     label: "Liked Songs",  icon: <HeartIcon />, badge: likedCount },
    { id: "downloads", label: "Downloads",    icon: <DownloadIcon /> },
  ];

  return (
    <aside style={{ width: 260, flexShrink: 0, background: "#12121a", borderRight: "1px solid #2a2a45", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "28px 24px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, background: GRAD, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>♪</div>
        <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 700, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SoundWave</span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "0 12px", flex: 1, overflowY: "auto" }}>
        <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#606080", padding: "0 12px" }}>Menu</div>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setCurrentPage(item.id)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer", color: currentPage === item.id ? "#6c63ff" : "#a0a0c0", background: currentPage === item.id ? "rgba(108,99,255,.15)" : "none", border: "none", width: "100%", textAlign: "left", fontSize: 14, fontWeight: 500, fontFamily: "inherit", marginBottom: 2 }}>
            {item.icon}
            {item.label}
            {item.badge > 0 && (
              <span style={{ marginLeft: "auto", background: "#6c63ff", color: "#fff", fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700 }}>{item.badge}</span>
            )}
          </button>
        ))}

        {/* Playlists */}
        <div style={{ marginTop: 24, marginBottom: 8, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#606080", padding: "0 12px" }}>Playlists</div>
        {playlists.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#1a1a28"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{p.emoji}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#f0f0ff" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "#606080" }}>{p.songIds.length} songs</div>
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function HomeIcon()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> }
function SearchIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }
function LibraryIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg> }
function HeartIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> }
function DownloadIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }