---
name: nsfw-continuity
description: 当用户要求"连续性检查"、"好感度变化"、"关系进展"、"情欲状态追踪"、"后宫管理"、"角色状态更新"，或需要检查和更新NSFW故事中的连续性状态时，应使用此技能。
---

# NSFW连续性追踪

## 概述

在标准 story-skills 连续性引擎基础上，扩展NSFW专属的连续性追踪：情欲状态、好感度变化、关系阶段进展、后宫动态平衡、情欲场景日志。确保长篇NSFW小说中的角色关系、身体状态和情欲内容保持一致。

## 前置条件

故事项目必须已存在。通过检查项目根目录中存在 `story.md` 来验证。

## NSFW连续性维度

### 1. 角色身体状态 (`continuity/state.md`)

在标准角色状态基础上增加NSFW维度：

```yaml
character-state:
  - character: {char-slug}
    status: alive
    location: {location-slug}
    physical-state: {normal|injured|exhausted|aroused|post-coital|pregnant|menstruating|in-heat}
    emotional-state: {neutral|happy|angry|sad|anxious|aroused|loving|guilty|ashamed}
    sexual-state:
      virginity: {intact|lost|unknown}
      last-encounter: {chapter-ref or null}
      current-condition: {normal|sore|satisfied|unsatisfied|overstimulated}
      pregnancy-status: {not-pregnant|pregnant|unknown}
      pregnancy-chapter: {chapter-ref or null}
    affection-snapshot:
      {char-slug}: {affection-level}
      {char-slug}: {affection-level}
```

### 2. 关系阶段进展

追踪每对角色之间的亲密关系阶段：

| 阶段 | 名称 | 标志事件 | 好感度范围 |
|------|------|---------|-----------|
| S0 | 陌生人 | 初次见面 | 0-10 |
| S1 | 相识 | 互通姓名、初步了解 | 11-25 |
| S2 | 有好感 | 注意到对方、开始在意 | 26-40 |
| S3 | 暧昧 | 独处、试探、心跳 | 41-55 |
| S4 | 牵手/拥抱 | 首次身体接触 | 56-65 |
| S5 | 接吻 | 初吻 | 66-75 |
| S6 | 亲密爱抚 | 突破衣物界限 | 76-85 |
| S7 | 初次结合 | 首次性行为 | 86-92 |
| S8 | 灵魂伴侣 | 完全的信任与融合 | 93-100 |

### 3. 后宫动态追踪

对于后宫/多角恋类型的作品，额外追踪：

- **成员列表**: 所有后宫成员及其加入顺序
- **侍寝轮换**: 记录每次侍寝的时间、地点和简要描述
- **宫斗/关系张力**: 成员之间的竞争、同盟、嫉妒等关系
- **好感度排序**: 后宫成员对主角的好感度排名
- **公平性检查**: 确保各成员的"戏份"分布合理（除非刻意偏重某些角色）

### 4. 情欲场景日志 (`continuity/scene-log.md`)

新增文件，记录每章的NSFW场景摘要：

```markdown
---
type: nsfw-scene-log
story: {story-slug}
---

# 情欲场景日志

| 章节 | 场景级别 | 参与角色 | 类型 | 时长(字) | 关键事件 |
|------|---------|---------|------|---------|---------|
| Ch.3 | L1-L2 | 苏雪, 林婉儿 | 暧昧/调情 | ~800 | 温泉中对视，苏雪心动 |
| Ch.5 | L2-L5 | 苏雪, 林婉儿 | 初次/温存 | ~2500 | 林婉儿初夜，苏雪主导 |
```

### 5. 安全机制

确保连续性检查不会因为NSFW内容产生误报：

- **"死而复生"豁免**: NSFW场景中角色可能在极端快感中"失去意识"或"欲仙欲死"，这些描述不应被标记为角色死亡
- **身体状态时效**: 情欲状态（如"事后疲惫"、"身体酸软"）应有合理的持续时间，超时自动恢复
- **好感度合理性**: 一次性行为不应导致好感度从0飙升至100，除非有特殊设定（如功法效果、诅咒等）
- **怀孕时间线**: 如果作品中有怀孕情节，确保时间线合理

## 工作流程

### 检查流程

每次写作后运行：

1. 更新角色身体状态和情欲状态
2. 更新关系阶段（如有进展）
3. 更新好感度变化
4. 更新情欲场景日志
5. 运行 `story continuity .` 检查标准连续性
6. 额外检查：
   - 角色是否在禁忌场景中出现（违反角色设定）
   - 描写尺度是否超出作品声明范围
   - 后宫成员的戏份分配是否严重失衡
   - 好感度变化是否合理

### 写后更新

在 `chapter-writing` 完成后：
1. 从章节中提取NSFW相关内容（场景级别、参与角色、类型、字数、关键事件）
2. 更新 `continuity/scene-log.md`
3. 更新 `continuity/state.md` 中涉及角色的 `sexual-state` 和 `affection-snapshot`
4. 如果关系阶段有进展，更新角色文件中的 `relationships`
5. 如果有好感度变化，更新角色文件中的 `affection-level`

## 连续性冲突告警

以下情况应产生警告：

- 角色的好感度在单章内变化超过30点（可能不合理）
- 身体状态在时间线上矛盾（如刚经历初夜的处子在下一场戏又变成处子）
- 后宫成员连续5章以上无任何互动
- 禁忌标签被违反
- 怀孕角色出现在不适合的场景中（如饮酒、激烈战斗）
- 描写尺度超出 `story.md` 中声明的 `explicit-level`

## 参考文件

- 上游 `story-skills-main/skills/revision-continuity/SKILL.md`
- `references/state-template.md` - NSFW连续性状态模板
- `references/scene-log-template.md` - 情欲场景日志模板
