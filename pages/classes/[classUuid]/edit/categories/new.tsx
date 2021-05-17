import {ClientUser} from "../../../../../lib/common/types";
import {GetServerSideProps} from "next";
import {genNewCategoryView} from "../../../../../lib/server/class";
import ErrorHandler, {HtmlError} from "../../../../../lib/client/ErrorHandler";
import React, {ChangeEvent, useState} from "react";
import {stringToMillipoint} from "../../../../../lib/common/fraction";
import Box from "../../../../../styles/InputBox.module.css";
import TopBar from "../../../../../lib/client/TopBar";
import Link from "next/link";
import {sendApiPostRequest} from "../../../../../lib/client/util";
import {useRouter} from "next/router";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genNewCategoryView(context)
}

export interface CategoryNewProps {
  classUuid: string,
  user: ClientUser
}

export function CategoryNew(props: CategoryNewProps) {
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('0')
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState('')
  const router = useRouter()

  function onChangeName(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function onChangeWeight(event: ChangeEvent<HTMLInputElement>) {
    setWeight(event.target.value)
  }

  async function onNew() {
    setUpdating(true)
    setStatus('Creating')

    try {
      await sendApiPostRequest(props.user, '/api/class', {
        command: 'new_category',
        classUuid: props.classUuid,
        name: name,
        weight: stringToMillipoint(weight)
      })
      await router.push(`/classes/${props.classUuid}/edit`)
    } catch (e) {
      setStatus(e.toString())
      setUpdating(false)
    }
  }

  let valid = !updating

  let nameClassName = Box.Box
  if (name.length < 1) {
    nameClassName = Box.Error
    valid = false
  }

  let weightClassName = Box.Box
  if (typeof stringToMillipoint(weight) !== 'number') {
    weightClassName = Box.Error
    valid = false
  }

  return(
    <div>
      <TopBar user={props.user}/>
      <Link href={`/classes/${props.classUuid}/edit`}>Back</Link>
      <br/>
      <h3>{status}</h3>
      <label>Category Name: </label>
      <input className={nameClassName} onChange={onChangeName} type='text' value={name}/>
      <br/>
      <label>Weight: </label>
      <input className={weightClassName} onChange={onChangeWeight} type='text' value={weight}/>
      <br/>
      <button onClick={onNew} disabled={!valid}>New</button>
    </div>
  )
}

export default function Main(props: CategoryNewProps | HtmlError) {
  return <ErrorHandler dispatch={CategoryNew} props={props}/>
}