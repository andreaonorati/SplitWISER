import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create demo users
  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      passwordHash,
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      passwordHash,
    },
  });

  // Create a demo trip
  const trip = await prisma.groupTrip.create({
    data: {
      name: 'Summer Road Trip 2026',
      description: 'Cross-country road trip with friends!',
      currency: 'USD',
      members: {
        create: [
          { userId: alice.id, role: 'admin' },
          { userId: bob.id, role: 'member' },
          { userId: charlie.id, role: 'member' },
        ],
      },
    },
  });

  // Create demo expenses
  const expense1 = await prisma.expense.create({
    data: {
      description: 'Hotel in San Francisco',
      amount: 450,
      date: new Date('2026-07-15'),
      category: 'accommodation',
      splitType: 'equal',
      payerId: alice.id,
      groupId: trip.id,
      participants: {
        create: [
          { userId: alice.id, share: 150, isPayer: true },
          { userId: bob.id, share: 150 },
          { userId: charlie.id, share: 150 },
        ],
      },
    },
  });

  const expense2 = await prisma.expense.create({
    data: {
      description: 'Gas station fill-up',
      amount: 80,
      date: new Date('2026-07-15'),
      category: 'transport',
      splitType: 'equal',
      payerId: bob.id,
      groupId: trip.id,
      participants: {
        create: [
          { userId: alice.id, share: 26.67 },
          { userId: bob.id, share: 26.67, isPayer: true },
          { userId: charlie.id, share: 26.66 },
        ],
      },
    },
  });

  const expense3 = await prisma.expense.create({
    data: {
      description: 'Dinner at Fishermans Wharf',
      amount: 180,
      date: new Date('2026-07-16'),
      category: 'food',
      splitType: 'equal',
      payerId: charlie.id,
      groupId: trip.id,
      participants: {
        create: [
          { userId: alice.id, share: 60 },
          { userId: bob.id, share: 60 },
          { userId: charlie.id, share: 60, isPayer: true },
        ],
      },
    },
  });

  console.log('Seed data created successfully!');
  console.log({ alice, bob, charlie, trip });
  console.log({ expense1, expense2, expense3 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
