import {GetServerSideProps} from "next";
import {ClientUser} from "../lib/common/types";
import ErrorHandler, {HtmlError} from "../lib/client/ErrorHandler";
import React from "react";
import {authAdmin} from "../lib/server/admin";
import TopBar from "../lib/client/TopBar";
import Link from 'next/link'

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await authAdmin(context)
}

export function AdminTools(props: {user: ClientUser}) {
  return (
    <div>
      <TopBar user={props.user}/>
      <h1>Admin Tools</h1>
      <Link href='/admin/new_user'>New User</Link>
      <br/>
      <Link href='/admin/force_change_password'>Force Change Password</Link>
      <br/>
      <Link href='/admin/delete_user'>Delete User</Link>
      <br/>
      <Link href='/admin/list_user'>List User</Link>
      <br/>
      <Link href='/admin/create_class'>Create Class</Link>
      <br/>
      <Link href='/admin/list_class'>Class List</Link>
    </div>
  )
}

export default function Main(props: { user: ClientUser } | HtmlError) {
  return <ErrorHandler dispatch={AdminTools} props={props}/>
}
