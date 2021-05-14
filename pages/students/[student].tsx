import styles from '../../styles/StudentLanding.module.css'
import bTable from '../../styles/BoarderedTable.module.css'
import {fractionToLetterGrade, fractionToPercent, fractionToString} from '../../lib/common/fraction'
import Link from 'next/link'
import TopBar from "../../lib/client/TopBar";
import {GetServerSideProps} from "next";
import {connectToDB} from "../../lib/server/db";
import {userFromSession} from "../../lib/server/user";
import {ClientUser} from "../../lib/common/types";
import {ClassOverview, genStudentClassOverview} from "../../lib/server/class";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const client = await connectToDB()
  let user: ClientUser | {error: unknown} | null = await userFromSession(client, context.req, context.res)
  if (typeof user.error !== 'undefined') {
    return {
      redirect: {destination: `/login?redirect=${encodeURIComponent(context.req.url!)}`, permanent: false}
    }
  }

  const overview = await genStudentClassOverview(client, user as ClientUser)

  return {
    props: {user, classOverview: overview}
  }
}

export default function StudentPage(props: {user: ClientUser, classOverview: ClassOverview[]}) {
  const classRows = []

  for (const studentClass of props.classOverview) {
    const classUrl = `/students/${props.user.uuid}/classes/${studentClass.class_uuid}`
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
      <h1>{`Student Name: ${props.user.name}`}</h1>
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