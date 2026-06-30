"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Account, PaymentItem, OccurrenceOverride, PaymentCycle } from "./types";
import { formatLocalDate } from "./dateUtils";

interface AppContextType {
  accounts: Account[];
  paymentItems: PaymentItem[];
  overrides: OccurrenceOverride[];
  isLoading: boolean;
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
  theme: string;
  setTheme: (val: string) => void;
  
  // Account actions
  addAccount: (account: Omit<Account, "id" | "createdAt" | "updatedAt">) => void;
  updateAccount: (id: string, updates: Partial<Omit<Account, "id" | "createdAt" | "updatedAt">>) => void;
  deleteAccount: (id: string) => boolean; // returns false if in use, or reassigns
  
  // PaymentItem actions
  addPaymentItem: (item: Omit<PaymentItem, "id" | "createdAt" | "updatedAt">) => void;
  updatePaymentItem: (id: string, updates: Partial<Omit<PaymentItem, "id" | "createdAt" | "updatedAt">>) => void;
  deletePaymentItem: (id: string) => void;
  
  // Occurrence Override actions
  setOccurrenceOverride: (
    paymentItemId: string,
    occurrenceDate: string,
    override: {
      amount?: number;
      amountType?: "fixed" | "estimate" | "unknown";
      status?: "scheduled" | "confirmed" | "paid" | "skipped";
      memo?: string;
    }
  ) => void;
  
