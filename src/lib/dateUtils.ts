import { PaymentItem, PaymentOccurrence, OccurrenceOverride, Account } from "./types";

// Parse YYYY-MM-DD to a local Date object at midnight JST
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

// Format a Date object to YYYY-MM-DD
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Add days to a YYYY-MM-DD date string
export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

// Get the start and end dates of a month as strings
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// Generate calendar cells (6 weeks grid = 42 cells) for a given year and month
export function getCalendarGrid(year: number, month: number): { dateStr: string; day: number; isCurrentMonth: boolean }[] {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0: Sun, 1: Mon, etc.
  
  const grid: { dateStr: string; day: number; isCurrentMonth: boolean }[] = [];
  
  // Backfill from previous month
  const prevMonthLast = new Date(year, month - 1, 0);
  const prevMonthLastDate = prevMonthLast.getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDate - i;
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    grid.push({
      dateStr: `${py}-${String(pm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      isCurrentMonth: false
    });
  }
  
  // Current month
  const lastDayDate = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDayDate; d++) {
    grid.push({
      dateStr: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      isCurrentMonth: true
    });
  }
  
  // Pad forward to complete 6 weeks (42 items)
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    grid.push({
      dateStr: `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      isCurrentMonth: false
    });
  }
  
  return grid;
}

// Generate occurrences of a single payment item in a date range [start, end]
export function generateOccurrencesForItem(
  item: PaymentItem,
  startStr: string,
  endStr: string
): string[] {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  const dates: string[] = [];

  const cycle = item.cycle;

  if (cycle.type === "oneTime") {
    const oDate = parseLocalDate(cycle.date);
    if (oDate >= start && oDate <= end) {
      dates.push(cycle.date);
    }
  } else if (cycle.type === "custom") {
    for (const dStr of cycle.dates) {
      const oDate = parseLocalDate(dStr);
      if (oDate >= start && oDate <= end) {
        dates.push(dStr);
      }
    }
  } else if (cycle.type === "monthly") {
    // Generate for months overlapping start and end
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endLimit) {
      const y = current.getFullYear();
      const m = current.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      const d = Math.min(cycle.day, lastDay);
      
      const occDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const occDate = parseLocalDate(occDateStr);
      if (occDate >= start && occDate <= end) {
        dates.push(occDateStr);
      }
      current.setMonth(current.getMonth() + 1);
    }
  } else if (cycle.type === "yearly") {
    // Generate for years overlapping start and end
    let currentYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let y = currentYear; y <= endYear; y++) {
      const m = cycle.month;
      const lastDay = new Date(y, m, 0).getDate();
      const d = Math.min(cycle.day, lastDay);

      const occDateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const occDate = parseLocalDate(occDateStr);
      if (occDate >= start && occDate <= end) {
        dates.push(occDateStr);
      }
    }
  } else if (cycle.type === "everyNDays") {
    const base = parseLocalDate(cycle.baseDate);
    const intervalMs = cycle.days * 24 * 60 * 60 * 1000;
    
    // Find approximate starting k
    const diffMs = start.getTime() - base.getTime();
    let k = Math.floor(diffMs / intervalMs);
    
    // Scan forward from k until we cross end
    let currentOcc = new Date(base.getTime() + k * intervalMs);
    
    // Back up if we missed some overlap
    while (currentOcc >= start) {
      k--;
      currentOcc = new Date(base.getTime() + k * intervalMs);
    }
    
    // Scan forward
    while (true) {
      currentOcc = new Date(base.getTime() + k * intervalMs);
      if (currentOcc > end) break;
      if (currentOcc >= start) {
        dates.push(formatLocalDate(currentOcc));
      }
      k++;
    }
  }

  return dates;
}

