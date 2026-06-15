import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'tuaemail@esempio.com'; // Metti la tua email qui
  const password = await bcrypt.hash('tuaPasswordSegreta123', 12);

  await prisma.user.upsert({
    where: { email: email },
    update: {},
    create: {
      email: email,
      username: 'superadmin',
      password: password,
      role: 'SUPERADMIN' // Questo ruolo scavalca la logica del 'register'
    }
  });
  console.log('Seed eseguito con successo: Superadmin creato.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });