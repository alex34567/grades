export interface Fraction {
  n: number,
  d: number
}

export interface ClientClass {
  uuid: string,
  name: string,
  professor_name: string,
  categories: ClassCategory[],
}

export interface ClientStudentClass extends ClientClass {
  student_name: string,
  grade: Fraction,
  categories: ClientStudentClassCategory[],
}

export interface CategoryMeta {
  name: string,
  uuid: string,
  weight: number,
}

export interface ClassCategory extends CategoryMeta {
  assignments: Assignment[],
}

export interface ClientStudentClassCategory extends ClassCategory {
  grade: Fraction,
  weighted_grade: Fraction,
  assignments: ClientStudentAssignment[],
}

export interface Assignment {
  name: string,
  uuid: string,
  max_points: number
}

export interface EditAssignment {
  name: string,
  uuid: string,
  categoryUuid: string,
  max_points: number
}

export interface SingleGradeEntry {
  studentUuid: string,
  grade: number | null
}

export interface ClientGradeEntry extends SingleGradeEntry{
  studentName: string
}

export interface ClientStudentAssignment extends Assignment {
  grade: Fraction,
  weighted_grade: Fraction,
}

export interface UserInfo {
  login_name: string
  name: string,
  type: UserType
  uuid: string
}

export interface ClientUser extends UserInfo{
  csrf: string
  error?: undefined
}

export enum UserType {
  admin,
  professor,
  student,
}

export const USER_TYPES = [UserType.admin, UserType.professor, UserType.student]

export interface ClassOverview {
  class_uuid: string
  professor_name: string
  name: string
  grade: Fraction
}

export interface CategoryViewProps {
  category: ClassCategory,
  classUuid: string
  user: ClientUser
}