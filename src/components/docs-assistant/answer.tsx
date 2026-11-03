import Markdown from "react-markdown";

export function AssistantAnswer({ content }: { readonly content: string }) {
  return (
    <Markdown
      skipHtml
      allowedElements={[
        "p",
        "a",
        "strong",
        "em",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
        "blockquote",
        "h3",
        "h4",
        "hr",
        "br",
      ]}
      components={{
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </Markdown>
  );
}
