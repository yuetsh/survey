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
  NSwitch,
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
const shuffleEnabled = ref(false)
const originalData = ref<Exam[]>([])

function cloneData(list: Exam[]) {
  return JSON.parse(JSON.stringify(list)) as Exam[]
}

function upload({ file }: UploadCustomRequestOptions) {
  const reader = new FileReader()
  reader.readAsText(file.file!)
  reader.onload = (event) => {
    const str = (event.target?.result as string) ?? ""
    data.value = JSON.parse(str)
    window.localStorage.setItem(EXAM, str)
    originalData.value = cloneData(data.value)
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
  originalData.value = cloneData(data.value)
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
  originalData.value = cloneData(data.value)
}

function getRandom(n: number = 50) {
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
  originalData.value = cloneData(data.value)
}

function shuffleOptions() {
  if (!shuffleEnabled.value) return
  if (!originalData.value.length) {
    originalData.value = cloneData(data.value)
  }
  data.value = data.value.map((item) => {
    const availableOptions = optionLabels
      .map((key) => ({ key, text: item[key] }))
      .filter((entry) => entry.text)
    const shuffledOptions = shuffle(availableOptions)
    const newItem: Exam = { ...item, A: "", B: "", C: "", D: "" }
    let mappedAnswer: Option | undefined
    let mappedSelect: Option | undefined

    shuffledOptions.forEach((entry, idx) => {
      const label = optionLabels[idx]
      newItem[label] = entry.text as string
      if (entry.key === item.answer) {
        mappedAnswer = label
      }
      if (entry.key === item.select) {
        mappedSelect = label
      }
    })

    newItem.answer = mappedAnswer ?? item.answer
    newItem.select = mappedSelect ?? item.select
    return newItem
  })
  const storageKey = status.value === TestStatus.IS_TESTING ? TEST : EXAM
  window.localStorage.setItem(storageKey, JSON.stringify(data.value))
}

function start() {
  getRandom(50)
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
  originalData.value = cloneData(data.value)
}

function clear() {
  window.localStorage.clear()
  data.value = []
  keyword.value = ""
  status.value = TestStatus.NO_TESTING
  showWrongAnswer.value = false
  wrongAnswers.value = []
  score.value = 0
  originalData.value = []
}

onMounted(() => {
  init()
  if (!!window.localStorage.getItem(TEST_STATUS)) {
    status.value = window.localStorage.getItem(TEST_STATUS) as TestStatus
  } else {
    status.value = TestStatus.NO_TESTING
  }
  window.localStorage.setItem(TEST_STATUS, status.value)
})

watch(shuffleEnabled, (enabled) => {
  if (!enabled && originalData.value.length) {
    data.value = cloneData(originalData.value)
    const storageKey = status.value === TestStatus.IS_TESTING ? TEST : EXAM
    window.localStorage.setItem(storageKey, JSON.stringify(data.value))
  }
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
            <n-button @click="getRandom(50)" :disabled="!data.length">
              随机 50 题
            </n-button>
            <n-button @click="showAll" :disabled="!data.length">
              显示所有题
            </n-button>
            <n-space align="center">
              <span>选项乱序</span>
              <n-switch size="small" v-model:value="shuffleEnabled" />
            </n-space>
            <n-button
              @click="shuffleOptions"
              :disabled="!data.length || !shuffleEnabled"
            >
              打乱
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
  color: red;
}
</style>
