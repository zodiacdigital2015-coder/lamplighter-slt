import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email: 'admin@lamplighter.com',
    },
  })

  if (existingUser) {
    console.log('User already exists')
    return
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email: 'admin@lamplighter.com',
      password: 'securePassword123',
    },
  })

  console.log('Created user with id:', user.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })