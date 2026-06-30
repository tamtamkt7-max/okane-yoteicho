"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import HomeTab from "@/components/HomeTab";
import CalendarTab from "@/components/CalendarTab";
import AddPaymentTab from "@/components/AddPaymentTab";
import AccountsTab from "@/components/AccountsTab";
import SettingsTab from "@/components/SettingsTab";
import { PaymentItem } from "@/lib/types";

type TabType = "home" | "calendar" | "add" | "accounts" | "settings";

export default function Home() {
  const { isLoading, theme } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [itemForEdit, setItemForEdit] = useState<PaymentItem | null>(null);
  const [confettiPieces, setConfettiPieces] = useState<{ id: number; left: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.error("Service worker registration failed", err);
        });
      });
    }
  }, []);

  const triggerConfetti = () => {
    const colors = ["#ff5964", "#35a7ff", "#74b49b", "#ffe74c", "#ffffff", "#e29770", "#805ad5"];
    const pieces = Array.from({ length: 50 }).map((_, i) => ({
      id: Math.random() + i,
      left: Math.random() * 100, // percentage
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1.0
    }));
    setConfettiPieces(pieces);
    setTimeout(() => {
      setConfettiPieces([]);
    }, 2800);
  };

  useEffect(() => {
    const handleTrigger = () => triggerConfetti();
    window.addEventListener("trigger-confetti", handleTrigger);
    return () => window.removeEventListener("trigger-confetti", handleTrigger);
  }, []);

  const handleEditItem = (item: PaymentItem) => {
    setItemForEdit(item);
    setActiveTab("add");
  };

  const handleSelectAddTab = () => {
    setItemForEdit(null); // Clear edit state when clicking "+" to add new
    setActiveTab("add");
  };

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f7f6f0",
        gap: "16px"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "4px solid #e6efed",
          borderTopColor: "#5c8d89",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ color: "#5c8d89", fontWeight: 700, fontSize: "0.9rem" }}>ひらいています...</p>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`app-container theme-${theme}`}>
      {confettiPieces.length > 0 && (
        <div className="confetti-wrapper">
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* App Header (Dynamic title based on tab) */}
      <header className="app-header">
        <div className="flex-between">
          <div>
            <h1>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-primary)" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M9 16l2 2 4-4" />
              </svg>
              おかねの予定帳
            </h1>
            <p>これから落ちるお金を、カレンダーと口座別に見える化</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="tab-content">
        {activeTab === "home" && (
          <HomeTab
            onEditItem={handleEditItem}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarTab
            onEditItem={handleEditItem}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "add" && (
          <AddPaymentTab
            itemForEdit={itemForEdit}
            clearEdit={() => setItemForEdit(null)}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "accounts" && (
          <AccountsTab
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="app-nav">
        <button
          className={`nav-item ${activeTab === "home" ? "active" : ""}`}
          onClick={() => setActiveTab("home")}
          aria-label="ホーム"
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          ホーム
        </button>
        <button
          className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveTab("calendar")}
          aria-label="カレンダー"
        >
          <svg viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          予定表
        </button>
        <button
          className={`nav-item ${activeTab === "add" && !itemForEdit ? "active" : ""}`}
          onClick={handleSelectAddTab}
          aria-label="追加"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="12" y2="12" />
          </svg>
          追加
        </button>
        <button
          className={`nav-item ${activeTab === "accounts" ? "active" : ""}`}
          onClick={() => setActiveTab("accounts")}
          aria-label="口座"
        >
          <svg viewBox="0 0 24 24">
            <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          口座
        </button>
        <button
          className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
          aria-label="設定"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          設定
        </button>
      </nav>
    </div>
  );
}
