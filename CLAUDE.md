# Lexiloom

Personal vocabulary knowledge management desktop app.
Tauri 2 + React + TypeScript + SQLite.

> **Status: v0.4.0** — 开发中。v0.4.0 更新清单：合并添加词性错位修复、设置面板条目样式重设计（词典返回词条树形分块 + 分类管理计数/悬停按钮）、顶部搜索框垂直瘦身与宽度规则、单词标题衬线字体（Palatino Linotype）、检查更新按钮化、移除小搜索框分割线。

---

## 快速开始 Quick Start

```bash
cd /e/Workspace/Projects/Lexiloom
npm install
npm run build:dictionaries  # build local dictionary DBs (ecdict.db / wordnet.db) — gitignored, required on fresh clone
npm run tauri dev
```

## 常用脚本 Scripts

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 类型检查（`tsc -b`）+ 前端构建 |
| `npm run tauri dev` | 启动 Tauri 桌面应用（开发模式，热更新） |
| `npm run tauri build` | 打包发布版安装包 |
| `npm test` | 单元测试（Vitest） |
| `npm run lint` | 代码检查（oxlint） |
| `npm run build:dictionaries` | 构建本地词典库（`ecdict.db` / `wordnet.db`） |

## 架构 Architecture

- `src/types/` — 共享 TypeScript 类型（项目数据契约）
- `src/db/` — 数据库访问层（words / fields / dictionary queries）
- `src/providers/` — 词典数据源，实现 `DictionaryProvider`
- `src/stores/` — Zustand UI 状态
- `src/routes/` — 页面组件
- `src/components/` — UI 组件

### 关键类型 Key Types

- `Word` (`src/types/word.ts`) — 单词身份
- `FieldKey` (`src/types/field.ts`) — 17 个内置字段键（联合字面量类型）
- `BUILTIN_FIELDS` (`src/types/field.ts`) — 字段元数据常量
- `FieldValue` (`src/types/field.ts`) — 单词 + 字段值对
- `DictionaryEntry` (`src/types/dictionary.ts`)
- `DictionaryProvider` (`src/providers/types.ts`) — 必须实现 `lookup(query)`

### 数据库 Database

5 张表，经 tauri-plugin-sql（纯 TS，无 Rust CRUD）：
`words`、`field_definitions`、`field_values`、`categories`、`word_categories`

词典查询读取打包的 `ecdict.db` / `wordnet.db`，由 `npm run build:dictionaries` 生成。

### 布局 Layout

AppShell 三区：TopBar（56px，常驻）/ 侧边栏（300px，可收起 120–240px）/ 右侧（词编辑视图 ↔ 词典详情视图）。

## 开发约定 Conventions

### 添加内置字段 Adding a New Built-in Field

1. 在 `src/types/field.ts` 的 `FieldKey` 联合类型中加入新键；
2. 加入 `BUILTIN_FIELDS` 常量；
3. 在 `src/db/schema.ts` 添加种子 INSERT。

---

## 版本发布工作流 Release Workflow

> 用途：每次**更新软件后**（改代码 → 重打安装包 → 上架）的固定流程。新代理接手后续版本时照此执行。
> **git 边界**：add / commit 可自行执行；**本地 merge、push 与 `gh release`（公开发布）必须由用户亲自执行**。

### 第 1 步 · 开发与验证

1. 从 `main` 切出功能分支 `vX.Y.Z`（本仓库惯例：直接开版本分支，如 `git checkout -b v0.4.0`）；
2. 开发完成后 `npm test` / `npm run lint` / `npm run build` 全绿；
3. 本地合并回 `main`：`git checkout main && git merge vX.Y.Z`（分叉时会产生 merge commit，可能有冲突需解决）。

### 第 2 步 · 同步版本号

三处必须一致：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`（`src-tauri/Cargo.lock` 根部若记录了也同步）。

### 第 3 步 · 同步文档

- `CLAUDE.md` 顶部 `Status:` 行：更新版本号与进度；
- `README.md`：徽章 `version-<v>`、安装表文件名；若功能/截图变化则同步「特色 / 截图」段；
- 内置字段计数：若 `BUILTIN_FIELDS` 增减，同步 README / CLAUDE.md 的「17 个内置字段」；
- 词典集变化：更新 `src-tauri/tauri.conf.json` 的 `resources` 白名单。

### 第 4 步 · 重新打包安装包

```bash
npm run tauri build          # 完整打包（MSI + NSIS）
npm run tauri build -- --bundles nsis   # 网络受限时只打 NSIS（MSI 需联网下载 WiX，可能失败）
```

产物：`src-tauri/target/release/bundle/nsis/Lexiloom_<version>_x64-setup.exe`（Windows 用户主用此安装包）。

> 注意：`tauri.conf.json` 改动需**完全重启** `npm run tauri dev` 才生效（热更新不读配置）。

### 第 5 步 · 生成更新清单 + 发布 GitHub Release（用户执行）

1. 生成 `latest.json`（自更新 endpoint 读取，必须含签名）：
   ```bash
   node scripts/write-latest-json.mjs   # 按已构建产物生成平台条目（Windows 必有）
   # 手工填写 latest.json 的 notes 字段
   git add latest.json && git commit -m "chore: update latest.json for v<version>"
   ```
2. 发布：
   ```bash
   git push origin main
   git tag v<version> && git push origin v<version>
   gh release create v<version> \
     "src-tauri/target/release/bundle/nsis/Lexiloom_<version>_x64-setup.exe" \
     "src-tauri/target/release/bundle/nsis/Lexiloom_<version>_x64-setup.exe.sig" \
     --title "Lexiloom v<version>" --notes "<changelog>"
   ```

### 第 5b 步 · macOS 发布（Mac 上执行，仅需发布 macOS 更新时）

1. Mac 上 `TAURI_SIGNING_PRIVATE_KEY="$(cat Lexiloom.key)" TAURI_SIGNING_PRIVATE_KEY_PASSWORD=<密码> npm run tauri build`；
2. 核对 `bundle/dmg/Lexiloom_<v>_aarch64.dmg.sig` / `Lexiloom_<v>_x64.dmg.sig` 命名与 `write-latest-json.mjs` 的假设一致（不一致则调整脚本模式匹配）；
3. Mac 上 `node scripts/write-latest-json.mjs` 重新生成 latest.json（含 darwin 条目）并 commit；
4. Apple 代码签名 + 公证 dmg（Gatekeeper）；
5. 上传 dmg 到 GitHub Release；
6. macOS 真机验证应用内更新（装旧版 → 检查更新 → 升级成功、数据保留）。

### 第 6 步 · 收尾

- 确认 README 的版本徽章、安装表文件名与 Release 实际产物一致；
- 可选：删除已合并的本地分支 `git branch -d vX.Y.Z`（若其尚未合入 `origin/vX.Y.Z`，`-d` 会拒绝，需 `-D` 强制删除——前提是内容已在 `origin/main` 上确认无丢失）。

---

## 备注 Notes

- `docs/v0.2.x-work.md` 状态更新随各版本任务进行，属一次性工作，**不入**发布清单。
- README 面向用户（安装/使用/卸载），开发者细节（构建、打包、发布）以本文件为准。