  // System actions
  loadSampleData: () => void;
  clearAllData: () => void;
  importData: (jsonStr: string) => { success: boolean; error?: string };
  exportData: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "okane_yoteicho_v1";

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 11);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [overrides, setOverrides] = useState<OccurrenceOverride[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [theme, setTheme] = useState("ivory");
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accounts && parsed.paymentItems && parsed.occurrenceOverrides) {
          setAccounts(parsed.accounts);
          setPaymentItems(parsed.paymentItems);
          setOverrides(parsed.occurrenceOverrides);
          if (parsed.settings) {
            setIsPremium(!!parsed.settings.isPremium);
            setTheme(parsed.settings.theme || "ivory");
          }
          setIsLoading(false);
          return;
        }
      }
      
      // Load sample data if empty
      loadSampleDataInternal();
    } catch (e) {
      console.error("Failed to load local storage data", e);
      // Fallback: clear and load sample
      loadSampleDataInternal();
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage when state changes (only after loading is complete)
  useEffect(() => {
    if (isLoading) return;
    try {
      const data = {
        accounts,
        paymentItems,
        occurrenceOverrides: overrides,
        settings: {
          isPremium,
          theme
        }
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data to local storage", e);
    }
  }, [accounts, paymentItems, overrides, isPremium, theme, isLoading]);

  const loadSampleDataInternal = () => {
    // Generate dates relative to "now" so the sample data fits the current view
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-indexed

    // Format helpers
    const makeDateStr = (dayNum: number, monthOffset = 0) => {
      const d = new Date(currentYear, currentMonth - 1 + monthOffset, dayNum);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    // 1. Sample Accounts
    const sampleAccounts: Account[] = [
      {
        id: "acc-rakuten-bank",
        name: "楽天銀行",
        kind: "bank",
        color: "#E53E3E", // Soft Red/Crimson
        memo: "生活費のメイン引き落とし口座",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "acc-yucho",
        name: "ゆうちょ銀行",
        kind: "bank",
        color: "#319795", // Teal
        memo: "子どもの手当受取・保育料引き落とし口座",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "acc-rakuten-card",
        name: "楽天カード",
        kind: "card",
        color: "#3182CE", // Muted Blue
        memo: "サブスク・通信費などの支払い用",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "acc-living-expenses",
        name: "生活費口座 (三井住友)",
        kind: "bank",
        color: "#DD6B20", // Orange
        memo: "家賃や光熱費など固定費引き落とし口座",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 2. Sample Payment Items
    const sampleItems: PaymentItem[] = [
      {
        id: "pay-netflix",
        title: "Netflix (プレミアム)",
        category: "subscription",
        amount: 1490,
        amountType: "fixed",
        sourceAccountId: "acc-rakuten-card",
        cycle: { type: "monthly", day: 15 },
        nextDate: makeDateStr(15),
        reminderDaysBefore: [2],
        memo: "毎月15日自動決済。アニメやドラマ視聴用",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "pay-rakuten-mobile",
        title: "楽天モバイル",
        category: "communication",
        amount: 3278,
        amountType: "fixed",
        sourceAccountId: "acc-rakuten-card",
        cycle: { type: "monthly", day: 27 },
        nextDate: makeDateStr(27),
        reminderDaysBefore: [3],
        memo: "毎月27日引き落とし。プランによって若干変動するが上限目安",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "pay-gas",
        title: "ガス代",
        category: "utilities",
        amount: 8000,
        amountType: "estimate",
        sourceAccountId: "acc-living-expenses",
        cycle: { type: "monthly", day: 25 },
        nextDate: makeDateStr(25),
        reminderDaysBefore: [2],
        memo: "毎月25日目安。冬場は高めになる傾向",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "pay-electricity",
        title: "電気代 (東京電力)",
        category: "utilities",
        amount: 0,
        amountType: "unknown",
        sourceAccountId: "acc-living-expenses",
        cycle: { type: "monthly", day: 28 },
        nextDate: makeDateStr(28),
        reminderDaysBefore: [2],
        memo: "毎月28日引き落とし。検針票が入ったら金額を上書きする",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "pay-diapers",
        title: "おむつ定期便 (Amazon)",
        category: "delivery",
        amount: 6600,
        amountType: "fixed",
        sourceAccountId: "acc-rakuten-card",
        cycle: { type: "everyNDays", days: 45, baseDate: makeDateStr(29, -1) }, // 45 days cycle
        nextDate: makeDateStr(14), // Approx 45 days from baseDate in past month
        reminderDaysBefore: [5],
        memo: "45日ごとにお届け。そろそろサイズアップ検討する",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "pay-nursery",
        title: "保育料",
        category: "children",
        amount: 12000,
        amountType: "fixed",
        sourceAccountId: "acc-yucho",
        cycle: { type: "monthly", day: 20 },
        nextDate: makeDateStr(20),
        reminderDaysBefore: [5],
        memo: "毎月20日ゆうちょ自動引落",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 3. Sample Overrides (e.g. this month's gas bill is verified, electricity bill is filled, one subscription was paid)
    const sampleOverrides: OccurrenceOverride[] = [
      {
        id: `pay-gas-${makeDateStr(25)}`,
        paymentItemId: "pay-gas",
        occurrenceDate: makeDateStr(25),
        amount: 7850,
        amountType: "fixed",
        status: "confirmed",
        memo: "今月分の検針結果を反映。少し安かった！",
        updatedAt: new Date().toISOString()
      },
      {
        id: `pay-electricity-${makeDateStr(28)}`,
        paymentItemId: "pay-electricity",
        occurrenceDate: makeDateStr(28),
        amount: 11450,
        amountType: "fixed",
        status: "confirmed",
        memo: "検針票の金額を登録",
        updatedAt: new Date().toISOString()
      },
      {
        id: `pay-netflix-${makeDateStr(15)}`,
        paymentItemId: "pay-netflix",
        occurrenceDate: makeDateStr(15),
        status: "paid",
        memo: "引き落とし確認済み",
        updatedAt: new Date().toISOString()
      }
    ];

    setAccounts(sampleAccounts);
    setPaymentItems(sampleItems);
    setOverrides(sampleOverrides);
  };

  const loadSampleData = () => {
    loadSampleDataInternal();
  };

  const clearAllData = () => {
    setAccounts([]);
    setPaymentItems([]);
    setOverrides([]);
    setIsPremium(false);
    setTheme("ivory");
  };

  const importData = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.accounts || !parsed.paymentItems || !parsed.occurrenceOverrides) {
        return { success: false, error: "必要なデータ項目(accounts, paymentItems, occurrenceOverrides)が見つかりません。" };
      }
      
      // Basic runtime structural checks
      if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.paymentItems) || !Array.isArray(parsed.occurrenceOverrides)) {
        return { success: false, error: "データの形式が正しくありません (配列ではありません)。" };
      }
      
      setAccounts(parsed.accounts);
      setPaymentItems(parsed.paymentItems);
      setOverrides(parsed.occurrenceOverrides);
      if (parsed.settings) {
        setIsPremium(!!parsed.settings.isPremium);
        setTheme(parsed.settings.theme || "ivory");
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "JSONの解析に失敗しました。" };
    }
  };

  const exportData = () => {
    const data = {
      accounts,
      paymentItems,
      occurrenceOverrides: overrides,
      settings: {
        isPremium,
        theme
      },
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  };

  // Account actions
  const addAccount = (acc: Omit<Account, "id" | "createdAt" | "updatedAt">) => {
    const newAcc: Account = {
      ...acc,
      id: "acc-" + generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setAccounts(prev => [...prev, newAcc]);
  };

  const updateAccount = (id: string, updates: Partial<Omit<Account, "id" | "createdAt" | "updatedAt">>) => {
    setAccounts(prev =>
      prev.map(acc =>
        acc.id === id
          ? { ...acc, ...updates, updatedAt: new Date().toISOString() }
          : acc
      )
    );
  };

  const deleteAccount = (id: string): boolean => {
    // Check if this account is in use by any payment items
    const inUse = paymentItems.some(item => item.sourceAccountId === id);
    if (inUse) {
      // Reassign to the first available account, or return false if no accounts left
      const remainingAccounts = accounts.filter(acc => acc.id !== id);
      if (remainingAccounts.length === 0) {
        return false; // Can't delete if it is the only account in use
      }
      // Reassign all matching items to the first remaining account
      const firstRemId = remainingAccounts[0].id;
      setPaymentItems(prev =>
        prev.map(item =>
          item.sourceAccountId === id ? { ...item, sourceAccountId: firstRemId } : item
        )
      );
    }
    setAccounts(prev => prev.filter(acc => acc.id !== id));
    return true;
  };

  // PaymentItem actions
  const addPaymentItem = (item: Omit<PaymentItem, "id" | "createdAt" | "updatedAt">) => {
    const newItem: PaymentItem = {
      ...item,
      id: "pay-" + generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setPaymentItems(prev => [...prev, newItem]);
  };

  const updatePaymentItem = (id: string, updates: Partial<Omit<PaymentItem, "id" | "createdAt" | "updatedAt">>) => {
    setPaymentItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const deletePaymentItem = (id: string) => {
    setPaymentItems(prev => prev.filter(item => item.id !== id));
    // Clean up associated overrides
    setOverrides(prev => prev.filter(o => o.paymentItemId !== id));
  };

  // Occurrence Override actions
  const setOccurrenceOverride = (
    paymentItemId: string,
    occurrenceDate: string,
    overrideUpdates: {
      amount?: number;
      amountType?: "fixed" | "estimate" | "unknown";
      status?: "scheduled" | "confirmed" | "paid" | "skipped";
      memo?: string;
    }
  ) => {
    const overrideId = `${paymentItemId}-${occurrenceDate}`;
    setOverrides(prev => {
      const existingIdx = prev.findIndex(o => o.id === overrideId);
      
      if (existingIdx > -1) {
        const existing = prev[existingIdx];
        
        // Merge updates
        const updated = {
          ...existing,
          ...overrideUpdates,
          updatedAt: new Date().toISOString()
        };
        
        const next = [...prev];
        next[existingIdx] = updated;
        return next;
      } else {
        // Create new override
        const newOverride: OccurrenceOverride = {
          id: overrideId,
          paymentItemId,
          occurrenceDate,
          ...overrideUpdates,
          updatedAt: new Date().toISOString()
        };
        return [...prev, newOverride];
      }
    });
  };

  return (
    <AppContext.Provider
      value={{
        accounts,
        paymentItems,
        overrides,
        isLoading,
        isPremium,
        setIsPremium,
        theme,
        setTheme,
        addAccount,
        updateAccount,
        deleteAccount,
        addPaymentItem,
        updatePaymentItem,
        deletePaymentItem,
        setOccurrenceOverride,
        loadSampleData,
        clearAllData,
        importData,
        exportData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
