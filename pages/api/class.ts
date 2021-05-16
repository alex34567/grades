import {NextApiRequest, NextApiResponse} from "next";
import {LoginResponse} from "./login";
import {connectToDB} from "../../lib/server/db";
import {jsonTransactionWithUser} from "../../lib/server/util";
import {DbClass, DbGradeEntry, withFindClassJson} from "../../lib/server/class";
import {EditAssignment, SingleGradeEntry, UserType} from "../../lib/common/types";
import {v4 as uuidv4} from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  const client = await connectToDB()

  return await jsonTransactionWithUser(client, req, res, undefined, async (session, user) => {
    return await withFindClassJson(client, session, req.body, async (dbClass) => {
      if (user.type !== UserType.admin && dbClass.professor_uuid !== user.uuid) {
        return {
          statusCode: 403,
          body: {
            status: 'You are not the professor'
          }
        }
      }

      const db = client.db()
      const classes = db.collection<DbClass>('class')
      const dbGrades = db.collection<DbGradeEntry>('grade_entry')

      switch (req.body.command) {
        case 'create_assignment':
          if (typeof req.body.name !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment uuid'
              }
            }
          }
          const assignmentName: string = req.body.name

          if (typeof req.body.category !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment uuid'
              }
            }
          }
          const categoryUuid: string = req.body.category

          if (typeof req.body.maxPoints !== 'number') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment uuid'
              }
            }
          }
          const maxPoints: number = req.body.maxPoints

          const category = dbClass.category.filter(c => c.uuid === categoryUuid)[0]
          if (!category) {
            return {
              statusCode: 404,
              body: {
                status: 'Category not found'
              }
            }
          }

          const uuid = uuidv4()

          category.assignments.push({
            max_points: maxPoints,
            name: assignmentName,
            uuid
          })

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})

          return {
            statusCode: 200,
            body: {
              status: 'Assignment created',
              uuid
            }
          }
        case 'delete_assignment':
          if (typeof req.body.assignmentUuid !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment uuid'
              }
            }
          }
          const assignmentUuid: string = req.body.assignmentUuid

          for (const category of dbClass.category) {
            category.assignments = category.assignments.filter(a => a.uuid !== assignmentUuid)
          }

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})

          const gradeEntryCursor = dbGrades.find({class_uuid: dbClass.uuid}, {session})
          try {
            for await (const entry of gradeEntryCursor) {
              entry.assignments = entry.assignments.filter(a => a.assignment_uuid !== assignmentUuid)
              await dbGrades.replaceOne({class_uuid: dbClass.uuid, student_uuid: entry.student_uuid}, entry, {session})
            }
          } finally {
            await gradeEntryCursor.close()
          }

          return {
            statusCode: 200,
            body: {
              status: 'Assignment deleted'
            }
          }
        case 'edit_assignment':
          const validAssignment = typeof req.body.assignment === 'object' &&
            typeof req.body.assignment.name === 'string' &&
            typeof req.body.assignment.uuid === 'string' &&
            typeof req.body.assignment.categoryUuid === 'string' &&
            typeof req.body.assignment.max_points === 'number'
          if (!validAssignment) {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment'
              }
            }
          }
          const assignment: EditAssignment = req.body.assignment
          if (assignment.name.length < 1) {
            return {
              statusCode: 400,
              body: {
                status: 'Assignment name must be as least one char'
              }
            }
          }

          if (!Array.isArray(req.body.grades)) {
            return {
              statusCode: 400,
              body: {
                status: 'Grades is not an array'
              }
            }
          }

          for (let grade of req.body.grades) {
            const gradeValid = typeof grade.studentUuid === 'string' &&
              (typeof grade.grade === 'number' || grade.grade === null)
            if (!gradeValid) {
              return {
                statusCode: 400,
                body: {
                  status: 'Bad grade'
                }
              }
            }
          }

          const grades: SingleGradeEntry[] = req.body.grades

          const assignmentPresent =
            dbClass.category.some(
              category => category.assignments.some(a => a.uuid === assignment.uuid))

          if (!assignmentPresent) {
            return {
              statusCode: 404,
              body: {
                status: 'Assignment not found'
              }
            }
          }

          if (!dbClass.category.some(c => c.uuid === assignment.categoryUuid)) {
            return {
              statusCode: 404,
              body: {
                status: 'Category not found'
              }
            }
          }

          for (const category of dbClass.category) {
            category.assignments = category.assignments.filter(a => a.uuid !== assignment.uuid)
          }

          for (const category of dbClass.category) {
            if (category.uuid === assignment.categoryUuid) {
              category.assignments.push({
                max_points: assignment.max_points,
                name: assignment.name,
                uuid: assignment.uuid
              })
              break
            }
          }

          for (const grade of grades) {
            if (!dbClass.students.includes(grade.studentUuid)) {
              return {
                statusCode: 400,
                body: {
                  status: 'Attempted to set score for nonexistent student'
                }
              }
            }
          }

          for (const grade of grades) {
            let dbGradeEntry = await dbGrades.findOne({class_uuid: dbClass.uuid, student_uuid: grade.studentUuid}, {session})
            if (!dbGradeEntry) {
              dbGradeEntry = {
                class_uuid: dbClass.uuid,
                student_uuid: grade.studentUuid,
                assignments: []
              }
            }
            if (grade.grade) {
              for (const dbGradeAssignment of dbGradeEntry.assignments) {
                if (dbGradeAssignment.assignment_uuid === assignment.uuid) {
                  dbGradeAssignment.grade = grade.grade
                }
              }
            } else {
              dbGradeEntry.assignments = dbGradeEntry.assignments.filter(a => a.assignment_uuid !== assignment.uuid)
            }

            await dbGrades.replaceOne({student_uuid: grade.studentUuid, class_uuid: dbClass.uuid}, dbGradeEntry, {session, upsert: true})
          }

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})
          return {
            statusCode: 200,
            body: {
              status: 'Grades updated'
            }
          }
      }
      return {
        statusCode: 400,
        body: {
          status: 'Unknown command'
        }
      }
    })
  })
}