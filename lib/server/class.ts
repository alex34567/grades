import {MongoClient} from 'mongodb'
import {v4 as uuidv4} from 'uuid'
import {User} from './user'

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

export async function createClass(client: MongoClient, professor: User, name: string): Promise<Class> {
  const db = client.db();

  const classes = await db.collection<DbClass>('class');

  const uuid = uuidv4();
  const class_obj = {
    uuid,
    professor_uuid: professor.uuid,
    name,
    category: [],
    students: [],
  };
  await classes.insertOne(class_obj);

  return new Class(class_obj);
}