// Generate all occurrences including overrides in range [start, end]
export function generateOccurrences(
  paymentItems: PaymentItem[],
  overrides: OccurrenceOverride[],
  startStr: string,
  endStr: string
): PaymentOccurrence[] {
  const occurrences: PaymentOccurrence[] = [];
  
  for (const item of paymentItems) {
    // If stopped (inactive), we only generate occurrences that have manual overrides
    if (!item.isActive) {
      const itemOverrides = overrides.filter(o => o.paymentItemId === item.id);
      for (const override of itemOverrides) {
        const occDate = parseLocalDate(override.occurrenceDate);
        const start = parseLocalDate(startStr);
        const end = parseLocalDate(endStr);
        if (occDate >= start && occDate <= end) {
          occurrences.push({
            id: `${item.id}-${override.occurrenceDate}`,
            paymentItemId: item.id,
            title: item.title,
            category: item.category,
            date: override.occurrenceDate,
            amount: override.amount !== undefined ? override.amount : item.amount,
            amountType: override.amountType !== undefined ? override.amountType : item.amountType,
            sourceAccountId: item.sourceAccountId,
            status: override.status || "scheduled",
            memo: override.memo || item.memo
          });
        }
      }
      continue;
    }

    const occurrenceDates = generateOccurrencesForItem(item, startStr, endStr);
    
    for (const dateStr of occurrenceDates) {
      const override = overrides.find(
        o => o.paymentItemId === item.id && o.occurrenceDate === dateStr
      );
      
      occurrences.push({
        id: `${item.id}-${dateStr}`,
        paymentItemId: item.id,
        title: item.title,
        category: item.category,
        date: dateStr,
        amount: override?.amount !== undefined ? override.amount : item.amount,
        amountType: override?.amountType !== undefined ? override.amountType : item.amountType,
        sourceAccountId: item.sourceAccountId,
        status: override?.status || "scheduled",
        memo: override?.memo || item.memo
      });
    }
  }
  
  // Sort by date then title
  return occurrences.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title);
  });
}

// Calculate the summary of safe deposit amount needed for each account in a specific month
export type AccountSummary = {
  accountId: string
  accountName: string
  color: string
  kind: Account["kind"]
  totalNeeded: number
  scheduledCount: number
  confirmedCount: number
  paidCount: number
  skippedCount: number
  unconfirmedCount: number // Amount type is unknown or has 0 amount but unknown
}

export function calculateAccountSummaries(
  accounts: Account[],
  occurrences: PaymentOccurrence[]
): AccountSummary[] {
  return accounts.map(account => {
    const accountOccurrences = occurrences.filter(occ => occ.sourceAccountId === account.id);
    
    let totalNeeded = 0;
    let scheduledCount = 0;
    let confirmedCount = 0;
    let paidCount = 0;
    let skippedCount = 0;
    let unconfirmedCount = 0;
    
    for (const occ of accountOccurrences) {
      if (occ.status === "skipped") {
        skippedCount++;
        continue;
      }
      
      if (occ.status === "paid") {
        paidCount++;
      } else if (occ.status === "confirmed") {
        confirmedCount++;
      } else {
        scheduledCount++;
      }
      
      // Sum the amount if it's not skipped and has a value
      if (occ.amountType === "unknown") {
        unconfirmedCount++;
      } else {
        totalNeeded += occ.amount;
      }
    }
    
    return {
      accountId: account.id,
      accountName: account.name,
      color: account.color,
      kind: account.kind,
      totalNeeded,
      scheduledCount,
      confirmedCount,
      paidCount,
      skippedCount,
      unconfirmedCount
    };
  });
}

// Helper to determine the "next payment date" for a list of items starting from a reference date
export function getNextOccurrenceDate(item: PaymentItem, fromDateStr: string): string | null {
  // Let's generate occurrences for the next 365 days and pick the first one >= fromDateStr
  const start = parseLocalDate(fromDateStr);
  const end = new Date(start.getTime() + 366 * 24 * 60 * 60 * 1000);
  const occDates = generateOccurrencesForItem(item, fromDateStr, formatLocalDate(end));
  return occDates.length > 0 ? occDates[0] : null;
}
