import {GetServerSideProps} from "next";
import {userList} from "../../lib/server/admin";
import {ClientUser, UserInfo, UserType} from "../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../lib/client/ErrorHandler";
import React from "react";
import MainTable from '../../styles/MainTable.module.css'
import TopBar from "../../lib/client/TopBar";
import Link from "next/link";

export interface UserListProps {
  user: ClientUser
  userList: UserInfo[]
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await userList(context)
}

export function UserList(props: UserListProps) {
  const users = []
  for (const user of props.userList) {
    let type
    switch (user.type) {
      case UserType.admin:
        type = 'Admin'
        break
      case UserType.professor:
        type = 'Professor'
        break
      case UserType.student:
        type = 'Student'
        break
    }

    users.push(
      <tr key={user.uuid}>
        <td>{user.name}</td>
        <td>{user.login_name}</td>
        <td>{user.uuid}</td>
        <td>{type}</td>
      </tr>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href='/admin'>Back</Link>
      <table className={MainTable.MainTable}>
        <thead>
        <tr>
          <th scope='col'>Name</th>
          <th scope='col'>Username</th>
          <th scope='col'>Uuid</th>
          <th scope='col'>Type</th>
        </tr>
        </thead>
        <tbody>
        {users}
        </tbody>
      </table>
    </div>

  )
}


export default function Main(props: UserListProps | HtmlError) {
  return <ErrorHandler dispatch={UserList} props={props}/>
}