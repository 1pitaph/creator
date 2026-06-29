import { type CSSProperties, memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@creator/ui";

const markdownPlugins = [remarkGfm];

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 text-lg font-semibold leading-7 text-zinc-950 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-base font-semibold leading-6 text-zinc-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-sm font-semibold leading-6 text-zinc-900 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-2 whitespace-pre-wrap break-words first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-950">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-zinc-300 pl-3 text-zinc-600">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlockCode = className?.startsWith("language-");

    return (
      <code
        className={cn(
          isBlockCode
            ? "text-zinc-50"
            : "rounded bg-white/80 px-1 py-0.5 text-[0.92em] text-zinc-900",
          className,
        )}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-zinc-900 px-3 py-2 text-xs leading-5 text-zinc-50">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  ),
  th: ({ children, align }) => (
    <th
      className="border border-zinc-200 bg-white/70 px-2 py-1 font-semibold text-zinc-700"
      style={tableTextAlignStyle(align)}
    >
      {children}
    </th>
  ),
  td: ({ children, align }) => (
    <td
      className="border border-zinc-200 px-2 py-1 text-zinc-700"
      style={tableTextAlignStyle(align)}
    >
      {children}
    </td>
  ),
};

const tableTextAlignStyle = (align?: string): CSSProperties | undefined => {
  if (
    align === "left" ||
    align === "right" ||
    align === "center" ||
    align === "justify"
  ) {
    return { textAlign: align };
  }

  return undefined;
};

const AssistantMarkdown = memo(function AssistantMarkdown({
  content,
}: {
  content: string;
}) {
  return (
    <div className="max-w-full break-words">
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={markdownPlugins}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default AssistantMarkdown;
