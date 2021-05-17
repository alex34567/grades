import {MongoClient, ClientSession as MongoSession} from 'mongodb'
import {DbUser, withFindUserHtml} from './user'
import {ClassCategory, ClientUser, Fraction, UserInfo, UserType} from "../common/types";
import {connectToDB} from "./db";
import {GetServerSidePropsContext} from "next";
import {htmlTransactionWithUser, JsonTransactionRet} from "./util";
import {v4 as uuidv4} from "uuid";

export interface DbClass {
  uuid: string,
  professor_uuid: string,
  name: string,
  category: ClassCategory[],
  students: string[]
}

export interface AssignmentEntry {
  assignment_uuid: string,
  grade: number,
}

export interface DbGradeEntry {
  class_uuid: string,
  student_uuid: string,
  assignments: AssignmentEntry[]
}

export async function createClass(client: MongoClient, session: MongoSession, professor: UserInfo, name: string) {
  const db = client.db()

  const classes = db.collection<DbClass>('class')

  await classes.insertOne({
    uuid: uuidv4(),
    professor_uuid: professor.uuid,
    name,
    category: [],
    students: []
  }, {session})
}

export async function deleteClass(client: MongoClient, session: MongoSession, dbClass: DbClass) {
  const db = client.db()

  const classes = db.collection<DbClass>('class')
  const grades = db.collection<DbGradeEntry>('grade_entry')

  await classes.deleteOne({uuid: dbClass.uuid}, {session})
  await grades.deleteMany({class_uuid: dbClass.uuid}, {session})
}

export async function dropStudent(client: MongoClient, session: MongoSession, student: UserInfo, dbClass: DbClass) {
  const db = client.db()

  const classes = db.collection<DbClass>('class')
  const grades = db.collection<DbGradeEntry>('grade_entry')

  await classes.updateOne({uuid: dbClass.uuid}, {$pull: {
    students: student.uuid
  }}, {session})
  await grades.deleteOne({student_uuid: student.uuid, class_uuid: dbClass.uuid}, {session})
}

export async function addStudent(client: MongoClient, session: MongoSession, dbClass: DbClass, student: UserInfo) {
  const db = client.db()

  const classes = db.collection<DbClass>('class')

  await classes.updateOne({uuid: dbClass.uuid},
    {$addToSet: {
      students: student.uuid
  }})
}

function calcGrade(dbClass: DbClass, gradeEntry?: DbGradeEntry | null): Fraction {
  let assignmentToGrade = new Map<string, number>()
  if (gradeEntry) {
    for (const assignment of gradeEntry.assignments) {
      assignmentToGrade.set(assignment.assignment_uuid, assignment.grade)
    }
  }

  let totalWeights = 0n
  let numerator = 0n
  let denominator = 1n
  for (const category of dbClass.category) {
    totalWeights += BigInt(category.weight)
    let categoryPoints = 0n
    let categoryTotal = 0n
    for (const assignment of category.assignments) {
      let grade = assignmentToGrade.get(assignment.uuid)
      if (!grade) {
        continue
      }
      categoryTotal += BigInt(assignment.max_points)
      categoryPoints += BigInt(grade)
    }
    categoryPoints *= BigInt(category.weight)

    // Prevent divides by zero
    if (categoryTotal > 0) {
      categoryPoints *= denominator
      denominator *= categoryTotal
      numerator *= categoryTotal
      numerator += categoryPoints
    }
  }

  let final_numerator = 0n
  let final_denominator = 0n
  if (denominator > 0) {
    final_numerator = numerator / denominator
    final_denominator = totalWeights
  }

  return {
    n: Number(final_numerator),
    d: Number(final_denominator)
  }
}

