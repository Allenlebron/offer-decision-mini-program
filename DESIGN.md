---
name: 真涨薪微信小程序
description: 把收入与被工作占用的时间放在同一张账上
colors:
  surface-page: "#F5F6F2"
  surface-raised: "#FFFFFF"
  surface-muted: "#E8EBE6"
  surface-dark: "#13221C"
  surface-attention: "#FFF0EA"
  text-primary: "#13221C"
  text-secondary: "#415149"
  text-on-dark: "#FBFCF8"
  accent-primary: "#D7F55F"
  accent-attention: "#F27655"
  option-current: "#74827B"
  option-a: "#79A6DF"
  option-b: "#A8C936"
  error: "#8D2618"
typography:
  display:
    fontFamily: "Songti SC, STSong, serif"
    fontSize: "56rpx"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Songti SC, STSong, serif"
    fontSize: "44rpx"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "38rpx"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "32rpx"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "28rpx"
    fontWeight: 700
    lineHeight: 1.5
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "26rpx"
    fontWeight: 600
    lineHeight: 1.5
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "34rpx"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  sm: "8rpx"
  md: "12rpx"
  pill: "999rpx"
spacing:
  xs: "8rpx"
  sm: "16rpx"
  md: "24rpx"
  lg: "32rpx"
  xl: "48rpx"
  xxl: "64rpx"
components:
  button-primary:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.sm}"
    height: "52px"
    padding: "0 28rpx"
  button-share:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "52px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    height: "44px"
  option-current:
    backgroundColor: "#E4E8E3"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
  option-a:
    backgroundColor: "#E4EEFB"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
  option-b:
    backgroundColor: "#EDF6C9"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
---

# Design System: 真涨薪微信小程序

## Overview

**Creative North Star: “一张清醒的账”**

界面像一张随手可核对的职业决策账单：标题有编辑感，但输入、数字和按钮必须像成熟工具一样直接。手机上的用户往往正处于通勤或谈薪前的焦虑状态，信息层级应帮助他们从条件进入数字，再落到下一步，而不是制造额外兴奋。

整体采用克制的浅色任务界面，结果区用深绿色形成明确阶段切换。系统拒绝喧闹招聘广告、堆满大数字的金融仪表盘、玻璃拟态 SaaS 模板和游戏化打分器。

**Key Characteristics:**

- 先输入、后结论的两页任务流。
- 宋体只负责关键标题，系统无衬线负责所有操作和说明。
- 三个选项始终使用固定灰、蓝、绿映射。
- 深色只用于结果阶段和主动作，不作为装饰背景。
- 所有核心触控目标不小于 44px。

## Colors

颜色服务于选项识别和状态反馈；任何高饱和色都必须承担明确语义。

### Primary

- **深林墨色**：主文字、主要按钮和结果背景，是整个产品的可信度锚点。
- **判断荧光**：仅用于主要分享动作、领先标签和已选反馈，稀缺使用才有效。

### Secondary

- **当前工作灰**：当前工作的圆点、条形图和浅底。
- **Offer A 蓝**：Offer A 的圆点、条形图和浅底。
- **Offer B 绿**：Offer B 的圆点、条形图和浅底。

### Tertiary

- **谈判珊瑚**：标题下划线、关键反超条件和注意状态，不用于普通装饰。
- **错误砖红**：输入错误、危险确认和复制失败状态。

### Neutral

- **冷静底色**：页面基础表面，不做暖黄纸张效果。
- **次级墨绿**：帮助文字和说明，仍保持正文级对比度。

**The Fixed Option Rule.** 当前工作永远是灰色、Offer A 永远是蓝色、Offer B 永远是绿色；输入页、结果卡和图表禁止交换。

## Typography

**Display Font:** Songti SC（STSong 后备）

**Body Font:** 系统无衬线（PingFang SC 与 Microsoft YaHei 后备）

**Label/Mono Font:** ui-monospace / SFMono-Regular / Menlo，仅用于金额、比例与编号。

**Character:** 宋体提供“认真看一笔账”的编辑气质；系统字体保持原生小程序的熟悉感。两者职责严格分开，不用展示字体装饰按钮或字段标签。

