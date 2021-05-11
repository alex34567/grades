import MOCK_STUDENT from '../../src/mockStudent.json'
import styles from '../../styles/StudentLanding.module.css'
import {fractionToLetterGrade, fractionToPercent, fractionToString} from '../../src/fraction'

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
        <colgroup>
          <col className={styles.ClassName} span={1}/>
          <col className={styles.ProfName} span={1}/>
          <col className={styles.Grade} span={1}/>
          <col className={styles.Letter} span={1}/>
          <col className={styles.Score} span={1}/>
        </colgroup>

        <thead>
          <tr>
            <th scope='col'>Class Name</th>
            <th scope='col'>Professor</th>
            <th scope='col'>Grade</th>
            <th scope='col'>Letter</th>
            <th scope='col'>Score</th>
          </tr>
        </thead>
        <tbody>
          {classRows}
        </tbody>
      </table>
    </div>
  )
}