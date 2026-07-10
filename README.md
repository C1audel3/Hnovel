# Hnovel

Hnovel 是一个面向长篇小说创作的本地 AI 写作工作台。它把故事设定、角色档案、世界观、情节线、大纲和章节正文放在同一个项目空间里，帮助作者更稳定地推进长篇作品。

它适合用来做：

- 长篇小说项目管理
- 故事圣经维护
- 角色与关系梳理
- 世界观资料整理
- 分卷 / 分批大纲规划
- 逐章正文生成与编辑
- 参考文风与风格档案管理

## 功能概览

- 故事管理：创建多个故事项目，维护标题、类型、简介、视角、时态和整体基调。
- 故事圣经：集中管理作品核心设定、参考文风和可人工编辑的风格档案。
- 角色管理：记录角色身份、性格、外貌、背景、标签和说话风格。
- 世界观管理：保存地点、组织、规则、物品、事件等世界观条目。
- 情节管理：维护主线、阶段目标、时间线和关键事件。
- 大纲生成：按章节数、本批目标、焦点角色和逐章提示生成多章大纲。
- 章节写作：根据当前章节大纲，并参考前后章节大纲与最近正文生成章节草稿。
- 章节列表：查看、编辑、删除章节。
- 本地保存：使用 SQLite 保存创作数据，适合个人本地工作流。
- OpenAI 兼容接口：可接入支持 OpenAI Chat Completions 协议的模型服务。

## 快速开始

### 1. 安装依赖

在项目根目录执行：

```bash
npm install
cd server && npm install
cd ../web && npm install
```

### 2. 配置模型接口

复制后端环境变量示例：

```bash
copy server\.env.example server\.env
```

然后编辑 `server/.env`：

```env
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://your-openai-compatible-endpoint/v1
LLM_MODEL=your-model-name
PORT=4000
DATA_DIR=../story-output
DEBUG_AI_RESPONSE=false
```

### 3. 一键启动

Windows 用户可以直接双击：

```text
start-dev.cmd
```

也可以在根目录执行：

```bash
npm run app
```

启动后访问：

```text
http://localhost:3000
```

后端默认运行在：

```text
http://localhost:4000
```

## 常用命令

```bash
npm run app          # 一键启动前端和后端开发服务
npm run dev          # 同 app，启动开发环境
npm run dev:web      # 只启动前端
npm run dev:server   # 只启动后端
npm run build        # 构建前端和后端
npm run start        # 构建后启动生产服务（后端会托管 web/dist）
npm run lint         # 前端 lint + 后端类型检查
npm run test         # 完整构建检查
```

## 推荐创作流程

1. 创建故事项目，填写简介、类型、视角和基调。
2. 在故事圣经中补充核心设定、参考文风和风格档案。
3. 添加主要角色，整理角色动机、关系和说话方式。
4. 在世界观与情节管理中记录重要地点、组织、规则、主线和时间线。
5. 进入写作页，填写本批章节目标和逐章提示。
6. 生成大纲，人工调整章节标题和摘要。
7. 按章节生成正文，检查连续性后继续编辑。
8. 在章节列表中统一管理已写章节。

## 项目结构

```text
Hnovel/
├─ web/                # React 前端应用
│  └─ src/
│     ├─ components/   # 通用组件
│     ├─ pages/        # 页面
│     ├─ stores/       # 前端状态
│     └─ lib/          # API 客户端与类型
├─ server/             # Express 后端 API
│  └─ src/
│     ├─ agents/       # AI 生成调度
│     ├─ db/           # SQLite 初始化与迁移
│     ├─ middleware/   # 校验与错误处理
│     └─ routes/       # API 路由
├─ story-output/       # 默认数据输出目录
├─ templates/          # 故事模板
├─ skills/             # 内部创作辅助资料
├─ start-dev.cmd       # Windows 一键启动脚本
└─ package.json        # 根项目命令
```

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | React + TypeScript + Vite |
| 状态管理 | Zustand + TanStack React Query |
| 后端 | Express + TypeScript |
| 数据库 | SQLite / better-sqlite3 |
| AI 接口 | OpenAI-compatible Chat Completions API |

## 环境变量

后端读取 `server/.env`：

```env
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://your-openai-compatible-endpoint/v1
LLM_MODEL=your-model-name
PORT=4000
DATA_DIR=../story-output
DEBUG_AI_RESPONSE=false
```

说明：

- `LLM_API_KEY`：模型服务密钥。
- `LLM_BASE_URL`：OpenAI 兼容接口地址。
- `LLM_MODEL`：模型名称。
- `PORT`：后端端口，默认 `4000`。
- `DATA_DIR`：SQLite 数据与输出文件目录。
- `DEBUG_AI_RESPONSE`：设为 `true` 时，会把 AI 大纲原始响应保存到 `story-output/debug/`，便于排查格式问题。

## 运行检查

后端提供两个健康检查接口：

```text
GET /api/health
GET /api/health/llm
```

其中 `/api/health/llm` 会用当前 `LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL` 发起一次最小模型请求，用于确认模型配置是否可用。

## 常见问题

### 前端提示 AI 生成失败

先检查：

- `server/.env` 是否存在。
- `LLM_API_KEY` 是否填写。
- `LLM_BASE_URL` 是否是可用的 OpenAI 兼容地址。
- 修改后端代码或 `.env` 后是否已经重启后端。

如果问题和大纲格式有关，可以临时设置：

```env
DEBUG_AI_RESPONSE=true
```

然后重启后端，重新生成一次大纲，再查看 `story-output/debug/` 下的原始响应文件。

### 提示 404

通常是模型接口地址或后端路由不匹配。优先检查 `LLM_BASE_URL`，确认它指向模型服务的 Chat Completions 兼容入口。

### 修改代码后没有生效

后端代码和 `.env` 修改后需要重启后端服务。使用 `start-dev.cmd` 时，关闭窗口后重新启动即可。

### 数据保存在哪里

默认保存在 `story-output/`，可通过 `server/.env` 里的 `DATA_DIR` 修改。

## License

MIT
