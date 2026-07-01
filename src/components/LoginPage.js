"use client";

import { useState } from "react";
import styles from "./LoginPage.module.css";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Username is required");
      return;
    }

    if (trimmed.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
      setError("Username can only contain letters, numbers, dashes, and underscores");
      return;
    }

    setIsLoading(true);
    
    // Simulate a professional delay
    setTimeout(() => {
      setIsLoading(false);
      onLogin(trimmed);
    }, 800);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoContainer}>
          {/* Custom SVG logo representing a concentric ring and core dot */}
          <svg
            className={styles.logo}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="50" r="38" stroke="var(--text-primary)" strokeWidth="10" />
            <circle cx="50" cy="50" r="15" fill="var(--text-primary)" />
          </svg>
        </div>

        <h1 className={styles.title}>Sign in to Core</h1>
        <p className={styles.subtitle}>
          Enter your username to access your repository dashboard.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              type="text"
              id="username"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              placeholder="e.g. github_dev"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
            {error && <span className={styles.errorMessage}>{error}</span>}
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.spinner}></span>
            ) : (
              "Continue with Username"
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p>This is a temporary frontend login. Any username works.</p>
        </div>
      </div>
    </div>
  );
}
