import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt' // Import the encryption tool

const prisma = new PrismaClient()

async function main() {
  // 1. Create/Verify Andrew
  // We hash the password so the database stores the secure version
  const andrewPassword = await bcrypt.hash('Bedsty2013@', 10)
  
  const andrew = await prisma.user.upsert({
    where: { email: 'andrew.cummins@eastdurham.ac.uk' },
    update: {},
    create: {
      email: 'andrew.cummins@eastdurham.ac.uk',
      password: andrewPassword, 
      firstName: 'Andrew',
      lastName: 'Cummins'
    },
  })
  console.log('Processed User: Andrew')

  // 2. Create/Verify Lee
  const leePassword = await bcrypt.hash('Summer!2026Tr@in', 10)

  const lee = await prisma.user.upsert({
    where: { email: 'lee.kennedy@eastdurham.ac.uk' },
    update: {},
    create: {
      email: 'lee.kennedy@eastdurham.ac.uk',
      password: leePassword,
      firstName: 'Lee',
      lastName: 'Kennedy'
    },
  })
  console.log('Processed User: Lee')

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })