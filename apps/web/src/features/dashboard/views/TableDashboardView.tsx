import { Eye } from "@phosphor-icons/react/Eye";
import { EyeSlash } from "@phosphor-icons/react/EyeSlash";

import type { DashboardCardSize, DashboardPreferencesV1 } from "@creator/data-contracts";
import { Badge, Button } from "@creator/ui";

import { phosphorIconWeight } from "../../../constants";
import type { DashboardCardDefinition, DashboardCardKind } from "../customization";

const sizeLabels: Record<DashboardCardSize, string> = {
  sm: "小",
  md: "中",
  wide: "宽",
  tall: "高",
  hero: "重点"
};

const kindLabels: Record<DashboardCardKind, string> = {
  summary: "摘要",
  metric: "指标",
  trend: "趋势",
  insights: "洞察",
  "top-content": "内容",
  modules: "模块",
  actions: "行动"
};

const sizeOptions = Object.keys(sizeLabels) as DashboardCardSize[];

export const TableDashboardView = ({
  cards,
  preferences,
  updatePreferences
}: {
  cards: DashboardCardDefinition[];
  preferences: DashboardPreferencesV1;
  updatePreferences: (updater: (current: DashboardPreferencesV1) => DashboardPreferencesV1) => void;
}) => {
  const sortedCards = [...cards].sort((a, b) => {
    const direction = preferences.table.sort.direction === "asc" ? 1 : -1;
    const aPreference = preferences.cards[a.id] ?? { visible: true, size: a.defaultSize };
    const bPreference = preferences.cards[b.id] ?? { visible: true, size: b.defaultSize };

    switch (preferences.table.sort.field) {
      case "title":
        return a.title.localeCompare(b.title, "zh-CN") * direction;
      case "type":
        return kindLabels[a.kind].localeCompare(kindLabels[b.kind], "zh-CN") * direction;
      case "size":
        return (sizeOptions.indexOf(aPreference.size) - sizeOptions.indexOf(bPreference.size)) * direction;
      case "visible":
        return (Number(bPreference.visible) - Number(aPreference.visible)) * direction;
      case "priority":
      default:
        return (a.priority - b.priority) * direction;
    }
  });

  const setSort = (field: DashboardPreferencesV1["table"]["sort"]["field"]) => {
    updatePreferences((current) => ({
      ...current,
      table: {
        sort: {
          field,
          direction: current.table.sort.field === field && current.table.sort.direction === "asc" ? "desc" : "asc"
        }
      }
    }));
  };

  return (
    <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_1px_rgba(24,24,27,0.025),0_8px_28px_rgba(24,24,27,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full border-collapse text-left">
          <thead className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold text-zinc-500">
            <tr>
              <HeaderButton label="名称" onClick={() => setSort("title")} />
              <HeaderButton label="类型" onClick={() => setSort("type")} />
              <HeaderButton label="尺寸" onClick={() => setSort("size")} />
              <HeaderButton label="显示" onClick={() => setSort("visible")} />
              <HeaderButton label="顺序" onClick={() => setSort("priority")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm">
            {sortedCards.map((card) => {
              const preference = preferences.cards[card.id] ?? { visible: true, size: card.defaultSize };

              return (
                <tr key={card.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-zinc-950">{card.title}</p>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">{card.description}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge tone="neutral">{kindLabels[card.kind]}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
                      value={preference.size}
                      onChange={(event) => {
                        const size = event.target.value as DashboardCardSize;
                        updatePreferences((current) => ({
                          ...current,
                          cards: {
                            ...current.cards,
                            [card.id]: {
                              ...current.cards[card.id],
                              visible: current.cards[card.id]?.visible ?? true,
                              size
                            }
                          }
                        }));
                      }}
                    >
                      {sizeOptions.map((size) => (
                        <option key={size} value={size}>
                          {sizeLabels[size]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={preference.visible ? `隐藏 ${card.title}` : `显示 ${card.title}`}
                      onClick={() => {
                        updatePreferences((current) => ({
                          ...current,
                          cards: {
                            ...current.cards,
                            [card.id]: {
                              ...current.cards[card.id],
                              visible: !(current.cards[card.id]?.visible ?? true),
                              size: current.cards[card.id]?.size ?? card.defaultSize
                            }
                          }
                        }));
                      }}
                    >
                      {preference.visible ? <Eye className="h-4 w-4" weight={phosphorIconWeight} /> : <EyeSlash className="h-4 w-4" weight={phosphorIconWeight} />}
                    </Button>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-zinc-500">{card.priority}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const HeaderButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <th className="px-4 py-3">
    <button type="button" className="font-semibold text-zinc-500 transition hover:text-zinc-900" onClick={onClick}>
      {label}
    </button>
  </th>
);
