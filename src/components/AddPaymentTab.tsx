import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { PaymentItem, PaymentCycle, Account } from "@/lib/types";
import { formatLocalDate, getNextOccurrenceDate, parseLocalDate } from "@/lib/dateUtils";
import { categoryNames, accountKindNames } from "./HomeTab";

interface AddPaymentTabProps {
  itemForEdit: PaymentItem | null;
  clearEdit: () => void;
  setActiveTab: (tab: "home" | "calendar" | "add" | "accounts" | "settings") => void;
}

const PRESET_COLORS = ["#5c8d89", "#e29770", "#74b49b", "#e27070", "#3182CE", "#319795", "#DD6B20", "#805ad5", "#4a5568"];

export default function AddPaymentTab({ itemForEdit, clearEdit, setActiveTab }: AddPaymentTabProps) {
  const { accounts, addPaymentItem, updatePaymentItem, deletePaymentItem, addAccount, isPremium, paymentItems, setIsPremium } = useApp();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const todayStr = formatLocalDate(new Date());

  // Form Fields State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [amountType, setAmountType] = useState<PaymentItem["amountType"]>("fixed");
  const [category, setCategory] = useState<PaymentItem["category"]>("subscription");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [memo, setMemo] = useState("");
  
  // Cycle Fields State
  const [cycleType, setCycleType] = useState<"monthly" | "yearly" | "everyNDays" | "oneTime">("monthly");
  const [cycleDay, setCycleDay] = useState<number>(new Date().getDate());
  const [cycleMonth, setCycleMonth] = useState<number>(new Date().getMonth() + 1);
  const [cycleDays, setCycleDays] = useState<number>(30);
  const [cycleBaseDate, setCycleBaseDate] = useState<string>(todayStr);
  const [cycleDate, setCycleDate] = useState<string>(todayStr);
  const [nextDate, setNextDate] = useState<string>(todayStr);

  // Quick Add Account Modal State
  const [showQuickAccount, setShowQuickAccount] = useState(false);
  const [quickAccName, setQuickAccName] = useState("");
  const [quickAccKind, setQuickAccKind] = useState<Account["kind"]>("bank");
  const [quickAccColor, setQuickAccColor] = useState(PRESET_COLORS[0]);
  const [quickAccMemo, setQuickAccMemo] = useState("");

  // Error State
  const [errorMsg, setErrorMsg] = useState("");

  // Populate form if editing
  useEffect(() => {
    if (itemForEdit) {
      setTitle(itemForEdit.title);
      setAmount(itemForEdit.amountType === "unknown" ? "" : itemForEdit.amount);
      setAmountType(itemForEdit.amountType);
      setCategory(itemForEdit.category);
      setSourceAccountId(itemForEdit.sourceAccountId);
      setIsActive(itemForEdit.isActive);
      setMemo(itemForEdit.memo || "");
      setNextDate(itemForEdit.nextDate);

      const cycle = itemForEdit.cycle;
      if (cycle.type === "monthly") {
        setCycleType("monthly");
        setCycleDay(cycle.day);
      } else if (cycle.type === "yearly") {
        setCycleType("yearly");
        setCycleMonth(cycle.month);
        setCycleDay(cycle.day);
      } else if (cycle.type === "everyNDays") {
        setCycleType("everyNDays");
        setCycleDays(cycle.days);
        setCycleBaseDate(cycle.baseDate);
      } else if (cycle.type === "oneTime") {
        setCycleType("oneTime");
        setCycleDate(cycle.date);
      }
    } else {
      // Defaults for new item
      setTitle("");
      setAmount("");
      setAmountType("fixed");
      setCategory("subscription");
      setIsActive(true);
      setMemo("");
      
      const today = new Date();
      setCycleType("monthly");
      setCycleDay(today.getDate());
      setCycleMonth(today.getMonth() + 1);
      setCycleDays(30);
      setCycleBaseDate(todayStr);
      setCycleDate(todayStr);
      
      // Auto select first account if available
      if (accounts.length > 0) {
        setSourceAccountId(accounts[0].id);
      } else {
        setSourceAccountId("");
      }
    }
  }, [itemForEdit, accounts]);

  // Recalculate nextDate when cycle fields change
  useEffect(() => {
    // Skip if editing and nextDate is already populated from the existing record, 
    // unless they changed the cycle type/parameters.
    // To keep it simple, let's auto-calculate a recommendation when cycle parameters change.
    const tempItem: any = {
      cycle: getCycleObject(),
      nextDate: todayStr // temp
    };

    const calculated = getNextOccurrenceDate(tempItem as PaymentItem, todayStr);
    if (calculated) {
      setNextDate(calculated);
    }
  }, [cycleType, cycleDay, cycleMonth, cycleDays, cycleBaseDate, cycleDate]);

  // Helper to compile state into a PaymentCycle object
  const getCycleObject = (): PaymentCycle => {
    switch (cycleType) {
      case "monthly":
        return { type: "monthly", day: Number(cycleDay) };
      case "yearly":
        return { type: "yearly", month: Number(cycleMonth), day: Number(cycleDay) };
      case "everyNDays":
        return { type: "everyNDays", days: Number(cycleDays), baseDate: cycleBaseDate };
      case "oneTime":
        return { type: "oneTime", date: cycleDate };
      default:
        return { type: "monthly", day: 15 };
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validations
    if (!title.trim()) {
      setErrorMsg("予定の名前を入力してください。");
      return;
    }
    
    if (amountType !== "unknown") {
      if (amount === "" || isNaN(Number(amount)) || Number(amount) < 0) {
        setErrorMsg("金額には0以上の数値を入力してください。");
        return;
      }
    }

    if (!sourceAccountId) {
      setErrorMsg("支払い元の口座を選択してください。");
      return;
    }

    if (cycleType === "monthly" && (cycleDay < 1 || cycleDay > 31)) {
      setErrorMsg("日付は1日〜31日の間で入力してください。");
      return;
    }

    if (cycleType === "yearly") {
      if (cycleMonth < 1 || cycleMonth > 12) {
        setErrorMsg("月は1月〜12月の間で入力してください。");
        return;
      }
      if (cycleDay < 1 || cycleDay > 31) {
        setErrorMsg("日は1日〜31日の間で入力してください。");
        return;
      }
    }

    if (cycleType === "everyNDays" && cycleDays <= 0) {
      setErrorMsg("間隔には1以上の数値を入力してください。");
      return;
    }

    const compiledCycle = getCycleObject();
    const finalAmount = amountType === "unknown" ? 0 : Number(amount);

    const paymentData = {
      title: title.trim(),
      category,
      amount: finalAmount,
      amountType,
      sourceAccountId,
      cycle: compiledCycle,
      nextDate,
      reminderDaysBefore: [2], // default reminder days
      memo: memo.trim() || undefined,
      isActive
    };

    if (itemForEdit) {
      updatePaymentItem(itemForEdit.id, paymentData);
      clearEdit();
      setActiveTab("home");
    } else {
      if (!isPremium && paymentItems.length >= 10) {
        setShowUpgradeModal(true);
      } else {
        addPaymentItem(paymentData);
        setActiveTab("home");
      }
    }
  };

  const handleCancel = () => {
    if (itemForEdit) {
      clearEdit();
    }
    setActiveTab("home");
  };

  const handleDelete = () => {
    if (itemForEdit) {
      if (window.confirm(`「${itemForEdit.title}」を削除しますか？`)) {
        deletePaymentItem(itemForEdit.id);
        clearEdit();
        setActiveTab("home");
      }
    }
  };

  const handleQuickAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAccName.trim()) return;

    const newAccId = "acc-" + Math.random().toString(36).substring(2, 11);
    
    // Add account to store
    addAccount({
      name: quickAccName.trim(),
      kind: quickAccKind,
      color: quickAccColor,
      memo: quickAccMemo.trim() || undefined
    });

    // We can't immediately get the auto-generated ID from addAccount since it's state-bound.
    // However, our addAccount writes a randomized ID, or we can just trigger selection.
    // To make it easy, we'll re-fetch the accounts and auto-select.
    // But since the React state won't flush immediately, we can listen for accounts length change in hook or simply
    // wait. Let's make sure the select updates by setting sourceAccountId in a useEffect or by predicting the id.
    // For predictability, let's let the user select it, or we will set sourceAccountId to the name.
    // Actually, in store.ts, `addAccount` uses `acc-` + generateId(). Let's assign an ID inside addAccount if we pass one,
    // or just let accounts update and we grab the last account.
    // Let's implement an effect that auto-selects the newly created account.
    setShowQuickAccount(false);
    
    // Reset quick form
    setQuickAccName("");
    setQuickAccKind("bank");
    setQuickAccColor(PRESET_COLORS[0]);
    setQuickAccMemo("");
  };

  // Auto-select the newly added account
  useEffect(() => {
    if (accounts.length > 0 && !sourceAccountId) {
      setSourceAccountId(accounts[accounts.length - 1].id);
    }
  }, [accounts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* Tab Title */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)" }}>
          {itemForEdit ? "📝 予定を編集する" : "➕ 新しい予定を登録する"}
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
          引き落とし日や周期を入力し、安心額の目安に反映します。
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "30px 20px" }}>
          <span style={{ fontSize: "3rem" }}>🏦</span>
          <h3 style={{ margin: "12px 0 6px", fontWeight: 700 }}>まずは「支払い元」を登録しましょう</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
            楽天カードやゆうちょ銀行など、お金が引き落とされる口座を1つ以上登録する必要があります。
          </p>
          <button className="btn btn-primary" onClick={() => setShowQuickAccount(true)}>
            口座をクイック追加する
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="card" style={{ display: "flex", flexDirection: "column" }}>
          
          {errorMsg && (
            <div style={{ 
              backgroundColor: "var(--color-danger-light)", 
              color: "var(--color-danger)", 
              padding: "10px 12px", 
              borderRadius: "8px", 
              fontSize: "0.85rem", 
              fontWeight: 700,
              marginBottom: "16px" 
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. Name */}
          <div className="form-group">
            <label htmlFor="title">支払い・引き落としの名前</label>
            <input
              id="title"
              type="text"
              className="form-control"
              placeholder="例: Netflix, 電気代, 保育料"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 2. Amount Type & Amount */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="amountType">金額のタイプ</label>
              <select
                id="amountType"
                className="form-control"
                value={amountType}
                onChange={e => {
                  const val = e.target.value as PaymentItem["amountType"];
                  setAmountType(val);
                  if (val === "unknown") setAmount("");
                }}
              >
                <option value="fixed">固定額 (毎月同じ)</option>
                <option value="estimate">目安額 (変動あり)</option>
                <option value="unknown">未確定 (請求書待ち)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount">金額 (円)</label>
              <input
                id="amount"
                type="number"
                className="form-control"
                placeholder={amountType === "unknown" ? "未確定" : "1500"}
                value={amount}
                onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={amountType === "unknown"}
                min="0"
              />
            </div>
          </div>

          {/* 3. Category & Source Account */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="category">カテゴリ</label>
              <select
                id="category"
                className="form-control"
                value={category}
                onChange={e => setCategory(e.target.value as PaymentItem["category"])}
              >
                {Object.entries(categoryNames).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sourceAccount" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>引き落とし元</span>
                <span 
                  onClick={() => setShowQuickAccount(true)} 
                  style={{ color: "var(--color-primary)", cursor: "pointer", fontWeight: 700, fontSize: "0.75rem" }}
                >
                  ＋追加
                </span>
              </label>
              <select
                id="sourceAccount"
                className="form-control"
                value={sourceAccountId}
                onChange={e => setSourceAccountId(e.target.value)}
                required
              >
                <option value="" disabled>口座を選択</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({accountKindNames[acc.kind]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Cycle Selection */}
          <div className="form-group" style={{ borderTop: "1px dashed #f0f0eb", paddingTop: "12px" }}>
            <label htmlFor="cycleType">繰り返しの周期</label>
            <select
              id="cycleType"
              className="form-control"
              value={cycleType}
              onChange={e => setCycleType(e.target.value as any)}
            >
              <option value="monthly">毎月</option>
              <option value="yearly">毎年</option>
              <option value="everyNDays">指定日数ごと (定期便等)</option>
              <option value="oneTime">一回だけ</option>
            </select>
          </div>

          {/* 4a. Conditional Cycle Details */}
          {cycleType === "monthly" && (
            <div className="form-group">
              <label htmlFor="cycleDay">引き落とし日 (日)</label>
              <input
                id="cycleDay"
                type="number"
                className="form-control"
                placeholder="15"
                min="1"
                max="31"
                value={cycleDay}
                onChange={e => setCycleDay(Number(e.target.value))}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                ※ 31日などを指定した場合、2月などの短い月は自動的に月末に調整されます。
              </span>
            </div>
          )}

          {cycleType === "yearly" && (
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="cycleMonth">月</label>
                <input
                  id="cycleMonth"
                  type="number"
                  className="form-control"
                  placeholder="12"
                  min="1"
                  max="12"
                  value={cycleMonth}
                  onChange={e => setCycleMonth(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="cycleDayYear">日</label>
                <input
                  id="cycleDayYear"
                  type="number"
                  className="form-control"
                  placeholder="25"
                  min="1"
                  max="31"
                  value={cycleDay}
                  onChange={e => setCycleDay(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {cycleType === "everyNDays" && (
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="cycleDays">お届けの間隔 (日)</label>
                <input
                  id="cycleDays"
                  type="number"
                  className="form-control"
                  placeholder="45"
                  min="1"
                  value={cycleDays}
                  onChange={e => setCycleDays(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="cycleBaseDate">計算の基準日</label>
                <input
                  id="cycleBaseDate"
                  type="date"
                  className="form-control"
                  value={cycleBaseDate}
                  onChange={e => setCycleBaseDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {cycleType === "oneTime" && (
            <div className="form-group">
              <label htmlFor="cycleDate">お支払日</label>
              <input
                id="cycleDate"
                type="date"
                className="form-control"
                value={cycleDate}
                onChange={e => setCycleDate(e.target.value)}
              />
            </div>
          )}

          {/* 5. Auto calculated Next payment date preview & overrides */}
          <div className="form-group" style={{ backgroundColor: "#fcfbf9", padding: "10px", borderRadius: "8px", border: "1px solid #f0f0eb" }}>
            <label htmlFor="nextDate">次回引き落とし予定日</label>
            <input
              id="nextDate"
              type="date"
              className="form-control"
              value={nextDate}
              onChange={e => setNextDate(e.target.value)}
              style={{ backgroundColor: "#ffffff" }}
            />
            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginTop: "4px" }}>
              ※ 周期に合わせて自動算出されています。異なる場合は調整してください。
            </span>
          </div>

          {/* 6. Memo */}
          <div className="form-group">
            <label htmlFor="memo">メモ・備考 (任意)</label>
            <textarea
              id="memo"
              className="form-control"
              placeholder="例: 年間パスポート更新、引き落とし時間に注意"
              rows={2}
              value={memo}
              onChange={e => setMemo(e.target.value)}
              style={{ resize: "none" }}
            />
          </div>

          {/* 7. Active State Toggle (Only for editing) */}
          {itemForEdit && (
            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", margin: "8px 0" }}>
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              <label htmlFor="isActive" style={{ fontWeight: 700 }}>この予定を有効にする（チェックを外すと一時停止）</label>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "16px", borderTop: "1px solid #f0f0eb", paddingTop: "16px" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {itemForEdit ? "変更を保存" : "登録する"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              キャンセル
            </button>
            {itemForEdit && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                削除
              </button>
            )}
          </div>

        </form>
      )}

      {/* Quick Add Account Modal */}
      {showQuickAccount && (
        <div className="modal-overlay" onClick={() => setShowQuickAccount(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", color: "var(--color-primary)" }}>
              🏦 口座・カードのクイック登録
            </h3>
            
            <form onSubmit={handleQuickAccountSubmit}>
              <div className="form-group">
                <label htmlFor="qName">口座・カードの名前</label>
                <input
                  id="qName"
                  type="text"
                  className="form-control"
                  placeholder="例: 三井住友銀行, 楽天カード"
                  value={quickAccName}
                  onChange={e => setQuickAccName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="qKind">種類</label>
                <select
                  id="qKind"
                  className="form-control"
                  value={quickAccKind}
                  onChange={e => setQuickAccKind(e.target.value as Account["kind"])}
                >
                  <option value="bank">銀行口座</option>
                  <option value="card">クレジットカード</option>
                  <option value="emoney">電子マネー</option>
                  <option value="cash">現金</option>
                  <option value="other">その他</option>
                </select>
              </div>

              {/* Color Picker */}
              <div className="form-group">
                <label>テーマカラー</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                  {PRESET_COLORS.map(c => (
                    <span
                      key={c}
                      onClick={() => setQuickAccColor(c)}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: c,
                        border: quickAccColor === c ? "3px solid #2d3748" : "1px solid #cbd5e0",
                        cursor: "pointer",
                        boxSizing: "border-box"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="qMemo">メモ (任意)</label>
                <input
                  id="qMemo"
                  type="text"
                  className="form-control"
                  placeholder="例: 給与受取口座"
                  value={quickAccMemo}
                  onChange={e => setQuickAccMemo(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  登録する
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuickAccount(false)}>
                  閉じる
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Premium Plan Upgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
            <span style={{ fontSize: "3rem" }}>👑</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "12px 0 6px", color: "var(--color-primary)" }}>
              予定登録数の上限に達しました
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.6" }}>
              無料プランでの予定登録数は <strong>10件</strong> までとなっています。<br />
              月額360円のプレミアムプランへ加入すると、登録数が<strong>無制限</strong>になり、すべての<strong>広告が非表示</strong>になります。
            </p>

            <ul style={{ 
              textAlign: "left", 
              fontSize: "0.8rem", 
              backgroundColor: "var(--color-primary-light)", 
              padding: "12px 20px", 
              borderRadius: "10px", 
              listStyleType: "none", 
              display: "flex", 
              flexDirection: "column", 
              gap: "6px",
              marginBottom: "20px",
              color: "var(--text-primary)" 
            }}>
              <li>✨ <strong>予定登録数:</strong> 無制限 (サブスク・定期便など何件でも)</li>
              <li>✨ <strong>広告非表示:</strong> スポンサー広告が完全に消えます</li>
              <li>✨ <strong>着せ替えテーマ:</strong> 4つの美しいカラーテーマが解放</li>
              <li>✨ <strong>家族同期・検索:</strong> バックアップと検索機能の拡張 (準備中)</li>
            </ul>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => {
                  setIsPremium(true);
                  setShowUpgradeModal(false);
                  window.dispatchEvent(new Event("trigger-confetti"));
                  alert("👑 プレミアム会員へアップグレードしました！30日間の無料お試し期間が適用されます。");
                  
                  // Continue saving the current item
                  const compiledCycle = getCycleObject();
                  const finalAmount = amountType === "unknown" ? 0 : Number(amount);
                  addPaymentItem({
                    title: title.trim(),
                    category,
                    amount: finalAmount,
                    amountType,
                    sourceAccountId,
                    cycle: compiledCycle,
                    nextDate,
                    reminderDaysBefore: [2],
                    memo: memo.trim() || undefined,
                    isActive
                  });
                  setActiveTab("home");
                }}
              >
                30日間無料でお試しする
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowUpgradeModal(false)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
