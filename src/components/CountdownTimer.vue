<script setup lang="ts">
import { watch } from "vue"
import { NButton, NSelect, NSpace } from "naive-ui"
import {
  resetTimer,
  setTimerDuration,
  timerDone,
  timerDuration,
  timerOptions,
  timerRemaining,
  timerRunning,
  timerText,
  toggleTimer,
} from "../store"

// 归零提示音临时用 WebAudio 合一个，省得往 public 里塞音频文件
watch(timerDone, (done) => {
  if (!done) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.2
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    osc.onended = () => ctx.close()
  } catch {
    // 浏览器不让出声就算了，界面上已经有红色提示
  }
})
</script>

<template>
  <n-space align="center" :size="8">
    <n-select
      :value="timerDuration"
      :options="timerOptions"
      style="width: 110px"
      @update:value="setTimerDuration"
    />
    <span class="time" :class="{ urgent: timerDone || timerRemaining <= 10 }">
      {{ timerText }}
    </span>
    <n-button tertiary @click="toggleTimer">
      {{ timerRunning ? "暂停" : "开始" }}
    </n-button>
    <n-button
      quaternary
      @click="resetTimer"
      :disabled="!timerRunning && timerRemaining === timerDuration"
    >
      重置
    </n-button>
    <span v-if="timerDone" class="urgent">时间到</span>
  </n-space>
</template>

<style scoped>
.time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 62px;
  text-align: center;
}

.urgent {
  color: #d03050;
}
</style>
