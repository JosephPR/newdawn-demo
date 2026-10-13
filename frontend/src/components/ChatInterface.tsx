import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Database, Users, Sparkles } from 'lucide-react';
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

export function ChatInterface({ sessionId, selectedModel, onMessageSent }: ChatInterfaceProps) {
  const { getIdToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
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
      setMessages([]);
      setIsLoadingHistory(true);
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/history`, { headers });
        if (!res.ok) {
          // Session might not exist yet – that's fine, start fresh
          return;
        }
        const data: { role: string; content: string }[] = await res.json();
        if (cancelled) return;

        const loaded: Message[] = data.map((m, i) => ({
          id: `hist-${i}`,
          role: m.role === 'user' ? 'user' : 'agent',
          content: m.content,
        }));
        setMessages(loaded);
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
        throw new Error('Network response was not ok');
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
    } catch (error) {
      console.error('Error sending message:', error);
      if (currentSessionRef.current === sessionId) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: 'Sorry, I encountered an error communicating with the server. Please ensure the backend is running.',
        };
        setMessages((prev) => [...prev, errorMessage]);
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
        ) : messages.length === 0 ? (
          <div className="hero-section">
            <div className="hero-badge">
              <Sparkles size={16} /> Multi-Agent Assistant
            </div>
            <h1 className="hero-title">How can I help you today?</h1>
            <p className="hero-subtitle">I'm your AI orchestrator, ready to coordinate tasks and assist with your workflow.</p>
            
            <div className="tools-grid">
              <div className="tool-card" onClick={() => submitPrompt("What capabilities and tools are currently available?")} style={{cursor: "pointer"}}>
                <div className="tool-icon-wrapper prop-icon">
                  <Database size={24} />
                </div>
                <div className="tool-info">
                  <h3>Explore Capabilities</h3>
                  <p>Discover active tools, registered agents, and system integrations.</p>
                </div>
              </div>
              
              <div className="tool-card" onClick={() => submitPrompt("Help me coordinate a new task workflow.")} style={{cursor: "pointer"}}>
                <div className="tool-icon-wrapper user-icon">
                  <Users size={24} />
                </div>
                <div className="tool-info">
                  <h3>Start a Workflow</h3>
                  <p>Delegate multi-step tasks across specialized agents and external services.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.filter(m => !(m.role === 'agent' && !m.content)).map((message) => (
            <div key={message.id} className={`message-wrapper ${message.role}`}>
              <div className="message-sender" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                {message.role === 'user' ? (
                  <>User <User size={12} /></>
                ) : (
                  <><Bot size={12} /> Agent</>
                )}
              </div>
              <div className="message-content markdown-body">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          ))
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
            placeholder="Type your message here... (Shift+Enter for new line)"
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
