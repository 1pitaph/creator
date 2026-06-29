import type { Icon, IconProps, IconWeight } from "@phosphor-icons/react";

import { cn } from "@creator/ui";

import { phosphorIconHoverWeight, phosphorIconWeight } from "../../constants";

type PhosphorHoverIconProps = Omit<IconProps, "weight"> & {
  icon: Icon;
  defaultWeight?: IconWeight;
  hoverWeight?: IconWeight;
};

export const PhosphorHoverIcon = ({
  className,
  defaultWeight = phosphorIconWeight,
  hoverWeight = phosphorIconHoverWeight,
  icon: Icon,
  ...props
}: PhosphorHoverIconProps) => (
  <span
    aria-hidden="true"
    className={cn("phosphor-hover-icon relative inline-flex shrink-0", className)}
    data-phosphor-hover-icon="true"
  >
    <Icon
      {...props}
      className="phosphor-hover-icon__regular block h-full w-full"
      focusable="false"
      weight={defaultWeight}
    />
    <Icon
      {...props}
      className="phosphor-hover-icon__duotone absolute inset-0 h-full w-full"
      focusable="false"
      weight={hoverWeight}
    />
  </span>
);
