import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@safenest.ai";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "SafeNest Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash("Admin@1234", 12),
        role: "ADMIN",
        isVerified: true,
        consentGiven: true,
      },
    });
    console.log(`Seeded admin user: ${adminEmail} / Admin@1234`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  const lenderEmail = "lender@safenest.ai";
  let lender = await prisma.user.findUnique({ where: { email: lenderEmail } });
  if (!lender) {
    lender = await prisma.user.create({
      data: {
        name: "Demo Lender Co-op",
        email: lenderEmail,
        passwordHash: await bcrypt.hash("Lender@1234", 12),
        role: "LENDER",
        isVerified: true,
        consentGiven: true,
      },
    });
    console.log(`Seeded lender user: ${lenderEmail} / Lender@1234`);
  } else {
    console.log("Lender user already exists, skipping.");
  }

  const offerCount = await prisma.loanOffer.count({ where: { lenderUserId: lender.id } });
  if (offerCount === 0) {
    await prisma.loanOffer.createMany({
      data: [
        {
          lenderUserId: lender.id,
          title: "Personal Loan — Salaried Professionals",
          lenderDisplayName: "Demo Lender Co-op",
          category: "PRIVATE_BANK",
          purposes: JSON.stringify(["PERSONAL", "MEDICAL"]),
          minAmount: 50000,
          maxAmount: 1000000,
          minTenureMonths: 12,
          maxTenureMonths: 60,
          interestRatePct: 13.5,
          processingFeePct: 1.5,
          minIncomeRequired: 25000,
          eligibleEmploymentTypes: JSON.stringify(["SALARIED"]),
          excludesIfDefault: true,
          description: "An unsecured personal loan for salaried applicants, aimed at medical and general personal needs. Sample listing for demo/eval purposes.",
        },
        {
          lenderUserId: lender.id,
          title: "Micro-Business Growth Loan",
          lenderDisplayName: "Demo Lender Co-op",
          category: "NBFC",
          purposes: JSON.stringify(["BUSINESS"]),
          minAmount: 25000,
          maxAmount: 500000,
          minTenureMonths: 6,
          maxTenureMonths: 36,
          interestRatePct: 16,
          processingFeePct: 2,
          minIncomeRequired: undefined,
          eligibleEmploymentTypes: JSON.stringify(["SELF_EMPLOYED", "BUSINESS_OWNER"]),
          excludesIfDefault: true,
          description: "Working-capital loan for small business owners and self-employed applicants. Sample listing for demo/eval purposes.",
        },
      ],
    });
    console.log("Seeded 2 demo marketplace offers.");
  } else {
    console.log("Demo lender already has offers, skipping.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
