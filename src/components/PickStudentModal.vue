<script setup lang="ts">
import { NButton, NModal, NSpace } from "naive-ui"
import { pickStudent, pickedStudent, showPickedStudent } from "../store"
</script>

<template>
  <n-modal
    style="width: 360px"
    preset="card"
    title="抽到的是"
    v-model:show="showPickedStudent"
  >
    <p class="name">{{ pickedStudent }}</p>
    <n-space justify="center">
      <n-button type="primary" @click="pickStudent">再抽一个</n-button>
      <n-button @click="showPickedStudent = false">关闭</n-button>
    </n-space>
  </n-modal>
</template>

<style scoped>
.name {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 4px;
  margin: 10px 0 26px;
  text-align: center;
}
</style>
