---
name: nsfw-story-init
description: 当用户要求"开始一个新故事"、"初始化一个NSFW故事"、"创建R18小说"、"新书"、"搭建故事"或想要从头开始一个新的成人向小说写作项目时，应使用此技能。支持仙侠修真、都市言情、架空奇幻、纯官能等多种NSFW子类型。
---

# NSFW故事初始化

## 概述

使用结构化的 markdown 文件夹布局初始化一个新的NSFW故事项目。在标准 story-skills 框架基础上，增加成人内容专属的元数据：内容分级、NSFW子类型标签、描写尺度、目标读者等。同时根据故事类型自动应用对应的预设模板。

## 适用场景

- 开始一个新的成人向故事、R18小说项目
- 为已有的NSFW小说创意搭建文件夹结构
- 不适用于向已有故事项目添加内容（请改用各领域专属技能）

## 工作流程

### 1. 收集故事基本信息

询问用户以下信息，提供选项但允许自由输入：

**基础信息：**
- 标题
- 类型与子类型：仙侠修真 | 都市言情 | 架空奇幻 | 历史架空 | 纯官能 | 其他
- 简要梗概（2-3句话）
- 设定时代/时期
- 核心主题（2-4个）

**NSFW专属信息：**
- **内容分级** (`rating`): `R18`（成人向）| `R18G`（重度成人向，含猎奇/黑暗内容）| `R18+`（极重度）
- **NSFW子标签** (`nsfw-tags`): 多选，如 `harem`（后宫）、`cultivation`（双修）、`bdsm`、`ntr`、`milf`、`yuri`、`yaoi`、`mind-control`、`monster`、`tentacle`、`exhibitionism`、`voyeurism`、` corruption`（堕落）等
- **目标读者** (`target-audience`): `male`（男频）| `female`（女频）| `general`（一般向）
- **描写尺度** (`explicit-level`): `mild`（轻度：含蓄暗示，点到为止）| `moderate`（中度：适度描写，有具体感官刻画）| `graphic`（详细：浓墨重彩，完整场景描写）
- **情欲场景比例** (`nsfw-ratio`): `low`（约10-20%）| `balanced`（约30-50%）| `high`（约50-70%）| `pure`（约80%+，纯官能向）

**叙事信息：**
- 视角风格：第一人称 | 第三人称有限视角 | 第三人称全知视角 | 说书人视角
- 叙事时间定位：过去 | 现在

### 2. 应用类型模板

根据用户选择的类型，推荐并应用预设模板。模板位于 `templates/` 目录下：

| 类型 | 模板目录 | 预设内容 |
|------|---------|---------|
| 仙侠修真 | `templates/xianxia/` | 修炼等级体系、双修功法、宗门势力、灵药/法宝体系 |
| 都市言情 | `templates/urban/` | 现代都市场景、职场/娱乐圈设定、社会关系网络 |
| 架空奇幻 | `templates/fantasy/` | 魔法/异能体系、异世界设定、种族关系 |
| 纯官能 | `templates/erotica/` | 简化的世界观、重点在角色关系网和场景类型库 |

### 3. 创建项目结构

如果 Story CLI 可用，优先使用：
```shell
story init "{Title}" --genre "{genre}" --sub-genre "{sub-genre}" --setting-era "{era}" --pov "{pov}" --tense "{tense}" --synopsis "{synopsis}" --theme "{themes}"
```

创建标准 story-skills 目录结构，并在 `story.md` frontmatter 中增加NSFW专属字段：

```yaml
---
title: "{Title}"
schema-version: 2
genre: {genre}
sub-genre: {sub-genre}
setting-era: {era}
status: planning
rating: {R18|R18G|R18+}
nsfw-tags:
  - {tag1}
  - {tag2}
explicit-level: {mild|moderate|graphic}
nsfw-ratio: {low|balanced|high|pure}
target-audience: {male|female|general}
themes:
  - {theme1}
  - {theme2}
pov: {pov-style}
tense: {tense}
---
```

在 frontmatter 下方包含：
- **梗概** - 提供的 2-3 句话梗概
- **基调与风格** - 包括情欲描写的风格定位
- **尺度说明** - 明确定义该作品的描写边界和禁忌
- **备注** - 供用户填写的空白章节

### 4. 初始化NSFW专属文件

除了标准文件外，还需创建：

- `characters/_index.md` - 增加 `nsfw-roles` 和 `affection-network` 章节
- `worldbuilding/_index.md` - 增加 `cultivation-system`（修炼体系）和 `sexual-systems`（情欲规则）章节
- `continuity/scene-log.md` - **新增**：情欲场景日志，记录每章的NSFW内容摘要
- `scenes/_index.md` - 增加 `scene-type` 和 `explicit-level` 列

### 5. 展示摘要并建议后续步骤

创建完成后，展示：
- 故事设定摘要
- NSFW配置一览（分级、尺度、比例）
- 建议的下一步：
  - "添加第一个角色"（触发 nsfw-character 技能）
  - "配置世界观中的情欲体系"（触发 nsfw-worldbuilding 技能）
  - "定义情节结构"（触发 plot-structure 技能）
  - 运行 `story validate .` 检查项目完整性

## 约定

继承标准 story-skills 的所有约定，并增加：

- **内容分级标记** - 每个章节文件 frontmatter 中标记该章的 `explicit-level` 和 `scene-type`
- **NSFW标签体系** - 角色和场景使用统一的NSFW标签（参见 `references/nsfw-tags.md`）
- **边界声明** - `story.md` 中明确作品的性描写边界和绝对禁忌
- **模板优先** - 使用类型模板快速启动，避免从零开始

## 参考文件

- `references/story-template.md` - NSFW故事圣经完整模板
- `references/nsfw-tags.md` - NSFW标签体系完整列表
- 上游 `story-skills-main/skills/story-init/SKILL.md` - 标准初始化流程
