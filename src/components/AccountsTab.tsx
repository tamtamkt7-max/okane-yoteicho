import React, { useState } from "react";
import { useApp } from "@/lib/store";
import { Account, PaymentOccurrence } from "@/lib/types";
import { generateOccurrences, formatLocalDate, calculateAccountSummaries } from "@/lib/dateUtils";
import { accountKindNames } from "./HomeTab";

interface AccountsTabProps {
  setActiveTab: (tab: "home" | "calendar" | "add" | "accounts" | "settings") => void;
}

const PRESET_COLORS = ["#5c8d89", "#e29770", "#74b49b", "#e27070", "#3182CE", "#319795", "#DD6B20", "#805ad5", "#4a5568"];

export default function AccountsTab({ setActiveTab }: AccountsTabProps) {
  const { accounts, paymentItems, overrides, addAccount, updateAccount, deleteAccount } = useApp();

  // Mode states
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Account["kind"]>("bank");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [memo, setMemo] = useState("");

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Calculate range for this month
  const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();
  const endOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Generate occurrences for this month to display scheduled items per account
  const monthOccurrences = generateOccurrences(paymentItems, overrides, startOfMonth, endOfMonth);
  const summaries = calculateAccountSummaries(accounts, monthOccurrences);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addAccount({
      name: name.trim(),
      kind,
      color,
      memo: memo.trim() || undefined
    });

    // Reset and close
    resetForm();
    setIsAdding(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingAccountId) return;

    updateAccount(editingAccountId, {
      name: name.trim(),
      kind,
      color,
      memo: memo.trim() || undefined
    });

    resetForm();
    setEditingAccountId(null);
  };

  const handleStartEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setName(account.name);
    setKind(account.kind);
    setColor(account.color);
    setMemo(account.memo || "");
    setIsAdding(false);
    
    // Scroll to form area
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    const message = `本当に「${acc.name}」を削除しますか？\n\n※この口座から引き落とされる予定は、他の口座へ自動的に変更されます。`;
    
    if (window.confirm(message)) {
      const success = deleteAccount(id);
      if (!success) {
        alert("口座を削除できません。他に口座が存在しないため、全ての引き落とし予定を維持するために最低1つの口座が必要です。");
      } else {
        if (editingAccountId === id) {
          resetForm();
          setEditingAccountId(null);
        }
      }
    }
  };

  const resetForm = () => {
    setName("");
    setKind("bank");
    setColor(PRESET_COLORS[0]);
    setMemo("");
  };

  const formatCurrency = (val: number) => val.toLocaleString("ja-JP") + "円";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* View Header */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="flex-between">
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)" }}>
              🏦 口座・支払い元の管理
            </h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              引き落としが発生する銀行やクレジットカードを登録します。
            </p>
          </div>
          {!isAdding && !editingAccountId && (
            <button 
              className="btn btn-primary btn-sm font-bold" 
              onClick={() => { resetForm(); setIsAdding(true); }}
            >
              ＋追加
            </button>
          )}
        </div>
      </div>

      {/* Account Add/Edit Expandable Panel */}
      {(isAdding || editingAccountId) && (
        <form onSubmit={isAdding ? handleAddSubmit : handleEditSubmit} className="card" style={{ border: "2px solid var(--color-primary)", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "12px", color: "var(--color-primary)" }}>
            {isAdding ? "🏦 口座の新規登録" : "📝 口座情報の編集"}
          </h3>

          <div className="form-group">
            <label htmlFor="accName">口座・カードの名前</label>
            <input
              id="accName"
              type="text"
              className="form-control"
              placeholder="例: ゆうちょ銀行, 楽天カード"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="accKind">種類</label>
              <select
                id="accKind"
                className="form-control"
                value={kind}
                onChange={e => setKind(e.target.value as Account["kind"])}
              >
                <option value="bank">銀行口座</option>
                <option value="card">クレジットカード</option>
                <option value="emoney">電子マネー</option>
                <option value="cash">現金</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div className="form-group">
              <label>テーマカラー</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                {PRESET_COLORS.map(c => (
                  <span
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      border: color === c ? "3px solid #2d3748" : "1px solid #cbd5e0",
                      cursor: "pointer",
                      boxSizing: "border-box"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="accMemo">メモ・用途</label>
            <input
              id="accMemo"
              type="text"
              className="form-control"
              placeholder="例: 生活費口座、保育料引き落とし専用"
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {isAdding ? "登録する" : "更新する"}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => { resetForm(); setIsAdding(false); setEditingAccountId(null); }}
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">🏦</span>
            <h3>登録されている口座はありません</h3>
            <p>引き落とし元の銀行口座やクレジットカードを登録してください。</p>
            <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
              口座を登録する
            </button>
          </div>
        </div>
      ) : (
        accounts.map(account => {
          const summary = summaries.find(s => s.accountId === account.id);
          const totalNeeded = summary ? summary.totalNeeded : 0;
          const unconfirmedCount = summary ? summary.unconfirmedCount : 0;
          
          // Get list of occurrences from this account this month
          const accountOccs = monthOccurrences.filter(
            occ => occ.sourceAccountId === account.id && occ.status !== "skipped"
          );

          return (
            <div key={account.id} className="card">
              {/* Header card info */}
              <div className="flex-between" style={{ borderBottom: "1.5px solid #f0f0eb", paddingBottom: "10px", marginBottom: "12px" }}>
                <div className="flex-align-center gap-12">
                  <span style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: account.color }} />
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800 }}>{account.name}</h3>
                    <span className="badge badge-info" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                      {accountKindNames[account.kind]}
                    </span>
                  </div>
                </div>

                {/* Balance needed summary */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>今月必要な安心額</div>
                  <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--color-primary)" }}>
                    {formatCurrency(totalNeeded)}
                  </div>
                  {unconfirmedCount > 0 && (
                    <span style={{ fontSize: "0.65rem", color: "var(--color-danger)", fontWeight: 700 }}>
                      金額未定が {unconfirmedCount} 件
                    </span>
                  )}
                </div>
              </div>

              {/* Memo */}
              {account.memo && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "12px", fontStyle: "italic" }}>
                  💡 {account.memo}
                </p>
              )}

              {/* Scheduled withdrawals list */}
              <div style={{ backgroundColor: "#fafaf7", padding: "10px", borderRadius: "10px", marginBottom: "12px" }}>
                <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                  🗓 {currentMonth}月の引き落とし明細 ({accountOccs.length}件)
                </h4>
                {accountOccs.length === 0 ? (
                  <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>予定されている引き落としはありません。</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {accountOccs.map(occ => (
                      <div key={occ.id} className="flex-between" style={{ fontSize: "0.75rem" }}>
                        <span style={{ color: occ.status === "paid" ? "var(--text-secondary)" : "var(--text-primary)" }}>
                          • {occ.title} ({occ.date.split("-")[2]}日)
                          {occ.status === "paid" && <span style={{ color: "var(--color-success)", marginLeft: "4px" }} className="font-bold">[済]</span>}
                        </span>
                        <span className="font-bold" style={{ textDecoration: occ.status === "paid" ? "line-through" : "" }}>
                          {occ.amountType === "unknown" ? "未確定" : formatCurrency(occ.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action items */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  className="btn btn-outline btn-sm" 
                  style={{ padding: "4px 10px", borderColor: "#cbd5e0", color: "#718096" }}
                  onClick={() => handleStartEdit(account)}
                >
                  編集
                </button>
                <button 
                  className="btn btn-danger btn-sm" 
                  style={{ padding: "4px 10px" }}
                  onClick={() => handleDelete(account.id)}
                >
                  削除
                </button>
              </div>

            </div>
          );
        })
      )}

    </div>
  );
}
