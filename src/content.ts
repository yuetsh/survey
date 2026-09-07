// 班级名单和内置题库都在这里写死：一份文件一行 import，下面两张表里的键
// 就是下拉框里显示的名字。以后加一个班、换一份题库，改这个文件就够了。
//
// 走 import 而不是运行时 fetch：应用会被 vite-plugin-singlefile 打成一份
// index.html 单独分发，那种形态下页面旁边没有 data/ 目录可取。名单也因此
// 放在 src/class/ 而不是 public/——Vite 不允许从 JS 里 import public 下的
// 文件（"Assets in public directory cannot be imported from JavaScript"）。
import type { Exam } from "./types"

import class241 from "./class/241.json"
import class242 from "./class/242.json"

// 文件名不能带 #：开发服务器下 import 出去的 URL 会被浏览器当成锚点截断
import info1 from "../data/信息1.json"
import info2 from "../data/信息2.json"
import info3 from "../data/信息3.json"
import info4 from "../data/信息4.json"
import info5 from "../data/信息5.json"
import info6 from "../data/信息6.json"
import info7 from "../data/信息7.json"

// 用 type 而不是 interface：naive-ui 的 SelectMixedOption 要求带索引签名，
// interface 没有隐式索引签名，传进 n-select 会类型不通过。
// 也别叫 Option——types.ts 里那个 Option 是选项字母。
export type NameOption = { label: string; value: string }

export const rosters: Record<string, string[]> = {
  "24计算机1": class241,
  "24计算机2": class242,
}

export const banks: Record<string, Exam[]> = {
  信息1: info1,
  信息2: info2,
  信息3: info3,
  信息4: info4,
  信息5: info5,
  信息6: info6,
  信息7: info7,
}

function toOptions(dict: Record<string, unknown>): NameOption[] {
  return Object.keys(dict).map((name) => ({ label: name, value: name }))
}

export const classOptions = toOptions(rosters)
export const bankOptions = toOptions(banks)

// 上传的题库走的也是这个判断，内置的和手动传的用同一把尺子。
export function isExamList(value: unknown): value is Exam[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item?.title === "string" && item.title)
  )
}
