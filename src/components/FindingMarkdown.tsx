import { marked, type Token, type MarkedToken } from 'marked';
import { createElement, type ReactNode } from 'react';

function renderTokens(tokens: Token[], depth = 0): ReactNode {
  if (depth > 16) return 'Content nesting limit reached.';
  return (tokens as MarkedToken[]).map((token, index) => {
    const children =
      'tokens' in token && token.tokens
        ? renderTokens(token.tokens, depth + 1)
        : 'text' in token
          ? String(token.text)
          : token.raw;
    switch (token.type) {
      case 'space':
        return null;
      case 'heading':
        return createElement(
          `h${Math.min(token.depth + 2, 6)}`,
          { key: index },
          children
        );
      case 'paragraph':
        return <p key={index}>{children}</p>;
      case 'strong':
        return <strong key={index}>{children}</strong>;
      case 'em':
        return <em key={index}>{children}</em>;
      case 'del':
        return <del key={index}>{children}</del>;
      case 'code':
        return (
          <pre key={index}>
            <code>{token.text}</code>
          </pre>
        );
      case 'codespan':
        return <code key={index}>{token.text}</code>;
      case 'br':
        return <br key={index} />;
      case 'blockquote':
        return <blockquote key={index}>{children}</blockquote>;
      case 'list':
        return createElement(
          token.ordered ? 'ol' : 'ul',
          { key: index },
          token.items.map((item, i) => (
            <li key={i}>{renderTokens(item.tokens, depth + 1)}</li>
          ))
        );
      case 'table':
        return (
          <table key={index}>
            <thead>
              <tr>
                {token.header.map((cell, i) => (
                  <th key={i}>{renderTokens(cell.tokens, depth + 1)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {token.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{renderTokens(cell.tokens, depth + 1)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      // Treat links, images and HTML as text. Preview never requests remote evidence or runs HTML.
      case 'link':
        return (
          <span key={index}>
            {children} ({token.href})
          </span>
        );
      case 'image':
        return (
          <span key={index}>
            {token.text} (attach evidence using the upload panel)
          </span>
        );
      default:
        return children;
    }
  });
}

export function FindingMarkdown({ text }: { text: string }) {
  let content: ReactNode;
  try {
    content = renderTokens(marked.lexer(text.slice(0, 10000), { gfm: true }));
  } catch {
    content = <p>{text.slice(0, 10000)}</p>;
  }
  return <div className="finding-markdown">{content}</div>;
}
