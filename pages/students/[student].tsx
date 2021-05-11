import MOCK_STUDENT from '../../src/mockStudent.json'
import styles from '../../styles/StudentLanding.module.css'
import {fractionToLetterGrade, fractionToPercent, fractionToString} from "../../src/fraction";

export default function StudentPage() {
  const classRows = []

  for (const studentClass of MOCK_STUDENT.classes) {
    classRows.push(
      <tr key={studentClass.id}>
        <td>{studentClass.name}</td>
        <td>{studentClass.professor}</td>
        <td>{fractionToPercent(studentClass.grade)}</td>
        <td>{fractionToLetterGrade(studentClass.grade)}</td>
        <td>{fractionToString(studentClass.grade)}</td>
      </tr>
    )
  }

  return (
    <div>
      <h1>{`Student Name: ${MOCK_STUDENT.name}`}</h1>
      <table className={styles.ClassList}>
        <thead>
          <tr>
            <th scope='col' className={styles.ClassName}>Class Name</th>
            <th scope='col' className={styles.ProfName}>Professor</th>
            <th scope='col' className={styles.Grade}>Grade</th>
            <th scope='col' className={styles.Letter}>Letter</th>
            <th scope='col' className={styles.Score}>Score</th>
          </tr>
        </thead>
        <tbody>
          {classRows}
        </tbody>
      </table>
    </div>
  )
}