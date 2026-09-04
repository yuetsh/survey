<script setup lang="ts">
import { NButton, NDivider, NInput, NSelect, NSpace, NUpload } from "naive-ui"
import type { UploadCustomRequestOptions } from "naive-ui"
import {
  check,
  clear,
  getRandom,
  importExams,
  isTesting,
  keyword,
  randomCount,
  showAll,
  source,
  start,
} from "../store"
import ShortcutHint from "./ShortcutHint.vue"

const randomOptions = [
  { label: "10 题", value: 10 },
  { label: "20 题", value: 20 },
  { label: "30 题", value: 30 },
  { label: "50 题", value: 50 },
  { label: "100 题", value: 100 },
  { label: "200 题", value: 200 },
]

// 读文件和报错提示留在 UI 层，store 只负责校验和写入
function upload({ file }: UploadCustomRequestOptions) {
  const reader = new FileReader()
  reader.readAsText(file.file!)
  reader.onload = (event) => {
    const error = importExams((event.target?.result as string) ?? "")
    if (error) window.alert(error)
  }
}
</script>

<template>
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
      <n-button type="primary" secondary @click="check" :disabled="!isTesting">
        交卷
      </n-button>
    </n-space>
    <n-space align="center">
      <shortcut-hint />
      <n-input
        style="width: 200px"
        v-model:value="keyword"
        placeholder="通过关键词搜索"
      />
    </n-space>
  </n-space>
</template>
