"use client";

import { useState, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import DashboardPage from "@/components/DashboardPage";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      const storedUser = localStorage.getItem("current_user");
      if (storedUser) {
        setUser(storedUser);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (username) => {
    setUser(username);
    localStorage.setItem("current_user", username);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("current_user");
  };

  if (!isMounted) {
    // Elegant dark loading screen to prevent server/client hydration mismatch flashing
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: "var(--font-geist-sans), sans-serif",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "2px solid rgba(255, 255, 255, 0.1)",
            borderTopColor: "#ffffff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <DashboardPage username={user} onLogout={handleLogout} />;
}
