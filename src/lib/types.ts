export type Account = {
  id: string
  name: string
  kind: "bank" | "card" | "emoney" | "cash" | "other"
  color: string // Hex code or named color representing the account
  memo?: string
  createdAt: string
  updatedAt: string
}

export type PaymentCycle =
  | { type: "monthly"; day: number }
  | { type: "yearly"; month: number; day: number }
  | { type: "everyNDays"; days: number; baseDate: string } // e.g. 45 days
  | { type: "oneTime"; date: string }
  | { type: "custom"; dates: string[] }

export type PaymentItem = {
  id: string
  title: string
  category:
    | "subscription"    // サブスク
    | "communication"   // 通信費
    | "utilities"       // 光熱費
    | "insurance"       // 保険
    | "housing"         // 住まい
    | "children"        // 子ども
    | "delivery"        // 定期便
    | "creditCard"      // クレジットカード
    | "other"           // その他
  amount: number
  amountType: "fixed" | "estimate" | "unknown" // 固定 | 目安 | 未確定
  sourceAccountId: string
  cycle: PaymentCycle
  nextDate: string // YYYY-MM-DD
  reminderDaysBefore: number[]
  memo?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PaymentOccurrence = {
  id: string // Format: `${paymentItemId}-${date}`
  paymentItemId: string
  title: string
  category: PaymentItem["category"]
  date: string // YYYY-MM-DD
  amount: number
  amountType: PaymentItem["amountType"]
  sourceAccountId: string
  status: "scheduled" | "confirmed" | "paid" | "skipped"
  memo?: string
}

export type OccurrenceOverride = {
  id: string // Format: `${paymentItemId}-${occurrenceDate}`
  paymentItemId: string
  occurrenceDate: string // YYYY-MM-DD
  amount?: number
  amountType?: "fixed" | "estimate" | "unknown"
  status?: "scheduled" | "confirmed" | "paid" | "skipped"
  memo?: string
  updatedAt: string
}

export type AppData = {
  accounts: Account[]
  paymentItems: PaymentItem[]
  occurrenceOverrides: OccurrenceOverride[]
  // Additional configurations like PWA notification preferences
  settings: {
    theme?: string
  }
}
