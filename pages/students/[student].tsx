import MOCK_STUDENT from '../../lib/mockStudent.json'
import styles from '../../styles/StudentLanding.module.css'
import bTable from '../../styles/BoarderedTable.module.css'
import {fractionToLetterGrade, fractionToPercent, fractionToString} from '../../lib/fraction'
import Link from 'next/link'
import {useRouter} from "next/router";

export default function StudentPage() {
  const router = useRouter()
  const classRows = []

  for (const studentClass of MOCK_STUDENT.classes) {
    const classUrl = `/students/${router.query.student}/classes/${studentClass.id}`
    classRows.push(
      <tr key={studentClass.id}>
        <td><Link href={classUrl}><a>{studentClass.name}</a></Link></td>
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
      <table className={styles.ClassList + ' ' + bTable.BTable}>
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