import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 1. Create/Verify Andrew
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

  // 3. Create/Verify Andy Grainger
  const andrewgPassword = await bcrypt.hash('Quality!2026Tr@in', 10)

  // CHANGED: 'const lee' becomes 'const andy' below
  const andy = await prisma.user.upsert({
    where: { email: 'andy.grainger@eastdurham.ac.uk' },
    update: {},
    create: {
      email: 'andy.grainger@eastdurham.ac.uk',
      password: andrewgPassword,
      firstName: 'Andy',
      lastName: 'Grainger'
    },
  })
  console.log('Processed User: Andy Grainger')

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