export async function genStudentClassOverview(context: GetServerSidePropsContext, client: MongoClient, session: MongoSession, homepage: boolean, thisUser: ClientUser) {
  let studentUuid: string | undefined
  if (homepage) {
    studentUuid = thisUser.uuid
  } else if (context.query.userUuid) {
    if (Array.isArray(context.query.userUuid)) {
      studentUuid = context.query.userUuid[0]
    } else {
      studentUuid = context.query.userUuid
    }
  }

  if (thisUser.type !== UserType.admin && thisUser.uuid !== studentUuid) {
    return {
      props: {error: 403}
    }
  }

  const db = client.db()

  const classes = db.collection<DbClass>('class')
  const users = db.collection<DbUser>('users')
  const gradeEntries = db.collection<DbGradeEntry>('grade_entry')

  async function withUser(student: UserInfo) {
    const studentClasses = new Map<string, {dbClass: DbClass, grades?: DbGradeEntry}>()

    const classCursor = classes.find({students: studentUuid}, {session})
    try {
      let dbClass = await classCursor.next()
      while (dbClass) {
        studentClasses.set(dbClass.uuid, {dbClass})
        dbClass = await classCursor.next()
      }
    } finally {
      await classCursor.close()
    }

    const gradeCursor = gradeEntries.find({student_uuid: studentUuid}, {session})
    try {
      let gradeEntry = await gradeCursor.next()
      while (gradeEntry) {
        const sClass = studentClasses.get(gradeEntry.class_uuid)
        if (!sClass) {
          throw new Error('Student has grades for a non existent class')
        }
        sClass.grades = gradeEntry
        gradeEntry = await gradeCursor.next()
      }
    } finally {
      await gradeCursor.close()
    }

    const classOverview = []
    for (const sClass of studentClasses.values()) {
      const grade = calcGrade(sClass.dbClass, sClass.grades)

      const professor_name = (await users.findOne({uuid: sClass.dbClass.professor_uuid}, {projection: {name: 1}, session}))!.name

      classOverview.push({
        class_uuid: sClass.dbClass.uuid,
        professor_name,
        name: sClass.dbClass.name,
        grade
      })
    }

    return {
      props: {user: thisUser, studentName: student.name, studentUuid: student.uuid, classOverview}
    }
  }

  if (studentUuid === thisUser.uuid) {
    return await withUser(thisUser)
  } else {
    return await withFindUserHtml(client, session, {userUuid: studentUuid}, withUser)
  }
}

export async function genStudentClassView(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await withFindUserHtml(client, session, context.query, async (student) => {
      return await withFindClassHtml(client, session, context.query, async (dbClass) => {
        const db = client.db()
        const users = db.collection<DbUser>('users')
        const gradesEntries = db.collection<DbGradeEntry>('grade_entry')

        if (thisUser.type !== UserType.admin && dbClass.professor_uuid !== thisUser.uuid && !dbClass.students.includes(thisUser.uuid)) {
          return {
            props: {error: 403}
          }
        }

        const grades = await gradesEntries.findOne({class_uuid: dbClass.uuid, student_uuid: student.uuid}, {session})

        const assignmentToGrade = new Map<string, number>()
        if (grades) {
          for (const assignment of grades.assignments) {
            assignmentToGrade.set(assignment.assignment_uuid, assignment.grade)
          }
        }
        let totalWeights = 0n
        let numerator = 0n
        let denominator = 1n

        const categories = []
        for (const category of dbClass.category) {
          totalWeights += BigInt(category.weight)
        }
        for (const category of dbClass.category) {
          let categoryPoints = 0n
          let categoryTotal = 0n
          const assignments = []
          for (const assignment of category.assignments) {
            if (assignmentToGrade.get(assignment.uuid)) {
              categoryTotal += BigInt(assignment.max_points)
            }
          }
          for (const assignment of category.assignments) {
            let grade = null
            let weighted_grade = null
            const rawGrade = assignmentToGrade.get(assignment.uuid)
            if (rawGrade) {
              const gradeVal = BigInt(rawGrade)
              categoryPoints += gradeVal
              const proportionOfWeight = BigInt(category.weight) * gradeVal / categoryTotal
              const maxProportionOfWeight = BigInt(category.weight) * BigInt(assignment.max_points) / categoryTotal

              grade = {
                n: Number(gradeVal),
                d: assignment.max_points
              }
              weighted_grade = {
                n: Number(proportionOfWeight),
                  d: Number(maxProportionOfWeight)
              }
            }

            assignments.push({
              name: assignment.name,
              uuid: assignment.uuid,
              grade,
              max_points: assignment.max_points,
              weighted_grade
            })

          }

          let proportionOfGrade = 0n
          if (categoryTotal > 0) {
            proportionOfGrade = BigInt(category.weight) * categoryPoints / categoryTotal
          }

          categories.push({
            name: category.name,
            uuid: category.uuid,
            grade: {
              n: Number(categoryPoints),
              d: Number(categoryTotal)
            },
            weight: category.weight,
            weighted_grade: {
              n: Number(proportionOfGrade),
              d: category.weight
            },
            assignments
          })

          categoryPoints *= BigInt(category.weight)

          // Prevent divides by zero
          if (categoryTotal > 0) {
            categoryPoints *= denominator
            denominator *= categoryTotal
            numerator *= categoryTotal
            numerator += categoryPoints
          }
        }

        let final_numerator = 0n
        let final_denominator = 1000n
        if (denominator > 0) {
          final_numerator = numerator / denominator
          final_denominator = totalWeights
        }

        const student_name = student.name
        const professor_name = (await users.findOne({uuid: dbClass.professor_uuid}, {projection: {name: 1}, session}))!.name

        return {
          props: {
            classView: {
              uuid: dbClass.uuid,
              name: dbClass.name,
              student_name,
              professor_name,
              grade: {
                n: Number(final_numerator),
                d: Number(final_denominator)
              },
              categories
            },
            user: thisUser
          }
        }
      })
    })
  })
}

