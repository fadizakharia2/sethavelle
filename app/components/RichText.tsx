import type { TextBlock } from "~/lib/rich-text";

/** Renders text-only blocks produced by `htmlToBlocks` (React escapes all text). */
export function RichText({ blocks, className = "" }: { blocks: TextBlock[]; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.level === 2 ? "h2" : "h3";
          return (
            <Tag key={index} className="font-heading pt-4 text-xl text-[#e5d8c5]">
              {block.text}
            </Tag>
          );
        }
        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={index}
              className={`space-y-1.5 ps-5 ${block.ordered ? "list-decimal" : "list-[square]"} marker:text-[#b59660]`}
            >
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </Tag>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
