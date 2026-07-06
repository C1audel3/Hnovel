---
name: nsfw-character
description: 当用户要求"创建角色"、"添加后宫"、"角色关系"、"角色XP"、"角色性向"、"人物设定"、"角色档案"，或需要管理NSFW故事中的角色（包括性向、偏好、身体特征、后宫关系）时，应使用此技能。
---

# NSFW角色管理

## 概述

在标准角色管理基础上，为NSFW小说创建和管理包含成人内容的丰富角色档案。每个角色增加性向与偏好、身体特征描述、情史追踪、好感度系统，以及支持后宫/多角关系网络。

## 前置条件

故事项目必须已经存在。通过检查项目根目录下是否存在 `story.md` 来验证。`story.md` 的 frontmatter 中应包含 `rating` 字段。

## 创建角色

### 1. 收集上下文
- 阅读 `story.md` 了解类型、分级、尺度和基调
- 阅读 `characters/_index.md` 了解已有角色
- 了解后宫/关系的当前状态

### 2. 信息收集

**基础角色信息：**
- 姓名、性别、年龄
- 角色定位：`protagonist`（主角）| `antagonist`（反派）| `love-interest`（攻略对象）| `harem-member`（后宫成员）| `supporting`（配角）| `minor`（次要）
- 性格特质与背景故事
- 动机（外在欲望 vs 内在需求）

**NSFW专属信息：**
- **性取向** (`sexual-orientation`): `heterosexual` | `bisexual` | `homosexual` | `pansexual` | `asexual` | `other`
- **性偏好** (`preferences`): 多选标签，如:
  - 角色定位: `dom`（主导）| `sub`（服从）| `switch`（可切换）
  - 性格属性: `tsundere`（傲娇）| `yandere`（病娇）| `kuudere`（酷娇）| `dandere`（沉默娇）
  - 体型标签: `milf` | `loli` | `shota` | `femboy` | `tomboy` | `bishounen` | `mature`
  - 特殊设定: `first-time`（处）| `experienced` | `nympho` | `innocent`
- **身体特征** (`body-features`): 身高、体型、三围（如适用）、特殊体征（如胎记、伤疤、身体改造等）
- **禁忌** (`taboos`): 该角色不参与的性场景类型
- **初次经历**: 该角色的初次性经历背景（如有）

**角色分类标签** (`tags`):
- 类型标签: `cultivator`（修士）| `mortal`（凡人）| `immortal`（仙人）| `demon`（妖/魔）| `ghost`（鬼）| `deity`（神）| `vampire` | `werewolf` | `elf` | `beastkin`
- 关系标签: `wife` | `concubine`（妾）| `lover` | `fiancee` | `crush` | `one-night`

### 3. 角色模板

使用 `references/character-template.md` 中的模板，包含完整的 frontmatter：

```yaml
---
name: "{角色名}"
slug: {name-kebab}
role: {protagonist|antagonist|love-interest|harem-member|supporting|minor}
status: alive
gender: {male|female|futanari|other}
age: "{年龄/外观年龄}"
sexual-orientation: {heterosexual|bisexual|homosexual|pansexual|asexual|other}
preferences:
  - {pref1}
  - {pref2}
taboos:
  - {taboo1}
body-features: >
  身高、体型、三围等身体特征描述
appearance: >
  外貌与显著特征描述
personality: >
  性格、特质与怪癖
background: >
  背景故事与关键成长事件
motivation: >
  外在欲望 vs 内在需求
voice-style: >
  语气、说话风格、口头禅（提供示例对话）
tags:
  - {tag1}
  - {tag2}
affection-level: 0
first-experience: >
  初次性经历描述或"未设定"
relationships:
  - character: {other-char-slug}
    type: {relationship-type}
    intimacy: 0
    description: ""
locations:
  - {location-slug}
character-arc: >
  角色弧光：起始状态 -> 转折点 -> 结局状态
---
```

### 4. 关系管理

NSFW角色关系支持更丰富的类型：

**后宫关系类型：**
- `main-wife`（正妻） ↔ `main-husband`
- `concubine`（妾室） ↔ `master`
- `lover`（情人） ↔ `lover`
- `sex-friend`（炮友） ↔ `sex-friend`
- `master`（主人） ↔ `slave`（奴隶）
- `dom`（主导方） ↔ `sub`（服从方）
- `mates`（伴侣，兽人/ABO世界观） ↔ `mates`
- `fated-pair`（命定之人，仙侠） ↔ `fated-pair`

**中式特殊关系：**
- `master-disciple`（师徒） — 指向从师尊到徒弟
- `dao-companion`（道侣，仙侠中的修仙伴侣）
- `fated-rival`（宿敌/欢喜冤家，最终常发展成恋爱关系）
- `childhood-friend`（青梅竹马）

**双向性维护：**
在添加关系时，必须同时在双方角色的 frontmatter 中维护。例如：
- A对B是 `master`，B对A必须标注 `slave`
- A对B是 `main-wife`，B对A必须标注 `main-husband`

### 5. 好感度系统

角色的 `affection-level`（好感度）使用 0-100 量化：
- 0-20: 陌生人/初识
- 21-40: 相识/有好感
- 41-60: 亲近/暧昧
- 61-80: 亲密/爱慕
- 81-100: 深爱/灵魂伴侣

好感度变化应在 `continuity/state.md` 中有记录。

### 6. 情史追踪

在角色文件的 `## 情史时间线` 章节中维护：
```markdown
| 时间点 | 事件 | 对象 | 章节 |
|--------|------|------|------|
| 16岁 | 初吻 | 李师兄 | Ch.3 |
| 18岁 | 初次 | 王宗主 | Ch.12 |
```

### 7. 文件操作
1. 保存角色文件到 `characters/{name-kebab}.md`
2. 更新 `characters/_index.md` 注册表
3. 更新关系涉及的其他角色文件
4. 运行 `story reindex .`、`story links .` 和 `story validate .`（如CLI可用）

## 参考文件

- `references/character-template.md` - NSFW角色完整模板
- `references/relationship-types.md` - 关系类型完整列表及反向配对
- `references/nsfw-tags.md` - NSFW角色标签体系
- 上游 `story-skills-main/skills/character-management/SKILL.md`
