import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Sparkles, 
  Cpu, 
  Check, 
  Plus, 
  Terminal,
  Zap,
  Bot,
  Globe
} from 'lucide-react';

export interface ModelOption {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'cloud' | 'open_source' | string;
  description: string;
  is_default?: boolean;
}

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  compact?: boolean;
}

export function ModelSelector({
  models,
  selectedModelId,
  onSelectModel,
  compact = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find active model or treat as custom
  const activeModel = models.find((m) => m.id === selectedModelId) || {
    id: selectedModelId,
    name: selectedModelId || 'Select Model',
    provider: selectedModelId.split('/')[0] || 'custom',
    description: 'Custom configured model',
  };

  const getProviderBadge = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return {
          label: 'Google',
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.3)',
          icon: <Sparkles size={13} />,
        };
      case 'openai':
        return {
          label: 'OpenAI (GPT-6)',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          icon: <Bot size={13} />,
        };
      case 'anthropic':
        return {
          label: 'Anthropic (Claude 5.5)',
          color: '#f97316',
          bg: 'rgba(249, 115, 22, 0.12)',
          border: 'rgba(249, 115, 22, 0.3)',
          icon: <Zap size={13} />,
        };
      case 'xai':
      case 'grok':
        return {
          label: 'xAI (Grok 4.7)',
          color: '#f43f5e',
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.3)',
          icon: <Bot size={13} />,
        };
      case 'groq':
        return {
          label: 'Groq (LPU Speed)',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: <Zap size={13} />,
        };
      case 'cloud':
        return {
          label: 'Frontier Cloud',
          color: '#ec4899',
          bg: 'rgba(236, 72, 153, 0.12)',
          border: 'rgba(236, 72, 153, 0.3)',
          icon: <Globe size={13} />,
        };
      case 'open_source':
      case 'ollama':
      case 'deepseek':
      default:
        return {
          label: 'Local & Open-Weight',
          color: '#a855f7',
          bg: 'rgba(168, 85, 247, 0.12)',
          border: 'rgba(168, 85, 247, 0.3)',
          icon: <Cpu size={13} />,
        };
    }
  };

  const activeBadge = getProviderBadge(activeModel.provider);

  // Group models by provider
  const groupedModels = {
    google: models.filter((m) => m.provider === 'google'),
    openai: models.filter((m) => m.provider === 'openai'),
    anthropic: models.filter((m) => m.provider === 'anthropic'),
    xai: models.filter((m) => m.provider === 'xai'),
    groq: models.filter((m) => m.provider === 'groq'),
    cloud: models.filter((m) => m.provider === 'cloud'),
    open_source: models.filter((m) => m.provider === 'open_source'),
  };


  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customModelInput.trim()) {
      onSelectModel(customModelInput.trim());
      setIsOpen(false);
      setShowCustomInput(false);
      setCustomModelInput('');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: compact ? '0.35rem 0.65rem' : '0.45rem 0.85rem',
          borderRadius: '10px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#f8fafc',
          cursor: 'pointer',
          fontSize: '0.825rem',
          fontWeight: 500,
          backdropFilter: 'blur(12px)',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(56, 189, 248, 0.3)' : 'none',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.15rem 0.4rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: activeBadge.color,
            background: activeBadge.bg,
            border: `1px solid ${activeBadge.border}`,
          }}
        >
          {activeBadge.icon}
          {activeBadge.label}
        </span>
        <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeModel.name}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            color: '#94a3b8', 
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            maxHeight: '440px',
            overflowY: 'auto',
            background: '#090d16',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(56, 189, 248, 0.1)',
            zIndex: 9999,
            padding: '0.6rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
              Select Active Intelligence Model
            </div>
          </div>

          {/* Model Groups */}
          {(['google', 'openai', 'anthropic', 'xai', 'groq', 'cloud', 'open_source'] as const).map((groupKey) => {
            const list = groupedModels[groupKey];

            if (!list || list.length === 0) return null;
            const badge = getProviderBadge(groupKey);

            return (
              <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  padding: '0.3rem 0.5rem', 
                  fontSize: '0.72rem', 
                  fontWeight: 600, 
                  color: badge.color,
                  letterSpacing: '0.04em',
                }}>
                  {badge.icon}
                  {badge.label}
                </div>

                {list.map((m) => {
                  const isSelected = m.id === selectedModelId;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        onSelectModel(m.id);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '0.5rem 0.6rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                        transition: 'background 0.15s ease',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: isSelected ? '#38bdf8' : '#f1f5f9' }}>
                            {m.name}
                          </span>
                          {m.is_default && (
                            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 600 }}>
                              Default
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.2' }}>
                          {m.description}
                        </span>
                      </div>

                      {isSelected && (
                        <Check size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Custom Model Input Option */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.5rem' }}>
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                Enter Custom Model Identifier
              </button>
            ) : (
              <form onSubmit={handleApplyCustom} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Terminal size={12} color="#38bdf8" />
                  <span>Custom Model (e.g. <code>ollama/mistral</code>):</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    placeholder="provider/model-name"
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '6px',
                      background: '#0284c7',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
