import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Create/Verify Andrew
  const andrew = await prisma.user.upsert({
    where: { email: 'andrew.cummins@eastdurham.ac.uk' },
    update: {},
    create: {
      email: 'andrew.cummins@eastdurham.ac.uk',
      password: 'Bedsty2013@', 
      firstName: 'Andrew',
      lastName: 'Cummins'
    },
  })
  console.log('Processed User: Andrew')

  // 2. Create/Verify Lee
  const lee = await prisma.user.upsert({
    where: { email: 'lee.kennedy@eastdurham.ac.uk' },
    update: {},
    create: {
      email: 'lee.kennedy@eastdurham.ac.uk',
      password: 'Summer!2026Tr@in', // Complex password
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