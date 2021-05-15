import styles from '../../styles/StudentLanding.module.css'
import bTable from '../../styles/BoarderedTable.module.css'
import {fractionToLetterGrade, fractionToPercent, fractionToString} from '../../lib/common/fraction'
import Link from 'next/link'
import TopBar from "../../lib/client/TopBar";
import {GetServerSideProps} from "next";
import {ClassOverview, ClientUser} from "../../lib/common/types";
import {genStudentClassOverview} from "../../lib/server/class";
import Error from 'next/error'
import {connectToDB} from "../../lib/server/db";
import {htmlTransactionWithUser} from "../../lib/server/util";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const client = await connectToDB()
  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    return await genStudentClassOverview(context, client, session, false, thisUser)
  })
}

export interface StudentPageProps {
  user: ClientUser
  studentName: string
  studentUuid: string
  classOverview: ClassOverview[]
}

export default function StudentPage(rawProps: StudentPageProps | {error: number}) {
  if (typeof (rawProps as any).error !== 'undefined') {
    return <Error statusCode={(rawProps as any).error}/>
  }
  const props = rawProps as StudentPageProps

  const classRows = []

  for (const studentClass of props.classOverview) {
    const classUrl = `/students/${props.studentUuid}/classes/${studentClass.class_uuid}`
    classRows.push(
      <tr key={studentClass.class_uuid}>
        <td><Link href={classUrl}><a>{studentClass.name}</a></Link></td>
        <td>{studentClass.professor_name}</td>
        <td>{fractionToPercent(studentClass.grade)}</td>
        <td>{fractionToLetterGrade(studentClass.grade)}</td>
        <td>{fractionToString(studentClass.grade)}</td>
      </tr>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`Student Name: ${props.studentName}`}</h1>
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