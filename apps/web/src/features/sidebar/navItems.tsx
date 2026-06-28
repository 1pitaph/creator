import { ChartBar } from "@phosphor-icons/react/ChartBar";
import { Compass } from "@phosphor-icons/react/Compass";
import { Play } from "@phosphor-icons/react/Play";
import { Robot } from "@phosphor-icons/react/Robot";
import { SquaresFour } from "@phosphor-icons/react/SquaresFour";
import { Table } from "@phosphor-icons/react/Table";
import type { ReactNode } from "react";

import { phosphorIconWeight } from "../../constants";
import type { DashboardPanel } from "../../types";

export const sidebarNavItems = [
  {
    id: "overview",
    label: "诊断总览",
    icon: (
      <SquaresFour className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />
    ),
    panel: "overview",
    primary: true,
  },
  {
    id: "metrics",
    label: "指标面板",
    icon: <ChartBar className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
    panel: "overview",
  },
  {
    id: "content",
    label: "内容样本",
    icon: <Play className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
    panel: "overview",
  },
  {
    id: "modules",
    label: "AI 模块",
    icon: <Robot className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
    panel: "overview",
  },
  {
    id: "actions",
    label: "行动队列",
    icon: <Compass className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
    panel: "board",
  },
  {
    id: "settings",
    label: "面板配置",
    icon: <Table className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
    panel: "table",
  },
] satisfies Array<{
  id: string;
  label: string;
  icon: ReactNode;
  panel: DashboardPanel;
  primary?: boolean;
}>;
