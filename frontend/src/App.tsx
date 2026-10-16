import { useState, useEffect, useCallback } from 'react';
import { Box, MessageSquare, Menu, Database, Wrench, Plus, Trash2, History, LogOut, Settings, Globe, Zap, Search } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { AuditLogPanel } from './components/AuditLogPanel';
import { SettingsModal } from './components/SettingsModal';
import { ModelSelector, type ModelOption } from './components/ModelSelector';

import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const STORAGE_KEY = 'multi_agent_starter_session_id';

interface SessionInfo {
  session_id: string;
  user_id: string;
  created_at: string | null;
  last_update: string | null;
  message_count: number;
  preview: string;
  model?: string | null;
}

interface AuthenticatedAppProps {
  onNavigateToShowcase: () => void;
}

const DEFAULT_MODEL = 'gemini-3.1-pro-preview';

/**
 * Inner app that uses auth context — rendered only when authenticated.
 */
function AuthenticatedApp({ onNavigateToShowcase }: AuthenticatedAppProps) {
  const { user, signOut, getIdToken } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  // ---------------------------------------------------------------------------
  // Helper: build auth headers for API calls
  // ---------------------------------------------------------------------------
  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, [getIdToken]);



  // ---------------------------------------------------------------------------
  // Fetch the list of sessions from the backend
  // ---------------------------------------------------------------------------
  const refreshSessions = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/sessions`, { headers });
      if (res.ok) {
        const data: SessionInfo[] = await res.json();
        setSessions(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
    return [];
  }, [authHeaders]);

  // ---------------------------------------------------------------------------
  // Fetch supported model options catalog
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch(`${API_BASE}/models`);
        if (res.ok) {
          const data: ModelOption[] = await res.json();
          setModels(data);
          const defaultOpt = data.find((m) => m.is_default);
          if (defaultOpt) {
            setSelectedModel((prev) => prev || defaultOpt.id);
          }
        }
      } catch (err) {
        console.error('Failed to load model catalog:', err);
      }
    };
    fetchModels();
  }, []);

  // ---------------------------------------------------------------------------
  // Switch to an existing session
  // ---------------------------------------------------------------------------
  const switchSession = useCallback((sid: string, sessionList?: SessionInfo[]) => {
    localStorage.setItem(STORAGE_KEY, sid);
    setCurrentSessionId(sid);
    const listToSearch = sessionList || sessions;
    const match = listToSearch.find((s) => s.session_id === sid);
    if (match?.model) {
      setSelectedModel(match.model);
    } else {
      setSelectedModel(DEFAULT_MODEL);
    }
  }, [sessions]);

  // ---------------------------------------------------------------------------
  // Select active model
  // ---------------------------------------------------------------------------
  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    if (currentSessionId) {
      setSessions((prev) =>
        prev.map((s) => s.session_id === currentSessionId ? { ...s, model: modelId } : s)
      );
    }
  }, [currentSessionId]);


  // ---------------------------------------------------------------------------
  // Create a brand-new session via the backend (defaults to Gemini)
  // ---------------------------------------------------------------------------
  const createNewSession = useCallback(async (forcedModel?: string | React.MouseEvent) => {
    setIsCreating(true);
    const targetModel = typeof forcedModel === 'string' ? forcedModel : DEFAULT_MODEL;
    setSelectedModel(targetModel);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: targetModel }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data: { session_id: string } = await res.json();
      localStorage.setItem(STORAGE_KEY, data.session_id);
      setCurrentSessionId(data.session_id);
      await refreshSessions();
      return data.session_id;
    } catch (err) {
      console.error('Could not create session:', err);
      // Fallback: generate a local UUID
      const fallback = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, fallback);
      setCurrentSessionId(fallback);
      return fallback;
    } finally {
      setIsCreating(false);
    }
  }, [authHeaders, refreshSessions]);

  // ---------------------------------------------------------------------------
  // Delete a session
  // ---------------------------------------------------------------------------
  const deleteSession = useCallback(async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger session switch
    if (!confirm('Delete this conversation?')) return;
    try {
      const headers = await authHeaders();
      await fetch(`${API_BASE}/sessions/${sid}`, { method: 'DELETE', headers });
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
    const updated = await refreshSessions();
    // If we deleted the active session, switch to the most recent or create new
    if (sid === currentSessionId) {
      if (updated.length > 0) {
        switchSession(updated[0].session_id, updated);
      } else {
        await createNewSession();
      }
    }
  }, [currentSessionId, authHeaders, refreshSessions, createNewSession, switchSession]);

  // ---------------------------------------------------------------------------
  // Initialize on mount: restore from localStorage or create first session
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const existing = await refreshSessions();
      const stored = localStorage.getItem(STORAGE_KEY);

      // If stored session still exists in the list, use it
      if (stored && existing.some((s) => s.session_id === stored)) {
        switchSession(stored, existing);
      } else if (existing.length > 0) {
        // Use the most recent session
        switchSession(existing[0].session_id, existing);
      } else {
        // No sessions at all – create one
        await createNewSession();
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Trigger a test prompt or action when clicking a sidebar tool
  // ---------------------------------------------------------------------------
  const handleToolClick = useCallback((toolType: 'search' | 'scraper' | 'zapier') => {
    if (toolType === 'search') {
      window.dispatchEvent(new CustomEvent('send-prompt', {
        detail: 'Use the Google Search Specialist to find recent developments in autonomous AI multi-agent frameworks and summarize key findings.'
      }));
    } else if (toolType === 'scraper') {
      window.dispatchEvent(new CustomEvent('send-prompt', {
        detail: 'Use the Web Scraper agent to inspect https://ai.google.dev and summarize its developer tooling capabilities.'
      }));
    } else if (toolType === 'zapier') {
      setShowSettings(true);
    }
  }, []);




  // Helper to format relative time
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Helper to format model identifier into clean display label
  const formatModelName = (model?: string | null) => {
    if (!model) return '';
    const clean = model.split('/')[1] || model;
    if (clean.includes('gemini-3.1-pro')) return 'Gemini Pro';
    if (clean.includes('gemini-3.8-flash')) return 'Gemini Flash';
    if (clean.includes('gpt-4o')) return 'GPT-4o';
    if (clean.includes('claude-3-7')) return 'Claude 3.7';
    if (clean.includes('claude-3-5')) return 'Claude 3.5';
    if (clean.includes('deepseek')) return 'DeepSeek';
    return clean.replace('-preview', '').replace('-latest', '');
  };

  return (
    <div className="app-container">
      {/* Animated Background */}
      <div className="background-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      
      {/* Sidebar Layout */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Box size={24} className="text-[var(--brand-primary)]" />
            <span>New Dawn Demo</span>
          </div>
        </div>
      
        <nav className="sidebar-nav">
          {/* ─── Session Management ─── */}
          <button
            className="new-chat-btn"
            onClick={createNewSession}
            disabled={isCreating}
          >
            <Plus size={16} />
            <span>{isCreating ? 'Creating…' : 'New Chat'}</span>
          </button>

          {sessions.length > 0 && (
            <>
              <div className="sidebar-divider"></div>
              <div className="sidebar-section-title">
                <History size={14} /> Conversations
              </div>
              <div className="session-list">
                {sessions.map((s) => (
                  <div
                    key={s.session_id}
                    className={`session-item ${s.session_id === currentSessionId ? 'active' : ''}`}
                    onClick={() => switchSession(s.session_id)}
                    title={s.preview || 'New conversation'}
                  >
                    <div className="session-item-content">
                      <MessageSquare size={14} />
                      <div className="session-item-text">
                        <span className="session-preview">
                          {s.preview || 'New conversation'}
                        </span>
                        <span className="session-meta">
                          {s.model ? `${formatModelName(s.model)} · ` : ''}
                          {s.message_count > 0 ? `${s.message_count} msgs` : 'Empty'}
                          {s.last_update ? ` · ${formatRelativeTime(s.last_update)}` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      className="session-delete-btn"
                      onClick={(e) => deleteSession(s.session_id, e)}
                      title="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="sidebar-divider"></div>

          {/* ─── Navigation ─── */}
          {/* <a href="#" className="nav-item active">
            <MessageSquare size={18} />
            <span>Agent Chat</span>
          </a>
          <a href="#" className="nav-item">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </a>
          <a href="#" className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </a> */}

          <div className="sidebar-divider"></div>
          <div className="sidebar-section-title">
            <Wrench size={14} /> Available Tools
          </div>
          
          <button 
            type="button"
            className="sidebar-tool"
            onClick={() => handleToolClick('search')}
            title="Click to run a live Google Search test prompt in chat"
          >
            <div className="tool-icon search">
              <Search size={16} />
            </div>
            <div className="tool-text">
              <span className="tool-name">Google Search</span>
              <span className="tool-desc">Live web grounding</span>
            </div>
            <span className="tool-action-hint">Test ↗</span>
          </button>

          <button 
            type="button"
            className="sidebar-tool"
            onClick={() => handleToolClick('scraper')}
            title="Click to run a live Web Scraper test prompt in chat"
          >
            <div className="tool-icon scraper">
              <Globe size={16} />
            </div>
            <div className="tool-text">
              <span className="tool-name">Web Scraper</span>
              <span className="tool-desc">Full-page URL reader</span>
            </div>
            <span className="tool-action-hint">Test ↗</span>
          </button>

          <button 
            type="button"
            className="sidebar-tool"
            onClick={() => handleToolClick('zapier')}
            title="Click to open Settings and configure custom MCPs & API keys"
          >
            <div className="tool-icon zapier">
              <Zap size={16} />
            </div>
            <div className="tool-text">
              <span className="tool-name">Zapier & MCPs</span>
              <span className="tool-desc">Connect external APIs</span>
            </div>
            <span className="tool-action-hint">Setup ⚙️</span>
          </button>
        </nav>

        {/* ─── User Profile & Sign-Out ─── */}
        <div className="sidebar-user">
          <img
            className="sidebar-user-avatar"
            src={user?.photoURL || ''}
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.displayName || 'User'}</span>
            <span className="sidebar-user-email">{user?.email || ''}</span>
          </div>
          <button className="sidebar-signout-btn" onClick={signOut} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button className="mobile-menu-btn" style={{ color: 'var(--text-secondary)', display: 'none' }}>
              <Menu size={20} />
            </button>
            <h1 className="header-title">Agent Chat Session</h1>
            <ModelSelector
              models={models}
              selectedModelId={selectedModel}
              onSelectModel={handleSelectModel}
            />

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            <button 
              className={`audit-toggle-btn ${showAuditTrail ? 'active' : ''}`}
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              title="Toggle Audit Log"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: showAuditTrail ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: showAuditTrail ? '#f472b6' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                flexShrink: 0
              }}
            >
              <Database size={14} />
              <span>{showAuditTrail ? 'Hide Logs' : 'Audit Log'}</span>
            </button>
            
            <button 
              className={`audit-toggle-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(true)}
              title="Settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: showSettings ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: showSettings ? '#818cf8' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                flexShrink: 0
              }}
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>

            <button 
              className="audit-toggle-btn"
              onClick={onNavigateToShowcase}
              title="View Architecture & Client Showcase (/showcase)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                flexShrink: 0
              }}
            >
              <Globe size={14} />
              <span>Showcase</span>
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {currentSessionId && (
            <ChatInterface
              key={currentSessionId}
              sessionId={currentSessionId}
              selectedModel={selectedModel}
              onMessageSent={refreshSessions}
            />
          )}

          {showAuditTrail && (
            <AuditLogPanel onClose={() => setShowAuditTrail(false)} authHeaders={authHeaders} />
          )}
          {showSettings && (
            <SettingsModal onClose={() => setShowSettings(false)} authHeaders={authHeaders} />
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Hook to track current pathname and handle client-side routing.
 */
function useCurrentPath() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname.toLowerCase() || '/';
  });

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname.toLowerCase() || '/');
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const navigate = useCallback((to: string) => {
    if (window.location.pathname.toLowerCase() !== to.toLowerCase()) {
      window.history.pushState({}, '', to);
      setCurrentPath(to.toLowerCase());
      window.scrollTo(0, 0);
    }
  }, []);

  return { currentPath, navigate };
}

