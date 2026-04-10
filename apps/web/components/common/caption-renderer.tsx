import parse, { Element, HTMLReactParserOptions } from "html-react-parser";
import Link from "next/link";
import { useMemo } from "react";

interface CaptionRendererProps {
  html: string;
}

export const CaptionRenderer = ({ html }: CaptionRendererProps) => {
  const processedContent = useMemo(() => {
    // 1. Remove all contenteditable attributes saved by Quill
    // This removes the "Case 2" conflict entirely
    const strippedHtml = html.replace(/\s?contenteditable="[^"]*"/g, "");

    const options: HTMLReactParserOptions = {
      replace: (domNode) => {
        if ((domNode as Element).attribs?.class?.includes("mention")) {
          const value = (domNode as Element).attribs["data-value"];
          const char = (domNode as Element).attribs["data-denotation-char"] || "@";

          return (
            <Link
              href={`/explore/tags/${encodeURIComponent(value!)}`}
              // We explicitly set this to false for React's peace of mind
              contentEditable={false}
              className="inline-flex items-center rounded-sm border border-transparent bg-secondary px-1.5 py-0 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors mx-0.5"
            >
              {char}
              {value}
            </Link>
          );
        }
      },
    };

    return parse(strippedHtml, options);
  }, [html]);

  return <div className="whitespace-pre-wrap break-words text-sm text-foreground">{processedContent}</div>;
};