export async function genProfessorClassEditView(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      const db = client.db()
      const users = db.collection<DbUser>('users')

      if (thisUser.type !== UserType.admin && dbClass.professor_uuid !== thisUser.uuid) {
        return {
          props: {error: 403}
        }
      }

      const categories = []
      for (const category of dbClass.category) {
        const assignments = []
        for (const assignment of category.assignments) {
          assignments.push({
            name: assignment.name,
            uuid: assignment.uuid,
            max_points: assignment.max_points,
          })
        }

        categories.push({
          name: category.name,
          uuid: category.uuid,
          weight: category.weight,
          assignments
        })
      }

      const professor_name = (await users.findOne({uuid: dbClass.professor_uuid}, {projection: {name: 1}, session}))!.name

      return {
        props: {
          classView: {
            uuid: dbClass.uuid,
            name: dbClass.name,
            professor_name,
            categories
          },
          user: thisUser
        }
      }
    })
  })
}

export async function genProfessorAssignmentView(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      if (thisUser.type !== UserType.admin && dbClass.professor_uuid !== thisUser.uuid) {
        return {
          props: {error: 403}
        }
      }

      const db = client.db()
      const users = db.collection<UserInfo>('users')
      const dbGrades = db.collection<DbGradeEntry>('grade_entry')

      let assignment
      for (const category of dbClass.category) {
        for (const assign of category.assignments) {
          if (assign.uuid !== context.query.assignmentUuid) {
            continue
          }
          assignment = {
            categoryUuid: category.uuid,
            ...assign
          }
        }
      }
      if (!assignment) {
        return {
          props: {error: 404}
        }
      }

      const classGrades = await dbGrades.find({class_uuid: dbClass.uuid}).toArray()

      const studentToGrade = new Map<string, number>()
      for (const gradeList of classGrades) {
        for (const assignment of gradeList.assignments) {
          if (assignment.assignment_uuid === context.query.assignmentUuid) {
            studentToGrade.set(gradeList.student_uuid, assignment.grade)
            break
          }
        }
      }

      const grades = []
      for (const studentUuid of dbClass.students) {
        const studentName = (await users.findOne({uuid: studentUuid}, {session, projection: {password: 0, salt: 0}}))!.name
        const rawGrade = studentToGrade.get(studentUuid)
        let grade
        if (typeof rawGrade === 'undefined') {
          grade = null
        } else {
          grade = rawGrade
        }
        grades.push({
          studentName,
          studentUuid,
          grade
        })
      }

      return {
        props: {
          assignment: assignment,
          classUuid: dbClass.uuid,
          categories: dbClass.category,
          grades,
          user: thisUser
        }
      }
    })
  })
}

export async function genMultiCategoryView(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      if (thisUser.type !== UserType.admin && dbClass.professor_uuid !== thisUser.uuid) {
        return {
          props: {error: 403}
        }
      }

      return {
        props: {
          categories: dbClass.category,
          classUuid: dbClass.uuid,
          user: thisUser
        }
      }
    })
  })
}

