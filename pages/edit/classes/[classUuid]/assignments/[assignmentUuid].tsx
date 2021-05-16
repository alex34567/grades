import {ClassCategory, ClientGradeEntry, ClientUser, EditAssignment} from "../../../../../lib/common/types";
import {GetServerSideProps} from "next";
import {genProfessorAssignmentView} from "../../../../../lib/server/class";
import Error from "next/error";
import React, {ChangeEvent, useMemo, useState} from "react";
import {millipointToString, stringToMillipoint} from "../../../../../lib/common/fraction";
import TopBar from "../../../../../lib/client/TopBar";
import MainTable from "../../../../../styles/MainTable.module.css"
import Link from 'next/link'
import * as Immutable from 'immutable'
import Box from '../../../../../styles/InputBox.module.css'
import {sendApiPostRequest} from "../../../../../lib/client/util";
import {useRouter} from "next/router";

export interface EditAssignmentProps {
  assignment: EditAssignment
  classUuid: string
  categories: ClassCategory[]
  grades: ClientGradeEntry[]
  user: ClientUser
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genProfessorAssignmentView(context)
}

export default function ModifyAssignment(rawProps: EditAssignmentProps | {error: number}) {
  const props = rawProps as EditAssignmentProps

  const error = typeof (rawProps as any).error !== 'undefined'

  function initGradeValues() {
    if (error) {
      return Immutable.Map<string, string>()
    }

    const ret: [string, string][] = []
    for (const student of props.grades) {
      let gradeValue = ''
      if (typeof student.grade === 'number') {
        gradeValue = millipointToString(student.grade)
      }

      ret.push([student.studentUuid, gradeValue])
    }
    return Immutable.Map<string, string>(ret)
  }

  const router = useRouter()
  const [status, setStatus] = useState<string>()
  const [updating, setUpdating] = useState<boolean>()
  const [gradeValues, setGradeValues] = useState<Immutable.Map<string, string>>(initGradeValues)
  const [name, setName] = useState(props.assignment.name)
  const [maxPoints, setMaxPoints] = useState(millipointToString(props.assignment.max_points))
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (error) {
      return ''
    }
    return props.assignment.categoryUuid
  })
  const sortedGrades = useMemo(() => {
    const ret = props.grades.concat()
    ret.sort((lhs, rhs) => lhs.studentName.localeCompare(rhs.studentName))
    return ret
  }, [props.grades])

  function onChangeName(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function onChangePoints(event: ChangeEvent<HTMLInputElement>) {
    setMaxPoints(event.target.value)
  }

  function onChangeCategory(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedCategory(event.target.value)
  }

  async function onDelete() {
    if (!confirm(`Are you sure that you want to delete ${props.assignment.name}?`)) {
      return
    }

    setUpdating(true)
    setStatus('Deleting')

    try {
      await sendApiPostRequest(props.user, '/api/class', {
        command: 'delete_assignment',
        classUuid: props.classUuid,
        assignmentUuid: props.assignment.uuid
      })

      await router.push(`/edit/classes/${props.classUuid}`)
    } catch (e) {
      setStatus(e.toString())
      setUpdating(false)
    }
  }

  async function onUpdate() {
    setUpdating(true)
    setStatus('Updating')

    const newAssignment = {
      name,
      uuid: props.assignment.uuid,
      categoryUuid: selectedCategory,
      max_points: stringToMillipoint(maxPoints)!
    }

    const grades = []
    for (const [studentUuid, rawGrade] of gradeValues.entries()) {
      let grade = null
      if (rawGrade.trim() !== '') {
        grade = stringToMillipoint(rawGrade)!
      }
      grades.push({studentUuid, grade})
    }

    try {
      const ret = await sendApiPostRequest(props.user, '/api/class', {
        command: 'edit_assignment',
        classUuid: props.classUuid,
        assignment: newAssignment,
        grades
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setUpdating(false)
    }
  }

  if (typeof (rawProps as any).error !== 'undefined') {
    return <Error statusCode={(rawProps as any).error}/>
  }

  const nameValid = name.length > 0
  const maxPointsValid = typeof stringToMillipoint(maxPoints) === 'number'

  const studentList = []
  let buttonValid = nameValid && maxPointsValid && !updating
  for (const student of sortedGrades) {
    const gradeValue = gradeValues.get(student.studentUuid)!
    let validMillipoint = gradeValue.trim() === '' || typeof stringToMillipoint(gradeValue) === 'number'
    buttonValid &&= validMillipoint

    let className = Box.Box
    if (!validMillipoint) {
      className = Box.Error
    }

    function onChangeGrade(event: ChangeEvent<HTMLInputElement>) {
      setGradeValues(gradeValues.set(student.studentUuid, event.target.value))
    }

    studentList.push(
      <tr key={student.studentUuid}>
        <td>{student.studentName}</td>
        <td>
          <input type='text' className={className} onChange={onChangeGrade} value={gradeValues.get(student.studentUuid)}/>
        </td>
      </tr>
    )
  }

  let nameClassName = Box.Box
  if (!nameValid) {
    nameClassName = Box.Error
  }

  let pointsClassName = Box.Box
  if (!maxPointsValid) {
    pointsClassName = Box.Error
  }

  const categories = []
  for (const category of props.categories) {
    categories.push(
      <option key={category.uuid} value={category.uuid}>{category.name}</option>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href={`/edit/classes/${props.classUuid}`}>Back</Link>
      <br/>
      <h3>{status}</h3>
      <br/>
      <label>Assignment Name: </label>
      <input className={nameClassName} type='text' onChange={onChangeName} value={name}/>
      <br/>
      <label>Max Points: </label>
      <input className={pointsClassName} type='text' onChange={onChangePoints} value={maxPoints}/>
      <br/>
      <label>Category</label>
      <select onChange={onChangeCategory} value={selectedCategory}>{categories}</select>
      <table className={MainTable.MainTable}>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {studentList}
        </tbody>
      </table>
      <br/>
      <button disabled={updating} onClick={onDelete}>Delete</button>
      <button disabled={!buttonValid} onClick={onUpdate}>Update</button>
      <p>Grades are specified in .001 increments of a single point.</p>
    </div>
  )
}