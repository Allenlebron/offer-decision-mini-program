// Bundled explanatory content only. No network fetch, policy lookup or user data.
const SOURCES = [
  {
    id: "how-to-live-better",
    title: "高性价比人生指南",
    author: "eternity4719",
    url: "https://github.com/eternity4719/HowToLiveBetter",
    articleTitle: "换工作、换城市之前",
    articleUrl: "https://github.com/eternity4719/HowToLiveBetter/blob/main/docs/换工作、换城市之前.md",
    sections: "拿主意之前：时间账、钱账",
    checkedAt: "2026-10-09",
    versionLabel: "2026-10-09 查阅的 main 分支页面；链接内容可能更新",
    licenseName: "CC BY 4.0（正文）",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    summary: "场景组织参考：面对工作或居住变化，把时间和金钱等方面分开核对。",
    adaptation: "本产品重新设计了输入、公式、结果和填写提醒，没有逐条移植原书，也不沿用其性价比排名。",
    reviewScope: "本次核对的是参考文章的主题、出处与仓库授权说明，不代表逐条验证了书中的研究、政策或法律结论。",
    limitations: "参考文章不是个人建议。原书的制度内容以中国大陆为背景，具体事项仍须按地区、时间及适用条件核实。",
  },
];

const METHOD_NOTES = [
  {
    id: "habits", title: "日常打卡怎么统计",
    body: "饮水按每次记录累加，常用杯容量可自设；睡眠按醒来的日期记录实际小时数，醒来感受为个人自述。睡前准备不等于已经入睡，恢复安排不等于完成训练。力量训练按周一至周日统计训练日数，同一天多次只算一天，原场次仍保留。旧次数目标不会换算成天数，请重新确认。空白睡眠不按零小时计算。薄肌、大水、大睡是生活主张，不是科学分级或健康评估；目标由你设置，特殊身体情况请遵医嘱调整。",
  },
  {
    id: "offer", title: "Offer 对比怎么算",
    body: "保证收入按税前月薪、固定发薪月数和另有保证奖金计算；已知的公司公积金单独加入综合价值。按每年 48 个工作周、240 个往返通勤日估算时间，不是税后到账收入。",
  },
  {
    id: "rent", title: "租房通勤怎么算",
    body: "月支出只合计住房总支出和通勤交通费；时间按单程分钟 × 2 × 月通勤天数计算。两方案存在金钱与时间取舍时，再计算每节省一小时的额外支出。未计押金占用或搬迁费用。",
  },
  {
    id: "budget", title: "空窗期预算怎么算",
    body: "从已到账可用资金中扣除预留和一次性支出，再除以每月净支出。仅在起点无缺口、月净支出为正时计算月数，向下保留一位小数；收入持续与预算稳定都是前提。",
  },
];

const CONTENT_NOTICE = "各场景的核对事项标为“填写提醒”，由本产品依据输入和模型边界编写，不冒充研究结论。计算公式属于本产品口径，不代表参考项目作者为结果背书。";

const PRIVACY_SECTIONS = [
  {
    id: "local", title: "输入在本机处理",
    body: "无需登录。薪资、存款、预算、打卡记录和计算结果在本机处理；产品代码不向服务端、日志或统计接口发送这些内容，不接入云端 AI。",
  },
  {
    id: "storage", title: "每个场景一份草稿",
    body: "Offer、租房通勤和空窗期预算三个场景分别保存，不自动交换金额。日常打卡独立保存记录和目标。“重新填写”只清除当前场景；“清除全部本机数据”会在确认后同时清除决策与打卡数据。",
  },
  {
    id: "limits", title: "本机保存的边界",
    body: "本地存储不是加密保险箱。卸载、清理缓存或更换设备可能丢失数据，当前没有云端备份与恢复。保存失败时仍可查看当次结果，但重新打开后可能无法恢复。",
  },
  {
    id: "sharing", title: "分享的是工具入口",
    body: "工具入口及达成分享不携带个人输入、结果或自定义方案名称，好友使用自己的本机数据。生活周刊默认分享生活态度、不带个人数值；仅当你主动开启“分享卡包含本周记录”、生成预览并确认分享后，图片才包含本周记录汇总。接收者可看到该图片，但不能读取你的本机记录。主动点击“复制记录 JSON”会把打卡数据复制到系统剪贴板，请自行选择保管位置。复制资料来源时只复制公开链接，打开外部资料会受对应网站隐私规则约束。",
  },
  {
    id: "platform", title: "与微信平台的关系",
    body: "上述说明针对本产品的处理方式。微信平台自身的数据处理以其说明为准，不意味着整个微信没有网络请求。未来如新增云同步、AI 或统计，会另行说明并更新隐私边界。",
  },
];

// Only known, public links may be copied. Never accept a URL from input/query data.
function getPublicSourceUrl(id) {
  const source = SOURCES[0];
  if (id === "project") return source.url;
  if (id === "article") return source.articleUrl;
  if (id === "license") return source.licenseUrl;
  return null;
}

module.exports = { SOURCES, METHOD_NOTES, CONTENT_NOTICE, PRIVACY_SECTIONS, getPublicSourceUrl };
