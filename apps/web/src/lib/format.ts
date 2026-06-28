const compactFormatter = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 1
});

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "CNY"
});

export const formatCompact = (value: number) => compactFormatter.format(value);

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const formatPct = (value: number) => `${(value * 100).toFixed(1)}%`;
