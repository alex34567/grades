import {MongoClient} from 'mongodb'
import {v4 as uuidv4} from 'uuid'
import {DbUser, User} from './user'
import {ClientUser, Fraction} from "../common/types";

export interface DbClass {
  uuid: string,
  professor_uuid: string,
  name: string,
  category: ClassCategory[],
  students: string[]
}

export class Class {
  uuid: string
  professor_uuid: string
  name: string
  category: ClassCategory[]
  students: string[]

  constructor(db: DbClass) {
    this.uuid = db.uuid;
    this.professor_uuid = db.professor_uuid;
    this.name = db.name;
    this.category = db.category;
    this.students = db.students;
  }

  async writeToDB(client: MongoClient) {
    const db = client.db();

    const classes = await db.collection<DbClass>('class');

    await classes.replaceOne({uuid: this.uuid}, this);
  }
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

export class GradeEntry {
  class_uuid: string
  student_uuid: string
  assignments: AssignmentEntry[]

  constructor(db: DbGradeEntry) {
    this.class_uuid = db.class_uuid;
    this.student_uuid = db.student_uuid;
    this.assignments = db.assignments;
  }

  async writeToDB(client: MongoClient) {
    const db = client.db();

    const entries = await db.collection<DbGradeEntry>('grade_entry');

    await entries.replaceOne({class_uuid: this.class_uuid, student_uuid: this.student_uuid}, this, {upsert: true});
  }
}

export interface ClassOverview {
  class_uuid: string
  professor_name: string
  name: string
  grade: Fraction
}

export async function createClass(client: MongoClient, professor: User, name: string): Promise<Class> {
  const db = client.db();

  const classes = db.collection<DbClass>('class')

  const uuid = uuidv4();
  const class_obj = {
    uuid,
    professor_uuid: professor.uuid,
    name,
    category: [],
    students: [],
  };
  await classes.insertOne(class_obj)

  return new Class(class_obj)
}

export async function genStudentClassOverview(client: MongoClient, user: ClientUser): Promise<ClassOverview[]> {
  const db = client.db()

  const classes = db.collection<DbClass>('class')
  const users = db.collection<DbUser>('users')
  const gradeEntries = db.collection<DbGradeEntry>('grade_entry')

  const studentClasses = new Map<string, {dbClass: DbClass, grades?: DbGradeEntry}>()

  const classCursor = classes.find({students: user.uuid})
  try {
    let dbClass = await classCursor.next()
    while (dbClass) {
      studentClasses.set(dbClass.uuid, {dbClass})
      dbClass = await classCursor.next()
    }
  } finally {
    await classCursor.close()
  }

  const gradeCursor = gradeEntries.find({student_uuid: user.uuid})
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

  const ret = []
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

    const professor_name = (await users.findOne({uuid: sClass.dbClass.professor_uuid}, {projection: {name: 1}}))!.name

    let final_numerator = 0n
    let final_denominator = 1n
    if (denominator > 0) {
      final_numerator = numerator / denominator
      final_denominator = totalWeights
    }

    ret.push({
      class_uuid: sClass.dbClass.uuid,
      professor_name,
      name: sClass.dbClass.name,
      grade: {
        n: Number(final_numerator),
        d: Number(final_denominator),
      }
    })
  }
  return ret
}
