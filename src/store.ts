// 应用只有一份状态，直接放模块作用域当作简易 store：
// 组件从这里取值和调动作，不再层层传 props。
import { computed, nextTick, reactive, ref, watch } from "vue"
import sample from "lodash/sample"
import shuffle from "lodash/shuffle"
import * as storage from "./storage"
// 名单是 import 进来的（而不是运行时 fetch public/*.json）：
// 这个应用会被 vite-plugin-singlefile 打成一份 index.html 单独分发，
// 那种形态下页面旁边没有 public 目录可取。
import class241 from "../public/class/241.json"
import class242 from "../public/class/242.json"
import { OPTION_KEY, TestStatus } from "./types"
import type { Exam, WrongAnswer } from "./types"

// source 是完整的工作集（考试中为整份试卷，否则为整个题库），
// data 只是它按关键词过滤后的视图，作答始终写回 source。
export const source = ref<Exam[]>([])
export const keyword = ref("")
export const status = ref(TestStatus.NO_TESTING)
export const randomCount = ref(50)
export const wrongAnswers = ref<WrongAnswer[]>([])
export const showWrongAnswer = ref(false)
export const score = ref(0)

export const isTesting = computed(() => status.value === TestStatus.IS_TESTING)

// 点名：和题库完全无关的一条支线，选个班级随机抽一个人。
const rosters: Record<string, string[]> = { "241": class241, "242": class242 }

export const classOptions = [
  { label: "24计算机1", value: "241" },
  { label: "24计算机2", value: "242" },
]

export const classId = ref("241")
export const pickedStudent = ref("")
export const showPickedStudent = ref(false)

export function pickStudent() {
  const roster = rosters[classId.value] ?? []
  if (!roster.length) return
  // 连着抽到同一个人看起来像没抽，先把上一个剔掉再抽
  const pool = roster.filter((name) => name !== pickedStudent.value)
  pickedStudent.value = sample(pool.length ? pool : roster)!
  showPickedStudent.value = true
}

// 课堂倒计时：又一条和题库无关的支线。状态落在 localStorage 的 timer 里，
// 刷新（或误关页面）之后接着走——正在走的按截止时刻续上，暂停的还停在原处。
export const timerOptions = [3, 5, 10].map((min) => ({
  label: `${min} 分钟`,
  value: min * 60,
}))

export const timerDuration = ref(5 * 60)
export const timerRemaining = ref(5 * 60)
export const timerRunning = ref(false)
export const timerDone = ref(false)

export const timerText = computed(() => {
  const min = Math.floor(timerRemaining.value / 60)
  const sec = timerRemaining.value % 60
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
})

let timerHandle = 0
let timerEndAt = 0

// 只在状态变化时落盘（开始/暂停/重置/改时长/归零），tick 每秒都写就太浪费了：
// 运行中的剩余时间本来就能从 endAt 反推出来。
function persistTimer() {
  storage.saveTimer({
    duration: timerDuration.value,
    remaining: timerRemaining.value,
    endAt: timerRunning.value ? timerEndAt : 0,
  })
}

function stopTimer() {
  window.clearInterval(timerHandle)
  timerHandle = 0
  timerRunning.value = false
}

// 剩余时间由截止时刻反推，而不是每次减一：
// 这样 setInterval 的漂移、标签页被浏览器挂起，都不会把时间越走越偏。
function tick() {
  timerRemaining.value = Math.max(
    0,
    Math.round((timerEndAt - Date.now()) / 1000),
  )
  if (timerRemaining.value === 0) {
    stopTimer()
    timerDone.value = true
    persistTimer()
  }
}

export function toggleTimer() {
  if (timerRunning.value) {
    stopTimer()
    persistTimer()
    return
  }
  // 归零后再按开始，当作重新计一轮
  if (!timerRemaining.value) timerRemaining.value = timerDuration.value
  timerDone.value = false
  timerEndAt = Date.now() + timerRemaining.value * 1000
  timerRunning.value = true
  timerHandle = window.setInterval(tick, 250)
  persistTimer()
}

// 改时长等于重新设一轮，正在走的也停下。走动作而不是 watch(timerDuration)，
// 是为了让还原旧状态时的赋值不被当成用户改了时长。
export function setTimerDuration(seconds: number) {
  timerDuration.value = seconds
  resetTimer()
}

export function resetTimer() {
  stopTimer()
  timerDone.value = false
  timerRemaining.value = timerDuration.value
  persistTimer()
}

// 刷新后接着上一轮：运行中的按截止时刻重新算剩余，
// 页面关着的这段时间照样在走，回来发现已经过点就直接归零。
function restoreTimer() {
  const saved = storage.loadTimer()
  if (!saved) return
  timerDuration.value = saved.duration
  if (!saved.endAt) {
    timerRemaining.value = saved.remaining
    return
  }
  timerEndAt = saved.endAt
  timerRemaining.value = Math.max(
    0,
    Math.round((timerEndAt - Date.now()) / 1000),
  )
  if (!timerRemaining.value) {
    timerDone.value = true
    persistTimer()
    return
  }
  timerRunning.value = true
  timerHandle = window.setInterval(tick, 250)
}

export const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onUpdatePage: (page: number) => {
    goToPage(page)
  },
  onUpdatePageSize: (size: number) => {
    pagination.pageSize = size
    pagination.page = 1
  },
})

export const data = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return source.value
  return source.value.filter((item) => item.title.toLowerCase().includes(kw))
})

