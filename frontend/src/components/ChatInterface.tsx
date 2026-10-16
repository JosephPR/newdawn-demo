import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Database, Search, Globe, ShieldCheck, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

interface ChatInterfaceProps {
  sessionId: string;
  selectedModel?: string;
  /** Called after a message is sent so the parent can refresh the session list */
  onMessageSent?: () => void;
}

const WELCOME_PROMPT_MESSAGE: Message = {
  id: 'welcome-agent-intro',
  role: 'agent',
  content: `### Welcome to the New Dawn Multi-Agent Demo Workspace! 👋

Here is a quick guide on how this platform operates, what it can do, and how to set it up for your organization:

---

### 1. 📖 How to Use the App
* **Natural Language Goals:** Enter any complex objective, market query, or research topic into the prompt input below.
* **Supervised Autonomous Routing:** The **Director Agent** analyzes your objective and coordinates specialized sub-agents behind the scenes.
* **Live Observability:** Watch real-time execution pills update as agents perform web queries, scrape URLs, and synthesize data.
* **Human-in-the-Loop Safety:** For sensitive or high-impact actions, interactive safety approval gates will appear in this thread for your direct review.

---

### 2. ⚡ What It Can Do
* **Google Live Search:** Our Search Specialist sub-agent executes real-time web searches to gather current news, filings, and technical documentation.
* **Autonomous Web Scraping:** Point the agency to any target URL to read, digest, and extract structured intelligence directly into context.
* **Multi-Agent Orchestration:** Real-time reasoning and tool chaining built on the Google Agent Development Kit (ADK) architecture.
* **Deterministic Guardrails:** Tool validation prevents runaway actions, hallucinated endpoints, or unvetted external modifications.

---

### 3. 🛠️ How to Set It Up for Your Enterprise
* **Connect Proprietary Data:** Link your private databases (PostgreSQL, BigQuery, Snowflake) or internal APIs via **Model Context Protocol (MCP)**.
* **Tailored Domain Personas:** Configure bespoke sub-agents tuned with your internal SOPs, brand voice, and compliance policies.
* **Model Agnostic Freedom:** Seamlessly switch runtimes between Google Gemini 3.1 Pro / 3.8 Flash, Claude Sonnet 5.5, OpenAI GPT-6 Astra, or private local models via Ollama.

---

💡 **Try one of the live starter prompts below, or type your own question to see the agency in action!**`,
};

