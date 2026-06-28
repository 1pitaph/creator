import { ChartBar } from "@phosphor-icons/react/ChartBar";
import { Compass } from "@phosphor-icons/react/Compass";
import { Play } from "@phosphor-icons/react/Play";
import { Robot } from "@phosphor-icons/react/Robot";
import { SquaresFour } from "@phosphor-icons/react/SquaresFour";

import { phosphorIconWeight } from "../../constants";

export const sidebarNavItems = [
  {
    label: "诊断总览",
    icon: (
      <SquaresFour className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />
    ),
    active: true,
  },
  {
    label: "指标面板",
    icon: <ChartBar className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
  },
  {
    label: "内容样本",
    icon: <Play className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
  },
  {
    label: "AI 模块",
    icon: <Robot className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
  },
  {
    label: "行动队列",
    icon: <Compass className="h-5 w-5 shrink-0" weight={phosphorIconWeight} />,
  },
];
