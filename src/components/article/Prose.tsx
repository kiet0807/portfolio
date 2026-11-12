import { Fragment, type ReactNode } from 'react';
import type { Block, Inline } from '@/lib/markdown';

type HeadingBlock = Extract<Block, { kind: 'heading' }>;

function inline(nodes: readonly Inline[], external: string): ReactNode {
  return nodes.map((node, i) => {
    switch (node.kind) {
      case 'text':
        return <Fragment key={i}>{node.text}</Fragment>;
      case 'code':
        return <code key={i}>{node.text}</code>;
      case 'strong':
        return <strong key={i}>{inline(node.children, external)}</strong>;
      case 'em':
        return <em key={i}>{inline(node.children, external)}</em>;
      case 'link': {
        const outside = node.href.startsWith('https://');
        return (
          <a
            key={i}
            href={node.href}
            target={outside ? '_blank' : undefined}
            rel={outside ? 'noreferrer noopener' : undefined}
          >
            {inline(node.children, external)}
            {outside ? <span className="sr-only"> ({external})</span> : null}
          </a>
        );
      }
    }
  });
}

interface Labels {
  /** Screen-reader note for links that open a new tab. */
  external: string;
  /** Name of the scrollable frame around a table. */
  table: string;
}

function block(item: Block, key: number, labels: Labels): ReactNode {
  const { external } = labels;
  switch (item.kind) {
    case 'heading':
      // Level 2 headings open a <section> (see Prose); only level 3 reaches here.
      return (
        <h3 key={key} id={item.id}>
          {inline(item.content, external)}
        </h3>
      );
    case 'paragraph':
      return <p key={key}>{inline(item.content, external)}</p>;
    case 'list': {
      const List = item.ordered ? 'ol' : 'ul';
      return (
        <List key={key}>
          {item.items.map((entry, i) => (
            <li key={i}>{inline(entry, external)}</li>
          ))}
        </List>
      );
    }
    case 'quote':
      return (
        <blockquote key={key}>
          <p>{inline(item.content, external)}</p>
        </blockquote>
      );
    case 'code':
      return (
        <pre key={key} data-lang={item.lang || undefined}>
          <code>{item.text}</code>
        </pre>
      );
    case 'table':
      // On a narrow screen the table scrolls inside its frame, never the page. The frame is
      // focusable so a keyboard can scroll it too.
      return (
        <div key={key} className="table-wrap" role="region" aria-label={labels.table} tabIndex={0}>
          <table>
            <thead>
              <tr>
                {item.head.map((cell, i) => (
                  <th key={i} scope="col">
                    {inline(cell, external)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{inline(cell, external)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

interface ProseProps {
  blocks: readonly Block[];
  labels: Labels;
}

/**
 * The article text. Each level 2 heading opens a <section> carrying the heading's id, so the
 * table of contents can link to it and highlight the part being read. Typography lives in
 * styles.css (.prose-article).
 */
export function Prose({ blocks, labels }: ProseProps) {
  const intro: Block[] = [];
  const sections: { heading: HeadingBlock; body: Block[] }[] = [];
  for (const item of blocks) {
    if (item.kind === 'heading' && item.level === 2) sections.push({ heading: item, body: [] });
    else (sections.at(-1)?.body ?? intro).push(item);
  }
  return (
    <div className="prose-article">
      {intro.map((item, i) => block(item, i, labels))}
      {sections.map(({ heading, body }) => (
        <section key={heading.id} id={heading.id} data-article-section="">
          <h2>{inline(heading.content, labels.external)}</h2>
          {body.map((item, i) => block(item, i, labels))}
        </section>
      ))}
    </div>
  );
}
