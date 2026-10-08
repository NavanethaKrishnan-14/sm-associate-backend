import { prisma } from "../config/db";

const DEMO = "DEMO DATA";

const serviceData = [
  ["DSA_FINANCE", "DSA Finance", "DSA", null, "DSA finance sourcing.", 1],
  ["HOME_LOAN", "Home Loan", "DSA_PRODUCT", "DSA_FINANCE", "Home loan through DSA.", 2],
  ["CAR_LOAN", "Car Loan", "DSA_PRODUCT", "DSA_FINANCE", "Car loan through DSA.", 3],
  ["BUSINESS_LOAN", "Business Loan", "DSA_PRODUCT", "DSA_FINANCE", "Business loan through DSA.", 4],
  ["PERSONAL_LOAN", "Personal Loan", "DSA_PRODUCT", "DSA_FINANCE", "Personal loan through DSA.", 5],
  ["INSURANCE_RENEWAL", "Insurance Renewal", "SERVICE", null, "Insurance renewal support.", 6],
  ["GOLD_RESALE", "Gold Resale", "SERVICE", null, "Gold resale support.", 7]
] as const;

async function requireAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("ADMIN_EMAIL is required.");

  const admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    throw new Error(
      "Production admin was not found. Start/login once with the configured ADMIN_EMAIL/ADMIN_PASSWORD first."
    );
  }

  return admin;
}

export async function clearDemoData() {
  await prisma.loanFollowUp.deleteMany({
    where: { note: { contains: DEMO } }
  });

  await prisma.financeEnquiry.deleteMany({
    where: {
      AND: [
        { enquiryId: { startsWith: "ENQ-9" } },
        { notes: { contains: DEMO } }
      ]
    }
  });

  await prisma.carSale.deleteMany({
    where: {
      AND: [
        { saleId: { startsWith: "SALE-9" } },
        { notes: { contains: DEMO } }
      ]
    }
  });

  await prisma.carExpense.deleteMany({
    where: {
      OR: [
        { description: { contains: DEMO } },
        { car: { notes: { contains: DEMO } } }
      ]
    }
  });

  await prisma.car.deleteMany({
    where: {
      AND: [
        { vehicleId: { startsWith: "CAR-9" } },
        { notes: { contains: DEMO } }
      ]
    }
  });

  await prisma.loan.deleteMany({
    where: {
      AND: [
        {
          OR: [
            { loanId: { startsWith: "LN-9" } },
            { loanId: { startsWith: "LOAN-9" } }
          ]
        },
        { notes: { contains: DEMO } }
      ]
    }
  });

  await prisma.customer.deleteMany({
    where: {
      AND: [
        { customerId: { startsWith: "CUS-9" } },
        { notes: { contains: DEMO } }
      ]
    }
  });
}

