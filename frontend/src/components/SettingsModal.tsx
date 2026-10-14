import { useState, useEffect } from 'react';
import { X, Save, Key, Cpu, Globe, Check, AlertCircle, Plus, Trash2, Database, Server } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export interface CustomConnection {
  id: string;
  name: string;
  type: 'mcp_url' | 'api_key';
  url_or_key: string;
  description?: string;
  enabled?: boolean;
}

interface SettingsModalProps {
  onClose: () => void;
  authHeaders: () => Promise<Record<string, string>>;
}

export function SettingsModal({ onClose, authHeaders }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'tools'>('models');
  
  // Model provider credentials
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [xaiKey, setXaiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');

  // Tools & External integrations
  const [serviceKey, setServiceKey] = useState('');
  const [zapierUrl, setZapierUrl] = useState('');

  // Dynamic Multiple MCP / Service Key Connections
  const [customConnections, setCustomConnections] = useState<CustomConnection[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConnName, setNewConnName] = useState('');
  const [newConnType, setNewConnType] = useState<'mcp_url' | 'api_key'>('mcp_url');
  const [newConnValue, setNewConnValue] = useState('');
  const [newConnDesc, setNewConnDesc] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/settings`, { headers });
        if (res.ok) {
          const data = await res.json();
          setOpenaiKey(data.openai_api_key || '');
          setAnthropicKey(data.anthropic_api_key || '');
          setGroqKey(data.groq_api_key || '');
          setXaiKey(data.xai_api_key || '');
          setDeepseekKey(data.deepseek_api_key || '');
          setOllamaUrl(data.ollama_api_base || '');
          setServiceKey(data.service_api_key || '');
          setZapierUrl(data.zapier_mcp_url || '');
          if (data.custom_connections && Array.isArray(data.custom_connections)) {
            setCustomConnections(data.custom_connections);
          }
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [authHeaders]);

  const handleAddConnection = () => {
    if (!newConnName.trim() || !newConnValue.trim()) return;
    const newConn: CustomConnection = {
      id: `conn-${Date.now()}`,
      name: newConnName.trim(),
      type: newConnType,
      url_or_key: newConnValue.trim(),
      description: newConnDesc.trim(),
      enabled: true,
    };
    setCustomConnections((prev) => [...prev, newConn]);
    setNewConnName('');
    setNewConnValue('');
    setNewConnDesc('');
    setShowAddForm(false);
  };

  const handleRemoveConnection = (id: string) => {
    setCustomConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleConnection = (id: string) => {
    setCustomConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !(c.enabled ?? true) } : c))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openai_api_key: openaiKey,
          anthropic_api_key: anthropicKey,
          groq_api_key: groqKey,
          xai_api_key: xaiKey,
          deepseek_api_key: deepseekKey,
          ollama_api_base: ollamaUrl,
          service_api_key: serviceKey,
          zapier_mcp_url: zapierUrl,
          custom_connections: customConnections,
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Settings & MCP connections saved successfully!', type: 'success' });
        setTimeout(() => onClose(), 1200);
      } else {
        setMessage({ text: 'Failed to save settings. Please try again.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error saving settings.', type: 'error' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(15, 23, 42, 0.65)',
    color: '#f8fafc',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.35rem',
    fontSize: '0.82rem',
    fontWeight: 500,
    color: '#cbd5e1',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(8px)', padding: '1rem',
    }}>
      <div style={{
        background: '#0f172a',
        padding: '1.75rem',
        borderRadius: '16px',
        width: '580px',
        maxWidth: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} color="#38bdf8" />
              Configuration & Keys
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Manage model credentials and external tool integrations
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '1.25rem',
          paddingBottom: '0.5rem',
        }}>
          <button
            onClick={() => setActiveTab('models')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: activeTab === 'models' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'models' ? '#38bdf8' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Key size={14} />
            Model Providers
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: activeTab === 'tools' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'tools' ? '#38bdf8' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Globe size={14} />
            External Tools & MCP
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading settings...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeTab === 'models' ? (
              <>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.6rem 0.75rem', borderRadius: '8px' }}>
                  Google Gemini is configured by default via the server. You can provide your own API keys below to unlock OpenAI, Anthropic, or open-source inference.
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>OpenAI API Key</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>GPT-6 Astra, Sol, Luna</span>
                  </label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>Anthropic API Key</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Claude Opus 5.5, Sonnet 5.5</span>
                  </label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>Groq API Key (Optional)</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Llama 3.3 70B & Fast LPUs</span>
                  </label>
                  <input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>xAI (Grok) API Key (Optional)</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Grok 4.7, 4.6</span>
                  </label>
                  <input
                    type="password"
                    value={xaiKey}
                    onChange={(e) => setXaiKey(e.target.value)}
                    placeholder="xai-..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>DeepSeek / Cloud API Key (Optional)</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>DeepSeek-V4.1, GLM-5.3</span>
                  </label>
                  <input
                    type="password"
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    placeholder="sk-..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <span>Ollama Endpoint (Local Models)</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Qwen 3.8, Nemotron 3.5, Muse</span>
                  </label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    style={inputStyle}
                  />
                </div>

              </>
            ) : (
              <>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '10px',
                  lineHeight: 1.5,
                }}>
                  Connect your private databases (PostgreSQL, BigQuery, Snowflake) or internal APIs via Model Context Protocol (MCP). You can add multiple endpoints and service API keys below.
                </div>

                {/* Primary Default Connectors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={labelStyle}>
                      <span>Default Zapier MCP URL</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Primary Workspace Bridge</span>
                    </label>
                    <input 
                      type="text"
                      value={zapierUrl}
                      onChange={(e) => setZapierUrl(e.target.value)}
                      placeholder="https://mcp.zapier.com/api/v1/connect?token=..."
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Default Service API Key</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Internal Service Bearer Token</span>
                    </label>
                    <input 
                      type="password"
                      value={serviceKey}
                      onChange={(e) => setServiceKey(e.target.value)}
                      placeholder="sk-..."
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Multiple Custom MCP Connections Section */}
                <div style={{
                  marginTop: '0.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Database size={15} color="#38bdf8" />
                        <span>Enterprise MCP & Service Connections</span>
                        <span style={{
                          fontSize: '0.7rem',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '12px',
                          fontWeight: 700,
                        }}>
                          {customConnections.length}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Postgres, BigQuery, Snowflake, and internal microservice endpoints
                      </div>
                    </div>

                    {!showAddForm && (
                      <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '7px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Plus size={13} />
                        Add Connection
                      </button>
                    )}
                  </div>

                  {/* Add Connection Form Card */}
                  {showAddForm && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>New MCP Endpoint / Service Key</span>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                            Connection Name
                          </label>
                          <input
                            type="text"
                            value={newConnName}
                            onChange={(e) => setNewConnName(e.target.value)}
                            placeholder="e.g. Postgres Warehouse MCP"
                            style={{ ...inputStyle, padding: '0.5rem 0.7rem', fontSize: '0.8rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                            Connection Type
                          </label>
                          <select
                            value={newConnType}
                            onChange={(e) => setNewConnType(e.target.value as 'mcp_url' | 'api_key')}
                            style={{
                              ...inputStyle,
                              padding: '0.5rem 0.7rem',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="mcp_url" style={{ background: '#0f172a' }}>MCP Server URL (SSE / HTTP)</option>
                            <option value="api_key" style={{ background: '#0f172a' }}>Service API Key / Token</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          {newConnType === 'mcp_url' ? 'MCP Server Endpoint URL' : 'API Key / Secret Token'}
                        </label>
                        <input
                          type={newConnType === 'mcp_url' ? 'text' : 'password'}
                          value={newConnValue}
                          onChange={(e) => setNewConnValue(e.target.value)}
                          placeholder={newConnType === 'mcp_url' ? 'https://mcp.internal.corp/sse' : 'sk-svc-...'}
                          style={{ ...inputStyle, padding: '0.5rem 0.7rem', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ ...labelStyle, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={newConnDesc}
                          onChange={(e) => setNewConnDesc(e.target.value)}
                          placeholder="e.g. Read-only PostgreSQL replica for analytics queries"
                          style={{ ...inputStyle, padding: '0.5rem 0.7rem', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            padding: '0.4rem 0.8rem',
                            color: '#94a3b8',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddConnection}
                          disabled={!newConnName.trim() || !newConnValue.trim()}
                          style={{
                            background: '#0284c7',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.4rem 0.85rem',
                            color: '#fff',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: (!newConnName.trim() || !newConnValue.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (!newConnName.trim() || !newConnValue.trim()) ? 0.6 : 1,
                          }}
                        >
                          Add to Configuration
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Configured Connections */}
                  {customConnections.length === 0 && !showAddForm ? (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '1.25rem 1rem',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '0.8rem',
                    }}>
                      No custom MCP connections added yet. Click <strong>+ Add Connection</strong> to attach PostgreSQL, BigQuery, Snowflake, or custom service APIs.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {customConnections.map((conn) => (
                        <div
                          key={conn.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${conn.enabled ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            opacity: conn.enabled ? 1 : 0.6,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '7px',
                              background: conn.type === 'mcp_url' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                              color: conn.type === 'mcp_url' ? '#38bdf8' : '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {conn.type === 'mcp_url' ? <Server size={16} /> : <Key size={16} />}
                            </div>

                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                                  {conn.name}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  background: conn.type === 'mcp_url' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                  color: conn.type === 'mcp_url' ? '#38bdf8' : '#fbbf24',
                                }}>
                                  {conn.type === 'mcp_url' ? 'MCP URL' : 'API KEY'}
                                </span>
                              </div>

                              <div style={{
                                fontSize: '0.72rem',
                                color: '#94a3b8',
                                fontFamily: 'monospace',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                maxWidth: '320px',
                                marginTop: '0.15rem',
                              }}>
                                {conn.type === 'api_key'
                                  ? `${conn.url_or_key.slice(0, 6)}••••••••`
                                  : conn.url_or_key}
                              </div>

                              {conn.description && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                                  {conn.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleConnection(conn.id)}
                              title={conn.enabled ? 'Click to disable' : 'Click to enable'}
                              style={{
                                background: conn.enabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${conn.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                color: conn.enabled ? '#4ade80' : '#64748b',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.25rem 0.5rem',
                                borderRadius: '5px',
                                cursor: 'pointer',
                              }}
                            >
                              {conn.enabled ? 'Active' : 'Paused'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveConnection(conn.id)}
                              title="Delete connection"
                              style={{
                                background: 'rgba(244, 63, 94, 0.1)',
                                border: '1px solid rgba(244, 63, 94, 0.2)',
                                color: '#fb7185',
                                padding: '0.3rem',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {message && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: message.type === 'success' ? '#34d399' : '#fb7185',
                border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              }}>
                {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}

            <button 
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer',
                marginTop: '0.5rem', transition: 'opacity 0.2s', opacity: saving ? 0.7 : 1,
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

