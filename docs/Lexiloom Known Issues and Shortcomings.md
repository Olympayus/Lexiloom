# Lexiloom 已知问题与不足清单（Known Issues & Shortcomings）

> **本文档用途**：2026-08-01 对 Lexiloom 的代码审查结论，作为后续会话可直接读取执行的权威依据。
> 遇到与本项目相关的新任务（改代码/加功能/修 bug）前，先读本文件核对已知问题，避免重复排查或触雷。
>
> **核查方式**：最小读取策略，只读了关键文件（清单文件、数据层、services、providers、核心 UI 组件、Tauri 后端、构建脚本）。
> **编译状态**：`npx tsc -b` 通过（类型层面无错误）。
> **项目现状**：v0.2（词典字段系统）主干完成，v0.3+（标签/集合/笔记/AI）未开始。
>
> 所有路径相对项目根 `E:\Workspace\Projects\Lexiloom`，行号以 2026-08-01 的代码为准。

---

## 0. 项目状态速览

| 里程碑 | 状态 |
|---|---|
| v0.1 核心闭环（添加/查看/编辑、本地存储、基础字段） | ✅ 基本完成 |
| v0.1 删除单词（规格 #4） | ✅ **已接通（2026-08-02 修复）** |
| v0.2 层级字段 + 双词典搜索 | ✅ 已实现 |
| v0.2 展示控制（隐藏/折叠/排序/视觉层级） | ❌ 未实现 |
| v0.3+ 标签 / 词汇集合 / 个人笔记 / 词典与专业领域 / AI | ❌ 未开始（符合路线图） |

已实现的核心功能：ECDICT + WordNet 双词典两阶段搜索（建议下拉 → 详情卡片）、卡片勾选合并入词库（`mergeFields` 按 `field_id||value` 去重、父子字段归位）、词库列表筛选、字段行内编辑、11 个内置字段、5 张表 + 旧 schema 自动迁移。

---

## 1. 严重问题（必修）

### 1.1 🔴 多值字段编辑 bug：编辑第二条会覆盖第一条 —— ✅ 已修复（2026-08-02）

**位置**
- `src/components/word/WordWorkbench.tsx:62-71` — `handleSave` 用 `def.key` 调 `updateFieldValue`
- `src/stores/wordStore.ts:38-53` — `updateFieldValue(fieldKey, value)`
- `src/services/fieldService.ts:38-41` — `upsertValue`
- `src/db/fields.ts:50-102` — `upsertFieldValue`：`SELECT * FROM field_values WHERE word_id=?1 AND field_id=?2` **取第一行** UPDATE（lines 53-56, 59-62）

**根因**
v0.2 为支持多词义/多例句，允许同一 `field_id` 存在多条 `field_values`。但用户编辑路径仍按 `(word_id, field_id)` 定位记录，命中第一行即覆盖。

**复现**
从词典添加一个含多条中文释义或多条例句的词 → 在工作台点击编辑第 2 条 → 保存后第 1 条被覆盖为同一内容（或与第 2 条错位）。

**影响**
用户编辑多值字段时数据错乱，属数据正确性问题。

**修复建议**
用户编辑应按 `field_values.id` 精确 UPDATE：
1. `UpsertFieldValueInput` 增加可选 `id` 字段；
2. `updateFieldValue` 签名改为接收 `fvId`（WordWorkbench 的 `handleSave` 已能拿到 `fv.id`）；
3. DB 层新增/改造「按 id 更新」函数；
4. 保留 `mergeFields` 现有的按 `field_id||value` 去重逻辑（`src/services/wordService.ts:44`），二者互不影响。

---

### 1.2 🔴 删除单词功能未接通（v0.1 规格 #4） —— ✅ 已修复（2026-08-02）

**位置**
- 已实现：`src/db/words.ts:106-113`（`deleteWord`）、`src/services/wordService.ts:100-103`（`deleteWord`）
- 缺失：`src/stores/wordStore.ts` 无 `deleteWord` action（interface 在 lines 6-18）；全项目无删除按钮/入口

**影响**
用户无法从词库移除单词，词库只增不减。v0.1 规格承诺项。

**修复建议**
1. store 新增 `deleteWord(id)`：调 `wordService.deleteWord` → `loadWords()` → 清空 `selectedWordId`/`fieldValues`；
2. `WordWorkbench` 或 `WordList` 加删除按钮 + 确认弹窗（可用系统 `confirm()` 起步）。

---

## 2. 规格缺口（未实现承诺项）

### 2.1 🟠 展示控制未实现（规格 #24-26 / v0.2 计划「展示控制」）
- 字段显示/隐藏、展开/折叠、展示顺序调整、层级视觉区分（字号/颜色/间距）均未实现；
- `src/components/word/WordWorkbench.tsx:199-202` 固定渲染全部字段且默认全展开；
- `src/db/fields.ts:158-168` 的 `deleteFieldValue` 已实现，但无单字段删除 UI；字段排序 UI 亦无。

### 2.2 🟠 搜索能力与规格差距
- 规格 #21「中英双向搜索」：现为**仅英文**（v0.2 计划已弃 CC-CEDICT）；
- 规格 #22「模糊搜索」：实为 `LIKE '前缀%'`（`src/providers/ecdict.ts:37-42`、`src/providers/wordnet.ts:14-19`），非子串/真模糊；
- `src/providers/ecdict.ts:51` `lookup` 用 `LIMIT 1`，只返回第一条词条。

---

## 3. 死代码与遗留文件（清理类）

