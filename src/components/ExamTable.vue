<script setup lang="ts">
import { computed, h } from "vue"
import { NDataTable } from "naive-ui"
import type { DataTableColumn } from "naive-ui"
import {
  cursorRow,
  data,
  focusRow,
  indexMap,
  isTesting,
  optionLabels,
  pagination,
  selectOption,
} from "../store"
import type { Exam } from "../types"
import OptionCell from "./OptionCell.vue"

// 选项多了列会被挤扁，给个横向最小宽度让表格自己出滚动条。
const scrollX = computed(() => 450 + optionLabels.value.length * 160)

// 选项列用 h() 而不是模板：每个单元格都要拿到该行的 answer 和当前状态，
// 才能决定渲染成复选框（考试模式）还是纯文本 + 正确答案角标（复习模式）。
const columns = computed<DataTableColumn<Exam>[]>(() => {
  const options: DataTableColumn<Exam>[] = optionLabels.value.map((op) => ({
    title: "选项" + op,
    key: op,
    minWidth: 160,
    render: (row) =>
      h(OptionCell, {
        correct: row.answer === op,
        option: String(row[op] ?? ""),
        radio: isTesting.value,
        checked: row.select === op,
        updateChecked: () => selectOption(row, op),
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

function rowClassName(row: Exam) {
  return isTesting.value && row === cursorRow.value ? "cursor-row" : ""
}

// 鼠标点过的那一行就是游标所在行，键鼠可以随时接力
function rowProps(row: Exam) {
  return {
    onClick: () => {
      if (isTesting.value) focusRow(row)
    },
  }
}
</script>

<template>
  <n-data-table
    :data="data"
    :columns="columns"
    :pagination="pagination"
    :scroll-x="scrollX"
    :single-line="false"
    :bordered="false"
    :row-class-name="rowClassName"
    :row-props="rowProps"
  />
</template>

<style scoped>
:deep(.cursor-row .n-data-table-td) {
  background-color: #eef6ff !important;
}

:deep(.cursor-row .n-data-table-td:first-child) {
  box-shadow: inset 3px 0 0 #2080f0;
}
</style>
