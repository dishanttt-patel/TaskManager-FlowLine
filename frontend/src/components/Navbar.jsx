import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand" style={{ textDecoration: "none" }}>
        <span className="brand-mark" aria-hidden="true" />
        Flowline
      </Link>
      <div className="nav-actions">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle light/dark theme"
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>

        {user && (
          <div className="navbar-right">
            {location.pathname === "/admin" ? (
              <Link to="/" className="nav-link">
                Board
              </Link>
            ) : (
              user.role === "admin" && (
                <Link to="/admin" className="nav-link">
                  Admin Panel
                </Link>
              )
            )}
            <span>{user.name}</span>
            <span className="role-tag">{user.role}</span>
            <button className="btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