### 3.1 🟠 Rust 后端遗留 `seed_dictionary` 死代码
- 位置：`src-tauri/src/lib.rs:6-40`（引用处 lines 7, 23, 24, 25）
- 现象：每次启动硬编码查找已废弃的 `cc-cedict.db`，打印 `[seed] setup error: dictionary not found, tried: ...`
- 根因：v0.2 弃用 CC-CEDICT 后未清理 Rust 侧；词典交付已改由 `scripts/copy-dbs.mjs`（拷到 app data dir）
- 建议：删除 `seed_dictionary` 函数及其在 `run()` setup 中的调用，`setup` 留空。

### 3.2 🟠 死表：`dictionary_entries` / `dictionary_fields`
- 位置：`src/db/schema.ts:34-48`
- 现象：建表后**从未读写**（provider 直接查询词典库，不走这两张表）
- 建议：若未来做「来源管理/词典快照」可保留，否则删除。

### 3.3 🟡 不可达路由：`/add` 旧手动添加页
- 位置：`src/App.tsx:12` → `src/routes/AddWordPage.tsx` → `src/components/search/FieldSelector.tsx`
- 现象：路由已注册但**无任何入口跳转**（新流程是从搜索详情卡片添加），属不可达遗留页
- 建议：删除或补入口。

### 3.4 🟡 遗留词典文件增大安装包
- `scripts/parse-cc-cedict.mjs`、`public/dictionaries/cc-cedict.db`（10MB）、`public/dictionaries/cedict_ts.u8` 仍在仓库；
- `src-tauri/tauri.conf.json` 的 `"resources": ["../public/dictionaries/*"]` 会把它们全部打进安装包 → 无谓增大包体。
- 建议：删除 CC-CEDICT 相关文件，resources 改为仅 `ecdict.db`/`wordnet.db`（或目录内白名单）。

### 3.5 🟡 其他
- `src/services/searchService.ts:43-48`：`searchDictionary` 标 `@deprecated` 仍导出，可删。
- `src/components/word/WordCard.tsx:4,9,46`：`hasCustomContent` prop 恒为 `undefined`（`WordList` 未传），未接线。
- README 过时：`README.md:11-13` 仍声称 CC-CEDICT 中英搜索、7 个内置字段（实际 11 个），与实现不符，需同步更新。

---

## 4. 性能与工程隐患

### 4.1 🟠 每次搜索都重新打开全量词典库
- 位置：`src/providers/ecdict.ts:36,46`、`src/providers/wordnet.ts:12,22` 每次 `Database.load()` 打开 ecdict.db（95MB）/ wordnet.db（26MB）
- 影响：高频打字/多次查询有卡顿风险
- 建议：缓存已加载的连接（如模块级 Map<path, Database>），或确认 `tauri-plugin-sql` 的 `Database.load` 是否自带缓存。

### 4.2 🟠 查询逻辑重复
- `src/lib/search.ts` `vocabularySearch` 与 `src/db/words.ts:41-81` `getWordsWithPreviews` 是同一段 `MAX(CASE...) LEFT JOIN` 查询的两份拷贝
- 建议：合并到一处（例如统一走 `db/words.ts`，`lib/search.ts` 只做包装）。

### 4.3 🟡 WordList 无虚拟滚动
- 位置：`src/components/layout/WordList.tsx:1`（自带 TODO）
- 现状：`overflow-y-auto` 全量渲染，>100 词后会卡
- 建议：引入 `react-window` 或 `@tanstack/react-virtual`。

### 4.4 🟡 类型磨损
- `src/stores/wordStore.ts:6` `words: (Word | WordWithPreview)[]` 联合类型 + `WordList.tsx:16,21` 强转 `words as WordWithPreview[]`，类型不精确
- 建议：统一为 `WordWithPreview[]`（`getPreviews` 已返回该类型）。

### 4.5 🟡 mergeFields 父子映射机制脆弱（维护性）
- 位置：`src/services/wordService.ts:76-91`
- 现象：`parentIdMap` 用 `${key}::${occ}` 复合键 + 裸 key 覆盖（裸 key 会被最后出现的父字段覆盖，仅 'exchange' 单容器时可用）；依赖 `DictDetailCard` 传 `parentKey: 'english_definition::${defIdx}'`（`DictDetailCard.tsx:181,192`）
- 影响：当前工作正常，但两处隐式耦合，改动需谨慎
- 建议：重构时引入显式的父子匹配键（如父字段临时 id 传递）。

---

## 5. 元数据与一致性

- `package.json` version `0.0.0` vs `src-tauri/Cargo.toml` + `src-tauri/tauri.conf.json` version `0.1.0`，不一致。
- 项目无任何测试框架/测试文件。
- 文档文件名笔误：`docs/Card Exmaple.md`（应为 `Example`）。

---

## 6. 建议修复顺序

1. 🔴 **1.1 多值字段编辑 bug**（数据正确性，动数据层查重逻辑，改前先 `npx tsc -b` 验证）
2. 🔴 **1.2 删除单词接通 UI**（store action + WordWorkbench/WordList 按钮）
3. 🟠 **3.1 Rust seed 死代码**（每次启动报错噪声，删除简单）
4. 🟠 **3.2/3.3/3.4 死文件清理 + 4.2 去重 + README 更新**
5. 🟡 其余按需（展示控制、连接缓存、虚拟滚动、版本统一）

---

## 附：相关文档索引

- 功能规格：`docs/Lexiloom Feature Specification.md`
- 路线图：`docs/Lexiloom Product Roadmap.md`
- 产品愿景：`docs/Lexiloom_Vision.md`
- v0.2 实现计划：`docs/superpowers/plans/2026-07-30-v0.2-dictionary-field-system.md`
- 卡片模板示例：`docs/Card Exmaple.md`（文件名待修正为 Example）
- 架构说明：`CLAUDE.md`、`README.md`
