import prisma from './prisma';

// Runs idempotent SQL migrations needed for rapid deployment environments
// where local migration tooling may be unavailable.
export async function runRuntimeMigrations(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_confirmation',
      ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "createdById" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expenses_createdById_fkey'
      ) THEN
        ALTER TABLE expenses
          ADD CONSTRAINT "expenses_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES users(id)
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS expenses_createdById_idx ON expenses ("createdById");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS expenses_status_idx ON expenses (status);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS expenses_deletedAt_idx ON expenses ("deletedAt");`
  );

  await prisma.$executeRawUnsafe(`
    UPDATE expenses
    SET status = 'confirmed', "confirmedAt" = COALESCE("confirmedAt", NOW())
    WHERE status IS NULL OR status = 'pending_confirmation';
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_confirmations (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      "confirmedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expenseId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      CONSTRAINT "expense_confirmations_expenseId_fkey"
        FOREIGN KEY ("expenseId") REFERENCES expenses(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "expense_confirmations_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS expense_confirmations_expenseId_userId_key
      ON expense_confirmations ("expenseId", "userId");
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS expense_confirmations_userId_idx ON expense_confirmations ("userId");`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS expense_history (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      snapshot JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expenseId" TEXT NOT NULL,
      "actorId" TEXT,
      CONSTRAINT "expense_history_expenseId_fkey"
        FOREIGN KEY ("expenseId") REFERENCES expenses(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "expense_history_actorId_fkey"
        FOREIGN KEY ("actorId") REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS expense_history_expenseId_createdAt_idx ON expense_history ("expenseId", "createdAt");`
  );
}
