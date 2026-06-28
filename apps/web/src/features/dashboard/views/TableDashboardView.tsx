import { Eye } from "@phosphor-icons/react/Eye";
import { EyeSlash } from "@phosphor-icons/react/EyeSlash";
import { useContainerWidth, verticalCompactor, type Layout } from "react-grid-layout";

import type { DashboardGridItem, DashboardPreferencesV1 } from "@creator/data-contracts";
import { Badge, Button } from "@creator/ui";

import { phosphorIconWeight } from "../../../constants";
import {
  createDashboardGridItem,
  dashboardColumnCounts,
  getDashboardBreakpointForWidth,
  getDashboardCardGridConstraints,
  normalizeDashboardGridItem,
  normalizeDashboardCardDimensions,
  type DashboardCardDefinition,
  type DashboardCardKind
} from "../customization";

const kindLabels: Record<DashboardCardKind, string> = {
  summary: "摘要",
  metric: "指标",
  trend: "趋势",
  insights: "洞察",
  "top-content": "内容",
  modules: "模块",
  actions: "行动"
};

const toStoredGridItems = (layout: Layout): DashboardGridItem[] =>
  layout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH
  }));

export const TableDashboardView = ({
  cards,
  preferences,
  updatePreferences
}: {
  cards: DashboardCardDefinition[];
  preferences: DashboardPreferencesV1;
  updatePreferences: (updater: (current: DashboardPreferencesV1) => DashboardPreferencesV1) => void;
}) => {
  const { containerRef, mounted, width } = useContainerWidth({ measureBeforeMount: true, initialWidth: 0 });
  const measuredWidth = Math.round(width);
  const breakpoint = mounted && measuredWidth > 0 ? getDashboardBreakpointForWidth(measuredWidth) : "lg";
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const getCardLayoutItem = (card: DashboardCardDefinition, layout = preferences.visual.layouts[breakpoint]) => {
    const dimensions = normalizeDashboardCardDimensions(preferences.cards[card.id], card.defaultSize);
    const item = layout.find((layoutItem) => layoutItem.i === card.id) ?? createDashboardGridItem(card, breakpoint, 0, 0, dimensions);

    return normalizeDashboardGridItem(item, breakpoint, card);
  };
  const sortedCards = [...cards].sort((a, b) => {
    const direction = preferences.table.sort.direction === "asc" ? 1 : -1;
    const aLayout = getCardLayoutItem(a);
    const bLayout = getCardLayoutItem(b);

    switch (preferences.table.sort.field) {
      case "title":
        return a.title.localeCompare(b.title, "zh-CN") * direction;
      case "type":
        return kindLabels[a.kind].localeCompare(kindLabels[b.kind], "zh-CN") * direction;
      case "width":
        return (aLayout.w - bLayout.w) * direction;
      case "height":
        return (aLayout.h - bLayout.h) * direction;
      case "size":
        return (aLayout.w - bLayout.w) * direction;
      case "visible":
        return (Number(preferences.cards[b.id]?.visible ?? true) - Number(preferences.cards[a.id]?.visible ?? true)) * direction;
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

  const updateCardGridDimension = (card: DashboardCardDefinition, axis: "w" | "h", value: number) => {
    updatePreferences((current) => {
      const currentLayout = current.visual.layouts[breakpoint] ?? [];
      const dimensions = normalizeDashboardCardDimensions(current.cards[card.id], card.defaultSize);
      const fallbackItem = createDashboardGridItem(card, breakpoint, 0, 0, dimensions);
      const hasExistingItem = currentLayout.some((item) => item.i === card.id);
      const nextLayout = (hasExistingItem ? currentLayout : [...currentLayout, fallbackItem]).flatMap((item) => {
        const itemCard = cardById.get(item.i);

        if (!itemCard) {
          return [];
        }

        const normalizedItem = normalizeDashboardGridItem(item, breakpoint, itemCard);

        return [
          item.i === card.id
            ? normalizeDashboardGridItem(
                {
                  ...normalizedItem,
                  [axis]: value
                },
                breakpoint,
                itemCard
              )
            : normalizedItem
        ];
      });
      const compactedLayout = toStoredGridItems(verticalCompactor.compact(nextLayout as Layout, dashboardColumnCounts[breakpoint]) as Layout).flatMap((item) => {
        const itemCard = cardById.get(item.i);

        return itemCard ? [normalizeDashboardGridItem(item, breakpoint, itemCard)] : [];
      });

      return {
        ...current,
        visual: {
          layouts: {
            ...current.visual.layouts,
            [breakpoint]: compactedLayout
          }
        }
      };
    });
  };

  return (
    <section ref={containerRef} className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_1px_rgba(24,24,27,0.025),0_8px_28px_rgba(24,24,27,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full border-collapse text-left">
          <thead className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold text-zinc-500">
            <tr>
              <HeaderButton label="名称" onClick={() => setSort("title")} />
              <HeaderButton label="类型" onClick={() => setSort("type")} />
              <HeaderButton label="宽度(列)" onClick={() => setSort("width")} />
              <HeaderButton label="高度(行)" onClick={() => setSort("height")} />
              <HeaderButton label="显示" onClick={() => setSort("visible")} />
              <HeaderButton label="顺序" onClick={() => setSort("priority")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm">
            {sortedCards.map((card) => {
              const preference = preferences.cards[card.id] ?? { visible: true, width: card.defaultSize, height: card.defaultSize };
              const layoutItem = getCardLayoutItem(card);
              const constraints = getDashboardCardGridConstraints(card, breakpoint);

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
                    <input
                      aria-label={`设置「${card.title}」宽度列数`}
                      className="h-9 w-20 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
                      max={constraints.maxW}
                      min={constraints.minW}
                      step={1}
                      type="number"
                      value={layoutItem.w}
                      onChange={(event) => {
                        updateCardGridDimension(card, "w", Number(event.target.value));
                      }}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      aria-label={`设置「${card.title}」高度行数`}
                      className="h-9 w-20 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
                      max={constraints.maxH}
                      min={constraints.minH}
                      step={1}
                      type="number"
                      value={layoutItem.h}
                      onChange={(event) => {
                        updateCardGridDimension(card, "h", Number(event.target.value));
                      }}
                    />
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
                              ...normalizeDashboardCardDimensions(current.cards[card.id], card.defaultSize)
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
