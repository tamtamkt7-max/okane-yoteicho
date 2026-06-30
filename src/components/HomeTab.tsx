import React from "react";
import { useApp } from "@/lib/store";
import { generateOccurrences, calculateAccountSummaries, formatLocalDate, addDays, parseLocalDate } from "@/lib/dateUtils";
import { PaymentItem, PaymentOccurrence } from "@/lib/types";

interface HomeTabProps {
  onEditItem: (item: PaymentItem) => void;
  setActiveTab: (tab: "home" | "calendar" | "add" | "accounts" | "settings") => void;
}

export const categoryEmojis: Record<string, string> = {
  subscription: "📺",
  communication: "📱",
  utilities: "💡",
  insurance: "🛡️",
  housing: "🏠",
  children: "👶",
  delivery: "📦",
  creditCard: "💳",
  other: "🏷️"
};

export const categoryNames: Record<string, string> = {
  subscription: "サブスク",
  communication: "通信費",
  utilities: "光熱費",
  insurance: "保険",
  housing: "住まい",
  children: "子ども",
  delivery: "定期便",
  creditCard: "クレジットカード",
  other: "その他"
};

export const accountKindNames: Record<string, string> = {
  bank: "銀行",
  card: "カード",
  emoney: "電子マネー",
  cash: "現金",
  other: "その他"
};

