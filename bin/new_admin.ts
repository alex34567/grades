import {connectToDB} from "../lib/server/db";
import * as readline from "readline";
import {promisify} from "util";
import {createUser} from "../lib/server/user";
import {UserType} from "../lib/common/types";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  function question(question: string) {
    return new Promise<string>(resolve => rl.question(question, resolve))
  }

  const userName = await question('User name for admin: ')
  const name = await question('Full name for admin: ')
  const password = await question('Password for admin: ')

  await promisify(readline.cursorTo)(process.stdout, 0, 0)
  await promisify(readline.clearScreenDown)(process.stdout)

  const client = await connectToDB()
  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      await createUser(client, session, userName, name, password, UserType.admin)
    })
  } finally {
    await session.endSession()
    await client.close()
    rl.close()
  }
}

if (require.main === module) {
  main()
}