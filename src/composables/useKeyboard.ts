// 全局快捷键。按键行为和给学生看的说明写在同一个文件里，改了不会对不上。
import { onMounted, onUnmounted } from "vue"
import {
  answerCursor,
  goToPage,
  isTesting,
  moveCursor,
  optionLabels,
  pagination,
  showWrongAnswer,
} from "../store"
import { OPTION_KEY } from "../types"

const DIGIT_KEY = /^[1-9]$/

export interface Shortcut {
  keys: string[]
  desc: string
  // 只在考试模式下生效的，平时不用摆出来
  testingOnly?: boolean
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ["←", "→"], desc: "上一页 / 下一页" },
  { keys: ["↑", "↓"], desc: "选中上一题 / 下一题", testingOnly: true },
  { keys: ["A", "B", "C", "…"], desc: "给选中的题作答", testingOnly: true },
  {
    keys: ["1", "2", "3", "…"],
    desc: "同上，1 就是第一个选项",
    testingOnly: true,
  },
]

// 这几种情况不接管按键：光标在输入框/可编辑区里、n-select 展开着、
// 错题弹窗开着、按了 Ctrl / Cmd / Alt。
function shouldIgnore(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return true
  if (showWrongAnswer.value) return true
  const el = event.target as HTMLElement | null
  if (el?.isContentEditable) return true
  if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true
  return Boolean(document.querySelector(".n-base-select-menu"))
}

function onKeydown(event: KeyboardEvent) {
  if (shouldIgnore(event)) return

  if (event.key === "ArrowLeft") {
    event.preventDefault()
    goToPage(pagination.page - 1)
    return
  }
  if (event.key === "ArrowRight") {
    event.preventDefault()
    goToPage(pagination.page + 1)
    return
  }

  // 选题和作答只在考试模式下有意义，复习模式保持纯浏览
  if (!isTesting.value) return

  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault()
    moveCursor(event.key === "ArrowUp" ? -1 : 1)
    return
  }

  // 数字键按位置对应选项：1 是第一列选项，不管它的字母是 A 还是别的。
  // 只到 9，再多的选项用字母键。
  if (DIGIT_KEY.test(event.key)) {
    const letter = optionLabels.value[Number(event.key) - 1]
    if (!letter) return
    event.preventDefault()
    answerCursor(letter)
    return
  }

  const key = event.key.toUpperCase()
  if (!OPTION_KEY.test(key)) return
  // J / K 只有在它们不是本题库的选项字母时才当上下移动用，
  // 否则一个 10 选项的题库会按不出 J、K 两个答案。
  if ((key === "K" || key === "J") && !optionLabels.value.includes(key)) {
    event.preventDefault()
    moveCursor(key === "K" ? -1 : 1)
    return
  }
  if (!optionLabels.value.includes(key)) return
  event.preventDefault()
  answerCursor(key)
}

export function useKeyboard() {
  onMounted(() => window.addEventListener("keydown", onKeydown))
  onUnmounted(() => window.removeEventListener("keydown", onKeydown))
}
