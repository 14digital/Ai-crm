import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@gmail.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      rrSequence: 0,
    },
  });

  console.log("✅ Admin user seeded:", admin.email);
  console.log("   Password: admin123");
  console.log("");
  console.log("🔐 Change this password in production!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
