import { readFileSync } from "fs";
import { join } from "path";

/** Very simple markdown → HTML renderer for legal pages (server component) */
function mdToHtml(md: string): string {
  return md
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Tables (basic)
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row.slice(1, -1).split('|');
      const isHeader = false; // simplified
      const tag = isHeader ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    })
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Wrap list items in ul
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Wrap table rows in table
    .replace(/(<tr>.*<\/tr>)/gs, '<table>$1</table>');
}

interface Props {
  /** Path relative to app/legal/, e.g. "terms/content.md" */
  contentPath: string;
  title:       string;
}

export default function LegalPage({ contentPath, title }: Props) {
  let content = "";
  try {
    const fullPath = join(process.cwd(), "app", "legal", contentPath);
    content = readFileSync(fullPath, "utf-8");
  } catch {
    content = "Documento no disponible.";
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: `<p>${mdToHtml(content)}</p>` }}
      />
      <style>{`
        .legal-content { color: #ccc; font-size: 15px; line-height: 1.8; }
        .legal-content h1 { font-size: 28px; font-weight: 800; color: #fff; margin: 40px 0 12px; border-bottom: 1px solid #2a2a2a; padding-bottom: 10px; }
        .legal-content h2 { font-size: 20px; font-weight: 700; color: #e0e0e0; margin: 32px 0 10px; }
        .legal-content h3 { font-size: 16px; font-weight: 700; color: #ccc; margin: 24px 0 8px; }
        .legal-content h4 { font-size: 14px; font-weight: 700; color: #aaa; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .legal-content p  { margin: 12px 0; }
        .legal-content ul { margin: 12px 0; padding-left: 24px; }
        .legal-content li { margin: 6px 0; }
        .legal-content strong { color: #fff; font-weight: 600; }
        .legal-content em    { font-style: italic; color: #bbb; }
        .legal-content code  { background: #1e1e2e; border: 1px solid #333; border-radius: 4px; padding: 2px 6px; font-family: monospace; font-size: 13px; color: #a78bfa; }
        .legal-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .legal-content td, .legal-content th { border: 1px solid #2a2a2a; padding: 8px 12px; text-align: left; }
        .legal-content th   { background: #1a1a2e; color: #a78bfa; font-weight: 700; }
        .legal-content tr:nth-child(even) { background: #0d0d1a; }
        .legal-content hr   { border: none; border-top: 1px solid #2a2a2a; margin: 32px 0; }
        .legal-content blockquote { border-left: 3px solid #8b5cf6; padding: 8px 16px; margin: 16px 0; background: rgba(139,92,246,0.06); color: #bbb; }
        .legal-content a    { color: #a78bfa; text-decoration: underline; }
      `}</style>
    </div>
  );
}
