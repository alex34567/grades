import MainTable from '../../../../styles/MainTable.module.css'
import {GetServerSideProps} from 'next'
import {ClientStudentClass, ClientUser, UserType} from '../../../../lib/common/types'
import {
  fractionToLetterGrade,
  fractionToPercent,
  fractionToString,
  millipointToString
} from '../../../../lib/common/fraction';
import React from 'react'
import {genStudentClassView} from "../../../../lib/server/class";
import Error from "next/error";
import TopBar from "../../../../lib/client/TopBar";
import Link from 'next/link'

export const getServerSideProps: GetServerSideProps = async (context) => {
  return (await genStudentClassView(context))!
}

export interface ClassViewProps {
  classView: ClientStudentClass
  user: ClientUser
}

export default function ClassView(rawProps: ClassViewProps | {error: number}) {
  if (typeof (rawProps as any).error !== 'undefined') {
    return <Error statusCode={(rawProps as any).error}/>
  }
  const props = rawProps as ClassViewProps

  const categories = []
  for (const category of props.classView.categories) {
    const assignments = []
    for (const assignment of category.assignments) {
      let scoreString = `/ ${millipointToString(assignment.max_points)}`
      if (assignment.grade) {
        scoreString = fractionToString(assignment.grade)
      }

      assignments.push(
        <tr key={assignment.uuid}>
          <td>{assignment.name}</td>
          <td>{assignment.grade && fractionToPercent(assignment.grade)}</td>
          <td>{assignment.grade && fractionToLetterGrade(assignment.grade)}</td>
          <td>{scoreString}</td>
          <td>{assignment.weighted_grade && fractionToString(assignment.weighted_grade)}</td>
        </tr>
      )
    }
    assignments.push(
      <tr key='Total'>
        <th scope='row'>Total</th>
        <td>{category.grade && fractionToPercent(category.grade)}</td>
        <td>{category.grade && fractionToLetterGrade(category.grade)}</td>
        <td>{category.grade && fractionToString(category.grade)}</td>
        <td>{category.weighted_grade && fractionToString(category.weighted_grade)}</td>
      </tr>
    )
    categories.push(
      <React.Fragment key={category.uuid}>
        <tr>
          <th colSpan={5}>{category.name}</th>
        </tr>
        <tr>
          <th scope='col'>Name</th>
          <th scope='col'>Grade</th>
          <th scope='col'>Letter</th>
          <th scope='col'>Score</th>
          <th scope='col'>Weighted Score</th>
        </tr>
        {assignments}
      </React.Fragment>
    )
  }

  let gradeString = 'Grade: N/A'

  if (props.classView.grade) {
    gradeString = `Grade: ${fractionToLetterGrade(props.classView.grade)} (${fractionToPercent(props.classView.grade)})`
  }

  let backLink
  if (props.user.type !== UserType.student) {
    backLink = <Link href={`/classes/${props.classView.uuid}`}>Back</Link>
  }

  return (
    <div>
      <TopBar user={props.user}/>
      {backLink}
      <h1>{`Class: ${props.classView.name}`}</h1>
      <h2>{`Student: ${props.classView.student_name}`}</h2>
      <h2>{`Professor: ${props.classView.professor_name}`}</h2>
      <h3>{gradeString}</h3>
      <table className={MainTable.MainTable}>
        <tbody>
          {categories}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={5}>Class Total</th>
          </tr>
          <tr>
            <th scope='row'>Total</th>
            <td>{props.classView.grade && fractionToPercent(props.classView.grade)}</td>
            <td>{props.classView.grade && fractionToLetterGrade(props.classView.grade)}</td>
            <td>{props.classView.grade && fractionToString(props.classView.grade)}</td>
            <td>{props.classView.grade && fractionToString(props.classView.grade)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}