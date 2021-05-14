import MOCK_STUDENT from '../../../../lib/mockStudent.json'
import bTable from '../../../../styles/BoarderedTable.module.css'
import styles from '../../../../styles/StudentClassView.module.css'
import {GetServerSideProps} from 'next'
import {Class} from '../../../../lib/common/types'
import {fractionToLetterGrade, fractionToPercent, fractionToString} from '../../../../lib/common/fraction';
import React from 'react'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const thisClass = MOCK_STUDENT.classes.filter(x => String(x.id) === context.query.classId)[0]

  if (!thisClass) {
    return {
      notFound: true
    }
  }

  return {
    props: {thisClass},
  }
}

export default function ClassView(props: { thisClass: Class }) {
  const categories = []
  for (const category of props.thisClass.categories) {
    const assignments = []
    for (const assignment of category.assignments) {
      assignments.push(
        <tr key={assignment.id}>
          <td>{assignment.name}</td>
          <td>{fractionToPercent(assignment.grade)}</td>
          <td>{fractionToLetterGrade(assignment.grade)}</td>
          <td>{fractionToString(assignment.grade)}</td>
        </tr>
      )
    }
    assignments.push(
      <tr key='Total'>
        <th scope='row'>Total</th>
        <td>{fractionToPercent(category.grade)}</td>
        <td>{fractionToLetterGrade(category.grade)}</td>
        <td>{fractionToString(category.grade)}</td>
      </tr>
    )
    categories.push(
      <React.Fragment key={category.id}>
        <tr>
          <th colSpan={4}>{category.name}</th>
        </tr>
        <tr>
          <th scope='col'>Name</th>
          <th scope='col'>Grade</th>
          <th scope='col'>Letter</th>
          <th scope='col'>Score</th>
        </tr>
        {assignments}
      </React.Fragment>
    )
  }
  return (
    <div>
      <h1>{`Class: ${props.thisClass.name}`}</h1>
      <h2>{`Professor: ${props.thisClass.professor}`}</h2>
      <table className={styles.AssignmentTable + ' ' + bTable.BTable}>
        <tbody>
          {categories}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={4}>Class Total</th>
          </tr>
          <tr>
            <th scope='row'>Total</th>
            <td>{fractionToPercent(props.thisClass.grade)}</td>
            <td>{fractionToLetterGrade(props.thisClass.grade)}</td>
            <td>{fractionToString(props.thisClass.grade)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

  )
}