export function ChatInterface({ sessionId, selectedModel, onMessageSent }: ChatInterfaceProps) {
  const { getIdToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([WELCOME_PROMPT_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Agency is thinking...');
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentSessionRef = useRef(sessionId);
  const selectedModelRef = useRef(selectedModel);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // ---------------------------------------------------------------------------
  // Helper: build auth headers
  // ---------------------------------------------------------------------------
  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, [getIdToken]);

  // ---------------------------------------------------------------------------
  // Load conversation history whenever the sessionId changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    currentSessionRef.current = sessionId;
    let cancelled = false;

    const loadHistory = async () => {
      setMessages([WELCOME_PROMPT_MESSAGE]);
      setIsLoadingHistory(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/history`, { headers });
        if (!res.ok) {
          // Session might not exist yet – keep welcome message
          return;
        }
        const data: { role: string; content: string }[] = await res.json();
        if (cancelled) return;

        if (data.length === 0) {
          setMessages([WELCOME_PROMPT_MESSAGE]);
        } else {
          const loaded: Message[] = data.map((m, i) => ({
            id: `hist-${i}`,
            role: m.role === 'user' ? 'user' : 'agent',
            content: m.content,
          }));
          setMessages(loaded);
        }
      } catch (err) {
        console.error('Failed to load session history:', err);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [sessionId, authHeaders]);

  // ---------------------------------------------------------------------------
  // Send a message
  // ---------------------------------------------------------------------------
  const submitPrompt = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setStatusMessage('Agency is thinking...');

    const agentMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: agentMessageId, role: 'agent', content: '' }
    ]);

    try {
      const headers = await authHeaders();
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          message: newUserMessage.content,
          model: selectedModelRef.current || selectedModel,
        }),
      });

      if (!response.ok) {
        let errDetail = 'Network response was not ok';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errDetail = errData.detail;
          }
        } catch {
          // Response body was not JSON or already streamed
        }
        throw new Error(errDetail);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) throw new Error('No reader available');

      let done = false;
      let buffer = '';
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  if (currentSessionRef.current === sessionId) {
                    setMessages((prev) => 
                      prev.map((msg) => 
                        msg.id === agentMessageId 
                          ? { ...msg, content: msg.content + data.text } 
                          : msg
                      )
                    );
                  }
                } else if (data.type === 'status') {
                  setStatusMessage(data.text);
                } else if (data.type === 'error') {
                  if (currentSessionRef.current === sessionId) {
                    setMessages((prev) => 
                      prev.map((msg) => 
                        msg.id === agentMessageId 
                          ? { ...msg, content: msg.content + '\n\n**Error:** ' + data.text } 
                          : msg
                      )
                    );
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, line);
              }
            }
          }
        }
      }

      // Notify parent so session list can refresh previews
      onMessageSent?.();
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (currentSessionRef.current === sessionId) {
        const rawMessage = error?.message || '';
        const isQuotaOrLimit = rawMessage.includes('Demo quota reached') || rawMessage.includes('Rate limit exceeded');
        const displayContent = isQuotaOrLimit
          ? rawMessage
          : (rawMessage && rawMessage !== 'Network response was not ok'
              ? `Error: ${rawMessage}`
              : 'Sorry, I encountered an error communicating with the server. Please ensure the backend is running.');

        setMessages((prev) => {
          const placeholderExists = prev.some((m) => m.id === agentMessageId);
          if (placeholderExists) {
            return prev.map((m) =>
              m.id === agentMessageId
                ? { ...m, content: m.content ? `${m.content}\n\n⚠️ ${displayContent}` : `⚠️ ${displayContent}` }
                : m
            );
          }
          return [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'agent',
              content: `⚠️ ${displayContent}`,
            },
          ];
        });
      }
    } finally {
      setIsLoading(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [isLoading, sessionId, authHeaders, onMessageSent, selectedModel]);


  const handleSubmit = async () => {
    const text = inputValue;
    setInputValue('');
    await submitPrompt(text);
  };

  // Listen for sidebar tool clicks
  useEffect(() => {
    const handleSendPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      submitPrompt(customEvent.detail);
    };
    window.addEventListener('send-prompt', handleSendPrompt);
    return () => window.removeEventListener('send-prompt', handleSendPrompt);
  }, [submitPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Poll for pending human-in-the-loop approvals when the agent is loading/thinking
  useEffect(() => {
    if (!isLoading) {
      setPendingApprovals([]);
      return;
    }

    let active = true;
    const pollApprovals = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/approvals`, { headers });
        if (res.ok && active) {
          const data = await res.json();
          setPendingApprovals(data || []);
        }
      } catch (err) {
        console.error('Failed to poll pending approvals:', err);
      }
    };

    pollApprovals(); // run immediately
    const interval = setInterval(pollApprovals, 2000); // poll every 2 seconds

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isLoading, sessionId, authHeaders]);

  const handleApprovalResponse = async (approvalId: string, response: 'approve' | 'reject') => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/approvals/${approvalId}/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ response }),
      });
      if (res.ok) {
        // Optimistically update the status to trigger disable/hidden state in UI
        setPendingApprovals((prev) =>
          prev.map((app) => (app.id === approvalId ? { ...app, status: response === 'approve' ? 'approved' : 'rejected' } : app))
        );
      }
    } catch (err) {
      console.error('Failed to submit approval response:', err);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-history">
        {isLoadingHistory ? (
          <div className="history-loading">
            <Loader2 size={24} className="spin-icon" />
            <span>Loading conversation…</span>
          </div>
        ) : (
          <>
            {messages.filter(m => !(m.role === 'agent' && !m.content)).map((message) => (
              <div key={message.id} className={`message-wrapper ${message.role}`}>
                <div className="message-sender" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {message.role === 'user' ? (
                    <>User <User size={12} /></>
                  ) : (
                    <><Bot size={12} /> Director Agent</>
                  )}
                </div>
                <div className="message-content markdown-body">
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {/* Quick Action Starter Prompts (shown before the user sends their first message) */}
            {!messages.some(m => m.role === 'user') && (
              <div className="starter-prompts-section" style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                <div className="starter-prompts-label">
                  <span>Try one of these live starter prompts:</span>
                </div>
                <div className="starter-prompts-grid">
                  <button 
                    className="starter-chip"
                    onClick={() => submitPrompt("Research recent developments in autonomous multi-agent AI frameworks and summarize key findings with sources.")}
                  >
                    <Search size={15} />
                    <span>Research autonomous multi-agent frameworks</span>
                    <ArrowRight size={14} className="chip-arrow" />
                  </button>

                  <button 
                    className="starter-chip"
                    onClick={() => submitPrompt("Scrape and summarize the top stories from https://news.ycombinator.com")}
                  >
                    <Globe size={15} />
                    <span>Scrape and summarize Hacker News top stories</span>
                    <ArrowRight size={14} className="chip-arrow" />
                  </button>

                  <button 
                    className="starter-chip"
                    onClick={() => submitPrompt("Explain how Human-in-the-Loop safety approval gates prevent runaway actions in enterprise agent deployments.")}
                  >
                    <ShieldCheck size={15} />
                    <span>How Human-in-the-Loop approval gates work</span>
                    <ArrowRight size={14} className="chip-arrow" />
                  </button>

                  <button 
                    className="starter-chip"
                    onClick={() => submitPrompt("How do we configure custom sub-agent personas and connect proprietary databases via MCP for our company?")}
                  >
                    <Database size={15} />
                    <span>How to deploy custom sub-agents for enterprise</span>
                    <ArrowRight size={14} className="chip-arrow" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {isLoading && (
          <div className="loading-wrapper">
            <Loader2 size={16} className="spin-icon" />
            <div className="loading-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
            <span className="loading-text">{statusMessage}</span>
          </div>
        )}

        {pendingApprovals.length > 0 && (
          <div className="pending-approvals-container">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="approval-card slide-in-bottom">
                <div className="approval-card-header">
                  <Database size={16} className="text-yellow-400" style={{ color: '#fbbf24' }} />
                  <h4>Safety Gate: Human-in-the-Loop Approval Required</h4>
                </div>
                <div className="approval-card-body">
                  <p>
                    The agent is requesting permission to execute:
                    <strong> {approval.action.replace(/_/g, ' ').toUpperCase()}</strong> on target type <strong>{approval.target_type}</strong>.
                  </p>
                  {approval.details && Object.keys(approval.details).length > 0 && (
                    <div className="approval-details">
                      <span className="details-title">Payload parameters:</span>
                      <pre>{JSON.stringify(approval.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
                <div className="approval-card-actions">
                  <button 
                    className="approve-btn" 
                    onClick={() => handleApprovalResponse(approval.id, 'approve')}
                    disabled={approval.status !== 'pending'}
                  >
                    Confirm &amp; Execute
                  </button>
                  <button 
                    className="reject-btn" 
                    onClick={() => handleApprovalResponse(approval.id, 'reject')}
                    disabled={approval.status !== 'pending'}
                  >
                    Reject &amp; Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message, ask how to deploy for enterprise, or pick a starter prompt above..."
            rows={1}
            disabled={isLoading}
          />
          <button 
            className="send-button"
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
