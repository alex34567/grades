import {ClientUser, UserType} from "../common/types";
import styles from '../../styles/TopBar.module.css'
import Link from 'next/link'
import {useRouter} from "next/router";

export default function TopBar(props: {user: ClientUser | null}) {
  const router = useRouter()

  async function redirectToLogin() {
    await router.push(`/login?redirect=${encodeURIComponent(document.location.href)}`)
  }

  let userLogin
  if (props.user) {
    userLogin = (
      <div className={styles.UserLogin}>
        <p>{`Welcome ${props.user.name}`}</p>
        <Link href='/logout'><a>Logout</a></Link>
      </div>
    )
  } else {
    userLogin = (
      <div className={styles.UserLogin}>
        <a onClick={redirectToLogin} href='/login'>Login</a>
      </div>
    )
  }

  let admin
  if (props.user && props.user.type == UserType.admin) {
    admin = (
      <>
        <Link href='/admin'>Admin</Link>
        <span> </span>
      </>
    )
  }

  let changePassword
  if (props.user) {
    changePassword = <Link href='/change_password'><a href='/change_password'>Change Password</a></Link>
  }

  return (
    <div className={styles.TopBar}>
      <div className={styles.Home}>
        <Link href='/'>Home</Link>
        <span> </span>
        {admin}
        {changePassword}
      </div>
      <div className={styles.Padding}/>
      {userLogin}
    </div>
  )
}