/**
 * Root App — provides AuthProvider and gates access.
 */
function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

/**
 * Gate component — routes between Showcase landing page and Live App workspace.
 */
function AppGate() {
  const { user, loading } = useAuth();
  const { currentPath, navigate } = useCurrentPath();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="background-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>
        <div className="app-loading-content">
          <Box size={48} style={{ color: '#ef4444' }} />
          <div className="app-loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Workspace endpoint: /app or /workspace
  const isWorkspacePath = currentPath.startsWith('/app') || currentPath.startsWith('/workspace');

  if (isWorkspacePath) {
    if (!user) {
      return (
        <LoginPage 
          onBackToLanding={() => navigate('/')} 
          onSignInSuccess={() => navigate('/app')} 
        />
      );
    }
    return <AuthenticatedApp onNavigateToShowcase={() => navigate('/showcase')} />;
  }

  // Explicit /login endpoint
  if (currentPath === '/login') {
    if (user) {
      navigate('/app');
      return null;
    }
    return (
      <LoginPage 
        onBackToLanding={() => navigate('/')} 
        onSignInSuccess={() => navigate('/app')} 
      />
    );
  }

  // Showcase & Client Landing Page: / or /showcase (and all other paths)
  return (
    <LandingPage
      onBackToWorkspace={user ? () => navigate('/app') : undefined}
      onNavigateToWorkspace={() => navigate('/app')}
    />
  );
}

export default App;
