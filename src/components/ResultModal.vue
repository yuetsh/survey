<script setup lang="ts">
import { NButton, NModal, NSpace } from "naive-ui"
import { finish, score, showWrongAnswer, wrongAnswers } from "../store"
</script>

<template>
  <n-modal style="width: 800px" preset="card" v-model:show="showWrongAnswer">
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
</template>

<style scoped>
.wrong-item {
  line-height: 1.7;
  margin: 0 0 14px;
}

.correct {
  color: #18a058;
  font-weight: 700;
}
</style>
