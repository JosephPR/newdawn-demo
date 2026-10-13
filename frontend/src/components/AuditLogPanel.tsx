import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Clock, Database, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface AuditLogEntry {
  id: string | number;
  timestamp: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any> | null;
  status: 'success' | 'failure';
}

interface AuditLogPanelProps {
  onClose: () => void;
  authHeaders: () => Promise<Record<string, string>>;
}

export function AuditLogPanel({ onClose, authHeaders }: AuditLogPanelProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const fetchAuditLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/audit-log?limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  // Fetch immediately on mount
  useEffect(() => {
    fetchAuditLog();
    
    // Auto-polling interval: check for updates every 5 seconds
    const interval = setInterval(fetchAuditLog, 5000);
    return () => clearInterval(interval);
  }, [fetchAuditLog]);

  const toggleExpand = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatActionName = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="audit-panel">
      <div className="audit-panel-header">
        <div className="audit-panel-title">
          <Database size={18} className="text-[#f472b6]" />
          <span>System Audit Log</span>
        </div>
        <div className="audit-panel-actions">
          <button 
            className={`audit-refresh-btn ${isLoading ? 'spinning' : ''}`}
            onClick={fetchAuditLog}
            title="Refresh logs"
            disabled={isLoading}
          >
            <RefreshCw size={14} />
          </button>
          <button className="audit-close-btn" onClick={onClose} title="Close panel">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="audit-panel-body">
        {entries.length === 0 ? (
          <div className="audit-empty-state">
            <Clock size={36} className="text-muted mb-2" />
            <p>No operations logged yet.</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Any creates, updates, or actions logged by the AI will appear here in real time.
            </span>
          </div>
        ) : (
          <div className="audit-timeline">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const isSuccess = entry.status === 'success';
              
              return (
                <div 
                  key={entry.id} 
                  className={`audit-card ${isExpanded ? 'expanded' : ''} ${entry.status}`}
                >
                  <div className="audit-card-summary" onClick={() => toggleExpand(entry.id)}>
                    <div className="audit-card-icon-col">
                      {isSuccess ? (
                        <CheckCircle2 size={16} className="text-green-400" style={{ color: '#4ade80' }} />
                      ) : (
                        <AlertTriangle size={16} className="text-red-400" style={{ color: '#f87171' }} />
                      )}
                    </div>
                    
                    <div className="audit-card-info-col">
                      <div className="audit-action-header">
                        <span className="audit-action-name">
                          {formatActionName(entry.action)}
                        </span>
                        <span className="audit-time">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                      
                      <div className="audit-action-meta">
                        <span className="audit-target-badge">
                          {entry.target_type}
                        </span>
                        {entry.target_id && (
                          <span className="audit-target-id">
                            ID: {entry.target_id}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="audit-card-expand-col">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="audit-card-details">
                      <div className="audit-detail-row">
                        <User size={12} className="text-muted" />
                        <span className="audit-detail-label">Triggered by User:</span>
                        <code className="audit-detail-value">{entry.user_id}</code>
                      </div>
                      
                      {entry.details && (
                        <div className="audit-json-details">
                          <span className="audit-detail-label d-block mb-1">Payload parameters:</span>
                          <pre className="audit-json-code">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
