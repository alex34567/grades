import {connectToDB} from '../lib/server/db'
import * as readline from 'readline'
import * as crypto from 'crypto'
import initDb from './init_db'
import {promisify} from 'util'
import {createUser} from '../lib/server/user'
import {createClass, GradeEntry} from '../lib/server/class'
import {v4 as uuidv4} from 'uuid'
import {UserType} from "../lib/common/types";

const randomBytes = promisify(crypto.randomBytes)

async function main() {
  const client = await connectToDB()
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  try {
    const warning_str = 'Injecting the example will DROP THE DATABASE!\nSay yes if you want to replace the database with the example data: '
    const answer = await (new Promise<string>((resolve) => rl.question(warning_str, resolve)))
    if (answer.trim().toUpperCase() !== 'YES') {
      console.log('Incorrect response.\nShutting down.')
      rl.close()
      await client.close()
      return
    }
    const db = client.db()
    await db.dropDatabase()
    await initDb(client)

    const professor_password = (await randomBytes(16)).toString('base64')
    const professor = await createUser(client, 'kamek', 'Kamek', professor_password, UserType.professor)
    console.log(`User made\nUser name is kamek\nPassword is ${professor_password}`)

    const student_password = (await randomBytes(16)).toString('base64')
    const student = await createUser(client, 'bowser', 'Bowser', student_password, UserType.student)
    console.log(`User made\nUser name is bowser\nPassword is ${student_password}`)

    const beating_mario = await createClass(client, professor, 'Beating Mario')
    beating_mario.students.push(student.uuid)
    const mario_kart_uuid = uuidv4()
    const super_mario_kart_uuid = uuidv4()
    const mario_kart_8_uuid = uuidv4()
    const mario_kart = {
      name: 'Mario Kart',
      uuid: mario_kart_uuid,
      weight: 70000,
      assignments: [{
        name: 'Super Mario Kart',
        uuid: super_mario_kart_uuid,
        max_points: 35000,
      }, {
        name: 'Mario Kart 8',
        uuid: mario_kart_8_uuid,
        max_points: 69000,
      }],
    }

    const yi_category_uuid = uuidv4()
    const yi_uuid = uuidv4()
    const yi = {
      name: 'Yoshi\'s Island',
      uuid: yi_category_uuid,
      weight: 30000,
      assignments: [{
        name: 'SMW 2: Yoshi\'s Island',
        uuid: yi_uuid,
        max_points: 19000,
      }],
    }

    const sml_uuid = uuidv4()
    const sml1_uuid = uuidv4()
    const sml2_uuid = uuidv4()
    const super_mario_land = {
      name: 'Super Mario Land',
      uuid: sml_uuid,
      weight: 10000,
      assignments: [{
        name: 'Super Mario Land 1',
        uuid: sml1_uuid,
        max_points: 90000,
      }, {
        name: 'Super Mario Land 2',
        uuid: sml2_uuid,
        max_points: 80000,
      }],
    }

    beating_mario.category.push(mario_kart, yi, super_mario_land)
    await beating_mario.writeToDB(client)

    const beating_mario_entry = new GradeEntry({
      class_uuid: beating_mario.uuid,
      student_uuid: student.uuid,
      assignments: [{
        assignment_uuid: super_mario_kart_uuid,
        grade: 30000,
      },
      {
        assignment_uuid: mario_kart_8_uuid,
        grade: 67000,
      },
      {
        assignment_uuid: yi_uuid,
        grade: 20000,
      }]})
    await beating_mario_entry.writeToDB(client)
  } finally {
    rl.close()
    await client.close()
  }
}

if (require.main === module) {
  main()
}
