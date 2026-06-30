import React, { useState } from "react";
import { useApp } from "@/lib/store";
import { getCalendarGrid, generateOccurrences, formatLocalDate, parseLocalDate } from "@/lib/dateUtils";
import { PaymentOccurrence, PaymentItem } from "@/lib/types";
import { categoryEmojis, categoryNames } from "./HomeTab";

interface CalendarTabProps {
  onEditItem: (item: PaymentItem) => void;
  setActiveTab: (tab: "home" | "calendar" | "add" | "accounts" | "settings") => void;
}

export default function CalendarTab({ onEditItem, setActiveTab }: CalendarTabProps) {
  const { paymentItems, overrides, setOccurrenceOverride, deletePaymentItem } = useApp();

  const today = new Date();
  const todayStr = formatLocalDate(today);
  
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleResetToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDate(todayStr);
  };

  // Generate calendar grid dates
  const grid = getCalendarGrid(currentYear, currentMonth);

  // Define date range for occurrences generation: 
  // we want to cover all date cells in the calendar grid (which includes trailing/leading days of adjacent months)
  const firstGridDate = grid[0].dateStr;
  const lastGridDate = grid[grid.length - 1].dateStr;

  // Generate all occurrences falling in this grid range
  const allGridOccurrences = generateOccurrences(paymentItems, overrides, firstGridDate, lastGridDate);

  // Group occurrences by date for easy calendar cell lookup
  const occurrencesByDate: Record<string, PaymentOccurrence[]> = {};
  for (const occ of allGridOccurrences) {
    if (!occurrencesByDate[occ.date]) {
      occurrencesByDate[occ.date] = [];
    }
    occurrencesByDate[occ.date].push(occ);
  }

  // Handle selected date occurrences
  const selectedOccurrences = occurrencesByDate[selectedDate] || [];

  // Toggle paid status
  const handleTogglePaid = (occ: PaymentOccurrence) => {
    const nextStatus = occ.status === "paid" ? "scheduled" : "paid";
    setOccurrenceOverride(occ.paymentItemId, occ.date, { status: nextStatus });
    if (nextStatus === "paid") {
      window.dispatchEvent(new Event("trigger-confetti"));
    }
  };

  // Toggle skip status
  const handleToggleSkip = (occ: PaymentOccurrence) => {
    const nextStatus = occ.status === "skipped" ? "scheduled" : "skipped";
    setOccurrenceOverride(occ.paymentItemId, occ.date, { status: nextStatus });
  };

  // Handle delete click
  const handleDeleteClick = (paymentItemId: string) => {
    const item = paymentItems.find(p => p.id === paymentItemId);
    if (!item) return;
    if (window.confirm(`「${item.title}」を削除しますか？\n（この予定自体の登録が消去されます）`)) {
      deletePaymentItem(paymentItemId);
    }
  };

  // Formatter helpers
  const formatCurrency = (val: number) => val.toLocaleString("ja-JP") + "円";
  const formatCompactCurrency = (val: number) => {
    if (val >= 10000) {
      return (val / 10000).toFixed(1).replace(".0", "") + "万";
    }
    return val.toLocaleString("ja-JP");
  };

  // Format header display
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* Calendar Controller Card */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="flex-between">
          <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth} style={{ padding: "6px 12px" }}>
            ◀ 前月
          </button>
          
          <div style={{ textAlign: "center", cursor: "pointer" }} onClick={handleResetToToday}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)" }}>
              {currentYear}年 {currentMonth}月
            </h2>
            <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", display: "block" }}>
              今日に戻る
            </span>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleNextMonth} style={{ padding: "6px 12px" }}>
            翌月 ▶
          </button>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="card" style={{ padding: "12px" }}>
        {/* Days of Week Header */}
        <div className="calendar-header-grid">
          {dayNames.map((name, idx) => (
            <span 
              key={name} 
              style={{ 
                color: idx === 0 ? "var(--color-danger)" : idx === 6 ? "var(--color-primary)" : "var(--text-secondary)" 
              }}
            >
              {name}
            </span>
          ))}
        </div>

        {/* Calendar Cells */}
        <div className="calendar-grid">
          {grid.map(cell => {
            const occs = occurrencesByDate[cell.dateStr] || [];
            // Filter out skipped occurrences for counts/sums
            const activeOccs = occs.filter(o => o.status !== "skipped");
            const totalCount = activeOccs.length;
            const totalSum = activeOccs.reduce((sum, o) => sum + (o.amountType === "unknown" ? 0 : o.amount), 0);
            
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDate;
            const hasUnconfirmed = activeOccs.some(o => o.amountType === "unknown");
            
            return (
              <div
                key={cell.dateStr}
                onClick={() => setSelectedDate(cell.dateStr)}
                className={`calendar-cell ${cell.isCurrentMonth ? "" : "outside"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
              >
                <span className="calendar-cell-date" style={{ color: isToday ? "var(--color-accent)" : "" }}>
                  {cell.day}
                </span>

                {totalCount > 0 && (
                  <div className="calendar-cell-indicator">
                    <div className="calendar-count">{totalCount}件</div>
                    <div 
                      className="calendar-sum" 
                      style={{ color: hasUnconfirmed ? "var(--color-danger)" : "" }}
                    >
                      {hasUnconfirmed ? "未定" : formatCompactCurrency(totalSum)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Section */}
      <div className="card">
        <h3 className="card-title" style={{ borderBottom: "1px solid #f0f0eb", paddingBottom: "8px" }}>
          📅 {selectedDate.replace(/-/g, "/")} のお支払予定
        </h3>
        
        {selectedOccurrences.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">☕</span>
            <h3>支払予定はありません</h3>
            <p>この日に落ちるサブスクや引き落とし予定はありません。</p>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                // Navigate to add with predefined date
                // We'll pass the date later
                setActiveTab("add");
              }}
            >
              予定をここに登録する
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
            {selectedOccurrences.map(occ => {
              const isPaid = occ.status === "paid";
              const isSkipped = occ.status === "skipped";
              const isUnconfirmed = occ.amountType === "unknown";
              
              return (
                <div 
                  key={occ.id} 
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "12px",
                    backgroundColor: isSkipped ? "#e2e8f0" : isPaid ? "var(--color-success-light)" : "#fafaf7",
                    borderRadius: "12px",
                    opacity: isSkipped || isPaid ? 0.75 : 1,
                    border: isPaid ? "1px solid rgba(116, 180, 155, 0.3)" : "1.5px solid transparent",
                    transition: "var(--transition)"
                  }}
                >
                  {/* Top line: Category and Title */}
                  <div className="flex-between">
                    <div className="flex-align-center gap-8">
                      <span className={`cat-icon cat-${occ.category}`} style={{ width: "28px", height: "28px", fontSize: "0.85rem" }}>
                        {categoryEmojis[occ.category]}
                      </span>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", textDecoration: isPaid || isSkipped ? "line-through" : "" }}>
                          {occ.title}
                        </span>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                          {categoryNames[occ.category]}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: "right" }}>
                      <span style={{ 
                        fontWeight: 900, 
                        fontSize: "1.1rem", 
                        color: isUnconfirmed ? "var(--color-danger)" : "var(--text-primary)" 
                      }}>
                        {isUnconfirmed ? "未入力" : formatCurrency(occ.amount)}
                      </span>
                      {isSkipped && <span className="badge badge-danger" style={{ marginLeft: "6px" }}>スキップ中</span>}
                      {isPaid && <span className="badge badge-success" style={{ marginLeft: "6px" }}>完了</span>}
                    </div>
                  </div>

                  {/* Memo if any */}
                  {occ.memo && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", backgroundColor: "#ffffff", padding: "6px 8px", borderRadius: "6px" }}>
                      💬 {occ.memo}
                    </div>
                  )}

                  {/* Action buttons line */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginTop: "4px",
                    borderTop: "1px dashed rgba(92, 141, 137, 0.1)",
                    paddingTop: "8px" 
                  }}>
                    {/* Status Toggle Buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className={`btn btn-sm ${isPaid ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "4px 10px" }}
                        onClick={() => handleTogglePaid(occ)}
                        disabled={isSkipped}
                      >
                        {isPaid ? "✓ 支払完了" : "支払済にする"}
                      </button>
                      
                      <button
                        className={`btn btn-sm ${isSkipped ? "btn-danger" : "btn-outline"}`}
                        style={{ 
                          padding: "4px 10px", 
                          borderColor: isSkipped ? "transparent" : "#cbd5e0",
                          color: isSkipped ? "var(--color-danger)" : "#718096"
                        }}
                        onClick={() => handleToggleSkip(occ)}
                        disabled={isPaid}
                      >
                        {isSkipped ? "スキップ解除" : "今回スキップ"}
                      </button>
                    </div>

                    {/* Edit/Delete actions */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 8px", borderColor: "#cbd5e0", color: "#718096" }}
                        onClick={() => {
                          const item = paymentItems.find(p => p.id === occ.paymentItemId);
                          if (item) onEditItem(item);
                        }}
                      >
                        編集
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        style={{ padding: "4px 8px" }}
                        onClick={() => handleDeleteClick(occ.paymentItemId)}
                      >
                        削除
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
