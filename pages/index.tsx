import React from 'react'
import TopBar from "../lib/client/TopBar";
import {GetServerSideProps} from "next";
import {connectToDB} from "../lib/server/db";
import {userFromSession} from "../lib/server/user";
import {ClientUser, UserType} from "../lib/common/types";
import {genStudentClassOverview} from "../lib/server/class";
import StudentPage from "./students/[student]";

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

  const rawUser = await userFromSession(client, context.req, context.res)

  if (!rawUser.error) {
    const user = rawUser as ClientUser
    if (user.type === UserType.student) {
      const studentProps = await genStudentClassOverview(context, true)
      return {
        props: {
          type: HomepageTypes.student,
          props: studentProps.props
        }
      }
    }
  }

  return {
    props: {
      type: HomepageTypes.loggedOut,
      props: {}
    }
  }
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
