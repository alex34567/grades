import {GetServerSideProps} from "next";
import {authClassAdmin} from "../../../lib/server/admin";
import {ClassAdminProps} from "../../../lib/common/types";
import TopBar from "../../../lib/client/TopBar";
import Link from "next/link";
import ErrorHandler, {HtmlError} from "../../../lib/client/ErrorHandler";
import React from "react";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await authClassAdmin(context)
}

export function ClassAdmin(props: ClassAdminProps) {
  const urlPrefix = `/classes/${props.classUuid}`

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`Admin Tools for ${props.className}`}</h1>
      <Link href={urlPrefix}>Back</Link>
      <br/>
      <Link href={`${urlPrefix}/admin/add_student`}>Add Students</Link>
      <br/>
      <Link href={`${urlPrefix}/admin/drop_student`}>Drop Students</Link>
      <br/>
      <br/>
      <Link href={`${urlPrefix}/admin/delete_class`}>DELETE THIS CLASS!</Link>
    </div>
  )
}

export default function Main(props: ClassAdminProps | HtmlError) {
  return <ErrorHandler dispatch={ClassAdmin} props={props}/>
}