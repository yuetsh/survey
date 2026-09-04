<script setup lang="ts">
import {
  NButton,
  NUpload,
  NDataTable,
  NSpace,
  NInput,
  NConfigProvider,
  zhCN,
  dateZhCN,
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NModal,
  NDivider,
  NSelect,
} from "naive-ui"
import type {
  UploadCustomRequestOptions,
  DataTableColumn,
  GlobalThemeOverrides,
} from "naive-ui"
import { onMounted, ref, reactive, h, computed, watch } from "vue"
import shuffle from "lodash/shuffle"
import Option from "./Option.vue"

// 选项字母不写死：题库有几个选项就是几个，A~Z 都行。
type Option = string

interface Exam {
  title: string
  answer: Option
  select: Option | ""
  // A、B、C…… 每个单大写字母键是一个选项
  [key: string]: string | undefined
}

interface WrongAnswer {
  id: number
  title: string
  option: string
}

enum TestStatus {
  IS_TESTING = "1",
  NO_TESTING = "-1",
}

const EXAM = "exams"
const TEST = "tests"
const TEST_STATUS = "test_status"
const RANDOM_COUNT = "random_count"
// title / answer / select 之外的单个大写字母键才算选项列
const OPTION_KEY = /^[A-Z]$/

const keyword = ref("")
// source 是完整的工作集（考试中为整份试卷，否则为整个题库），
// data 只是它按关键词过滤后的视图，作答始终写回 source。
const source = ref<Exam[]>([])
const status = ref(TestStatus.NO_TESTING)
const wrongAnswers = ref<WrongAnswer[]>([])
const showWrongAnswer = ref(false)
const score = ref(0)
const randomCount = ref<number>(50)
const randomOptions = [
  { label: "10 题", value: 10 },
  { label: "20 题", value: 20 },
  { label: "30 题", value: 30 },
  { label: "50 题", value: 50 },
  { label: "100 题", value: 100 },
  { label: "200 题", value: 200 },
]

const isTesting = computed(() => status.value === TestStatus.IS_TESTING)

// 学生反馈"眼花"：字太小、行太挤、一页 200 行。这里统一放大字号、
// 撑开单元格留白，把网格线压淡，让视线能一行行走下去。
const themeOverrides: GlobalThemeOverrides = {
  common: { fontSize: "15px", fontSizeMedium: "15px" },
  DataTable: {
    fontSizeMedium: "15px",
    thPaddingMedium: "14px 16px",
    tdPaddingMedium: "16px 16px",
    thFontWeight: "600",
    borderColor: "#eceef1",
    thColor: "#fafbfc",
  },
}

const pagination = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [20, 50, 100, 200],
  onUpdatePage: (page: number) => {
    pagination.page = page
  },
  onUpdatePageSize: (size: number) => {
    pagination.pageSize = size
    pagination.page = 1
  },
})

// 序号取自 source 中的固定位置，不跟随分页/搜索变化，
// 也与交卷时错题的编号口径一致。
const indexMap = computed(
  () => new Map(source.value.map((item, index) => [item, index + 1])),
)

// 选项列由题库自己决定：扫一遍 source 收集真正有内容的选项键，按字母序出列。
// 两选项的题库不会多出空列，七个八个选项的题库也照样能全部显示。
const optionLabels = computed(() => {
  const labels = new Set<string>()
  for (const item of source.value) {
    for (const key of Object.keys(item)) {
      if (OPTION_KEY.test(key) && item[key]) labels.add(key)
    }
  }
  return [...labels].sort()
})

// 选项多了列会被挤扁，给个横向最小宽度让表格自己出滚动条。
const scrollX = computed(() => 450 + optionLabels.value.length * 160)

const data = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return source.value
  return source.value.filter((item) => item.title.toLowerCase().includes(kw))
})

const columns = computed<DataTableColumn<Exam>[]>(() => {
  const options: DataTableColumn<Exam>[] = optionLabels.value.map((op) => ({
    title: "选项" + op,
    key: op,
    minWidth: 160,
    render: (row) =>
      h(Option, {
        correct: row.answer === op,
        option: String(row[op] ?? ""),
        radio: isTesting.value,
        checked: row.select === op,
        updateChecked: () => {
          row.select = op
          persistTest()
        },
      }),
  }))
  return [
    {
      title: "序号",
      key: "id",
      render: (row) => indexMap.value.get(row) ?? "",
      width: 70,
      align: "center",
    },
    {
      title: "题目",
      key: "title",
      minWidth: 380,
    },
    ...options,
  ]
})