export async function genCategoryView(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      if (thisUser.type !== UserType.admin && dbClass.professor_uuid !== thisUser.uuid) {
        return {
          props: {error: 403}
        }
      }

      const category = dbClass.category.find(c => c.uuid === context.query.categoryUuid)

      if (!category) {
        return {
          props: {error: 404}
        }
      }

      return {
        props: {
          category,
          classUuid: dbClass.uuid,
          user: thisUser
        }
      }
    })
  })
}

export async function genNewCategoryView(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      if (thisUser.type !== UserType.admin && dbClass.professor_uuid !== thisUser.uuid) {
        return {
          props: {error: 403}
        }
      }

      return {
        props: {
          classUuid: dbClass.uuid,
          user: thisUser
        }
      }
    })
  })
}

export async function getProfessorClassOverview(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      if (thisUser.type !== UserType.admin && dbClass.professor_uuid !== thisUser.uuid) {
        return {
          props: {error: 403}
        }
      }

      const db = client.db()
      const grades = db.collection<DbGradeEntry>('grade_entry')
      const users = db.collection<UserInfo>('users')

      const studentGrades = []
      for (const student of dbClass.students) {
        const studentName = (await users.findOne({uuid: student}, {session, projection: {name: 1}}))!.name
        const gradeEntry = await grades.findOne({class_uuid: dbClass.uuid, student_uuid: student}, {session})
        let grade = calcGrade(dbClass, gradeEntry)
        studentGrades.push({
          uuid: student,
          name: studentName,
          grade
        })
      }

      const professorName = (await users.findOne({uuid: dbClass.professor_uuid}, {session, projection: {name: 1}}))!.name

      return {
        props: {
          className: dbClass.name,
          classUuid: dbClass.uuid,
          professorName,
          studentGrades,
          user: thisUser
        }
      }
    })
  })
}

export async function getClassList(client: MongoClient, session: MongoSession, user: ClientUser) {
  const db = client.db()
  const classes = db.collection<DbClass>('class')

  const classMetas = []

  const classCursor = classes.find({professor_uuid: user.uuid})
  try {
    for await (const dbClass of classCursor) {
      classMetas.push({
        name: dbClass.name,
        uuid: dbClass.uuid
      })
    }
  } finally {
    await classCursor.close()
  }

  return {
    props: {
      classMetas,
      user
    }
  }
}

export interface FindClassInputJson {
  classUuid?: string,
}

export interface FindClassInputHtml {
  classUuid?: string | string[],
}

type FindClassFunc<T> = (dbClass: DbClass) => Promise<T>
type FindClassHtmlRet<T> = T | {props: {error: number}}
type FindClassJsonRet<T> = T | JsonTransactionRet<{ status: string }>

export async function withFindClassHtml<T>(client: MongoClient, session: MongoSession, input: FindClassInputHtml, fn: FindClassFunc<T>): Promise<FindClassHtmlRet<T>> {
  const db = client.db()
  const classes = db.collection<DbClass>('class')
  const notFoundError = {
    props: {error: 404}
  }

  let classUuid
  if (input.classUuid) {
    if (Array.isArray(input.classUuid)) {
      classUuid = input.classUuid[0]
    } else {
      classUuid = input.classUuid
    }
  }

  if (typeof classUuid === 'string') {
    const dbClass: DbClass | null = await classes.findOne({uuid: classUuid}, {session})
    if (!dbClass) {
      return notFoundError
    }
    return await fn(dbClass)
  }

  return {
    props: {error: 400}
  }
}

export async function withFindClassJson<T>(client: MongoClient, session: MongoSession, input: FindClassInputJson, fn: FindClassFunc<T>): Promise<FindClassJsonRet<T>> {
  const db = client.db()
  const classes = db.collection<DbClass>('class')
  const notFoundError = {
    statusCode: 404,
    body: {
      status: 'Class not found'
    }
  }

  if (typeof input.classUuid === 'string') {
    const dbClass: DbClass | null = await classes.findOne({uuid: input.classUuid}, {session})
    if (!dbClass) {
      return notFoundError
    }
    return await fn(dbClass)
  }

  return {
    statusCode: 400,
    body: {
      status: 'Class uuid not in request'
    }
  }
}
