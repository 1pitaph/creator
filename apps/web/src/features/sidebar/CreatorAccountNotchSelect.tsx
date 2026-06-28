import { cn } from "@creator/ui";

import { Notch, type NotchItem } from "../../components/ui/notch";
import { creatorOptions } from "../creator-diagnosis/creatorOptions";

const getSelectedCreator = (selectedCreatorId: string) =>
  creatorOptions.find((creator) => creator.id === selectedCreatorId) ??
  creatorOptions[0] ?? {
    id: selectedCreatorId,
    name: "创作者账号",
    handle: "@creator",
    domain: "Demo",
    creatorType: "personal_daily_diagnosis" as const,
  };

const creatorTypeShortLabels = {
  short_drama_strategy: "短剧",
  personal_daily_diagnosis: "日常",
  growth_review: "职场",
  plateau_repair: "健身",
  series_operation: "城市",
} as const;

const getCreatorTypeShortLabel = ({
  creatorType,
  domain,
}: {
  creatorType: string;
  domain: string;
}) =>
  creatorTypeShortLabels[
    creatorType as keyof typeof creatorTypeShortLabels
  ] ?? domain.split(/[/／]/)[0]?.slice(0, 2) ?? "账号";

export const CreatorAccountNotchSelect = ({
  selectedCreatorId,
  onSelectCreator,
  collapsed = false,
}: {
  selectedCreatorId: string;
  onSelectCreator: (creatorId: string) => void;
  collapsed?: boolean;
}) => {
  const selectedCreator = getSelectedCreator(selectedCreatorId);
  const accountOptions = creatorOptions.map((creator) => ({
    id: creator.id,
    label: creator.name,
    icon: (
      <span
        className="flex h-4 w-4 items-center justify-center rounded bg-white/10 text-[10px] font-semibold text-white"
        aria-hidden="true"
      >
        {creator.name.slice(0, 1)}
      </span>
    ),
  }));

  const items: NotchItem[] = collapsed
    ? [
        {
          id: "account",
          label: "账号",
          ariaLabel: `切换创作者账号：${selectedCreator.name}`,
          options: accountOptions,
          value: selectedCreator.id,
          showValue: false,
          onChange: (creatorId) => onSelectCreator(creatorId),
        },
      ]
    : [
        {
          id: "sample",
          label: "示例",
          ariaLabel: "示例数据",
          disabled: true,
          options: [{ id: "demo", label: "数据" }],
          triggerValue: "数据",
          triggerValueClassName: "font-semibold text-neutral-100",
          value: "demo",
        },
        {
          id: "account",
          label: "账号",
          ariaLabel: `切换创作者账号：${selectedCreator.name}`,
          options: accountOptions,
          value: selectedCreator.id,
          triggerValue: getCreatorTypeShortLabel(selectedCreator),
          onChange: (creatorId) => onSelectCreator(creatorId),
        },
      ];

  return (
    <div
      className={cn(
        "relative h-11 overflow-visible [&_.fixed]:absolute",
        collapsed ? "px-0" : "px-1",
      )}
      data-testid="creator-account-notch"
    >
      <Notch
        items={items}
        position="bottom"
        align="center"
        offset={0}
        reveal={false}
        closeOnSelect
        accentColor="#0ea5e9"
        rootClassName="z-[65] px-0"
        optionsListClassName="max-h-[min(17rem,calc(100vh-8rem))] overflow-y-auto"
      />
    </div>
  );
};
