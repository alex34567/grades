import {useRouter} from 'next/router'
import {useEffect} from 'react'

export default function Index() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/students/0').then(() => {})
  });

  return (<></>)
}
