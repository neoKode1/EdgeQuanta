import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

export interface ArtifactContent {
  type: 'web_page' | 'search_results' | 'quantum_result';
  title: string;
  content: string;
  toolName: string;
}

interface Props {
  content: ArtifactContent;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  web_page: '🌐', search_results: '🔍', quantum_result: '⚛️',
};
const TYPE_LABELS: Record<string, string> = {
  web_page: 'WEB PAGE', search_results: 'SEARCH RESULTS', quantum_result: 'QUANTUM RESULT',
};

export default function ArtifactPanel({ content, onClose }: Props) {
  const parsed = useMemo(() => {
    try { return JSON.parse(content.content); } catch { return null; }
  }, [content.content]);

  return (
    <div className="artifact-panel">
      {/* Header */}
      <div className="artifact-header">
        <div className="artifact-header-left">
          <span>{TYPE_ICONS[content.type] ?? '📄'}</span>
          <span className="artifact-type-label">{TYPE_LABELS[content.type] ?? content.type}</span>
          <span className="artifact-title-text">{content.title}</span>
        </div>
        <button onClick={onClose} className="artifact-close" title="Close panel">✕</button>
      </div>

      {/* Content */}
      <div className="artifact-body">
        {content.type === 'search_results' && parsed?.results ? (
          <div className="artifact-search">
            {parsed.query && <p className="artifact-query">QUERY: {parsed.query}</p>}
            {parsed.results.map((r: { title: string; url: string; snippet: string }, i: number) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="artifact-result-card">
                <span className="artifact-result-num">{i + 1}</span>
                <div>
                  <h4>{r.title}</h4>
                  <p className="artifact-result-url">{r.url}</p>
                  {r.snippet && <p className="artifact-result-snippet">{r.snippet}</p>}
                </div>
              </a>
            ))}
          </div>
        ) : content.type === 'quantum_result' && parsed ? (
          <div className="artifact-quantum">
            <div className="artifact-quantum-grid">
              {parsed.backend && (
                <div className="artifact-stat-card">
                  <p className="artifact-stat-label">BACKEND</p>
                  <p className="artifact-stat-value">{parsed.backend}</p>
                </div>
              )}
              {parsed.shots && (
                <div className="artifact-stat-card">
                  <p className="artifact-stat-label">SHOTS</p>
                  <p className="artifact-stat-value">{parsed.shots.toLocaleString()}</p>
                </div>
              )}
              {parsed.fidelity != null && (
                <div className="artifact-stat-card">
                  <p className="artifact-stat-label">FIDELITY</p>
                  <p className="artifact-stat-value artifact-stat-cyan">{(parsed.fidelity * 100).toFixed(2)}%</p>
                </div>
              )}
              {parsed.provider && (
                <div className="artifact-stat-card">
                  <p className="artifact-stat-label">PROVIDER</p>
                  <p className="artifact-stat-value" style={{ fontSize: '0.85rem' }}>{parsed.provider}</p>
                </div>
              )}
            </div>
            {parsed.counts && (
              <div style={{ marginTop: 16 }}>
                <p className="artifact-stat-label" style={{ marginBottom: 8 }}>MEASUREMENT COUNTS</p>
                <div className="artifact-counts-grid">
                  {Object.entries(parsed.counts as Record<string, number>).map(([state, count]) => {
                    const total = Object.values(parsed.counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                    const pct = total > 0 ? ((count as number) / total) * 100 : 0;
                    return (
                      <div key={state} className="artifact-count-bar">
                        <div className="artifact-count-label">|{state}⟩</div>
                        <div className="artifact-count-track">
                          <div className="artifact-count-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="artifact-count-value">{count as number}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="artifact-prose"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                marked.parse(parsed?.content ?? content.content) as string
              ),
            }}
          />
        )}
      </div>
    </div>
  );
}

