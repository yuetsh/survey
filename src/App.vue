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
import type { UploadCustomRequestOptions, DataTableColumn } from "naive-ui"
import { onMounted, ref, h, computed, watch } from "vue"
import shuffle from "lodash/shuffle"
import Option from "./Option.vue"

type Option = "A" | "B" | "C" | "D"

interface Exam {
  title: string
  A: string
  B: string
  C?: string
  D?: string
  answer: Option
  select: Option
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
const optionLabels: Option[] = ["A", "B", "C", "D"]

const columns = computed<DataTableColumn<Exam>[]>(() => {
  const options: DataTableColumn<Exam>[] = optionLabels.map((op) => {
    return {
      title: "选项" + op,
      key: op,
      render: (row, index) =>
        h(Option, {
          correct: row.answer === op,
          option: String(row[op as Option] ?? ""),
          radio: status.value === TestStatus.IS_TESTING,
          checked: row.select === op,
          updateChecked: () => {
            row.select = op as Option
            const tests = data.value.map((item, i) => {
              if (index === i) {
                item.select = op as Option
              }
              return item
            })
            window.localStorage.setItem(TEST, JSON.stringify(tests))
          },
        }),
    }
  })
  return [
    {
      title: "序号",
      key: "id",
      render: (_, index) => index + 1,
      width: 60,
    },
    {
      title: "题目",
      key: "title",
    },
    ...options,
  ]
})
const keyword = ref("")
const data = ref<Exam[]>([])
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
]

function upload({ file }: UploadCustomRequestOptions) {
  const reader = new FileReader()
  reader.readAsText(file.file!)
  reader.onload = (event) => {
    const str = (event.target?.result as string) ?? ""
    data.value = JSON.parse(str)
    window.localStorage.setItem(EXAM, str)
  }
}

function init() {
  if (!!window.localStorage.getItem(TEST)) {
    data.value = JSON.parse(window.localStorage.getItem(TEST)!)
  } else {
    const strings = window.localStorage.getItem(EXAM)
    if (!strings) return
    data.value = JSON.parse(strings)
  }
}

function search() {
  if (!keyword.value) {
    init()
    return
  }
  const reg = new RegExp(keyword.value, "gi")
  const arr = []
  for (let i = 0; i < data.value.length; i++) {
    if (reg.test(data.value[i].title)) {
      arr.push(data.value[i])
    }
  }
  data.value = arr
}

function showAll() {
  data.value = JSON.parse(window.localStorage.getItem(EXAM)!)
  if (status.value === TestStatus.IS_TESTING) {
    window.localStorage.setItem(TEST, window.localStorage.getItem(EXAM)!)
  }
}

function getRandom(n: number) {
  data.value = []
  const cached = JSON.parse(window.localStorage.getItem(EXAM)!)
  if (n === 1) {
    const index = Math.floor(Math.random() * cached.length)
    data.value = [cached[index]]
  } else {
    const result = []
    const rand = shuffle(cached)
    for (let i = 0; i < n; i++) {
      result.push(rand[i])
    }
    data.value = result
  }
  if (status.value === TestStatus.IS_TESTING) {
    window.localStorage.setItem(TEST, JSON.stringify(data.value))
  }
}

function start() {
  getRandom(randomCount.value)
  window.localStorage.setItem(TEST_STATUS, TestStatus.IS_TESTING)
  window.localStorage.setItem(TEST, JSON.stringify(data.value))
  status.value = TestStatus.IS_TESTING
}

function check() {
  wrongAnswers.value = data.value
    .map((item, index) => {
      if (item.answer !== item.select) {
        return {
          id: index + 1,
          title: item.title,
          option: `${item.answer} ${item[item.answer]}`,
        }
      }
      return { id: 0, title: "", option: "" }
    })
    .filter((a) => a.id && a.title && a.option)
  score.value = data.value.length - wrongAnswers.value.length
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
  data.value = []
  keyword.value = ""
  status.value = TestStatus.NO_TESTING
  showWrongAnswer.value = false
  wrongAnswers.value = []
  score.value = 0
}

onMounted(() => {
  init()
  if (!!window.localStorage.getItem(TEST_STATUS)) {
    status.value = window.localStorage.getItem(TEST_STATUS) as TestStatus
  } else {
    status.value = TestStatus.NO_TESTING
  }
  window.localStorage.setItem(TEST_STATUS, status.value)
  const storedRandomCount = window.localStorage.getItem(RANDOM_COUNT)
  if (storedRandomCount) {
    const parsed = Number(storedRandomCount)
    if (!Number.isNaN(parsed)) {
      randomCount.value = parsed
    }
  }
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
              <n-button>上传文件</n-button>
            </n-upload>
            <n-button @click="clear" :disabled="!data.length">清除</n-button>
            <n-divider vertical />
            <n-button @click="getRandom(1)" :disabled="!data.length">
              随机 1 题
            </n-button>
            <n-space align="center">
              <n-select
                v-model:value="randomCount"
                :options="randomOptions"
                style="width: 100px"
              />
              <n-button
                @click="getRandom(randomCount)"
                :disabled="!data.length"
              >
                随机抽题
              </n-button>
            </n-space>
            <n-button @click="showAll" :disabled="!data.length">
              显示所有题
            </n-button>
            <n-divider vertical />
            <n-button
              @click="start"
              type="primary"
              :disabled="status === TestStatus.IS_TESTING || !data.length"
            >
              做题
            </n-button>
            <n-button
              @click="check"
              :disabled="status === TestStatus.NO_TESTING"
            >
              交卷
            </n-button>
          </n-space>
          <n-space>
            <n-input
            style="width: 200px;"
              v-model:value="keyword"
              @update:value="search"
              placeholder="通过关键词搜索"
            />
          </n-space>
        </n-space>
      </n-layout-header>
      <n-layout-content>
        <n-data-table :data="data" :columns="columns" striped />
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
        <p v-for="item in wrongAnswers" :key="item.id">
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
.correct {
  color: blue;
  font-weight: bold;
}
</style>