function loadExams(): Exam[] {
  const raw = window.localStorage.getItem(EXAM)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// 考试中才需要落盘，非考试状态下 tests 不应存在。
function persistTest() {
  if (!isTesting.value) return
  window.localStorage.setItem(TEST, JSON.stringify(source.value))
}

function upload({ file }: UploadCustomRequestOptions) {
  const reader = new FileReader()
  reader.readAsText(file.file!)
  reader.onload = (event) => {
    const str = (event.target?.result as string) ?? ""
    let parsed: unknown
    try {
      parsed = JSON.parse(str)
    } catch {
      window.alert("文件不是合法的 JSON")
      return
    }
    if (!Array.isArray(parsed) || parsed.some((item) => !item?.title)) {
      window.alert("题库格式不对，应为包含 title / answer 的对象数组")
      return
    }
    // 换题库意味着旧答卷作废
    window.localStorage.setItem(EXAM, str)
    window.localStorage.removeItem(TEST)
    window.localStorage.setItem(TEST_STATUS, TestStatus.NO_TESTING)
    status.value = TestStatus.NO_TESTING
    keyword.value = ""
    pagination.page = 1
    source.value = parsed as Exam[]
  }
}

function init() {
  const test = window.localStorage.getItem(TEST)
  if (test) {
    try {
      source.value = JSON.parse(test)
      return
    } catch {
      window.localStorage.removeItem(TEST)
    }
  }
  source.value = loadExams()
}

function showAll() {
  source.value = loadExams()
  pagination.page = 1
  persistTest()
}

function getRandom(n: number) {
  source.value = shuffle(loadExams()).slice(0, n)
  pagination.page = 1
  persistTest()
}

function start() {
  status.value = TestStatus.IS_TESTING
  window.localStorage.setItem(TEST_STATUS, TestStatus.IS_TESTING)
  getRandom(randomCount.value)
}

function check() {
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

function finish() {
  showWrongAnswer.value = false
  status.value = TestStatus.NO_TESTING
  window.localStorage.setItem(TEST_STATUS, TestStatus.NO_TESTING)
  window.localStorage.removeItem(TEST)
  init()
}

function clear() {
  window.localStorage.clear()
  source.value = []
  keyword.value = ""
  status.value = TestStatus.NO_TESTING
  showWrongAnswer.value = false
  wrongAnswers.value = []
  score.value = 0
}

onMounted(() => {
  const storedStatus = window.localStorage.getItem(TEST_STATUS)
  status.value =
    storedStatus === TestStatus.IS_TESTING
      ? TestStatus.IS_TESTING
      : TestStatus.NO_TESTING
  window.localStorage.setItem(TEST_STATUS, status.value)
  init()
  const parsed = Number(window.localStorage.getItem(RANDOM_COUNT))
  if (parsed) {
    randomCount.value = parsed
  }
})

watch(keyword, () => {
  pagination.page = 1
})

watch(randomCount, (val) => {
  window.localStorage.setItem(RANDOM_COUNT, String(val))
})
</script>

<template>
  <n-config-provider
    inline-theme-disabled
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <n-layout content-style="padding: 0 20px 20px">
      <n-layout-header style="padding: 20px 0">
        <n-space justify="space-between">
          <n-space align="center">
            <n-upload
              :show-file-list="false"
              accept="application/json"
              :custom-request="upload"
            >
              <n-button tertiary>上传文件</n-button>
            </n-upload>
            <n-button quaternary @click="clear" :disabled="!source.length">
              清除
            </n-button>
            <n-divider vertical />
            <n-button tertiary @click="getRandom(1)" :disabled="!source.length">
              随机 1 题
            </n-button>
            <n-space align="center">
              <n-select
                v-model:value="randomCount"
                :options="randomOptions"
                style="width: 100px"
              />
              <n-button
                tertiary
                @click="getRandom(randomCount)"
                :disabled="!source.length"
              >
                随机抽题
              </n-button>
            </n-space>
            <n-button tertiary @click="showAll" :disabled="!source.length">
              显示所有题
            </n-button>
            <n-divider vertical />
            <n-button
              @click="start"
              type="primary"
              :disabled="isTesting || !source.length"
            >
              做题
            </n-button>
            <n-button
              type="primary"
              secondary
              @click="check"
              :disabled="!isTesting"
            >
              交卷
            </n-button>
          </n-space>
          <n-space>
            <n-input
              style="width: 200px"
              v-model:value="keyword"
              placeholder="通过关键词搜索"
            />
          </n-space>
        </n-space>
      </n-layout-header>
      <n-layout-content>
        <n-data-table
          :data="data"
          :columns="columns"
          :pagination="pagination"
          :scroll-x="scrollX"
          :single-line="false"
          :bordered="false"
        />
      </n-layout-content>
      <n-modal
        style="width: 800px"
        preset="card"
        v-model:show="showWrongAnswer"
      >
        <template #header>
          得分：{{ score }} 分
          <span v-if="wrongAnswers.length !== 0">，以下是答错的题</span>
        </template>
        <p class="wrong-item" v-for="item in wrongAnswers" :key="item.id">
          <span>{{ item.id }} . {{ item.title }}</span>
          <span class="correct"> 答案：{{ item.option }}</span>
        </p>
        <p v-if="wrongAnswers.length === 0">🎉 恭喜你全对！</p>
        <n-space justify="center">
          <n-button type="primary" @click="finish">强化记忆已完成</n-button>
        </n-space>
      </n-modal>
    </n-layout>
  </n-config-provider>
</template>

<style>
body {
  background-color: #f6f7f9;
}

.correct {
  color: #18a058;
  font-weight: 600;
}

.wrong-item {
  line-height: 1.7;
  margin: 0 0 14px;
}
</style>
