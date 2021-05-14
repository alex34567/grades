import bTable from '../../../../styles/BoarderedTable.module.css'
import styles from '../../../../styles/StudentClassView.module.css'
import {GetServerSideProps} from 'next'
import {ClientClass, ClientUser} from '../../../../lib/common/types'
import {fractionToLetterGrade, fractionToPercent, fractionToString} from '../../../../lib/common/fraction';
import React from 'react'
import {genStudentClassView} from "../../../../lib/server/class";
import Error from "next/error";
import TopBar from "../../../../lib/client/TopBar";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genStudentClassView(context)
}

interface ClassViewProps {
  classView: ClientClass
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
      assignments.push(
        <tr key={assignment.uuid}>
          <td>{assignment.name}</td>
          <td>{fractionToPercent(assignment.grade)}</td>
          <td>{fractionToLetterGrade(assignment.grade)}</td>
          <td>{fractionToString(assignment.grade)}</td>
          <td>{fractionToString(assignment.weighted_grade)}</td>
        </tr>
      )
    }
    assignments.push(
      <tr key='Total'>
        <th scope='row'>Total</th>
        <td>{fractionToPercent(category.grade)}</td>
        <td>{fractionToLetterGrade(category.grade)}</td>
        <td>{fractionToString(category.grade)}</td>
        <td>{fractionToString(category.weighted_grade)}</td>
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

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`Class: ${props.classView.name}`}</h1>
      <h2>{`Student: ${props.classView.student_name}`}</h2>
      <h2>{`Professor: ${props.classView.professor_name}`}</h2>
      <table className={styles.AssignmentTable + ' ' + bTable.BTable}>
        <tbody>
          {categories}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={5}>Class Total</th>
          </tr>
          <tr>
            <th scope='row'>Total</th>
            <td>{fractionToPercent(props.classView.grade)}</td>
            <td>{fractionToLetterGrade(props.classView.grade)}</td>
            <td>{fractionToString(props.classView.grade)}</td>
            <td>{fractionToString(props.classView.grade)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}