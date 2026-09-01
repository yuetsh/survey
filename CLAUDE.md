# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 命令

```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # 先跑 vue-tsc 类型检查，再 vite build 输出到 dist/
npm run preview  # 预览构建产物 dist/
```

类型检查只在 `npm run build` 里通过 `vue-tsc` 执行。项目没有 linter，也没有测试。

## 这是什么

一个纯前端、单页的选择题练习应用（"速通选择题"）。没有后端：用户从本地上传 JSON 题库，题目、作答记录、考试状态全部存在 `localStorage` 里。界面是中文的，Naive UI 也配置了 `zhCN` 语言包。

## 架构

整个应用基本就是 `src/App.vue`；`src/Option.vue` 只是渲染单个选项单元格的叶子组件。没有路由、没有状态库、没有 service 层——状态就是 `App.vue` 里的一堆 `ref`。

**核心的两层数据结构：`source` 与 `data`。** `source` 是完整的工作集——考试中是整份试卷，否则是整个题库；`data` 是它按 `keyword` 过滤后的 `computed` 视图，只用于表格渲染。搜索永远只改视图，作答永远写回 `source`。改动这块时不要退回到"直接过滤 `data`"的写法：过滤会丢引用，导致退格无法恢复、以及考试中搜索一旦作答就把未显示的题连同答案一起写没。

**题库格式**（见 `data/*.json`、`public/demo.json`）：一个对象数组，字段为 `title`、`A`、`B`、可选的 `C`/`D`、`answer`（正确选项字母）、`select`（用户所选，未作答时为 `""`）。`data/` 放的是真实题库（C#、Python）；`public/demo.json` 是 5 题的示例。

**localStorage 是唯一数据源。** 四个 key，全部直接用 `window.localStorage` 读写：

- `exams` —— 上传的题库原始 JSON 字符串。只在上传时写入一次，之后当作不可变的原始数据，`showAll` 和 `getRandom` 都从它重新读取。
- `tests` —— 当前这场考试的题目，**包含**用户的 `select`。仅在考试中写入（统一走 `persistTest()`，非考试状态直接 return），每次点击选项都会落盘。`init()` 判断它是否存在，来决定恢复未完成的考试还是加载完整题库。
- `test_status` —— `"1"`（考试中）/ `"-1"`（非考试中），对应 `TestStatus` 枚举。
- `random_count` —— 上次选择的抽题数量，挂载时恢复。

由此带来的约束：任何替换 `source` 的逻辑都必须经 `loadExams()` 从 `exams` 重新读取（而不是在当前 `source` 上做减法），并在末尾调用 `persistTest()`，否则考试中已作答的记录会丢失/错位。`clear()` 会清空整个 localStorage。

**表格渲染。** Naive UI `n-data-table` 的 columns 是一个 `computed`，选项列用 `h()` 渲染函数而不是模板来构建，因为每个单元格都需要拿到该行的 `answer` 和当前的 `TestStatus`，才能决定渲染成复选框（考试模式）还是纯文本、并把正确答案标蓝（复习模式）。`updateChecked` 直接改行对象本身——它与 `source` 里的元素是同一个引用——然后 `persistTest()` 落盘整个 `source`。

表格默认每页 200 行（`pagination` 是个 `reactive` 对象，翻页和改每页条数都要自己写回它）。**序号列不要用 naive-ui 传给 `render` 的 index**：那是页内下标，分页后每页都会从 1 重新数。现在走 `indexMap`（行对象 → 它在 `source` 中的位置），跨页连续，也和交卷时错题的编号口径一致。

**考试生命周期：** `start()`（随机抽题、翻转状态、持久化）→ 点击选项（修改并持久化 `tests`）→ `check()`（比对 `answer` 与 `select`，在弹窗里列出错题）→ `finish()`（清除 `tests`、状态翻回、`init()` 重新加载完整题库）。

## 约定

- Prettier 配置 `semi: false`——不写分号。
- typescript 必须留在 `^6`。升到 `^7` 会让 `vue-tsc` 3.3.11 崩在 `ERR_PACKAGE_PATH_NOT_EXPORTED: './lib/tsc'`（TS 7 的 exports map 不再暴露该路径），`npm run build` 直接挂；`vite build` 仍能出包，但那条路径不做类型检查。
- `App.vue` 里 `Option` 类型别名（`"A" | "B" | "C" | "D"`）和导入的 `Option.vue` 组件同名；导入在值空间遮蔽了类型，所以 `op as Option` 这类断言指的是类型。
- `vite-plugin-singlefile` 和 `@vitejs/plugin-legacy` 已安装，但在 `vite.config.ts` 中当前是注释掉/未启用的状态——单文件构建原本是为了把 `dist/index.html` 单独分发。
