---
name: nsfw-worldbuilding
description: 当用户要求"创建修炼体系"、"双修功法"、"情欲规则"、"媚药设定"、"青楼"、"成人场所"、"情趣法宝"、"魅魔体质"、"发情期"或构建NSFW世界观的任何方面时，应使用此技能。
---

# NSFW世界观构建

## 概述

在标准世界观构建基础上，为NSFW故事增加成人内容专属的世界观元素：修炼/双修体系、情欲规则/世界观法则、成人场所、情趣法宝/道具、媚药体系、特殊体质等。

## 前置条件

必须已存在一个故事项目。通过检查项目根目录中是否存在 `story.md` 来验证。

## NSFW世界观元素

### 1. 修炼/双修体系 (`worldbuilding/systems/`)

仙侠修真类NSFW小说的核心体系。定义：

- **修炼等级**: 如 练气 → 筑基 → 金丹 → 元婴 → 化神 → 合体 → 大乘 → 渡劫
- **双修功法**: 
  - 功法名称与等级要求
  - 双修方式（神交、体交、采补等）
  - 双方获益比例（均衡双修 vs 采补/炉鼎）
  - 双修的效果（突破瓶颈、增强修为、疗伤等）
- **炉鼎设定** (如适用):
  - 炉鼎的资质要求（如特殊体质）
  - 采补对炉鼎的影响（修为下降、身体损耗等）
  - 炉鼎的保护/恢复方式
- **元阳/元阴**: 初次交合的特殊效果

### 2. 情欲规则/世界观法则 (`worldbuilding/systems/`)

定义这个世界中与情欲相关的特殊规则：

- **发情期设定** (兽人/ABO/兽耳世界观): 周期、症状、抑制方式
- **ABO世界观**: Alpha/Beta/Omega 的设定，信息素、标记、发情期、社会结构
- **魅魔/梦魇设定**: 魅魔的以精/欲为食的特性、魅惑能力、契约规则
- **诅咒/法术情欲效果**: 媚术、情蛊、合欢散等
- **体质设定**: 九尾狐体、玄牝之体、纯阳/纯阴体等对性/修炼的影响
- **异种/跨种族规则**: 人妖、人魔等跨种族交合的限制和后果

### 3. 成人场所 (`worldbuilding/locations/`)

在标准地点类型基础上增加：

- `brothel`（青楼/妓院）: 等级、花魁制度、背后势力
- `pleasure-quarter`（花街/风流坊）: 娱乐区的整体设定
- `secret-chamber`（密室）: 用于秘密约会的场所
- `hot-spring`（温泉/浴场）: 常见的邂逅/情欲场景发生地
- `bedchamber`（寝宫/闺房）: 重要角色的私密空间
- `dungeon`（地牢/调教室）: BDSM/囚禁场景
- `wilderness`（野外）: 野合场景的常见地点类型

### 4. 情趣道具/法宝 (`worldbuilding/artifacts/`)

在标准法宝类型基础上增加：

- `aphrodisiac`（媚药/春药）: 效果、持续时间、解药、副作用
- `sex-toy`（情趣法宝）: 功能、使用方法、对修炼的辅助
- `contraceptive`（避孕丹药）: 效果和限制
- `fertility-drug`（助孕丹药）: 效果和副作用
- `restraint`（束缚法器）: 用于BDSM场景的法器
- `body-modification`（身体改造器具）: 改变身体敏感度/反应的法器

### 5. 势力中的NSFW设定 (`worldbuilding/factions/`)

- **合欢宗/魔门**: 以双修/采补为修炼方式的宗门
- **青楼势力**: 以情报收集为目的的青楼网络
- **后宫体系**: 帝王/城主/宗主的多妻妾管理体系

## 交叉引用

- 修炼体系 → 标注可使用该体系的角色（通过角色标签如 `cultivator`）
- 情欲规则 → 标注受影响的角色和地点
- 成人场所 → 标注常驻角色和平常出入的访客
- 法宝 → 标注所有者角色或势力、当前所在位置
- 体质 → 在角色文件的 `tags` 中标注对应体质标签

## 文件模板

参见 `references/system-template.md`、`references/location-template.md`、`references/artifact-template.md`。

## 参考文件

- `references/nsfw-world-element-types.md` - 完整的NSFW世界观元素类型列表
- `references/cultivation-template.md` - 修炼/双修体系完整模板
- `references/location-template.md` - NSFW地点模板
- `references/artifact-template.md` - NSFW法宝模板
- 上游 `story-skills-main/skills/worldbuilding/SKILL.md`
