// Merge ccusage snapshots into a monotonic per-day ledger.

const TOKEN_FIELDS = [
  "inputTokens",
  "outputTokens",
  "cacheCreationTokens",
  "cacheReadTokens",
  "totalTokens",
];

const MONEY_FIELDS = ["totalCost"];

function sumField(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function tokenCount(row) {
  return Number(row?.totalTokens) || 0;
}

function withCapturedAt(row, capturedAt) {
  if (!row || !capturedAt || row.costCapturedAt) return row;
  return { ...row, costCapturedAt: capturedAt };
}

/**
 * Pick the ledger record for a date.
 * - More tokens means a more complete day, so use the new record.
 * - Same/fewer tokens means keep the existing record and locked cost.
 */
export function chooseDailyRecord(existing, incoming, capturedAt = null) {
  if (!existing) return withCapturedAt(incoming, capturedAt);
  if (!incoming) return existing;

  if (tokenCount(incoming) > tokenCount(existing)) {
    return withCapturedAt(incoming, capturedAt);
  }
  return existing;
}

export function computeTotals(daily = []) {
  const totals = {};
  for (const field of TOKEN_FIELDS) totals[field] = sumField(daily, field);
  for (const field of MONEY_FIELDS) totals[field] = sumField(daily, field);
  return totals;
}

export function normalizeUsage(data = {}) {
  const daily = Array.isArray(data.daily) ? [...data.daily] : [];
  daily.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { daily, totals: computeTotals(daily) };
}

export function mergeUsage(existing = {}, incoming = {}, capturedAt = null) {
  const byDate = new Map();
  for (const row of existing.daily || []) {
    if (row?.date) byDate.set(row.date, row);
  }

  for (const row of incoming.daily || []) {
    if (!row?.date) continue;
    byDate.set(row.date, chooseDailyRecord(byDate.get(row.date), row, capturedAt));
  }

  return normalizeUsage({ daily: [...byDate.values()] });
}
