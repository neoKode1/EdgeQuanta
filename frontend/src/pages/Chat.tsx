import { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import ArtifactPanel, { type ArtifactContent } from '../components/ArtifactPanel';

marked.setOptions({ breaks: true, gfm: true });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: { name: string; input: Record<string, unknown> }[];
  isStreaming?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  ts: number;
}

const STORAGE_KEY = 'eq_chat_history';

function loadConversations(): Conversation[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveConversations(convos: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos.slice(0, 50)));
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [artifact, setArtifact] = useState<ArtifactContent | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const bgRef = useRef<HTMLDivElement>(null);
  const active = conversations.find((c) => c.id === activeId) ?? null;

  // Load Unicorn Studio animated background
  useEffect(() => {
    if ((window as any).UnicornStudio?.isInitialized) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';
    script.onload = () => {
      if (!(window as any).UnicornStudio?.isInitialized) {
        (window as any).UnicornStudio.init();
        (window as any).UnicornStudio.isInitialized = true;
      }
    };
    (window as any).UnicornStudio = (window as any).UnicornStudio || { isInitialized: false };
    document.head.appendChild(script);
    return () => {
      // Cleanup: don't remove the script as it may be reused
    };
  }, []);

  useEffect(() => { saveConversations(conversations); }, [conversations]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages]);

  const newConversation = useCallback(() => {
    const c: Conversation = { id: crypto.randomUUID(), title: 'New chat', messages: [], ts: Date.now() };
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setArtifact(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    let cid = activeId;
    if (!cid) {
      const c: Conversation = { id: crypto.randomUUID(), title: text.slice(0, 60), messages: [], ts: Date.now() };
      setConversations((prev) => [c, ...prev]);
      cid = c.id;
      setActiveId(cid);
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', isStreaming: true, tools: [] };

    setConversations((prev) =>
      prev.map((c) => c.id === cid ? { ...c, title: c.messages.length === 0 ? text.slice(0, 60) : c.title, messages: [...c.messages, userMsg, assistantMsg], ts: Date.now() } : c)
    );

    try {
      const history = conversations.find((c) => c.id === cid)?.messages.map((m) => ({
        role: m.role, content: m.content,
      })) ?? [];

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: text, history }),
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let textContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'text') { textContent += ev.content; }
            else if (ev.type === 'tool_start') {
              assistantMsg.tools = [...(assistantMsg.tools || []), { name: ev.tool_name, input: ev.tool_input }];
            } else if (ev.type === 'preview') {
              setArtifact({ type: ev.preview_type, title: ev.preview_title, content: ev.preview_content, toolName: ev.tool_name });
            }
          } catch { /* skip bad JSON */ }
        }
        setConversations((prev) =>
          prev.map((c) => c.id === cid ? {
            ...c, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, content: textContent } : m),
          } : c)
        );
      }

      setConversations((prev) =>
        prev.map((c) => c.id === cid ? {
          ...c, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, content: textContent, isStreaming: false } : m),
        } : c)
      );
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Unknown error';
      setConversations((prev) =>
        prev.map((c) => c.id === cid ? {
          ...c, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, content: `⚠ Error: ${errText}`, isStreaming: false } : m),
        } : c)
      );
    } finally { setLoading(false); }
  }, [input, loading, activeId, conversations]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Full-page animated background — renders behind nav/footer */}
      <div className="chat-aura-bg" ref={bgRef} data-us-project="8G9qTlSBPboaCMb8UV64" />

    <div className="chat-layout">

      {/* History dropdown */}
      <div className="chat-history-dropdown-wrap">
        <button className="chat-history-btn" onClick={() => setHistoryOpen((v) => !v)}>
          ☰ {historyOpen ? 'CLOSE' : 'HISTORY'}
        </button>
        {historyOpen && (
          <div className="chat-history-dropdown">
            <button className="chat-history-new" onClick={() => { newConversation(); setHistoryOpen(false); }}>+ NEW CHAT</button>
            {conversations.length === 0 && <p className="chat-history-empty">No conversations yet</p>}
            {conversations.map((c) => (
              <div key={c.id} className={`chat-history-item ${c.id === activeId ? 'active' : ''}`} onClick={() => { setActiveId(c.id); setArtifact(null); setHistoryOpen(false); }}>
                <span className="chat-history-title">{c.title}</span>
                <button className="chat-history-del" onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main thread */}
      <div className={`chat-main ${artifact ? 'with-artifact' : ''}`}>
        <div className="chat-thread">
          {!active || active.messages.length === 0 ? (
            <div className="chat-empty">
              <h2>EDGE QUANTA</h2>
              <p>Ask anything about quantum computing, run experiments, or search the latest research.</p>
            </div>
          ) : (
            active.messages.map((m) => (
              <div key={m.id} className={`chat-msg chat-msg-${m.role}`}>
                <div className="chat-msg-avatar">{m.role === 'user' ? '→' : '⟡'}</div>
                <div className="chat-msg-body">
                  {m.tools && m.tools.length > 0 && (
                    <div className="chat-tools-used">
                      {m.tools.map((t, i) => (
                        <span key={i} className="chat-tool-tag">{t.name === 'web_search' ? '🔍' : t.name === 'web_fetch' ? '🌐' : '⚛️'} {t.name}</span>
                      ))}
                    </div>
                  )}
                  <div className="chat-msg-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.content) as string) }} />
                  {m.isStreaming && <span className="chat-cursor">▍</span>}
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="chat-input-wrap">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about quantum computing, run an experiment..."
            rows={1}
            disabled={loading}
          />
          <button className="chat-send-btn" onClick={send} disabled={loading || !input.trim()}>
            {loading ? '⏳' : '↑'}
          </button>
        </div>
      </div>

      {/* Artifact panel */}
      {artifact && <ArtifactPanel content={artifact} onClose={() => setArtifact(null)} />}
    </div>
    </>
  );
}

