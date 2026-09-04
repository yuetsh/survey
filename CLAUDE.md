# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 命令

```bash
bun install      # 安装依赖
bun run dev      # 启动 Vite 开发服务器
bun run build    # 先跑 vue-tsc 类型检查，再 vite build 输出到 dist/
bun run preview  # 预览构建产物 dist/
```

包管理器是 **Bun**（锁文件 `bun.lock`，已提交）。不要再用 npm/yarn 装依赖，混装会同时留下两份锁文件。Bun 在这里只做包管理和脚本运行器——`.vue` 单文件组件仍由 Vite + `@vitejs/plugin-vue` 编译，Bun 自带的打包器没有官方 Vue 插件，别把 `vite build` 换成 `bun build`。

类型检查只在 `bun run build` 里通过 `vue-tsc` 执行。项目没有 linter，也没有测试。

`core-js` 的 postinstall 被 Bun 拦下了（它只是打印一条募捐信息），不用 `bun pm trust`。

## 这是什么

一个纯前端、单页的选择题练习应用（"速通选择题"）。没有后端：用户从本地上传 JSON 题库，题目、作答记录、考试状态全部存在 `localStorage` 里。界面是中文的，Naive UI 也配置了 `zhCN` 语言包。

## 架构

没有路由、没有状态库。文件分工：

```
src/
  types.ts                    Exam / WrongAnswer / TestStatus / OPTION_KEY
  storage.ts                  localStorage 的唯一出入口，别处不要直接碰 window.localStorage
  store.ts                    模块作用域的简易 store：状态 + 派生 + 所有动作
  theme.ts                    naive-ui 的 themeOverrides
  composables/useKeyboard.ts  全局快捷键，以及给学生看的 SHORTCUTS 说明
  components/
    ExamToolbar.vue           顶部工具栏（上传 / 抽题 / 做题 / 交卷 / 搜索）
    ExamTable.vue             表格与列定义
    OptionCell.vue            单个选项单元格（叶子组件）
    ResultModal.vue           交卷后的得分与错题弹窗
    ShortcutHint.vue          快捷键提示浮层
  App.vue                     只剩 config-provider + 布局 + 三个组件
```

`store.ts` 的状态是**模块作用域的 `ref`**，组件直接 import 取用，不走 props/emits——应用只有一份状态，这样组件都是薄的。要新增状态或动作就加在 `store.ts`，不要在组件里再养一份。

**核心的两层数据结构：`source` 与 `data`。** `source` 是完整的工作集——考试中是整份试卷，否则是整个题库；`data` 是它按 `keyword` 过滤后的 `computed` 视图，只用于表格渲染。搜索永远只改视图，作答永远写回 `source`。改动这块时不要退回到"直接过滤 `data`"的写法：过滤会丢引用，导致退格无法恢复、以及考试中搜索一旦作答就把未显示的题连同答案一起写没。

**题库格式**（见 `data/*.json`、`public/demo.json`）：一个对象数组，字段为 `title`、`A`、`B`、可选的 `C` 及之后的字母、`answer`（正确选项字母）、`select`（用户所选，未作答时为 `""`）。选项个数不写死：`optionLabels` 这个 `computed` 扫描当前 `source`，把 `title`/`answer`/`select` 之外、有内容的单个大写字母键（`OPTION_KEY`）收集起来按字母序出列，A~Z 都支持，四选项题库也不会多出空列。`data/` 放的是真实题库（C#、Python）；`public/demo.json` 是 5 题的示例。

**localStorage 是唯一数据源。** 四个 key，全部直接用 `window.localStorage` 读写：

- `exams` —— 上传的题库原始 JSON 字符串。只在上传时写入一次，之后当作不可变的原始数据，`showAll` 和 `getRandom` 都从它重新读取。
- `tests` —— 当前这场考试的题目，**包含**用户的 `select`。仅在考试中写入（统一走 `persistTest()`，非考试状态直接 return），每次作答都会落盘。`init()` 判断它是否存在，来决定恢复未完成的考试还是加载完整题库。
- `test_status` —— `"1"`（考试中）/ `"-1"`（非考试中），对应 `TestStatus` 枚举。
- `random_count` —— 上次选择的抽题数量，挂载时恢复。

由此带来的约束：任何替换 `source` 的逻辑都必须经 `storage.loadExams()` 从 `exams` 重新读取（而不是在当前 `source` 上做减法），并在末尾调用 `persistTest()`，否则考试中已作答的记录会丢失/错位。`clear()` 会清空整个 localStorage。

**表格渲染**（`components/ExamTable.vue`）。Naive UI `n-data-table` 的 columns 是一个 `computed`，选项列用 `h()` 渲染函数而不是模板来构建，因为每个单元格都需要拿到该行的 `answer` 和当前的 `TestStatus`，才能决定渲染成复选框（考试模式）还是纯文本、并给正确答案加绿色 ✓ 角标（复习模式）。作答走 `store.selectOption()`，它直接改行对象本身——那与 `source` 里的元素是同一个引用——然后 `persistTest()` 落盘整个 `source`。

表格默认每页 10 行（`pagination` 是个 `reactive` 对象，翻页和改每页条数都要自己写回它）。**序号列不要用 naive-ui 传给 `render` 的 index**：那是页内下标，分页后每页都会从 1 重新数。现在走 `indexMap`（行对象 → 它在 `source` 中的位置），跨页连续，也和交卷时错题的编号口径一致。

**键盘操作**（`composables/useKeyboard.ts`）。`window` 上挂了一个 `keydown` 监听（`onMounted` 注册、`onUnmounted` 摘除）：`←` `→` 翻页始终可用，`↑` `↓` 移动高亮游标、字母键作答只在考试模式下生效。`cursorIndex` 存的是**在 `data`（过滤后的视图）里的下标**而不是行对象，这样才能由它算出该跳到第几页；任何替换 `source` 或改变过滤结果的操作（上传、抽题、显示所有题、改关键词、清除）都要调 `resetCursor()`，否则游标会指到另一道题上。字母键先查 `optionLabels`：`J`/`K` 只有在它们不是本题库的选项字母时才当上下移动用。给学生看的说明是同文件里的 `SHORTCUTS`，由 `ShortcutHint.vue` 渲染成提示浮层——**改按键行为时顺手改它**，两者放在一个文件就是为了不让它们对不上。

**考试生命周期：** `start()`（随机抽题、翻转状态、持久化）→ 点击选项（修改并持久化 `tests`）→ `check()`（比对 `answer` 与 `select`，在弹窗里列出错题）→ `finish()`（清除 `tests`、状态翻回、`init()` 重新加载完整题库）。

## 约定

- Prettier 配置 `semi: false`——不写分号。
- typescript 必须留在 `^6`。升到 `^7` 会让 `vue-tsc` 3.3.11 崩在 `ERR_PACKAGE_PATH_NOT_EXPORTED: './lib/tsc'`（TS 7 的 exports map 不再暴露该路径），`npm run build` 直接挂；`vite build` 仍能出包，但那条路径不做类型检查。
- `types.ts` 里的 `Option` 就是 `string`（选项字母由题库决定）。选项单元格组件叫 `OptionCell.vue` 而不是 `Option.vue`，就是为了不和这个类型重名——原来两者同名时，导入在值空间遮蔽了类型，`op as Option` 到底指哪个得靠猜。
- `vite-plugin-singlefile` 和 `@vitejs/plugin-legacy` 已安装，但在 `vite.config.ts` 中当前是注释掉/未启用的状态——单文件构建原本是为了把 `dist/index.html` 单独分发。
