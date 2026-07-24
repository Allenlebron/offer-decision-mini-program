---
name: 真涨薪微信小程序
description: 把收入与被工作占用的时间放在同一张账上
colors:
  surface-page: "#F4F7FC"
  surface-raised: "#FFFFFF"
  surface-muted: "#EDF1F7"
  surface-dark: "#071426"
  surface-panel: "#0B1B30"
  text-primary: "#101827"
  text-secondary: "#526178"
  text-muted-dark: "#A8B6CA"
  text-on-dark: "#F7F9FC"
  accent-primary: "#2463FF"
  accent-secondary: "#75A5FF"
  accent-attention: "#FFB54A"
  error: "#A12F39"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.5
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
  data:
    fontFamily: "inherit"
    fontSize: "15px"
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
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.sm}"
    height: "52px"
    padding: "0 28rpx"
  button-share:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-on-dark}"
    rounded: "{rounded.sm}"
    height: "52px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    height: "44px"
  option-current:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
  option-a:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
  option-b:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
---

# Design System: 真涨薪微信小程序

## Overview

**Creative North Star: “一张清醒的账”**

界面像一张随手可核对的职业决策账单：标题有编辑感，但输入、数字和按钮必须像成熟工具一样直接。手机上的用户往往正处于通勤或谈薪前的焦虑状态，信息层级应帮助他们从条件进入数字，再落到下一步，而不是制造额外兴奋。

整体采用“浅色录入、深色判断”的双阶段界面。录入页用冷白画布降低输入负担，结果与反超试算页切换为深海军蓝，让用户明确进入决策阶段。克制的电光蓝承担主动作，琥珀色只标记真正值得谈的条件。

**Key Characteristics:**

- 录入、结果、反超试算的三页任务流；输入页一次只展示一份工作的字段。
- 工作切换、填写进度和底部主动作共同表达当前位置，数字统一直接填写。
- 结果页先回答“钱更多”和“时间更值钱”，再单独列示五险一金，反超页把差距换成可谈条件。
- 系统无衬线负责标题、操作和说明，以字重和留白建立层级。
- 蓝色用于选择、领先和主要动作；琥珀色仅用于关键差额和追平条件。
- 深色只覆盖结果与试算阶段，不渗入录入表单。
- 所有核心触控目标不小于 44px。

## Colors

颜色服务于阶段切换、选择反馈和关键数字；任何高饱和色都必须承担明确语义。

### Primary

- **深海军蓝**：结果页与反超页背景，是产品的可信度锚点。
- **电光蓝**：选中态、领先项和主要按钮。

### Secondary

- **冰蓝**：辅助信息、次级领先项和深色背景上的弱强调。
- **冷白**：输入页背景，确保长表单仍然轻盈。

### Tertiary

- **琥珀色**：关键反超条件和可谈差额，不用于普通装饰。
- **错误砖红**：输入错误、危险确认和复制失败状态。

### Neutral

- **白色**：输入分组、深色页面主数字和主要按钮文字。
- **蓝灰**：帮助文字、分隔线和非重点数据。

**The Accent Rule.** 同一屏只允许一个电光蓝主动作；琥珀色只回答“差多少、要谈多少”，不能用于普通装饰。

## Typography

**Display Font:** 系统无衬线（SF Pro / PingFang SC / Roboto）

**Body Font:** 系统无衬线（PingFang SC 与 Microsoft YaHei 后备）

**Data Style:** 数据沿用系统字体，通过 `tabular-nums` 对齐数字，不使用代码字体。

**Character:** 依靠紧凑字距、克制字重和充足留白建立高级感，不用装饰字体增加阅读负担。

### Hierarchy

