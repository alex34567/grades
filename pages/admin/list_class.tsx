import {GetServerSideProps} from "next";
import {UserType} from "../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../lib/client/ErrorHandler";
import React from "react";
import {getClassList} from "../../lib/server/class";
import {htmlTransactionWithUser} from "../../lib/server/util";
import {connectToDB} from "../../lib/server/db";
import ClassList, {ClassListProps} from "../../lib/client/ClassList";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, user) => {
    if (user.type !== UserType.admin) {
      return {
        props: {
          error: 403
        }
      }
    }

    return await getClassList(client, session, user)
  })
}

export default function Main(props: ClassListProps | HtmlError) {
  return <ErrorHandler dispatch={ClassList} props={props}/>
}