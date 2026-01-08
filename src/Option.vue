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
    :checked="props.checked"
    @update:checked="props.updateChecked"
  >
    {{ props.option }}
  </n-checkbox>
  <span v-else :class="props.correct ? 'correct' : ''">
    {{ props.option }}
  </span>
</template>

<style scoped>
.correct {
  color: blue;
  font-weight: bold;
}
</style>
