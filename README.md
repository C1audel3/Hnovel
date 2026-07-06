# Hnovel ✦

NSFW 小说 AI 写作平台 — 基于大语言模型的智能网文创作工具。

## 功能

- **AI 大纲生成** — 输入基本设定，自动生成多章大纲，支持 NSFW 章节标记
- **AI 逐章写作** — 基于大纲逐章生成正文，支持情欲密度和描写尺度调节
- **AI 角色生成** — 自动生成详细角色档案（性格、外貌、背景、偏好），可手动修改
- **故事管理** — 故事圣经、角色管理、世界观、情节管理四大模块
- **参考文风** — 粘贴喜欢的文字样本，AI 自动模仿其语调、用词和节奏
- **多格式导出** — 支持 Markdown、TXT、HTML 格式导出
- **4 种故事类型** — 校园、武侠、异世界、西幻，每种有预设模板

## 快速开始

```bash
# 1. 安装依赖
cd web && npm install
cd ../server && npm install

# 2. 配置 API Key
cp server/.env.example server/.env
# 编辑 server/.env，填入你的 LLM API Key

# 3. 启动后端 (端口 4000)
cd server && npm run dev

# 4. 启动前端 (端口 3000)
cd web && npm run dev
```

打开浏览器访问 **http://localhost:3000**

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| 状态管理 | Zustand + TanStack React Query |
| 图标 | 内联 SVG 组件 |
| 后端 | Express 5 + TypeScript |
| 数据库 | SQLite (better-sqlite3) |
| AI 接口 | OpenAI 兼容 API (DeepSeek / Claude 等) |

## 项目结构

```
Hnovel/
├── web/                # 前端 React 应用
│   └── src/
│       ├── components/ # Icon、Layout 等通用组件
│       ├── pages/      # 路由页面
│       ├── stores/     # Zustand 全局状态
│       └── lib/        # API 客户端、类型定义
├── server/             # 后端 Express API
│   └── src/
│       ├── routes/     # stories、chapters、characters、export
│       ├── agents/     # AI 生成调度 (大纲/章节/角色)
│       └── db/         # SQLite 数据库初始化
├── skills/             # NSFW Agent Skill 定义
│   ├── nsfw-story-init/       # 故事初始化
│   ├── nsfw-character/        # 角色管理
│   ├── nsfw-worldbuilding/    # 世界观构建
│   ├── nsfw-scene-writing/    # 情欲场景写作指南
│   └── nsfw-continuity/       # 连续性追踪
├── templates/          # 故事类型预设模板
│   ├── school/         # 校园
│   ├── wuxia/          # 武侠
│   ├── isekai/         # 异世界
│   └── western/        # 西幻
└── story-output/       # 生成的故事数据 (SQLite + Markdown)
```

## API 端点

### 故事
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stories` | 故事列表 |
| POST | `/api/stories` | 创建故事 |
| GET | `/api/stories/:id` | 故事详情 |
| PUT | `/api/stories/:id` | 更新故事 |
| DELETE | `/api/stories/:id` | 删除故事 |

### 角色
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stories/:id/characters` | 角色列表 |
| POST | `/api/stories/:id/characters` | 添加角色 |
| POST | `/api/stories/:id/characters/generate` | AI 生成角色 |
| GET | `/api/stories/:id/characters/:cid` | 角色详情 |
| GET | `/api/stories/:id/relationship-graph` | 关系图谱 |

### 章节 & AI
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stories/:id/chapters` | 章节列表 |
| POST | `/api/stories/:id/chapters/generate-outline` | AI 生成大纲 |
| POST | `/api/stories/:id/chapters/generate` | AI 生成章节 |
| PUT | `/api/stories/:id/chapters/:num` | 保存章节 |

### 导出
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stories/:id/export/markdown` | 导出 Markdown |
| GET | `/api/stories/:id/export/txt` | 导出 TXT |
| GET | `/api/stories/:id/export/html` | 导出 HTML |

## 环境变量

```bash
# server/.env
LLM_API_KEY=your-api-key          # LLM API 密钥
LLM_BASE_URL=https://example.com  # API 地址 (OpenAI 兼容)
LLM_MODEL=deepseek-v4-flash       # 模型名称
PORT=4000                         # 后端端口
DATA_DIR=../story-output          # 数据存储目录
```

## 写作流程

1. **创建故事** → 选择类型、分级、描写尺度
2. **AI 生成角色** → 输入姓名和提示词，AI 生成完整档案
3. **生成大纲** → 设置章节数量，AI 生成多章大纲；手动标记 NSFW 章节
4. **编辑大纲** → 修改标题、概要；添加/删除章节
5. **逐章生成** → 点击单章生成正文，右侧实时预览
6. **手动编辑** → 在编辑器中修改章节内容
7. **导出** → 导出为 Markdown / TXT / HTML

## License

MIT
