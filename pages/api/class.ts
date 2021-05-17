import {NextApiRequest, NextApiResponse} from "next";
import {LoginResponse} from "./login";
import {connectToDB} from "../../lib/server/db";
import {jsonTransactionWithUser} from "../../lib/server/util";
import {DbClass, DbGradeEntry, withFindClassJson} from "../../lib/server/class";
import {
  Assignment,
  CategoryMeta,
  ClassCategory,
  EditAssignment,
  SingleGradeEntry,
  UserType
} from "../../lib/common/types";
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
        case 'create_assignment': {
          if (typeof req.body.name !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment name'
              }
            }
          }
          const assignmentName: string = req.body.name

          if (typeof req.body.category !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment category'
              }
            }
          }
          const categoryUuid: string = req.body.category

          if (typeof req.body.maxPoints !== 'number') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad max points'
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
        }
        case 'delete_assignment': {
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
        }
        case 'edit_assignment': {
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

          const fromCategory =
            dbClass.category.find(category => category.assignments.some(a => a.uuid === assignment.uuid))

          if (!fromCategory) {
            return {
              statusCode: 404,
              body: {
                status: 'Assignment not found'
              }
            }
          }

          const toCategory = dbClass.category.find(c => c.uuid === assignment.categoryUuid)

          if (!toCategory) {
            return {
              statusCode: 404,
              body: {
                status: 'Category not found'
              }
            }
          }

          if (fromCategory === toCategory) {
            const dbAssignment = toCategory.assignments.find(a => a.uuid === assignment.uuid)!
            dbAssignment.name = assignment.name
            dbAssignment.max_points = assignment.max_points
          } else {
            fromCategory.assignments = fromCategory.assignments.filter(a => a.uuid !== assignment.uuid)

            toCategory.assignments.push({
              max_points: assignment.max_points,
              name: assignment.name,
              uuid: assignment.uuid
            })
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
            let dbGradeEntry = await dbGrades.findOne({
              class_uuid: dbClass.uuid,
              student_uuid: grade.studentUuid
            }, {session})
            if (!dbGradeEntry) {
              dbGradeEntry = {
                class_uuid: dbClass.uuid,
                student_uuid: grade.studentUuid,
                assignments: []
              }
            }
            dbGradeEntry.assignments = dbGradeEntry.assignments.filter(a => a.assignment_uuid !== assignment.uuid)
            if (grade.grade) {
              dbGradeEntry.assignments.push({
                assignment_uuid: assignment.uuid,
                grade: grade.grade
              })
            }

            await dbGrades.replaceOne({
              student_uuid: grade.studentUuid,
              class_uuid: dbClass.uuid
            }, dbGradeEntry, {session, upsert: true})
          }

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})
          return {
            statusCode: 200,
            body: {
              status: 'Grades updated'
            }
          }
        }
        case 'reorder_assignments': {
          if (typeof req.body.categoryUuid !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad category uuid'
              }
            }
          }
          const categoryUuid: string = req.body.categoryUuid

          const category = dbClass.category.find(c => c.uuid === categoryUuid)
          if (!category) {
            return {
              statusCode: 404,
              body: {
                status: 'Category not found'
              }
            }
          }

          if (!Array.isArray(req.body.assignmentUuids)) {
            return {
              statusCode: 400,
              body: {
                status: 'Bad assignment uuids'
              }
            }
          }

          for (let uuid of req.body.assignmentUuids) {
            if (typeof uuid !== 'string') {
              return {
                statusCode: 400,
                body: {
                  status: 'Bad assignment uuids'
                }
              }
            }
          }

          const assignmentUuids: string[] = req.body.assignmentUuids

          if (category.assignments.length !== assignmentUuids.length) {
            return {
              statusCode: 400,
              body: {
                status: 'Assignment lengths do not match'
              }
            }
          }

          const uuidToAssignment = new Map<string, Assignment>()

          for (let assignment of category.assignments) {
            uuidToAssignment.set(assignment.uuid, assignment)
          }

          const sortedUuids = assignmentUuids.concat()
          sortedUuids.sort()
          for (let i = 0; i < sortedUuids.length - 1; i++) {
            if (sortedUuids[i] === sortedUuids[i + 1]) {
              return {
                statusCode: 400,
                body: {
                  status: 'Duplicate assignment uuids'
                }
              }
            }
          }

          const newAssignmentList = []
          for (let uuid of assignmentUuids) {
            const assignment = uuidToAssignment.get(uuid)
            if (!assignment) {
              return {
                statusCode: 400,
                body: {
                  status: 'Unknown assignment'
                }
              }
            }
            newAssignmentList.push(assignment)
          }

          category.assignments = newAssignmentList

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})

          return {
            statusCode: 200,
            body: {
              status: 'Assignments reordered'
            }
          }
        }
        case 'reorder_categories': {
          if (!Array.isArray(req.body.categoryUuids)) {
            return {
              statusCode: 400,
              body: {
                status: 'Bad category uuids'
              }
            }
          }

          for (let uuid of req.body.categoryUuids) {
            if (typeof uuid !== 'string') {
              return {
                statusCode: 400,
                body: {
                  status: 'Bad category uuids'
                }
              }
            }
          }

          const categoryUuids: string[] = req.body.categoryUuids

          if (dbClass.category.length !== categoryUuids.length) {
            return {
              statusCode: 400,
              body: {
                status: 'Category lengths do not match'
              }
            }
          }

          const uuidToCategory = new Map<string, ClassCategory>()

          for (let category of dbClass.category) {
            uuidToCategory.set(category.uuid, category)
          }

          const sortedUuids = categoryUuids.concat()
          sortedUuids.sort()
          for (let i = 0; i < sortedUuids.length - 1; i++) {
            if (sortedUuids[i] === sortedUuids[i + 1]) {
              return {
                statusCode: 400,
                body: {
                  status: 'Duplicate category uuids'
                }
              }
            }
          }

          const newCategoryList = []
          for (let uuid of categoryUuids) {
            const category = uuidToCategory.get(uuid)
            if (!category) {
              return {
                statusCode: 400,
                body: {
                  status: 'Unknown category'
                }
              }
            }
            newCategoryList.push(category)
          }

          dbClass.category = newCategoryList

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})

          return {
            statusCode: 200,
            body: {
              status: 'Categories reordered'
            }
          }
        }
        case 'new_category': {
          if (typeof req.body.name !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad name'
              }
            }
          }

          const name: string = req.body.name

          if (typeof req.body.weight !== 'number') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad weight'
              }
            }
          }
          const weight: number = req.body.weight

          dbClass.category.push({
            name,
            weight,
            uuid: uuidv4(),
            assignments: []
          })

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})

          return {
            statusCode: 200,
            body: {
              status: 'Category created'
            }
          }
        }
        case 'edit_category': {
          const validCategory = typeof req.body.categoryMeta === 'object' &&
            typeof req.body.categoryMeta.name === 'string' &&
            req.body.categoryMeta.name.length > 0 &&
            typeof req.body.categoryMeta.uuid === 'string' &&
            typeof req.body.categoryMeta.weight === 'number'

          if (!validCategory) {
            return {
              statusCode: 400,
              body: {
                status: 'Bad category'
              }
            }
          }

          const categoryMeta: CategoryMeta = req.body.categoryMeta

          const dbCategory = dbClass.category.find(c => c.uuid === categoryMeta.uuid)
          if (!dbCategory) {
            return {
              statusCode: 404,
              body: {
                status: 'Category not found'
              }
            }
          }

          dbCategory.name = categoryMeta.name
          dbCategory.weight = categoryMeta.weight

          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})

          return {
            statusCode: 200,
            body: {
              status: 'Category updated'
            }
          }
        }
        case 'delete_category': {
          if (typeof req.body.categoryUuid !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad category uuid'
              }
            }
          }

          const categoryUuid: string = req.body.categoryUuid

          const dbCategory = dbClass.category.find(c => c.uuid === categoryUuid)
          if (!dbCategory) {
            return {
              statusCode: 404,
              body: {
                status: 'Category already gone'
              }
            }
          }

          const assignmentUuids = new Set<string>()
          for (const assignment of dbCategory.assignments) {
            assignmentUuids.add(assignment.uuid)
          }

          const gradeCursor = dbGrades.find({class_uuid: dbClass.uuid}, {session})
          try {
            for await (let gradeEntry of gradeCursor) {
              gradeEntry.assignments = gradeEntry.assignments.filter(a => !assignmentUuids.has(a.assignment_uuid))
              await dbGrades.replaceOne(
                {class_uuid: gradeEntry.class_uuid, student_uuid: gradeEntry.student_uuid}, gradeEntry, {session})
            }
          } finally {
            await gradeCursor.close()
          }

          dbClass.category = dbClass.category.filter(c => c.uuid !== categoryUuid)
          await classes.replaceOne({uuid: dbClass.uuid}, dbClass, {session})

          return {
            statusCode: 200,
            body: {
              status: 'Category gone'
            }
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