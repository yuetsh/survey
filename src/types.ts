// 选项字母不写死：题库有几个选项就是几个，A~Z 都行。
export type Option = string

export interface Exam {
  title: string
  answer: Option
  select: Option | ""
  // A、B、C…… 每个单大写字母键是一个选项
  [key: string]: string | undefined
}

export interface WrongAnswer {
  id: number
  title: string
  option: string
}

export enum TestStatus {
  IS_TESTING = "1",
  NO_TESTING = "-1",
}

// title / answer / select 之外的单个大写字母键才算选项列
export const OPTION_KEY = /^[A-Z]$/