export async function seedDemoData() {
  const admin = await requireAdmin();

  // Replace only our DEMO DATA records. Real production records are preserved.
  await clearDemoData();

  for (const [code, name, category, parentCode, description, sortOrder] of serviceData) {
    await prisma.financeService.upsert({
      where: { code },
      update: { name, category, parentCode, description, active: true, sortOrder },
      create: { code, name, category, parentCode, description, active: true, sortOrder }
    });
  }

  const customers = [
    { customerId: "CUS-901", name: "Arun Kumar", mobile: "9000000001", email: "demo.customer@smassociate.test", city: "Tirunelveli", occupation: "Business Owner" },
    { customerId: "CUS-902", name: "Priya Raj", mobile: "9000000002", email: "demo.priya@smassociate.test", city: "Tirunelveli", occupation: "IT Professional" },
    { customerId: "CUS-903", name: "Mohamed Faizal", mobile: "9000000003", email: "demo.faizal@smassociate.test", city: "Tirunelveli", occupation: "Trader" },
    { customerId: "CUS-904", name: "Kavitha S", mobile: "9000000004", email: "demo.kavitha@smassociate.test", city: "Nagercoil", occupation: "Teacher" },
    { customerId: "CUS-905", name: "Suresh B", mobile: "9000000005", email: "demo.suresh@smassociate.test", city: "Tuticorin", occupation: "Engineer" },
    { customerId: "CUS-906", name: "Meena Devi", mobile: "9000000006", email: "demo.meena@smassociate.test", city: "Tirunelveli", occupation: "Retailer" },
    { customerId: "CUS-907", name: "Ramesh Kumar", mobile: "9000000007", email: "demo.ramesh@smassociate.test", city: "Nagercoil", occupation: "Self Employed" }
  ];

  const customerById = new Map<string, { id: string }>();
  for (const customer of customers) {
    const row = await prisma.customer.upsert({
      where: { customerId: customer.customerId },
      update: { ...customer, notes: DEMO },
      create: { ...customer, notes: DEMO }
    });
    customerById.set(customer.customerId, row);
  }

  const loanSeed = [
    ["LOAN-901", "CUS-901", "Home Loan", 4200000, 4000000, "HDFC Bank", "APPROVED", 42000, "2026-09-18", null],
    ["LOAN-902", "CUS-902", "Car Loan", 850000, 800000, "ICICI Bank", "DISBURSED", 12500, "2026-08-22", "2026-09-10"],
    ["LOAN-903", "CUS-903", "Business Loan", 2500000, null, "Axis Bank", "UNDER_REVIEW", 0, "2026-09-28", null],
    ["LOAN-904", "CUS-904", "Personal Loan", 500000, null, "Bajaj Finance", "ENTERED", 0, "2026-10-02", null],
    ["LOAN-905", "CUS-905", "Home Loan", 3200000, 3000000, "SBI", "CLOSED", 30000, "2026-07-12", "2026-08-02"],
    ["LOAN-906", "CUS-906", "Car Loan", 700000, null, "HDFC Bank", "SUBMITTED", 0, "2026-09-30", null],
    ["LOAN-907", "CUS-907", "Business Loan", 1800000, null, "Kotak Mahindra Bank", "REJECTED", 0, "2026-08-30", null],
    ["LOAN-908", "CUS-901", "Personal Loan", 400000, null, "Tata Capital", "DOCUMENTS_PENDING", 0, "2026-10-01", null]
  ] as const;

  const loanById = new Map<string, { id: string }>();
  for (const [loanId, customerId, loanType, requiredAmount, approvedAmount, financeCompany, status, commission, applicationDate, disbursementDate] of loanSeed) {
    const row = await prisma.loan.upsert({
      where: { loanId },
      update: {
        customerId: customerById.get(customerId)!.id,
        loanType,
        requiredAmount,
        approvedAmount,
        financeCompany,
        status,
        commission,
        applicationDate: new Date(applicationDate),
        disbursementDate: disbursementDate ? new Date(disbursementDate) : null,
        notes: DEMO,
        rejectionReason: status === "REJECTED" ? "DEMO - eligibility criteria" : null
      },
      create: {
        loanId,
        customerId: customerById.get(customerId)!.id,
        loanType,
        requiredAmount,
        approvedAmount,
        financeCompany,
        status,
        commission,
        applicationDate: new Date(applicationDate),
        disbursementDate: disbursementDate ? new Date(disbursementDate) : null,
        notes: DEMO,
        rejectionReason: status === "REJECTED" ? "DEMO - eligibility criteria" : null
      }
    });
    loanById.set(loanId, row);
  }

  await prisma.loanFollowUp.deleteMany({ where: { note: { contains: DEMO } } });

  const followUps = [
    ["LOAN-901", "2026-10-04", "2026-10-07", "Collect final property documents - DEMO", "OPEN"],
    ["LOAN-903", "2026-10-03", "2026-10-06", "Check bank review status - DEMO", "OPEN"],
    ["LOAN-904", "2026-10-08", null, "Call customer for documents - DEMO", "OPEN"],
    ["LOAN-906", "2026-10-05", null, "Verify submitted documents - DEMO", "OPEN"],
    ["LOAN-907", "2026-09-25", null, "Explain rejection and discuss alternatives - DEMO", "COMPLETED"]
  ] as const;

  for (const [loanId, followUpDate, nextFollowUpDate, note, status] of followUps) {
    await prisma.loanFollowUp.create({
      data: {
        loanId: loanById.get(loanId)!.id,
        followUpDate: new Date(followUpDate),
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        note,
        status,
        createdBy: admin.id
      }
    });
  }

  const enquirySeed = [
    ["ENQ-901", "CUS-901", "DSA_FINANCE", null, 4200000, "IN_PROGRESS", "2026-10-07", "DSA finance requirement - DEMO"],
    ["ENQ-902", "CUS-901", "HOME_LOAN", "HDFC Bank", 4200000, "IN_PROGRESS", "2026-10-07", "Home loan enquiry - DEMO"],
    ["ENQ-903", "CUS-902", "CAR_LOAN", "ICICI Bank", 850000, "COMPLETED", null, "Car loan enquiry - DEMO"],
    ["ENQ-904", "CUS-903", "BUSINESS_LOAN", "Axis Bank", 2500000, "IN_PROGRESS", "2026-10-06", "Business loan enquiry - DEMO"],
    ["ENQ-905", "CUS-904", "PERSONAL_LOAN", null, 500000, "NEW", null, "Personal loan enquiry - DEMO"],
    ["ENQ-906", "CUS-905", "INSURANCE_RENEWAL", null, null, "COMPLETED", null, "Vehicle insurance renewal - DEMO"],
    ["ENQ-907", "CUS-906", "GOLD_RESALE", null, null, "NEW", "2026-10-09", "Gold resale enquiry - DEMO"],
    ["ENQ-908", "CUS-907", "GOLD_RESALE", null, null, "CANCELLED", null, "Demo cancelled gold enquiry - DEMO"]
  ] as const;

  for (const [enquiryId, customerId, serviceCode, financeCompany, requiredAmount, status, followUpDate, notes] of enquirySeed) {
    await prisma.financeEnquiry.upsert({
      where: { enquiryId },
      update: {
        customerId: customerById.get(customerId)!.id,
        serviceCode,
        financeCompany,
        requiredAmount,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes,
        assignedTo: admin.id
      },
      create: {
        enquiryId,
        customerId: customerById.get(customerId)!.id,
        serviceCode,
        financeCompany,
        requiredAmount,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes,
        assignedTo: admin.id
      }
    });
  }

  const cars = [
    ["CAR-901", "CUS-903", "TN72AB9001", "Hyundai", "Creta SX", 2021, 1, 42000, "Diesel", 1180000, "AVAILABLE"],
    ["CAR-902", "CUS-905", "TN69EF9002", "Kia", "Seltos HTK", 2022, 1, 36000, "Petrol", 1250000, "RESERVED"],
    ["CAR-903", "CUS-901", "TN72CD9003", "Maruti Suzuki", "Swift VXi", 2022, 1, 31000, "Petrol", 720000, "SOLD"]
  ] as const;

  const carById = new Map<string, { id: string }>();
  for (const [vehicleId, sellerCustomerId, registrationNumber, make, model, year, ownerNumber, km, fuel, purchasePrice, status] of cars) {
    const row = await prisma.car.upsert({
      where: { vehicleId },
      update: {
        sellerId: customerById.get(sellerCustomerId)!.id,
        registrationNumber,
        make,
        model,
        year,
        ownerNumber,
        km,
        fuel,
        purchasePrice,
        status,
        notes: DEMO
      },
      create: {
        vehicleId,
        sellerId: customerById.get(sellerCustomerId)!.id,
        registrationNumber,
        make,
        model,
        year,
        ownerNumber,
        km,
        fuel,
        purchasePrice,
        status,
        notes: DEMO
      }
    });
    carById.set(vehicleId, row);
  }

  await prisma.carExpense.deleteMany({
    where: { description: { contains: DEMO } }
  });

  const expenses = [
    ["CAR-901", "Service", 18000, "Periodic service - DEMO"],
    ["CAR-901", "Detailing", 6500, "Vehicle detailing - DEMO"],
    ["CAR-902", "Tyres", 24000, "Tyre replacement - DEMO"],
    ["CAR-903", "Repair", 12000, "Brake and suspension work - DEMO"],
    ["CAR-903", "Detailing", 5000, "Final detailing - DEMO"]
  ] as const;

  for (const [vehicleId, category, amount, description] of expenses) {
    await prisma.carExpense.create({
      data: {
        carId: carById.get(vehicleId)!.id,
        category,
        amount,
        description
      }
    });
  }

  await prisma.carSale.upsert({
    where: { saleId: "SALE-901" },
    update: {
      carId: carById.get("CAR-903")!.id,
      buyerId: customerById.get("CUS-904")!.id,
      sellingPrice: 805000,
      sellingExpenses: 7500,
      totalInvestment: 737000,
      profit: 60500,
      saleDate: new Date("2026-09-20"),
      notes: DEMO
    },
    create: {
      saleId: "SALE-901",
      carId: carById.get("CAR-903")!.id,
      buyerId: customerById.get("CUS-904")!.id,
      sellingPrice: 805000,
      sellingExpenses: 7500,
      totalInvestment: 737000,
      profit: 60500,
      saleDate: new Date("2026-09-20"),
      notes: DEMO
    }
  });

  // Keep future generated IDs after the seeded range without lowering
  // an already-higher production counter.
  for (const [name, minimum] of [
    ["customer", 907],
    ["loan", 908],
    ["financeEnquiry", 908],
    ["car", 903],
    ["carSale", 901]
  ] as const) {
    await prisma.$executeRaw`
      UPDATE "Counter"
      SET "value" = GREATEST("value", ${minimum}),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "name" = ${name}
    `;
  }

  console.log("COMPLETE DEMO DATA SEEDED");
  return {
    services: 7,
    customers: 7,
    loans: 8,
    followUps: 5,
    financeEnquiries: 8,
    cars: 3,
    carExpenses: 5,
    carSales: 1
  };
}

export async function seedDemoDataOnce(marker: string) {
  let markerClaimed = false;

  try {
    await prisma.counter.create({
      data: { name: marker, value: 1 }
    });
    markerClaimed = true;

    return await seedDemoData();
  } catch (error: any) {
    if (error?.code === "P2002") {
      return null;
    }

    if (markerClaimed) {
      await prisma.counter.delete({
        where: { name: marker }
      }).catch(() => undefined);
    }

    throw error;
  }
}
