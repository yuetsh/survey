<script setup lang="ts">
import { onMounted } from "vue"
import {
  NConfigProvider,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  dateZhCN,
  zhCN,
} from "naive-ui"
import ExamTable from "./components/ExamTable.vue"
import ExamToolbar from "./components/ExamToolbar.vue"
import PickStudentModal from "./components/PickStudentModal.vue"
import ResultModal from "./components/ResultModal.vue"
import { useKeyboard } from "./composables/useKeyboard"
import { restore } from "./store"
import { themeOverrides } from "./theme"

useKeyboard()
onMounted(restore)
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
        <exam-toolbar />
      </n-layout-header>
      <n-layout-content>
        <exam-table />
      </n-layout-content>
      <result-modal />
      <pick-student-modal />
    </n-layout>
  </n-config-provider>
</template>

<style>
body {
  background-color: #f6f7f9;
}
</style>