export default function HomeTab({ onEditItem, setActiveTab }: HomeTabProps) {
  const { accounts, paymentItems, overrides, setOccurrenceOverride, isPremium } = useApp();

  // Get current JST date boundaries
  const today = new Date();
  const todayStr = formatLocalDate(today);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  // Calculate range for this month
  const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();
  const endOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Generate occurrences for this month
  const monthOccurrences = generateOccurrences(paymentItems, overrides, startOfMonth, endOfMonth);
  
  // Calculate account summaries for this month
  const summaries = calculateAccountSummaries(accounts, monthOccurrences);
  
  // Calculate total needed (safe amount) for this month (excluding skipped & unknown)
  const totalSafeAmount = summaries.reduce((sum, s) => sum + s.totalNeeded, 0);

  // 1. Next upcoming payment (today or in future, not paid/skipped)
  // Let's search up to 45 days in the future to find the next active payment
  const next45DaysEnd = formatLocalDate(new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000));
  const upcomingOccurrences = generateOccurrences(paymentItems, overrides, todayStr, next45DaysEnd)
    .filter(occ => occ.status !== "paid" && occ.status !== "skipped");
  
  const nextPayment = upcomingOccurrences.length > 0 ? upcomingOccurrences[0] : null;

  // 2. Payments within 7 days
  const next7DaysEnd = formatLocalDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  const payments7Days = generateOccurrences(paymentItems, overrides, todayStr, next7DaysEnd)
    .filter(occ => occ.status !== "skipped"); // include paid ones as faded

  // 3. Unconfirmed amounts this month (amountType = "unknown")
  const unconfirmedOccurrences = monthOccurrences.filter(
    occ => occ.amountType === "unknown" && occ.status !== "skipped"
  );

  // 4. Delivery/Shipments items (everyNDays cycle)
  const deliveryItems = paymentItems.filter(
    item => item.cycle.type === "everyNDays" && item.isActive
  );

  // 5. Peace of Mind score calculations
  const totalCount = monthOccurrences.length;
  const confirmedCount = monthOccurrences.filter(
    occ => occ.amountType !== "unknown" && occ.status !== "skipped"
  ).length;
  const paidCount = monthOccurrences.filter(
    occ => occ.status === "paid"
  ).length;
  const peaceScore = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 100;

  // Mascot dynamic messages
  let mascotMessage = "こんにちは！お金の引き落とし日を確認して安心の毎日を過ごそうね♪";
  if (unconfirmedOccurrences.length > 0) {
    mascotMessage = `「${unconfirmedOccurrences[0].title}」の金額が未確定のままだよ。目安金額だけでも入れておくと安心度（%）がアップするよ！`;
  } else if (nextPayment) {
    const acc = accounts.find(a => a.id === nextPayment.sourceAccountId);
    const accName = acc ? acc.name : "引き落とし口座";
    mascotMessage = `次の予定は ${nextPayment.date.split("-")[1]}月${nextPayment.date.split("-")[2]}日 の「${nextPayment.title}」だよ！${accName}にお金が入っているか確認してね♪`;
  } else if (totalCount > 0 && paidCount === totalCount) {
    mascotMessage = "わぁ！今月の支払予定はすべて完了しているよ！やりきったね、完璧！✨";
  } else {
    mascotMessage = "今月の予定額はすべて確認できているよ。お財布や家計の準備を整えて、安心して過ごしてね！";
  }

  // Formatter for currency
  const formatCurrency = (val: number) => {
    return val.toLocaleString("ja-JP") + "円";
  };

  const handleToggleStatus = (occ: PaymentOccurrence, currentStatus: string) => {
    const nextStatus = currentStatus === "paid" ? "scheduled" : "paid";
    setOccurrenceOverride(occ.paymentItemId, occ.date, { status: nextStatus });
    if (nextStatus === "paid") {
      window.dispatchEvent(new Event("trigger-confetti"));
    }
  };

  const getAccountColorAndName = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? { name: acc.name, color: acc.color } : { name: "不明な口座", color: "#718096" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* Target Persona Introduction Header Card */}
      <div className="card" style={{ background: "linear-gradient(135deg, var(--color-primary-light), #f0f6f4)", border: "none" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: 700, marginBottom: "4px" }}>
          給料日のあと、どの口座にいくら残すか迷わない。
        </p>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
          今月これから引き落とされるお金の予定帳です。
        </h2>
      </div>

      {/* Mascot Bubble */}
      <div className="mascot-container">
        <div className="mascot-avatar">
          <svg width="28" height="28" viewBox="0 0 32 32">
            <rect x="6" y="10" width="20" height="16" rx="6" fill="var(--color-primary)" />
            <path d="M10 10V8a6 6 0 0 1 12 0v2" fill="none" stroke="var(--color-accent)" strokeWidth="3" />
            <circle cx="12" cy="16" r="2" fill="#fff" />
            <circle cx="20" cy="16" r="2" fill="#fff" />
            <path d="M14 20s1 1.5 2 1.5 2-1.5 2-1.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="mascot-bubble">
          <div style={{ fontWeight: 800, color: "var(--color-primary)", fontSize: "0.75rem", marginBottom: "2px" }}>おかねちゃん</div>
          {mascotMessage}
        </div>
      </div>

      {/* Household Safety meter */}
      <div className="card safety-meter-card">
        <div className="flex-between">
          <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
            📊 今月のやりくり安心度
          </h3>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--color-primary)" }}>
            {peaceScore}%
          </span>
        </div>
        <div className="safety-meter-bar">
          <div className="safety-meter-fill" style={{ width: `${peaceScore}%` }} />
        </div>
        <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          {peaceScore === 100 
            ? "完璧です！すべての支払予定の金額が確認・確定しています。" 
            : `金額が未入力・未確定の予定が残っています。目安金額を入れると安心度が高まります。`}
        </p>
      </div>

      {/* A. 今月の安心額カード */}
      <div className="card" style={{ borderLeft: "5px solid var(--color-primary)" }}>
        <div className="flex-between" style={{ marginBottom: "6px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            {currentMonth}月の安心入金額
          </span>
          <span className="badge badge-info">{currentMonth}月分</span>
        </div>
        <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--color-primary)", marginBottom: "14px" }}>
          {formatCurrency(totalSafeAmount)}
        </div>
        
        {accounts.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", padding: "10px 0" }}>
            口座が登録されていません。「口座」タブから登録してください。
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {summaries.map(s => (
              <div key={s.accountId} className="flex-between" style={{ fontSize: "0.9rem", paddingBottom: "6px", borderBottom: "1px dashed #f0f0eb" }}>
                <div className="flex-align-center gap-8">
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: s.color }} />
                  <span className="font-bold">{s.accountName}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="font-black" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(s.totalNeeded)}
                  </span>
                  {s.unconfirmedCount > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--color-danger)" }} className="font-bold">
                      未確定が {s.unconfirmedCount} 件あります
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "12px", lineHeight: "1.3" }}>
          ※ 登録された支払い予定をもとに算出した金額です。実際の銀行残高とは連携していません。
        </p>
      </div>

      {/* B. 未確認の金額アラート */}
      {unconfirmedOccurrences.length > 0 && (
        <div className="card" style={{ backgroundColor: "var(--color-danger-light)", borderColor: "rgba(226, 112, 112, 0.2)" }}>
          <h3 className="card-title text-danger" style={{ marginBottom: "8px" }}>
            ⚠️ 金額が未入力の予定があります
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {unconfirmedOccurrences.map(occ => {
              const accInfo = getAccountColorAndName(occ.sourceAccountId);
              return (
                <div key={occ.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{occ.title}</span> ({occ.date.split("-")[1]}/{occ.date.split("-")[2]}引落)
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      引き落とし元: {accInfo.name}
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm font-bold" 
                    onClick={() => {
                      const item = paymentItems.find(p => p.id === occ.paymentItemId);
                      if (item) onEditItem(item);
                    }}
                  >
                    金額を入力する
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* C. 次に落ちる予定カード */}
      {nextPayment && (
        <div className="card" style={{ borderLeft: "5px solid var(--color-accent)" }}>
          <div className="card-title text-accent">
            🚀 次に落ちるお金の予定
          </div>
          <div className="flex-between">
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                {nextPayment.title}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                予定日: <span className="font-bold">{nextPayment.date.replace(/-/g, "/")}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }} className="flex-align-center gap-8">
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: getAccountColorAndName(nextPayment.sourceAccountId).color }} />
                <span>{getAccountColorAndName(nextPayment.sourceAccountId).name}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-primary)" }}>
                {nextPayment.amountType === "unknown" ? "未確定" : formatCurrency(nextPayment.amount)}
              </div>
              <span className={`badge ${nextPayment.amountType === "fixed" ? "badge-info" : nextPayment.amountType === "estimate" ? "badge-accent" : "badge-danger"}`} style={{ marginTop: "4px" }}>
                {nextPayment.amountType === "fixed" ? "固定" : nextPayment.amountType === "estimate" ? "目安" : "未確定"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid #f0f0eb", paddingTop: "12px" }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleToggleStatus(nextPayment, nextPayment.status)}
            >
              支払い完了にする
            </button>
          </div>
        </div>
      )}

      {/* D. 7日以内の予定リスト */}
      <div className="card">
        <h3 className="card-title">
          📅 7日以内の予定
        </h3>
        {payments7Days.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center", padding: "16px 0" }}>
            近い日数の予定はありません。
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {payments7Days.map(occ => {
              const acc = getAccountColorAndName(occ.sourceAccountId);
              const isPaid = occ.status === "paid";
              return (
                <div 
                  key={occ.id} 
                  className="flex-between"
                  style={{ 
                    opacity: isPaid ? 0.5 : 1,
                    textDecoration: isPaid ? "line-through" : "none",
                    paddingBottom: "8px",
                    borderBottom: "1px solid #f7f6f0"
                  }}
                >
                  <div className="flex-align-center gap-12">
                    <span className={`cat-icon cat-${occ.category}`} style={{ fontSize: "1rem" }}>
                      {categoryEmojis[occ.category]}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{occ.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {occ.date.substring(5).replace("-", "/")}引落 • {acc.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                      {occ.amountType === "unknown" ? "未確定" : formatCurrency(occ.amount)}
                    </div>
                    <button
                      className={`btn btn-sm ${isPaid ? "btn-secondary" : "btn-outline"}`}
                      style={{ padding: "3px 8px", fontSize: "0.65rem", borderRadius: "4px" }}
                      onClick={() => handleToggleStatus(occ, occ.status)}
                    >
                      {isPaid ? "済" : "払う"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* E. 定期便カード（N日ごと） */}
      {deliveryItems.length > 0 && (
        <div className="card">
          <h3 className="card-title">
            📦 お届け定期便の間隔
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
            {deliveryItems.map(item => {
              // Calculate next delivery date from today
              const nextDateStr = item.nextDate; // stored base date or manually updated nextDate
              const isOverdue = nextDateStr < todayStr;
              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "#fafaf7", borderRadius: "10px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {categoryEmojis.delivery} {item.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      間隔: <span className="font-bold text-accent">{item.cycle.type === "everyNDays" ? item.cycle.days : ""}日ごと</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: isOverdue ? "var(--color-danger)" : "var(--text-secondary)" }}>
                      次回: <span className="font-bold">{nextDateStr.replace(/-/g, "/")}</span>
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* F. クイック追加ボタン */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
        <button className="btn btn-outline" onClick={() => setActiveTab("add")}>
          ➕ 予定を登録する
        </button>
        <button className="btn btn-secondary" onClick={() => setActiveTab("accounts")}>
          🏦 口座を登録する
        </button>
      </div>

      {/* G. スポンサー広告 (無料ユーザーのみ表示) */}
      {!isPremium && (
        <div className="ad-banner">
          <div className="flex-align-center" style={{ marginBottom: "4px" }}>
            <span className="ad-badge">PR</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
              暮らしのスポンサー
            </span>
          </div>
          <a 
            href="#" 
            onClick={(e) => { 
              e.preventDefault(); 
              setActiveTab("settings"); 
              alert("広告を非表示にできるプレミアムプラン（月額360円）のご案内へ進みます。"); 
            }} 
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-primary)", marginBottom: "2px" }}>
              🍼 【おむつ定期便】今なら初月半額キャンペーン実施中！
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              重いおむつも玄関先まで自動配送。買い忘れを防いで、忙しいママ・パパを応援するおむつの定期便。
            </p>
          </a>
        </div>
      )}

    </div>
  );
}