- **Headline**（650，28px，1.24）：结果结论；长句自然换行，窄屏不缩字号。
- **Title**（650，16–17px，1.35）：分组与结果区标题。
- **Body**（400，14–16px，1.5–1.65）：说明、字段与结果行。
- **Label**（600–650，13–14px，1.4）：字段、按钮和错误信息。
- **Meta**（600，12px，1.5）：仅用于隐私短标、领先标签、提交摘要和页脚说明。
- **Data**（650–700，13–23px）：按信息层级变化，并统一启用等宽数字特性。

**The Interface Type Rule.** 标题、标签、按钮和数据都使用系统字体；数据仅启用等宽数字特性，不混入代码字体。

## Elevation

系统只用纯色色块、细边框和阶段背景表达层级。固定操作栏用分隔线说明覆盖关系，按钮与卡片默认无阴影、无发光。

**The Flat by Default Rule.** 如果一个容器同时需要明显边框和宽阴影，说明结构分组错误；先用间距和色调重写。

## Components

### Buttons

- **Shape:** 轻微圆角（8rpx），不用胶囊主按钮。
- **Primary:** 电光蓝底、白色文字，高度 52px；加载时保留原宽度并禁用重复点击。
- **Share:** 与主动作统一使用电光蓝底，只出现在结果阶段。
- **Focus / Active:** 按压时切换为更深或更浅的语义色；所有可见按钮保持至少 44px 触控高度。

### Chips

- **Style:** 胶囊仅用于领先状态等极短标签，采用电光蓝或琥珀色，必须同时保留文字含义。

### Cards / Containers

- **Corner Style:** 输入分组、结果表格和试算卡使用 10–12px；内部控件使用 7–8px。
- **Background:** 输入分组使用白底；结果表格与试算卡使用比页面略亮的深蓝面板。
- **Shadow Strategy:** 默认无阴影。
- **Border:** 浅色页使用极浅蓝灰边框，深色页使用半透明蓝灰边框，禁止彩色侧边条。
- **Internal Padding:** 24–32rpx；相关字段紧凑，选项之间保持 32rpx。

### Inputs / Fields

- **Style:** 标签与解释位于左侧，数字和单位在右侧；每个字段只保留一个直接输入入口，不用占位符冒充已填数据。
- **Touch Target:** 原生输入区高度至少 44px；这个无障碍下限不计入 rpx 间距阶梯。
- **Focus:** 底线或外框切换为电光蓝，并显示克制焦点反馈。
- **Error / Disabled:** 错误文字紧邻字段，说明合法范围；计算按钮加载时禁止重复触发。

### Navigation

使用微信原生导航栏与返回手势。小程序首页直接进入输入任务，不增加自定义营销导航或底部 Tab。

### Result Comparison

结果以“结论 → 收入与时间数据表 → 五险一金数据表（有填写时）→ 相比当前工作的差额 → 反超试算”排列，不提供只改变高亮的伪切换。公司公积金年缴计入年综合价值和综合时薪，同时在五险一金表中保留计算明细；税前保证收入继续单独展示。数据表同时显示文字值与领先标签，禁止只靠颜色表达结果。反超页提供全部两两组合，滑杆实时计算且不回写原始薪资数据。

## Do's and Don'ts

### Do:

- **Do** 保持三页结构，让用户在结果页返回修改，也能进入独立反超试算。
- **Do** 在 320px 等效窄屏上保证按钮至少 44px，并允许长结论自然换行。
- **Do** 明示 48 个工作周、240 个通勤日和税前估算边界。
- **Do** 为清除数据、分享、校验和选中状态提供明确反馈。

### Don't:

- **Don't** 做成喧闹的招聘广告、堆满大数字的金融仪表盘、玻璃拟态 SaaS 模板或游戏化打分器。
- **Don't** 使用彩色 `border-left` / `border-right` 侧边条、渐变文字或装饰性网格背景。
- **Don't** 把占位符当标签，也不要用“输入错误”“提交”“确定”等模糊文案。
- **Don't** 输出无法解释的综合分数或把税前估算包装成税后精确结论。
- **Don't** 把反超试算值自动写回录入页，或把临时假设冒充已确认薪资。
