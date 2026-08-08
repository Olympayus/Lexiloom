# Lexiloom

> 离线优先的个人词汇知识库 —— 在本地构建、管理、不断充实属于你自己的词库。

Lexiloom 是一款个人词汇知识管理桌面应用。它把**离线词典查询**与**结构化词汇管理**合二为一：搜索并合并 ECDICT / WordNet 的权威释义，再以分层字段、分类系统把你自己的理解沉淀成长期可复用的知识。

基于 Tauri 2 + React 构建，全部数据保存在本地，**无需联网**。

![version](https://img.shields.io/badge/version-0.3.2-4A6FA5)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![tech](https://img.shields.io/badge/tech-Tauri%202%20%2B%20React%2019-5B8C5A)
![offline](https://img.shields.io/badge/offline--first-✔-6B8E7F)

---

## 目录

- [简介](#简介)
- [✨ 特色](#-特色)
- [📸 截图](#-截图)
- [🚀 安装](#-安装)
- [📖 快速上手](#-快速上手)
- [🗑️ 卸载](#️-卸载)
- [💾 数据与隐私](#-数据与隐私)
- [🛠️ 技术栈](#️-技术栈)
- [🔧 开发](#-开发)
- [📄 许可](#-许可)

---

## 简介

背单词容易，**沉淀**单词难。Lexiloom 的理念很简单：把每一个词当作一条「知识条目」来经营。

- 从本地词典一键导入权威释义，再补上你自己的理解（例句、近义词、派生词、使用场景……）；
- 用**分类**组织词汇，用**分层字段**承载细节；
- 所有数据离线保存在本机，随时可以重新组织、重新挖掘。

它不是又一个背单词打卡 App，而是属于你的**个人词汇知识库**。

## ✨ 特色

### 🔍 双离线词典搜索
- 内置 **ECDICT + WordNet** 两套本地词典，查询**无需联网**；
- 两阶段搜索：输入联想建议 → 词性分组的详情树；
- ECDICT 提供音标、词性、中英释义、词形变化；WordNet 提供按词性分组的英文释义、近义词、例句。

### 🧩 合并添加（一键整合多词源）
- 在词典详情里**勾选**想要的字段，底部「合并添加」一次把 ECDICT + WordNet 的内容**合并进词库**；
- 字段按「父字段 + 值」去重，重复合并不会产生冗余。

### 📚 17 个内置分层字段
音标、词性、中文释义、英文释义、例句、词形变化、近义词、派生词、短语、补充……字段支持**树形层级**，一个词性下可挂多条中/英释义，释义下还可挂例句与近义词。

### 🧭 词性分组窗格
- 每个词性一个独立窗格，中/英释义**按词性独立编号**（中文释义(1)、英文释义(1)……）；
- 词性以紫色胶囊展示，状态一目了然。

### ✍️ 三态字段编辑
每个字段带**原始 / 已编辑 / 个人**三种状态：词典导入的原文、你修改过的内容、你原创的条目，一眼可辨；「编者模式」下支持可视化增删与拖拽排序。

### 🏷️ 分类系统
- **8 种颜色**的分类胶囊，单词 ↔ 分类自由分配；
- 侧边栏支持**字母 / 分类**双模式分组，收起态以彩色圆点快速识别；
- 设置面板内置**分类管理**：新建、编辑、删除、描述。

### 🖱️ 右键快捷菜单
- 侧边栏右键单词：编辑、添加到分类、从分类移除、删除；
- 右键分类标题：编辑分类、删除分类。

### ⚡ 顺手的小细节
- 弹窗与浮层**点击空白 / Esc 即关**；未改动的编辑框点外自动收起；
- **设置本地持久化**，重启后保留你的偏好；
- **自绘标题栏**与产品色系统一，内置最小化 / 最大化 / 关闭；
- 顶栏搜索框居中，圆角胶囊样式。

### 🔒 离线优先 & 跨平台
- 所有词典数据与应用数据均在本机，无云同步、无遥测；
- Windows / macOS / Linux 三平台桌面应用。

## 📸 截图

> 待补充：应用界面截图（词库视图、词典详情、编辑工作台、设置面板）。

```
┌──────────────────────────────────────────────┐
│  🔍 添加或查询单词...                    ⚙ ─ □ × │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │  A            │  │  观察 / observe        │ │
│  │  abandon      │  │  /əbˈzɜːv/            │ │
│  │  abate        │  │  [vt.] 中文释义(1)…    │ │
│  │  abbey        │  │  [vi.] 中文释义(1)…    │ │
│  │  ...          │  │  词形变化 / 例句 / 近义词 │ │
│  └──────────────┘  └───────────────────────┘ │
└──────────────────────────────────────────────┘
```

## 🚀 安装

### 正式安装包（推荐）

构建发布版后，运行安装程序即可：

```bash
cd Lexiloom
npm install
npm run build:dictionaries   # 生成本地词典库（首次必须）
npm run tauri build
```

生成的安装包位于：

```
src-tauri/target/release/bundle/
├── nsis/Lexiloom-0.3.2-setup.exe   # Windows 安装包（推荐）
└── msi/Lexiloom_0.3.2_x64.msi      # Windows MSI
```

双击 `setup.exe`，跟随向导完成安装；开始菜单会创建 **Lexiloom** 快捷方式。

> macOS 为 `.app` / `.dmg`，Linux 为 `.AppImage` / `.deb`（见 `bundle/` 目录）。

### 从源码运行（开发模式）

前置要求：

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://rustup.rs/) 工具链
- [Tauri 2 环境依赖](https://v2.tauri.app/start/prerequisites/)

```bash
cd Lexiloom
npm install
npm run build:dictionaries   # 生成本地词典库（ecdict.db / wordnet.db），全新克隆必须执行
npm run tauri dev            # 启动开发模式（Vite 热更新）
```

> 词典 `.db` 文件被 gitignore，由 `npm run build:dictionaries` 在本地生成。

## 📖 快速上手

1. **搜词** —— 在顶栏搜索框输入单词，选择联想建议。
2. **预览** —— 右侧展示 ECDICT / WordNet 详情，勾选想要的字段。
3. **加入词库** —— 点底部「**合并添加**」一键整合多词源内容并跳转编辑页；也可单源「添加到词库」。
4. **沉淀** —— 在编辑工作台用「编者模式」补充释义、例句、近义词、派生词等分层字段；右键单词快速操作。
5. **组织** —— 给单词分配彩色分类，在侧边栏按字母或分类浏览。
6. **回顾** —— 随时回到词库，检索、重排、整理你的词汇知识。

## 🗑️ 卸载

**Windows**

- 方式一：`设置 → 应用 → 已安装的应用 → Lexiloom → 卸载`；
- 方式二：`控制面板 → 程序 → 程序和功能 → Lexiloom → 卸载`；
- 方式三：从开始菜单运行「卸载 Lexiloom」。

**macOS**：将 `Lexiloom.app` 拖入废纸篓。

**Linux**：使用发行版的软件包管理器移除（如 `sudo apt remove lexiloom`）。

> **注意**：卸载程序不会删除你的个人数据（词库数据库与设置）。如需彻底清除，请手动删除数据目录，见下一节。

## 💾 数据与隐私

- **全部数据保存在本机**，无账号、无云端、无遥测。
- 词库数据库：`%APPDATA%\com.lexiloom.app\lexiloom.db`（Windows，macOS/Linux 位于对应的应用数据目录）。
- 应用设置：通过本地存储保存在应用数据目录中。
- 备份：直接复制 `lexiloom.db` 即可备份整个词库。

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 · TypeScript · Tailwind CSS v4 |
| 状态 | Zustand |
| 路由 | react-router-dom |
| 桌面壳 | Tauri 2（Rust） |
| 数据库 | SQLite（tauri-plugin-sql） |
| 词典 | ECDICT + WordNet（本地 SQLite） |

### 架构一览

```
src/
├── components/   # UI 组件（搜索、布局、词条编辑、设置、右键菜单…）
├── db/           # 数据库访问层（schema / 连接 / 查询）
├── lib/          # 纯逻辑库（词典解析、合并计划、字段排序、工具钩子…）
├── providers/    # 词典数据源（ECDICT / WordNet）
├── routes/       # 页面组件
├── services/     # 业务服务层（单词、字段、分类、搜索）
├── stores/       # Zustand 状态（单词 / 分类 / 视图 / 设置 / UI）
├── types/        # 共享类型定义
└── styles/       # 设计令牌与动画
```

## 🔧 开发

### 常用脚本

```bash
npm run dev                 # 启动 Vite 开发服务器
npm run build               # 类型检查 + 前端构建
npm run tauri dev           # 启动 Tauri 桌面应用（开发）
npm run tauri build         # 打包发布版
npm test                    # 运行单元测试（Vitest）
npm run lint                # 代码检查（oxlint）
npm run build:dictionaries  # 由源数据构建本地词典库
```

### 添加一个内置字段

1. 在 `src/types/field.ts` 的 `FieldKey` 联合类型中加入新键；
2. 加入 `BUILTIN_FIELDS` 常量；
3. 在 `src/db/schema.ts` 添加种子 INSERT。

### 版本发布同步清单

每次发版需将版本号同步为同一版本：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`（详见 `CLAUDE.md`）。

## 📄 许可

**Private** —— 个人项目，保留所有权利。
