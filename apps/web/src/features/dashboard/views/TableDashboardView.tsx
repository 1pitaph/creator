import { Eye } from "@phosphor-icons/react/Eye";
import { EyeSlash } from "@phosphor-icons/react/EyeSlash";
import { useContainerWidth } from "react-grid-layout";

import type { DashboardPreferencesV1 } from "@creator/data-contracts";
import { Button } from "@creator/ui";

import { phosphorIconWeight } from "../../../constants";
import { DashboardCardKindTag, dashboardCardKindLabels } from "../components/DashboardTags";
import {
  createDashboardGridItem,
  dashboardColumnCounts,
  getDashboardBreakpointForWidth,
  getDashboardCardGridConstraints,
  getDashboardMasonryColumnCount,
  isModuleChartCardId,
  normalizeDashboardGridItem,
  normalizeDashboardCardDimensions,
  packDashboardMasonryLayout,
  type DashboardCardDefinition
} from "../customization";

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
  const layoutWidth = Math.floor(width);
  const breakpoint = mounted && measuredWidth > 0 ? getDashboardBreakpointForWidth(layoutWidth) : "lg";
  const activeCols = mounted && measuredWidth > 0 ? getDashboardMasonryColumnCount(layoutWidth) : dashboardColumnCounts.lg;
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const getCardLayoutItem = (card: DashboardCardDefinition, layout = preferences.visual.layouts[breakpoint]) => {
    const dimensions = normalizeDashboardCardDimensions(preferences.cards[card.id], card.defaultSize);
    const item = layout.find((layoutItem) => layoutItem.i === card.id) ?? createDashboardGridItem(card, breakpoint, 0, 0, dimensions, activeCols);

    return normalizeDashboardGridItem(item, breakpoint, card, activeCols);
  };
  const sortedCards = [...cards].sort((a, b) => {
    const direction = preferences.table.sort.direction === "asc" ? 1 : -1;
    const aLayout = getCardLayoutItem(a);
    const bLayout = getCardLayoutItem(b);

    switch (preferences.table.sort.field) {
      case "title":
        return a.title.localeCompare(b.title, "zh-CN") * direction;
      case "type":
        return dashboardCardKindLabels[a.kind].localeCompare(dashboardCardKindLabels[b.kind], "zh-CN") * direction;
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
      const fallbackItem = createDashboardGridItem(card, breakpoint, 0, 0, dimensions, activeCols);
      const preservedModuleChartLayout = currentLayout.filter((item) => isModuleChartCardId(item.i) && !cardById.has(item.i));
      const currentKnownLayout = currentLayout.filter((item) => cardById.has(item.i));
      const hasExistingItem = currentKnownLayout.some((item) => item.i === card.id);
      const nextLayout = (hasExistingItem ? currentKnownLayout : [...currentKnownLayout, fallbackItem]).flatMap((item) => {
        const itemCard = cardById.get(item.i);

        if (!itemCard) {
          return [];
        }

        const normalizedItem = normalizeDashboardGridItem(item, breakpoint, itemCard, activeCols);

        return [
          item.i === card.id
            ? normalizeDashboardGridItem(
                {
                  ...normalizedItem,
                  [axis]: value
                },
                breakpoint,
                itemCard,
                activeCols
              )
            : normalizedItem
        ];
      });
      const compactedLayout = packDashboardMasonryLayout(cards, breakpoint, activeCols, current.cards, nextLayout);
      const compactedLayoutIds = new Set(compactedLayout.map((item) => item.i));
      const nextBreakpointLayout = [
        ...compactedLayout,
        ...preservedModuleChartLayout.filter((item) => !compactedLayoutIds.has(item.i))
      ];

      return {
        ...current,
        visual: {
          layouts: {
            ...current.visual.layouts,
            [breakpoint]: nextBreakpointLayout
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
              const constraints = getDashboardCardGridConstraints(card, breakpoint, activeCols);

              return (
                <tr key={card.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-zinc-950">{card.title}</p>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">{card.description}</p>
                  </td>
                  <td className="px-4 py-4">
                    <DashboardCardKindTag kind={card.kind} />
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
