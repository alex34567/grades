import React from 'react'
import TopBar from "../lib/client/TopBar";
import {GetServerSideProps} from "next";
import {connectToDB} from "../lib/server/db";
import {UserType} from "../lib/common/types";
import {genStudentClassOverview} from "../lib/server/class";
import StudentPage from "./students/[student]";
import {htmlTransactionWithUser} from "../lib/server/util";

interface IndexProps {
  type: HomepageTypes
  props: any
}

enum HomepageTypes {
  loggedOut,
  student
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, user) => {
    if (user.type === UserType.student) {
      const studentProps = await genStudentClassOverview(context, client, session, true, user)
      return {
        props: {
          type: HomepageTypes.student,
          props: studentProps.props
        }
      }
    }

    return {
      props: {
        type: HomepageTypes.loggedOut,
        props: {}
      }
    }
  }, async () => {
    return {
      props: {
        type: HomepageTypes.loggedOut,
        props: {}
      }
    }
  })
}

export function LoggedOut() {
  return (
    <div>
      <TopBar user={null}/>
      <p>Welcome to grades!</p>
    </div>
  )
}

export default function Index(props: IndexProps) {
  let Component: React.FunctionComponent<any>
  switch (props.type) {
    case HomepageTypes.loggedOut:
      Component = LoggedOut
      break
    case HomepageTypes.student:
      Component = StudentPage
      break
  }
  return <Component {...props.props}/>
}
