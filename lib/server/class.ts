import {MongoClient, ClientSession as MongoSession} from 'mongodb'
import {DbUser} from './user'
import {ClientUser, UserType} from "../common/types";
import {connectToDB} from "./db";
import {GetServerSidePropsContext} from "next";
import {htmlTransactionWithUser} from "./util";

export interface DbClass {
  uuid: string,
  professor_uuid: string,
  name: string,
  category: ClassCategory[],
  students: string[]
}

export interface ClassCategory {
  name: string,
  uuid: string,
  weight: number
  assignments: Assignment[],
}

export interface Assignment {
  name: string,
  uuid: string,
  max_points: number
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

export async function genStudentClassOverview(context: GetServerSidePropsContext, client: MongoClient, session: MongoSession, homepage: boolean, thisUser: ClientUser) {
  let studentUuid: string | undefined
  if (homepage) {
    studentUuid = thisUser.uuid
  } else if (context.query.student) {
    if (Array.isArray(context.query.student)) {
      studentUuid = context.query.student[0]
    } else {
      studentUuid = context.query.student
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

  let studentName
  if (studentUuid === thisUser.uuid) {
    studentName = thisUser.name
  } else {
    studentName = (await users.findOne({uuid: studentUuid}, {projection: {name: 1}, session}))?.name
    // If we made it here with a mismatched uuid, we are an admin, so a 404 is fine.
    if (!studentName) {
      return {
        props: {error: 404}
      }
    }
  }

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
    let assignmentToGrade = new Map<string, number>()
    if (sClass.grades) {
      for (const assignment of sClass.grades.assignments) {
        assignmentToGrade.set(assignment.assignment_uuid, assignment.grade)
      }
    }
    let totalWeights = 0n
    let numerator = 0n
    let denominator = 1n
    for (const category of sClass.dbClass.category) {
      totalWeights += BigInt(category.weight)
      let categoryPoints = 0n
      let categoryTotal = 0n
      for (const assignment of category.assignments) {
        categoryTotal += BigInt(assignment.max_points)
        let rawGrade = assignmentToGrade.get(assignment.uuid)
        let grade
        if (rawGrade) {
          grade = BigInt(rawGrade)
        } else {
          grade = 0n
        }
        categoryPoints += grade
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

    const professor_name = (await users.findOne({uuid: sClass.dbClass.professor_uuid}, {projection: {name: 1}, session}))!.name

    let final_numerator = 0n
    let final_denominator = 1000n
    if (denominator > 0) {
      final_numerator = numerator / denominator
      final_denominator = totalWeights
    }

    classOverview.push({
      class_uuid: sClass.dbClass.uuid,
      professor_name,
      name: sClass.dbClass.name,
      grade: {
        n: Number(final_numerator),
        d: Number(final_denominator),
      }
    })
  }

  return {
    props: {user: thisUser, studentName, studentUuid: studentUuid!, classOverview}
  }
}

export async function genStudentClassView(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    let studentUuid
    if (context.query.student) {
      if (Array.isArray(context.query.student)) {
        studentUuid = context.query.student[0]
      } else {
        studentUuid = context.query.student
      }
    }

    if (thisUser.type !== UserType.admin && thisUser.type !== UserType.professor && thisUser.uuid !== studentUuid) {
      return {
        props: {error: 403}
      }
    }

    let classUuid
    if (context.query.classUuid) {
      if (Array.isArray(context.query.classUuid)) {
        classUuid = context.query.classUuid[0]
      } else {
        classUuid = context.query.classUuid
      }
    }

    const db = client.db()
    const users = db.collection<DbUser>('users')
    const classes = db.collection<DbClass>('class')
    const gradesEntries = db.collection<DbGradeEntry>('grade_entry')

    const dbClass = await classes.findOne({uuid: classUuid, students: studentUuid}, {session})
    if (!dbClass) {
      let status = 403
      if (thisUser.type === UserType.admin) {
        status = 404
      }
      return {
        props: {error: status}
      }
    }

    if (thisUser.type === UserType.professor && dbClass.professor_uuid !== thisUser.uuid) {
      return {
        props: {error: 403}
      }
    }

    const grades = await gradesEntries.findOne({class_uuid: classUuid, student_uuid: studentUuid}, {session})

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
        categoryTotal += BigInt(assignment.max_points)
      }
      for (const assignment of category.assignments) {
        const rawGrade = assignmentToGrade.get(assignment.uuid)
        let grade
        if (rawGrade) {
          grade = BigInt(rawGrade)
        } else {
          grade = 0n
        }
        categoryPoints += grade

        const proportionOfWeight = BigInt(category.weight) * grade / categoryTotal
        const maxProportionOfWeight = BigInt(category.weight) * BigInt(assignment.max_points) / categoryTotal

        assignments.push({
          name: assignment.name,
          uuid: assignment.uuid,
          grade: {
            n: Number(grade),
            d: assignment.max_points
          },
          weighted_grade: {
            n: Number(proportionOfWeight),
            d: Number(maxProportionOfWeight)
          }
        })
      }

      const proportionOfGrade = BigInt(category.weight) * categoryPoints / categoryTotal

      categories.push({
        name: category.name,
        uuid: category.uuid,
        grade: {
          n: Number(categoryPoints),
          d: Number(categoryTotal)
        },
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

    const student_name = (await users.findOne({uuid: studentUuid}, {projection: {name: 1}, session}))!.name
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
}
