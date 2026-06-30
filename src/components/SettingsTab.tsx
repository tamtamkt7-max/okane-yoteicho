import React, { useRef, useState } from "react";
import { useApp } from "@/lib/store";

interface SettingsTabProps {
  setActiveTab: (tab: "home" | "calendar" | "add" | "accounts" | "settings") => void;
}

export default function SettingsTab({ setActiveTab }: SettingsTabProps) {
  const { loadSampleData, clearAllData, importData, exportData, isPremium, setIsPremium, theme, setTheme } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Handle data export
  const handleExport = () => {
    try {
      const dataStr = exportData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      link.download = `okane_yoteicho_backup_${dateStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("エクスポート中にエラーが発生しました。");
    }
  };

  // Handle data import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") return;

      if (window.confirm("バックアップデータを読み込みますか？\n（現在のデータは全て上書きされます）")) {
        const res = importData(result);
        if (res.success) {
          setImportStatus({ success: true, message: "データのインポートが完了しました。" });
          alert("データの復元に成功しました！");
          setActiveTab("home");
        } else {
          setImportStatus({ success: false, message: `インポート失敗: ${res.error || "正しいファイルではありません"}` });
        }
      }
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  // Handle loading sample data
  const handleLoadSample = () => {
    if (window.confirm("サンプルデータを再読み込みしますか？\n（既存のデータは全て上書きされます）")) {
      loadSampleData();
      alert("サンプルデータを読み込みました。");
      setActiveTab("home");
    }
  };

  // Handle clearing all data
  const handleClearAll = () => {
    const confirmText1 = "すべてのデータを削除しますか？\n（口座や支払いの予定、履歴がすべて消去されます。この操作は戻せません）";
    const confirmText2 = "本当に削除してよろしいですか？\n確認のため、もう一度お伺いします。";

    if (window.confirm(confirmText1) && window.confirm(confirmText2)) {
      clearAllData();
      alert("すべてのデータを削除しました。");
      setActiveTab("home");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* Tab Title */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)" }}>
          ⚙️ アプリの設定・データ管理
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
          データのバックアップやアプリの仕組みを確認できます。
        </p>
      </div>

      {/* Concept Card */}
      <div className="card" style={{ borderLeft: "5px solid var(--color-primary)" }}>
        <h3 className="card-title">💡 アプリの考え方</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.6" }}>
          「おかねの予定帳」は、家計簿や資産管理アプリではありません。
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6", marginTop: "6px" }}>
          使ったお金を細かく記録するのではなく、これから引き落とされる予定を見える化し、
          「給料日のあと、どの口座にいくら残しておけば安心か」をシンプルに把握するためのツールです。
        </p>
      </div>

      {/* Monetization / Membership Plan Card */}
      <div className="card" style={{ 
        border: isPremium ? "2.5px solid var(--color-primary)" : "1.5px solid rgba(92, 141, 137, 0.15)",
        background: isPremium ? "linear-gradient(135deg, var(--color-primary-light), #ffffff)" : "#ffffff",
        position: "relative"
      }}>
        {isPremium && <span style={{ position: "absolute", top: "10px", right: "12px", fontSize: "1.5rem" }}>👑</span>}
        <h3 className="card-title">
          {isPremium ? "👑 プレミアムプラン加入中" : "💳 会員プラン"}
        </h3>
        
        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.5" }}>
          現在の状態: <strong>{isPremium ? "プレミアム会員 (月額360円)" : "無料会員 (広告あり/予定10件まで)"}</strong>
        </p>

        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px", lineHeight: "1.4" }}>
          {isPremium 
            ? "予定件数無制限、広告非表示、きせかえテーマ機能がすべて有効化されています。" 
            : "プレミアムプランに登録すると、件数制限が解除され、すべての広告が非表示になり、きせかえテーマが利用可能になります。"}
        </p>

        <div style={{ marginTop: "14px" }}>
          {isPremium ? (
            <button 
              className="btn btn-secondary btn-block btn-sm"
              onClick={() => {
                if (window.confirm("本当にプレミアムプランを解約しますか？\n（無料プランに戻ると、登録数が10件を超えている場合は既存予定のみ閲覧可能となり、広告が表示されます）")) {
                  setIsPremium(false);
                  setTheme("ivory");
                  alert("無料会員へプランを変更しました。ご利用ありがとうございました。");
                }
              }}
            >
              プレミアムプランを解約する
            </button>
          ) : (
            <button 
              className="btn btn-primary btn-block"
              style={{ background: "linear-gradient(135deg, var(--color-accent), #d17a4c)" }}
              onClick={() => {
                setIsPremium(true);
                window.dispatchEvent(new Event("trigger-confetti"));
                alert("👑 プレミアム会員へ登録が完了しました！\n（デモ版のため実際の課金は発生しません。すべての機能をお楽しみください）");
              }}
            >
              👑 プレミアムプランに加入 (月額360円・初月無料)
            </button>
          )}
        </div>
      </div>

      {/* Theme Switcher Card */}
      <div className="card">
        <h3 className="card-title">🎨 きせかえテーマ</h3>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
          アプリ全体のカラーを着せ替えます。
          {!isPremium && <span style={{ color: "var(--color-accent)", fontWeight: 700 }}> (👑プレミアム限定)</span>}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { id: "ivory", label: "🌾 生成りアイボリー", desc: "おうちになじむ標準カラー" },
            { id: "sakura", label: "🌸 さくらピンク", desc: "かわいらしいキッチンカラー" },
            { id: "mint", label: "🌿 ミントフォレスト", desc: "すっきり爽快ハーブカラー" },
            { id: "midnight", label: "🌌 ミッドナイトダーク", desc: "目にやさしい夜間モード" }
          ].map(t => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className="btn"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: isSelected 
                    ? "2.5px solid var(--color-primary)" 
                    : "1.5px solid rgba(92, 141, 137, 0.15)",
                  backgroundColor: isSelected ? "var(--color-primary-light)" : "var(--card-bg)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "2px",
                  boxShadow: "none"
                }}
                onClick={() => {
                  if (isPremium) {
                    setTheme(t.id);
                  } else {
                    if (window.confirm(`「${t.label}」テーマはプレミアム会員限定の機能です。\n\nプレミアム会員にアップグレード（30日無料お試し）して変更しますか？`)) {
                      setIsPremium(true);
                      setTheme(t.id);
                      window.dispatchEvent(new Event("trigger-confetti"));
                      alert("👑 プレミアム会員へアップグレードし、テーマを適用しました！");
                    }
                  }
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>{t.label}</span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security Card */}
      <div className="card">
        <h3 className="card-title">🔒 データ保存と連携について</h3>
        <ul style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <li>
            <strong style={{ color: "var(--text-primary)" }}>端末内での保存:</strong><br />
            入力した口座や支払予定などの内容は、このスマートフォンのブラウザ内 (localStorage) にのみ安全に保存されます。外部のサーバーへ送信されることはありません。
          </li>
          <li>
            <strong style={{ color: "var(--text-primary)" }}>銀行・カード連携なし:</strong><br />
            銀行やクレジットカード会社との通信、自動明細取得、OCR等のAIアドバイスなどは実装していません。情報漏洩の心配がなく、手動で安心してご利用いただけます。
          </li>
        </ul>
      </div>

      {/* Data Backup & Operations Card */}
      <div className="card">
        <h3 className="card-title">📦 データ管理</h3>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
          機種変更時やデータのバックアップを行いたい場合、JSONファイルを書き出したり読み込んだりできます。
        </p>

        {importStatus && (
          <div style={{ 
            backgroundColor: importStatus.success ? "var(--color-success-light)" : "var(--color-danger-light)",
            color: importStatus.success ? "var(--color-success)" : "var(--color-danger)",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "0.8rem",
            marginBottom: "12px",
            fontWeight: 700
          }}>
            {importStatus.message}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button className="btn btn-outline" onClick={handleExport}>
            💾 データをバックアップ (エクスポート)
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            style={{ display: "none" }} 
          />
          <button className="btn btn-outline" onClick={handleImportClick}>
            📤 バックアップから復元 (インポート)
          </button>

          <button className="btn btn-secondary" onClick={handleLoadSample} style={{ marginTop: "10px" }}>
            🔄 サンプルデータを再読み込み
          </button>
          
          <button className="btn btn-danger" onClick={handleClearAll} style={{ marginTop: "6px" }}>
            🗑️ すべてのデータをクリアする
          </button>
        </div>
      </div>

      {/* PWA Guide Card */}
      <div className="card">
        <h3 className="card-title">📱 スマホのホーム画面に追加する (PWA)</h3>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: "1.5" }}>
          このアプリはPWAに対応しており、スマホのホーム画面にアイコンを追加すると、まるで本物のアプリのように全画面で起動でき、動作もスムーズになります。
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.8rem", borderTop: "1px dashed #f0f0eb", paddingTop: "12px" }}>
          <div>
            <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>🍎 iPhone (Safari) の場合</strong>
            <ol style={{ paddingLeft: "18px", color: "var(--text-secondary)" }}>
              <li>Safariで本アプリを表示します。</li>
              <li>画面下の「共有」ボタン（四角に上矢印のアイコン）をタップします。</li>
              <li>メニューをスクロールし、「ホーム画面に追加」をタップします。</li>
            </ol>
          </div>
          <div>
            <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>🤖 Android (Chrome) の場合</strong>
            <ol style={{ paddingLeft: "18px", color: "var(--text-secondary)" }}>
              <li>Chromeで本アプリを表示します。</li>
              <li>画面右上または右下の「設定」（3つの点）をタップします。</li>
              <li>メニューから「アプリのインストール」または「ホーム画面に追加」をタップします。</li>
            </ol>
          </div>
        </div>
      </div>

    </div>
  );
}
