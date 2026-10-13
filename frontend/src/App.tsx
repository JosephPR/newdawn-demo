import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, MessageSquare, Menu, Database, Wrench, Activity, Sparkles, Plus, Trash2, History, BarChart2, LogOut, ChevronDown, ChevronUp, Settings, Globe, Zap, Search } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
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

/**
 * Inner app that uses auth context — rendered only when authenticated.
 */
function AuthenticatedApp() {
  const { user, signOut, getIdToken } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState<boolean>(false);
  const [showKPIs, setShowKPIs] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showLandingView, setShowLandingView] = useState<boolean>(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-pro-preview');
  const kpiDropdownRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<{
    successful_actions: number;
    total_actions: number;
  }>({ successful_actions: 0, total_actions: 0 });

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
  // Fetch dynamic stats metrics for the authenticated user
  // ---------------------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch agency stats:', err);
    }
  }, [authHeaders]);

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
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/models`, { headers });
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
  }, [authHeaders]);

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
  // Create a brand-new session via the backend
  // ---------------------------------------------------------------------------
  const createNewSession = useCallback(async () => {
    setIsCreating(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: selectedModel }),
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
  }, [authHeaders, refreshSessions, selectedModel]);

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
  // Poll dynamic KPI stats periodically.
  // Uses a ref so the interval doesn't remount when authHeaders changes.
  // ---------------------------------------------------------------------------
  const fetchStatsRef = useRef(fetchStats);
  fetchStatsRef.current = fetchStats;

  useEffect(() => {
    // Initial fetch
    fetchStatsRef.current();
    const interval = setInterval(() => fetchStatsRef.current(), 30_000);
    return () => clearInterval(interval);
  }, []); // stable — never remounts

  // Click outside handler for the KPI metrics dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (kpiDropdownRef.current && !kpiDropdownRef.current.contains(event.target as Node)) {
        setShowKPIs(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
            <span>Multi-Agent Starter</span>
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
                          {s.model ? `${s.model.split('/')[1] || s.model} · ` : ''}
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
          
          <div className="sidebar-tool">
            <div className="tool-icon zapier">
              <Search size={16} />
            </div>
            <div className="tool-text">
              <span className="tool-name">Google Search</span>
              <span className="tool-desc">Live web grounding</span>
            </div>
          </div>

          <div className="sidebar-tool">
            <div className="tool-icon zapier">
              <Globe size={16} />
            </div>
            <div className="tool-text">
              <span className="tool-name">Web Scraper</span>
              <span className="tool-desc">Full-page URL reader</span>
            </div>
          </div>

          <div className="sidebar-tool">
            <div className="tool-icon zapier">
              <Zap size={16} />
            </div>
            <div className="tool-text">
              <span className="tool-name">Zapier MCP</span>
              <span className="tool-desc">External actions</span>
            </div>
          </div>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
            {/* Collapsible KPI Dropdown Container */}
            <div ref={kpiDropdownRef} style={{ position: 'relative' }}>
              <button 
                className={`kpi-toggle-btn ${showKPIs ? 'active' : ''}`}
                onClick={() => setShowKPIs(!showKPIs)}
                title="Toggle KPI Metrics"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: showKPIs ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: showKPIs ? '#818cf8' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <BarChart2 size={14} />
                <span>Metrics</span>
                {showKPIs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              {showKPIs && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  background: 'rgba(10, 10, 20, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4), 0 0 20px rgba(249, 115, 22, 0.15)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  zIndex: 100,
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    Agency Performance
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Successful Actions */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <Sparkles size={12} className="text-[#10b981]" />
                          <span>Successful Operations</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Approved actions</div>
                      </div>
                      <div className="text-glow-green" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.successful_actions || 0}</div>
                    </div>

                    {/* Total Activity Logs */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <Activity size={12} className="text-[#fbbf24]" />
                          <span>Total Log Events</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Firestore audit trail</div>
                      </div>
                      <div className="text-glow-yellow" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stats.total_actions}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              className={`audit-toggle-btn ${showAuditTrail ? 'active' : ''}`}
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              title="Toggle Audit Log"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
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
              <span>{showAuditTrail ? 'Hide Audit Log' : 'Show Audit Log'}</span>
            </button>
            
            <button 
              className={`audit-toggle-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(true)}
              title="Settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
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
              className={`audit-toggle-btn ${showLandingView ? 'active' : ''}`}
              onClick={() => setShowLandingView(!showLandingView)}
              title="View Architecture & Client Showcase"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: showLandingView ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: showLandingView ? '#f97316' : 'var(--text-secondary)',
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

            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }}></span>
              System Online
            </div>
          </div>
        </header>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {showLandingView ? (
            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
              <LandingPage onBackToWorkspace={() => setShowLandingView(false)} />
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
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
 * Gate component — shows LoginPage until authenticated, then the full app.
 */
function AppGate() {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

export default App;
