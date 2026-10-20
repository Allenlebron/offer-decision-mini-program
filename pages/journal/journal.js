const { dateKey, validDate, readHabits, weeklyJournal } = require("../../utils/habits");
const { enableShareMenu, scenarioShare } = require("../../utils/share");

Page({
  data: { status: "ready", journal: {}, titles: ["给自己留了些时间", "练一点，睡好一点", "按自己的节奏来"],
    titleIndex: 0, includeFacts: false, preview: "", generating: false, error: "" },
  onLoad(options = {}) {
    enableShareMenu();
    this.date = validDate(options.date) && options.date <= dateKey() ? options.date : dateKey();
    this.load();
  },
  load() {
    const result = readHabits();
    this.setData({ status: result.status, journal: result.state ? weeklyJournal(result.state, this.date) : {}, preview: "", error: "" });
  },
  invalidatePreview() {
    this.revision = (this.revision || 0) + 1;
    this.setData({ preview: "", generating: false, error: "" });
  },
  chooseTitle(event) {
    const index = Number(event.detail.value);
    if (!Number.isInteger(index) || !this.data.titles[index]) return;
    this.invalidatePreview(); this.setData({ titleIndex: index });
  },
  chooseFacts(event) { this.invalidatePreview(); this.setData({ includeFacts: event.detail.value === true }); },
  onUnload() { this.revision = (this.revision || 0) + 1; },
  createPreview() {
    if (this.data.status !== "ready" || this.data.generating) return;
    const revision = this.revision = (this.revision || 0) + 1;
    const { journal, includeFacts, titles, titleIndex } = this.data;
    this.setData({ generating: true, preview: "", error: "" });
    const fail = () => { if (this.revision === revision) this.setData({ generating: false, error: "分享卡未能生成，请重试。" }); };
    wx.createSelectorQuery().in(this).select("#journal-canvas").fields({ node: true }).exec((result) => {
      if (this.revision !== revision) return;
      const canvas = result[0]?.node;
      if (!canvas) return fail();
      try {
        canvas.width = 1000; canvas.height = 800;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#F4F7FC"; ctx.fillRect(0, 0, 1000, 800);
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(40, 40, 920, 720);
        ctx.fillStyle = "#526178"; ctx.font = "26px sans-serif";
        ctx.fillText("三件小事 / 生活周刊", 90, 115);
        ctx.fillStyle = "#101827"; ctx.font = "600 58px sans-serif";
        ctx.fillText("这一周，", 90, 220); ctx.fillText(`${titles[titleIndex]}。`, 90, 310);
        if (includeFacts) {
          ctx.fillStyle = "#526178"; ctx.font = "23px sans-serif";
          ctx.fillText(`${journal.start} — ${journal.end}`, 90, 380);
          ctx.font = "26px sans-serif";
          (journal.facts.length ? journal.facts : ["这一周还没有实际记录。从一件小事开始。"]).forEach((fact, index) => ctx.fillText(fact, 90, 440 + index * 52));
        } else {
          ["#2155CF", "#16785C", "#7049B8"].forEach((color, index) => {
            ctx.fillStyle = color; ctx.fillRect(90 + index * 275, 410, 230, 6);
            ctx.font = "600 35px sans-serif"; ctx.fillText(["喝够水", "练一点", "睡好觉"][index], 90 + index * 275, 485);
          });
          ctx.fillStyle = "#526178"; ctx.font = "28px sans-serif"; ctx.fillText("做一件，也很好。", 90, 575);
        }
        ctx.fillStyle = "#526178"; ctx.font = "22px sans-serif";
        ctx.fillText(includeFacts ? "个人自述记录 · 不作健康评价" : "薄肌 · 大水 · 大睡", 90, 705);
        wx.canvasToTempFilePath({ canvas, fileType: "png", success: (result) => {
          if (this.revision === revision) this.setData({ preview: result.tempFilePath, generating: false });
        }, fail }, this);
      } catch (_error) { fail(); }
    });
  },
  onShareAppMessage(event) {
    if (event?.from === "button" && this.data.preview && !this.data.generating) {
      return { title: `这一周，${this.data.titles[this.data.titleIndex]}。`, path: "/pages/habits/habits", imageUrl: this.data.preview };
    }
    return scenarioShare("habits");
  },
  onShareTimeline() { const share = scenarioShare("habits"); return { title: share.title, imageUrl: share.imageUrl }; },
});
