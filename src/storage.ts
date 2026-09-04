// localStorage 是这个应用唯一的数据源，所有读写都收敛在这里，
// 别的地方不要再直接碰 window.localStorage。
import { TestStatus } from "./types"
import type { Exam } from "./types"

const EXAM = "exams"
const TEST = "tests"
const TEST_STATUS = "test_status"
const RANDOM_COUNT = "random_count"

function parse(raw: string | null): Exam[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

// exams 上传后当作不可变的原始数据，换视图一律从它重新读，
// 而不是在当前 source 上做减法。
export function loadExams(): Exam[] {
  return parse(window.localStorage.getItem(EXAM)) ?? []
}

export function saveExams(raw: string) {
  window.localStorage.setItem(EXAM, raw)
}

// 读不出来就顺手清掉，免得下次启动又卡在同一份坏数据上
export function loadTest(): Exam[] | null {
  const raw = window.localStorage.getItem(TEST)
  if (!raw) return null
  const parsed = parse(raw)
  if (!parsed) removeTest()
  return parsed
}

export function saveTest(exams: Exam[]) {
  window.localStorage.setItem(TEST, JSON.stringify(exams))
}

export function removeTest() {
  window.localStorage.removeItem(TEST)
}

export function loadStatus(): TestStatus {
  return window.localStorage.getItem(TEST_STATUS) === TestStatus.IS_TESTING
    ? TestStatus.IS_TESTING
    : TestStatus.NO_TESTING
}

export function saveStatus(status: TestStatus) {
  window.localStorage.setItem(TEST_STATUS, status)
}

export function loadRandomCount(): number {
  return Number(window.localStorage.getItem(RANDOM_COUNT)) || 0
}

export function saveRandomCount(count: number) {
  window.localStorage.setItem(RANDOM_COUNT, String(count))
}

export function clearAll() {
  window.localStorage.clear()
}
