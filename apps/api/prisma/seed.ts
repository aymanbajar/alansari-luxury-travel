import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const developmentPassword = "ChangeMe123!";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(developmentPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@alansari.local" },
    update: {
      fullName: "مدير النظام",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      deletedAt: null
    },
    create: {
      fullName: "مدير النظام",
      email: "admin@alansari.local",
      passwordHash,
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { email: "staff@alansari.local" },
    update: {
      fullName: "موظف الحجوزات",
      passwordHash,
      role: "STAFF",
      isActive: true,
      deletedAt: null
    },
    create: {
      fullName: "موظف الحجوزات",
      email: "staff@alansari.local",
      passwordHash,
      role: "STAFF"
    }
  });

  await prisma.vehicle.createMany({
    skipDuplicates: true,
    data: [
      {
        plateNumber: "KSA-1001",
        make: "Mercedes-Benz",
        model: "V-Class",
        year: 2024,
        passengerCapacity: 7
      },
      {
        plateNumber: "KSA-1002",
        make: "Mercedes-Benz",
        model: "Sprinter",
        year: 2023,
        passengerCapacity: 14
      },
      { plateNumber: "KSA-1003", make: "GMC", model: "Yukon", year: 2024, passengerCapacity: 6 },
      {
        plateNumber: "KSA-1004",
        make: "Chevrolet",
        model: "Suburban",
        year: 2023,
        passengerCapacity: 7
      },
      {
        plateNumber: "KSA-1005",
        make: "Toyota",
        model: "Hiace",
        year: 2022,
        passengerCapacity: 12
      },
      {
        plateNumber: "KSA-1006",
        make: "Toyota",
        model: "Coaster",
        year: 2021,
        passengerCapacity: 22
      },
      {
        plateNumber: "KSA-1007",
        make: "Hyundai",
        model: "Staria",
        year: 2024,
        passengerCapacity: 9
      },
      { plateNumber: "KSA-1008", make: "Lexus", model: "ES", year: 2024, passengerCapacity: 4 },
      { plateNumber: "KSA-1009", make: "BMW", model: "7 Series", year: 2023, passengerCapacity: 4 },
      { plateNumber: "KSA-1010", make: "Audi", model: "A8", year: 2023, passengerCapacity: 4 }
    ]
  });

  const drivers = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      fullName: "أحمد علي",
      phoneNumber: "+966500000001",
      overnightDailyRate: "250.00"
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      fullName: "محمد حسن",
      phoneNumber: "+966500000002",
      overnightDailyRate: "250.00"
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      fullName: "خالد يوسف",
      phoneNumber: "+966500000003",
      overnightDailyRate: "275.00"
    },
    {
      id: "00000000-0000-4000-8000-000000000104",
      fullName: "سعيد عبدالله",
      phoneNumber: "+966500000004",
      overnightDailyRate: "240.00"
    },
    {
      id: "00000000-0000-4000-8000-000000000105",
      fullName: "فهد ناصر",
      phoneNumber: "+966500000005",
      overnightDailyRate: "260.00"
    }
  ];

  for (const driver of drivers) {
    await prisma.driver.upsert({
      where: { id: driver.id },
      update: driver,
      create: driver
    });
  }

  const customers = [
    {
      id: "00000000-0000-4000-8000-000000000201",
      fullName: "عبدالرحمن السالم",
      phoneCountryCode: "+966",
      phoneNumber: "511111111",
      nationality: "Saudi"
    },
    {
      id: "00000000-0000-4000-8000-000000000202",
      fullName: "Sarah Johnson",
      phoneCountryCode: "+1",
      phoneNumber: "2025550101",
      nationality: "American"
    },
    {
      id: "00000000-0000-4000-8000-000000000203",
      fullName: "Omar Al Mansouri",
      phoneCountryCode: "+971",
      phoneNumber: "501112223",
      nationality: "Emirati"
    },
    {
      id: "00000000-0000-4000-8000-000000000204",
      fullName: "Yuki Tanaka",
      phoneCountryCode: "+81",
      phoneNumber: "9012345678",
      nationality: "Japanese"
    },
    {
      id: "00000000-0000-4000-8000-000000000205",
      fullName: "Fatima Al Balushi",
      phoneCountryCode: "+968",
      phoneNumber: "92123456",
      nationality: "Omani"
    },
    {
      id: "00000000-0000-4000-8000-000000000206",
      fullName: "Lina Haddad",
      phoneCountryCode: "+961",
      phoneNumber: "71123456",
      nationality: "Lebanese"
    },
    {
      id: "00000000-0000-4000-8000-000000000207",
      fullName: "James Smith",
      phoneCountryCode: "+44",
      phoneNumber: "7700900001",
      nationality: "British"
    },
    {
      id: "00000000-0000-4000-8000-000000000208",
      fullName: "Aisha Khan",
      phoneCountryCode: "+92",
      phoneNumber: "3001234567",
      nationality: "Pakistani"
    },
    {
      id: "00000000-0000-4000-8000-000000000209",
      fullName: "Chen Wei",
      phoneCountryCode: "+86",
      phoneNumber: "13800138000",
      nationality: "Chinese"
    },
    {
      id: "00000000-0000-4000-8000-000000000210",
      fullName: "Noura Al Qahtani",
      phoneCountryCode: "+966",
      phoneNumber: "522222222",
      nationality: "Saudi"
    }
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: customer,
      create: customer
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "timezone" },
    update: { value: "Asia/Riyadh", updatedById: admin.id },
    create: {
      key: "timezone",
      value: "Asia/Riyadh",
      description: "Default display timezone for operational dates.",
      updatedById: admin.id
    }
  });

  await prisma.systemSetting.upsert({
    where: { key: "currency" },
    update: { value: "SAR", updatedById: admin.id },
    create: {
      key: "currency",
      value: "SAR",
      description: "Default reporting and expense currency.",
      updatedById: admin.id
    }
  });

  await prisma.systemSetting.upsert({
    where: { key: "overnightDefaults" },
    update: {
      value: {
        defaultDriverDailyRate: "250.00",
        driverDailyRate: "250.00",
        currency: "SAR",
        preTripBufferHours: 12,
        postTripBufferHours: 12
      },
      updatedById: admin.id
    },
    create: {
      key: "overnightDefaults",
      value: {
        defaultDriverDailyRate: "250.00",
        driverDailyRate: "250.00",
        currency: "SAR",
        preTripBufferHours: 12,
        postTripBufferHours: 12
      },
      description: "Default driver overnight rate and availability buffer settings.",
      updatedById: admin.id
    }
  });
}

main()
  .then(async () => {
    console.info("Seed data created. Development credentials: admin@alansari.local / ChangeMe123!");
    console.info("Development credentials must be changed outside local development.");
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