### Hierarchy

- **Display**（700，56rpx，1.08）：仅用于输入页主标题。
- **Headline**（700，44–48rpx，1.2）：结果结论与反馈问题；长句式反超条件允许使用 40–44rpx、1.45。
- **Title**（700，38–40rpx，1.35）：选项标题和图表标题。
- **Body**（400，32rpx，1.5–1.75）：说明、字段与结果行。
- **Label**（700，28rpx，1.5）：步骤、错误、标签和辅助动作。
- **Meta**（600–700，26rpx，1.5）：仅用于工作编号、隐私短标、领先标签、提交摘要和页脚说明。
- **Data**（700，34rpx，1.5）：输入数字与结果主指标；必须使用等宽数字。

**The Interface Type Rule.** UI 标签和按钮一律使用系统字体，数据使用等宽字体；宋体只出现在承担阅读层级的标题和孤立品牌字形。

## Elevation

系统以色块、分隔线和阶段背景表达层级，默认不使用悬浮卡片。唯一固定阴影位于输入页底部提交栏，用于说明它覆盖在滚动内容之上；阴影模糊不超过 6px。

**The Flat by Default Rule.** 如果一个容器同时需要明显边框和宽阴影，说明结构分组错误；先用间距和色调重写。

## Components

### Buttons

- **Shape:** 轻微圆角（8rpx），不用胶囊主按钮。
- **Primary:** 深林墨色底、近白文字，高度 52px；加载时保留原宽度并禁用重复点击。
- **Share:** 判断荧光底、深色文字，只出现在结果阶段。
- **Focus / Active:** 按压时切换为更深或更浅的语义色；所有可见按钮保持至少 44px 触控高度。

### Chips

- **Style:** 胶囊仅用于“本地计算”“税前估算”和领先状态等短标签。
- **State:** 已选反馈不是普通标签，必须同时显示荧光底、砖红外框和 `aria-pressed`。

### Cards / Containers

- **Corner Style:** 工作选项使用 12rpx；结果选项不做卡片，直接在深色结果区以分隔线组织。
- **Background:** 三个输入选项分别使用固定浅灰、浅蓝、浅绿。
- **Shadow Strategy:** 默认无阴影。
- **Border:** 工作选项使用 2rpx 深色整框，禁止彩色侧边条。
- **Internal Padding:** 24–32rpx；相关字段紧凑，选项之间保持 32rpx。

### Inputs / Fields

- **Style:** 可见标签在左，数字和单位在右；输入区以底线表达，不用占位符代替标签。
- **Touch Target:** 原生输入区高度至少 44px；这个无障碍下限不计入 rpx 间距阶梯。
- **Focus:** 底线切换为谈判珊瑚色，并显示短焦点阴影。
- **Error / Disabled:** 错误文字紧邻字段，说明合法范围；计算按钮加载时禁止重复触发。

### Navigation

使用微信原生导航栏与返回手势。小程序首页直接进入输入任务，不增加自定义营销导航或底部 Tab。

### Result Comparison

结果以“结论 → 每个选项 → 双图表 → 反超条件 → 下一步反馈”排列。条形图必须带文字值和固定颜色圆点，禁止只靠颜色表达结果。

## Do's and Don'ts

### Do:

- **Do** 保持两页结构，让用户在结果页返回修改条件。
- **Do** 在 320px 等效窄屏上保证按钮至少 44px，并允许长结论自然换行。
- **Do** 明示 48 个工作周、240 个通勤日和税前估算边界。
- **Do** 为清除数据、分享、复制、校验和选中状态提供明确反馈。

### Don't:

- **Don't** 做成喧闹的招聘广告、堆满大数字的金融仪表盘、玻璃拟态 SaaS 模板或游戏化打分器。
- **Don't** 使用彩色 `border-left` / `border-right` 侧边条、渐变文字或装饰性网格背景。
- **Don't** 把占位符当标签，也不要用“输入错误”“提交”“确定”等模糊文案。
- **Don't** 输出无法解释的综合分数或把税前估算包装成税后精确结论。
- **Don't** 交换当前工作、Offer A、Offer B 的灰、蓝、绿颜色映射。
