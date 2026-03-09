"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error(
        <span>
          <strong>Error:</strong> Please fill in all fields.
        </span>,
        { className: "wp-toast-error", icon: "⚠️" }
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      // Shake the form
      if (formRef.current) {
        formRef.current.classList.remove("shake");
        // Force reflow to restart animation
        void formRef.current.offsetWidth;
        formRef.current.classList.add("shake");
      }

      // Show WordPress-style error toast
      toast.error(
        <span>
          <strong>Error:</strong> {data.error || "The username or password you entered is incorrect."}
        </span>,
        {
          className: "wp-toast-error",
          icon: "🔒",
          duration: 6000,
        }
      );
    } catch {
      toast.error(
        <span>
          <strong>Error:</strong> An unexpected error occurred. Please try again.
        </span>,
        { className: "wp-toast-error", icon: "⚠️" }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* WordPress Logo */}
      <div className="login-logo">
        <a href="#" title="Powered by WordPress" tabIndex={-1}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 122.52 122.523"
            fill="currentColor"
          >
            <g>
              <path d="M8.708 61.26c0 20.802 12.089 38.778 29.619 47.298L13.258 39.872a52.354 52.354 0 0 0-4.55 21.388z" />
              <path d="M96.74 58.608c0-6.495-2.333-10.993-4.334-14.494-2.664-4.329-5.161-7.995-5.161-12.324 0-4.831 3.664-9.328 8.825-9.328.233 0 .454.029.681.042-9.35-8.566-21.807-13.796-35.489-13.796-18.36 0-34.513 9.42-43.91 23.688 1.233.037 2.395.063 3.382.063 5.497 0 14.006-.668 14.006-.668 2.833-.167 3.167 3.994.337 4.329 0 0-2.847.335-6.015.501L48.2 93.547l11.501-34.493-8.188-22.434c-2.83-.166-5.511-.501-5.511-.501-2.832-.166-2.5-4.496.332-4.329 0 0 8.679.668 13.843.668 5.496 0 14.006-.668 14.006-.668 2.834-.167 3.168 3.994.337 4.329 0 0-2.853.335-6.015.501l18.992 56.494 5.242-17.517c2.272-7.269 4.001-12.49 4.001-16.989z" />
              <path d="M62.184 65.857l-15.768 45.819a52.588 52.588 0 0 0 32.355-.843 4.725 4.725 0 0 1-.377-.726L62.184 65.857z" />
              <path d="M107.376 36.046c.226 1.674.354 3.471.354 5.404 0 5.333-.996 11.328-3.996 18.824l-16.053 46.415C101.351 98.147 112.57 81.053 112.57 61.26c0-9.165-2.566-17.733-7.012-25.037l1.818-.177z" />
              <path d="M61.262 0C27.483 0 0 27.481 0 61.26c0 33.783 27.483 61.263 61.262 61.263 33.778 0 61.258-27.48 61.258-61.263C122.52 27.481 95.04 0 61.262 0zm0 119.715c-32.23 0-58.453-26.223-58.453-58.455 0-32.23 26.222-58.451 58.453-58.451 32.229 0 58.45 26.221 58.45 58.451 0 32.232-26.221 58.455-58.45 58.455z" />
            </g>
          </svg>
        </a>
      </div>

      {/* Login Card */}
      <div className="login-container">
        <div className="login-card" ref={formRef}>
          <form onSubmit={handleSubmit}>
            <div className="input-wrap">
              <label htmlFor="user_login">Username or Email Address</label>
              <input
                id="user_login"
                type="text"
                name="log"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="input-wrap">
              <label htmlFor="user_pass">Password</label>
              <div className="password-wrap">
                <input
                  id="user_pass"
                  type={showPassword ? "text" : "password"}
                  name="pwd"
                  autoComplete="current-password"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-actions">
              <label className="remember-me">
                <input type="checkbox" name="rememberme" id="rememberme" />
                Remember Me
              </label>

              <button
                type="submit"
                className="login-btn"
                id="wp-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging In..." : "Log In"}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="login-footer">
          <a href="#">Lost your password?</a>
        </div>
      </div>

      <div className="back-to-link">
        <a href="#">&larr; Go to WordPress</a>
      </div>
    </>
  );
}
