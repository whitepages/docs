import { Card, Cards } from "fumadocs-ui/components/card";

export interface RelatedLink {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
}

export function RelatedLinks({
  links,
}: {
  links: readonly RelatedLink[];
}): React.ReactNode {
  if (links.length === 0) {
    return null;
  }

  return (
    <>
      <h2>Related</h2>
      <Cards>
        {links.map((link) => (
          <Card
            key={link.url}
            title={link.title}
            description={link.description}
            href={link.url}
          />
        ))}
      </Cards>
    </>
  );
}
