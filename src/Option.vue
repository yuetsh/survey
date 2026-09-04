<script lang="ts" setup>
import { NCheckbox } from "naive-ui"
interface Props {
  correct: boolean
  option?: string
  radio: boolean
  checked: boolean
  updateChecked: () => void
}
const props = defineProps<Props>()
</script>

<template>
  <n-checkbox
    v-if="props.radio && props.option"
    class="option"
    :checked="props.checked"
    @update:checked="props.updateChecked"
  >
    {{ props.option }}
  </n-checkbox>
  <span
    v-else-if="props.option"
    class="option"
    :class="{ correct: props.correct }"
  >
    <!-- 角标固定占位，正确项和其它选项的文字才会左对齐，视线不会被推得忽左忽右 -->
    <span class="mark">
      <svg
        v-if="props.correct"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 8.5 6.5 12 13 4.5" />
      </svg>
    </span>
    <span>{{ props.option }}</span>
  </span>
</template>

<style scoped>
.option {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.6;
}

.mark {
  display: flex;
  flex: none;
  /* 和首行文字对齐，而不是贴着单元格顶边 */
  align-items: center;
  width: 14px;
  height: calc(1.6em);
  color: #18a058;
}

.correct {
  color: #18a058;
  font-weight: 600;
}
</style>
