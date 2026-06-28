export const phosphorIconWeight = "duotone" as const;

export const lifecycleLabels = {
  new: "新手期",
  growing: "增长期",
  stable: "稳定期",
  plateau: "瓶颈期",
  commercial: "商业化期"
} as const;

export const creatorTypeLabels = {
  short_drama_strategy: "短剧选题/收益型",
  personal_daily_diagnosis: "个人日常/异常解释型",
  growth_review: "增长复盘型",
  plateau_repair: "瓶颈修复/实验型",
  series_operation: "系列合集/老粉运营型"
} as const;

export const moduleLoadModeLabels = {
  focused: "标准",
  complete: "完整",
  adaptive: "动态"
} as const;

export const moduleLoadModeDescriptions = {
  focused: "每类加载 3-4 个最强相关模块",
  complete: "展示该类型所有可用分析模块",
  adaptive: "按异常指标和画像动态排序加载"
} as const;

export const goalLabels = {
  increase_views: "提升播放",
  grow_followers: "涨粉",
  improve_interaction: "提高互动",
  increase_conversion: "提升转化",
  stabilize_output: "稳定更新"
} as const;

export const severityTone = {
  positive: "green",
  notice: "blue",
  warning: "amber",
  critical: "red"
} as const;

export const toneClass = {
  sky: {
    text: "text-sky-500",
    soft: "bg-sky-50 text-sky-700",
    border: "border-sky-100"
  },
  emerald: {
    text: "text-emerald-500",
    soft: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-100"
  },
  amber: {
    text: "text-amber-500",
    soft: "bg-amber-50 text-amber-700",
    border: "border-amber-100"
  },
  rose: {
    text: "text-rose-500",
    soft: "bg-rose-50 text-rose-700",
    border: "border-rose-100"
  },
  violet: {
    text: "text-violet-500",
    soft: "bg-violet-50 text-violet-700",
    border: "border-violet-100"
  }
} as const;
