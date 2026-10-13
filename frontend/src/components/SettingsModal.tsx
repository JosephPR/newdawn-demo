import { useState, useEffect } from 'react';
import { X, Save, Key, Cpu, Globe, Check, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

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
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [authHeaders]);

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
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Settings saved successfully!', type: 'success' });
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
        width: '520px',
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
                <div>
                  <label style={labelStyle}>
                    <span>Service API Key (Optional)</span>
                  </label>
                  <input 
                    type="password"
                    value={serviceKey}
                    onChange={(e) => setServiceKey(e.target.value)}
                    placeholder="sk-..."
                    style={inputStyle}
                  />
                </div>
                
                <div>
                  <label style={labelStyle}>
                    <span>Zapier MCP URL</span>
                  </label>
                  <input 
                    type="text"
                    value={zapierUrl}
                    onChange={(e) => setZapierUrl(e.target.value)}
                    placeholder="https://nla.zapier.com/mcp/..."
                    style={inputStyle}
                  />
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

