<script setup lang="ts">
import { computed } from "vue"
import { NButton, NPopover } from "naive-ui"
import { SHORTCUTS } from "../composables/useKeyboard"
import { isTesting } from "../store"

// 选题、作答那几条只在考试中生效，平时列出来只会让人困惑
const shortcuts = computed(() =>
  SHORTCUTS.filter((item) => !item.testingOnly || isTesting.value),
)
</script>

<template>
  <n-popover trigger="hover" placement="bottom-end">
    <template #trigger>
      <n-button quaternary size="small">⌨ 快捷键</n-button>
    </template>
    <ul class="shortcuts">
      <li v-for="item in shortcuts" :key="item.desc">
        <span class="keys">
          <kbd v-for="key in item.keys" :key="key">{{ key }}</kbd>
        </span>
        <span>{{ item.desc }}</span>
      </li>
    </ul>
    <p v-if="!isTesting" class="note">开始做题后还有选题和作答快捷键</p>
  </n-popover>
</template>

<style scoped>
.shortcuts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.shortcuts li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px 0;
}

.keys {
  display: flex;
  gap: 4px;
  flex: none;
  width: 108px;
}

kbd {
  min-width: 22px;
  padding: 1px 6px;
  border: 1px solid #dcdfe4;
  border-bottom-width: 2px;
  border-radius: 4px;
  background-color: #fafbfc;
  font-family: inherit;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

.note {
  margin: 8px 0 0;
  color: #8a8f99;
  font-size: 12px;
}
</style>