// 序号取自 source 中的固定位置，不跟随分页/搜索变化，
// 也与交卷时错题的编号口径一致。
export const indexMap = computed(
  () => new Map(source.value.map((item, index) => [item, index + 1])),
)

// 选项列由题库自己决定：扫一遍 source 收集真正有内容的选项键，按字母序出列。
// 两选项的题库不会多出空列，七个八个选项的题库也照样能全部显示。
export const optionLabels = computed(() => {
  const labels = new Set<string>()
  for (const item of source.value) {
    for (const key of Object.keys(item)) {
      if (OPTION_KEY.test(key) && item[key]) labels.add(key)
    }
  }
  return [...labels].sort()
})

export const pageCount = computed(() =>
  Math.max(1, Math.ceil(data.value.length / pagination.pageSize)),
)

// 键盘游标：指向 data（过滤后的视图）里的第 n 题，-1 表示还没选中任何题。
// 存下标而不是行对象，是为了翻页时能直接算出它落在第几页。
export const cursorIndex = ref(-1)
export const cursorRow = computed(() => data.value[cursorIndex.value] ?? null)

// 考试中才需要落盘，非考试状态下 tests 不应存在。
export function persistTest() {
  if (!isTesting.value) return
  storage.saveTest(source.value)
}

export function resetCursor() {
  cursorIndex.value = -1
}

function scrollCursorIntoView() {
  nextTick(() => {
    document.querySelector(".cursor-row")?.scrollIntoView({ block: "nearest" })
  })
}

// 游标没落下时，从当前页第一题开始；否则按 delta 走，越界就停住不动。
export function moveCursor(delta: number) {
  if (!data.value.length) return
  const next =
    cursorIndex.value < 0
      ? (pagination.page - 1) * pagination.pageSize
      : cursorIndex.value + delta
  if (next < 0 || next >= data.value.length) return
  cursorIndex.value = next
  pagination.page = Math.floor(next / pagination.pageSize) + 1
  scrollCursorIntoView()
}

export function focusRow(row: Exam) {
  cursorIndex.value = data.value.indexOf(row)
}

export function goToPage(page: number) {
  if (page < 1 || page > pageCount.value) return
  pagination.page = page
  // 翻页后把游标带到新页第一题，不然它会留在看不见的上一页
  if (cursorIndex.value >= 0) {
    cursorIndex.value = (page - 1) * pagination.pageSize
    scrollCursorIntoView()
  }
}

// 作答直接改行对象本身——它与 source 里的元素是同一个引用——再整体落盘。
export function selectOption(row: Exam, letter: string) {
  row.select = letter
  persistTest()
}

// 按选项字母给当前高亮的题作答，作答完自动跳下一题。
export function answerCursor(letter: string) {
  const row = cursorRow.value
  if (!row || !row[letter]) return
  selectOption(row, letter)
  moveCursor(1)
}

// 上传新题库。校验不过就返回错误文案，弹窗交给调用方，store 不碰 UI。
export function importExams(raw: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return "文件不是合法的 JSON"
  }
  if (!Array.isArray(parsed) || parsed.some((item) => !item?.title)) {
    return "题库格式不对，应为包含 title / answer 的对象数组"
  }
  // 换题库意味着旧答卷作废
  storage.saveExams(raw)
  storage.removeTest()
  storage.saveStatus(TestStatus.NO_TESTING)
  status.value = TestStatus.NO_TESTING
  keyword.value = ""
  pagination.page = 1
  resetCursor()
  source.value = parsed as Exam[]
  return null
}

// tests 存在就是有没做完的考试，恢复它；否则加载完整题库。
export function init() {
  source.value = storage.loadTest() ?? storage.loadExams()
}

export function showAll() {
  source.value = storage.loadExams()
  resetCursor()
  pagination.page = 1
  persistTest()
}

export function getRandom(n: number) {
  source.value = shuffle(storage.loadExams()).slice(0, n)
  resetCursor()
  pagination.page = 1
  persistTest()
}

export function start() {
  status.value = TestStatus.IS_TESTING
  storage.saveStatus(TestStatus.IS_TESTING)
  getRandom(randomCount.value)
}

export function check() {
  wrongAnswers.value = source.value.flatMap((item, index) =>
    item.answer === item.select
      ? []
      : [
          {
            id: index + 1,
            title: item.title,
            option: `${item.answer} ${item[item.answer]}`,
          },
        ],
  )
  score.value = source.value.length - wrongAnswers.value.length
  showWrongAnswer.value = true
}

export function finish() {
  showWrongAnswer.value = false
  status.value = TestStatus.NO_TESTING
  storage.saveStatus(TestStatus.NO_TESTING)
  storage.removeTest()
  init()
}

export function clear() {
  storage.clearAll()
  resetCursor()
  source.value = []
  keyword.value = ""
  status.value = TestStatus.NO_TESTING
  showWrongAnswer.value = false
  wrongAnswers.value = []
  score.value = 0
}

// 挂载时从 localStorage 恢复：考试状态、题目、上次的抽题数量。
export function restore() {
  status.value = storage.loadStatus()
  storage.saveStatus(status.value)
  init()
  const count = storage.loadRandomCount()
  if (count) randomCount.value = count
  restoreTimer()
}

watch(keyword, () => {
  pagination.page = 1
  resetCursor()
})

watch(randomCount, (value) => {
  storage.saveRandomCount(value)
})
