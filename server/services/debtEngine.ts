/**
 * Debt Simplification Engine
 *
 * Converts raw balances into a minimum-transaction settlement plan.
 * Uses a greedy algorithm that pairs the largest creditor with the
 * largest debtor in each round, minimizing the total number of payments.
 */

export interface Balance {
  userId: string;
  amount: number; // positive = is owed (creditor), negative = owes (debtor)
}

export interface DebtEdge {
  from: string; // debtor
  to: string;   // creditor
  amount: number;
}

/**
 * Calculate net balances for each user in a group.
 *
 * For each expense:
 *   - The payer gets +amount (they paid for everyone)
 *   - Each participant gets -share (their portion of the cost)
 *
 * Net balance = total paid - total share owed
 */
export function calculateNetBalances(
  expenses: Array<{
    payerId: string;
    amount: number;
    participants: Array<{ userId: string; share: number }>;
  }>,
  settlements: Array<{
    fromUserId: string;
    toUserId: string;
    amount: number;
    status: string;
  }>
): Map<string, number> {
  const balances = new Map<string, number>();

  const addBalance = (userId: string, amount: number) => {
    balances.set(userId, (balances.get(userId) || 0) + amount);
  };

  // Process expenses
  for (const expense of expenses) {
    // Payer contributed the full amount
    addBalance(expense.payerId, expense.amount);

    // Each participant owes their share
    for (const participant of expense.participants) {
      addBalance(participant.userId, -participant.share);
    }
  }

  // Process confirmed settlements
  for (const settlement of settlements) {
    if (settlement.status === 'confirmed') {
      addBalance(settlement.fromUserId, settlement.amount);  // debtor paid
      addBalance(settlement.toUserId, -settlement.amount);    // creditor received
    }
  }

  return balances;
}

/**
 * Simplify debts using a greedy min-transactions algorithm.
 *
 * 1. Compute net balance per user
 * 2. Separate into creditors (positive) and debtors (negative)
 * 3. Greedily match largest debtor with largest creditor
 * 4. Transfer min(|debt|, credit) — one of them zeroes out
 * 5. Repeat until all balances are zero
 *
 * This produces an optimal or near-optimal settlement plan.
 */
export function simplifyDebts(balanceMap: Map<string, number>): DebtEdge[] {
  const EPSILON = 0.01;
  const transactions: DebtEdge[] = [];

  // Build sorted lists of creditors and debtors
  const creditors: Balance[] = [];
  const debtors: Balance[] = [];

  for (const [userId, amount] of balanceMap.entries()) {
    if (amount > EPSILON) {
      creditors.push({ userId, amount });
    } else if (amount < -EPSILON) {
      debtors.push({ userId, amount: -amount }); // store as positive for easier math
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const transferAmount = Math.min(creditor.amount, debtor.amount);

    if (transferAmount > EPSILON) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(transferAmount * 100) / 100,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    if (creditor.amount < EPSILON) ci++;
    if (debtor.amount < EPSILON) di++;
  }

  return transactions;
}

/**
 * Full pipeline: expenses + settlements → optimized payment plan.
 */
export function computeSettlementPlan(
  expenses: Array<{
    payerId: string;
    amount: number;
    participants: Array<{ userId: string; share: number }>;
  }>,
  settlements: Array<{
    fromUserId: string;
    toUserId: string;
    amount: number;
    status: string;
  }>
): {
  balances: Map<string, number>;
  transactions: DebtEdge[];
} {
  const balances = calculateNetBalances(expenses, settlements);
  const transactions = simplifyDebts(balances);
  return { balances, transactions };
}

/**
 * Get per-user contribution stats for a group.
 */
export function getUserContributions(
  expenses: Array<{
    payerId: string;
    amount: number;
    participants: Array<{ userId: string; share: number }>;
  }>
): Map<string, { paid: number; owes: number; net: number }> {
  const stats = new Map<string, { paid: number; owes: number; net: number }>();

  const ensureUser = (userId: string) => {
    if (!stats.has(userId)) {
      stats.set(userId, { paid: 0, owes: 0, net: 0 });
    }
  };

  for (const expense of expenses) {
    ensureUser(expense.payerId);
    stats.get(expense.payerId)!.paid += expense.amount;

    for (const p of expense.participants) {
      ensureUser(p.userId);
      stats.get(p.userId)!.owes += p.share;
    }
  }

  for (const [userId, s] of stats.entries()) {
    s.net = Math.round((s.paid - s.owes) * 100) / 100;
    s.paid = Math.round(s.paid * 100) / 100;
    s.owes = Math.round(s.owes * 100) / 100;
  }

  return stats;
}
