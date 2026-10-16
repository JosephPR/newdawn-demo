/**
 * LandingPage — Enterprise Multi-Agent System Showcase & Client Portal.
 * 
 * Demonstrates the capabilities, architecture, and business value of the
 * Google ADK multi-agent platform with direct entry into the live workspace.
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Bot, 
  Search, 
  Globe, 
  Zap, 
  ShieldCheck, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Calendar, 
  X, 
  Loader2, 
  TrendingUp, 
  Scale, 
  Building2, 
  ShoppingCart, 
  Code2, 
  Sliders, 
  Workflow, 
  Cpu,
  RotateCcw,
  Check,
  AlertTriangle,
  Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

interface LandingPageProps {
  onSignInSuccess?: () => void;
  onBackToWorkspace?: () => void;
  onNavigateToWorkspace?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onBackToWorkspace, 
  onNavigateToWorkspace, 
  onSignInSuccess 
}) => {
  const { user, signIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'director' | 'research' | 'scrape' | 'zapier'>('director');
  const [selectedIndustry, setSelectedIndustry] = useState<'finance' | 'legal' | 'realestate' | 'ecommerce' | 'saas'>('finance');
  const [govTab, setGovTab] = useState<'hitl' | 'audit' | 'security'>('hitl');
  const [hitlActionStatus, setHitlActionStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Consultation Scoping Intake Form States
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formIndustry, setFormIndustry] = useState<string>(selectedIndustry);
  const [formScope, setFormScope] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Sync form default industry when showcase tab changes
  useEffect(() => {
    setFormIndustry(selectedIndustry);
  }, [selectedIndustry]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim()) return;
    setIsSubmittingForm(true);

    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        company: formCompany.trim(),
        industry: formIndustry,
        scope: formScope.trim(),
        timestamp: new Date().toISOString()
      };

      // Store in client localStorage
      const existing = JSON.parse(localStorage.getItem('scoping_requests') || '[]');
      existing.push(payload);
      localStorage.setItem('scoping_requests', JSON.stringify(existing));

      // Post to backend autonomous intelligence pipeline
      const apiBase = import.meta.env.VITE_API_BASE || '';
      await fetch(`${apiBase}/api/scoping-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {
        // Safe fallback for demo mode
      });

      // Smooth realistic submission animation
      await new Promise(r => setTimeout(r, 600));
      setFormSubmitted(true);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const resetConsultModal = () => {
    setShowConsultModal(false);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormName('');
      setFormEmail('');
      setFormCompany('');
      setFormScope('');
    }, 250);
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError('');
    try {
      await signIn();
      if (onSignInSuccess) {
        onSignInSuccess();
      } else if (onNavigateToWorkspace) {
        onNavigateToWorkspace();
      } else if (onBackToWorkspace) {
        onBackToWorkspace();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      if (!message.includes('popup-closed-by-user')) {
        setAuthError(message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Background glowing ambient orbs */}
      <div className="background-orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Navigation Header */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="brand-badge">
            <div className="brand-icon">
              <Box size={22} />
            </div>
            <div className="brand-text">
              <span className="brand-title">NEW DAWN</span>
              <span className="brand-tag">Agentic Studio</span>
            </div>
          </div>

          <nav className="nav-links">
            <button onClick={() => scrollToSection('customization')} className="nav-link">Your Business</button>
            <button onClick={() => scrollToSection('architecture')} className="nav-link">Architecture</button>
            <button onClick={() => scrollToSection('governance')} className="nav-link">HITL Safety</button>
            <button onClick={() => scrollToSection('capabilities')} className="nav-link">Capabilities</button>
          </nav>

          <div className="nav-actions">
            <button 
              className="btn-secondary-nav"
              onClick={() => setShowConsultModal(true)}
            >
              Book Scoping Call
            </button>

            {user || onBackToWorkspace ? (
              <button 
                className="btn-primary-nav"
                onClick={onNavigateToWorkspace || onBackToWorkspace}
              >
                <span>Open Workspace</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                className="btn-primary-nav"
                onClick={handleSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Connecting…</span>
                  </>
                ) : (
                  <>
                    <span>Launch Live Demo</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          Multi-Agent Intelligence <span className="gradient-text">Engineered for Your Enterprise</span>
        </h1>

        <p className="hero-subtitle">
          Move beyond simple chatbots. New Dawn coordinates specialized autonomous agents that browse live data, 
          extract intelligence, and execute multi-step workflows — protected by strict human approval guardrails 
          and zero vendor lock-in.
        </p>

        {authError && (
          <div className="landing-error-banner">
            <span>{authError}</span>
          </div>
        )}

        <div className="hero-cta-group">
          <button 
            className="hero-btn-primary" 
            onClick={(user || onBackToWorkspace) ? (onNavigateToWorkspace || onBackToWorkspace) : handleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <>
                <Loader2 size={20} className="spin-icon" />
                <span>Signing In…</span>
              </>
            ) : (user || onBackToWorkspace) ? (
              <>
                <span>Open Active Workspace</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>Try Interactive Live Demo</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <button 
            className="hero-btn-secondary" 
            onClick={() => scrollToSection('customization')}
          >
            <Sliders size={18} />
            <span>Explore Industry Solutions</span>
          </button>
        </div>

        {/* Customization Guarantee Value Pills */}
        <div className="hero-custom-pills">
          <div className="pill-item">
            <Bot size={15} />
            <span>Autonomous Agent Teams</span>
          </div>
          <div className="pill-item">
            <Database size={15} />
            <span>Internal APIs & SQL Connectors</span>
          </div>
          <div className="pill-item">
            <ShieldCheck size={15} />
            <span>Human-in-the-Loop Guardrails</span>
          </div>
          <div className="pill-item">
            <Cpu size={15} />
            <span>Zero Model Lock-In</span>
          </div>
        </div>

        {/* Interactive Live Agent Simulation Showcase */}
        <div className="hero-simulation-wrapper">
          <div className="simulation-window">
            <div className="window-header">
              <div className="window-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="window-title">
                <span>agency_orchestrator · live_session_preview</span>
              </div>
              <div className="window-status">
                <span className="status-indicator"></span>
                <span>SSE Streaming Active</span>
              </div>
            </div>

            <div className="simulation-body">
              {/* Directive prompt */}
              <div className="simulation-prompt">
                <div className="prompt-meta">
                  <span className="role-tag user">Enterprise Directive</span>
                  <span className="time-tag">Just now</span>
                </div>
                <p className="prompt-text">
                  "Analyze Q3 market competitors in autonomous logistics, summarize their recent regulatory filings, and draft an executive briefing ready for team distribution."
                </p>
              </div>

              {/* Agent Orchestration Nodes */}
              <div className="orchestration-grid">
                <div 
                  className={`agent-node ${activeTab === 'director' ? 'active' : ''}`}
                  onClick={() => setActiveTab('director')}
                >
                  <div className="node-icon director">
                    <Bot size={18} />
                  </div>
                  <div className="node-info">
                    <span className="node-name">Agency Director</span>
                    <span className="node-desc">Supervisor (Gemini 3.1 Pro / GPT-4o)</span>
                  </div>
                  <span className="node-badge status-routing">Delegating</span>
                </div>

                <div 
                  className={`agent-node ${activeTab === 'research' ? 'active' : ''}`}
                  onClick={() => setActiveTab('research')}
                >
                  <div className="node-icon search">
                    <Search size={18} />
                  </div>
                  <div className="node-info">
                    <span className="node-name">Search Specialist</span>
                    <span className="node-desc">Google Live Web Query</span>
                  </div>
                  <span className="node-badge status-success">8 Sources</span>
                </div>

                <div 
                  className={`agent-node ${activeTab === 'scrape' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scrape')}
                >
                  <div className="node-icon scraper">
                    <Globe size={18} />
                  </div>
                  <div className="node-info">
                    <span className="node-name">Web Scraper Agent</span>
                    <span className="node-desc">DOM & Markdown Extraction</span>
                  </div>
                  <span className="node-badge status-success">Processed</span>
                </div>

                <div 
                  className={`agent-node ${activeTab === 'zapier' ? 'active' : ''}`}
                  onClick={() => setActiveTab('zapier')}
                >
                  <div className="node-icon zapier">
                    <Zap size={18} />
                  </div>
                  <div className="node-info">
                    <span className="node-name">Zapier MCP Toolset</span>
                    <span className="node-desc">Slack, Gmail & Calendar</span>
                  </div>
                  <span className="node-badge status-hitl">HITL Gate</span>
                </div>
              </div>

              {/* Dynamic node detail inspection */}
              <div className="node-detail-card">
                {activeTab === 'director' && (
                  <div className="detail-content">
                    <div className="detail-header">
                      <span className="detail-title">Agency Director Orchestration Plan</span>
                      <span className="model-chip">Model: gemini-3.1-pro-preview</span>
                    </div>
                    <p className="detail-text">
                      Step 1: Dispatched query to <code>search_specialist_agent</code> to index the 5 latest competitor announcements.<br />
                      Step 2: Dispatched targeted URLs to <code>web_scraper_agent</code> to extract 10-K regulatory sections.<br />
                      Step 3: Synthesized structured brief and staged Slack message draft for human confirmation.
                    </p>
                  </div>
                )}

                {activeTab === 'research' && (
                  <div className="detail-content">
                    <div className="detail-header">
                      <span className="detail-title">Search Specialist Output</span>
                      <span className="model-chip">Model: gemini-3.8-flash</span>
                    </div>
                    <p className="detail-text">
                      Indexed 8 real-time domain facts from official press releases, government transportation filings, and corporate newsrooms.
                    </p>
                  </div>
                )}

                {activeTab === 'scrape' && (
                  <div className="detail-content">
                    <div className="detail-header">
                      <span className="detail-title">Web Scraper Agent Output</span>
                      <span className="model-chip">Parser: BeautifulSoup4 + Clean Markdown</span>
                    </div>
                    <p className="detail-text">
                      Sanitized DOM content, stripped scripts, navigation headers, and promotional banners. Clean structured report generated with 4,200 extracted tokens.
                    </p>
                  </div>
                )}

                {activeTab === 'zapier' && (
                  <div className="detail-content hitl-preview">
                    <div className="detail-header">
                      <span className="detail-title">
                        <ShieldCheck size={16} style={{ color: '#f97316' }} />
                        Human-in-the-Loop Safety Gate Intercepted
                      </span>
                      <span className="status-pending-chip">Awaiting Confirmation</span>
                    </div>
                    <p className="detail-text">
                      Action intercepted: <code>slack_send_channel_message</code> to <code>#leadership-briefs</code>. Execution halted until approved by authorized user.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="section-container">
        <div className="section-header">
          <span className="section-badge">System Blueprint</span>
          <h2 className="section-title">Engineered on Google ADK & Cloud Native Scale</h2>
          <p className="section-subtitle">
            A production-ready decoupled architecture that separates agentic reasoning, 
            session state, security enforcement, and streaming user interfaces.
          </p>
        </div>

        <div className="architecture-grid">
          <div className="arch-card">
            <div className="arch-step">01</div>
            <h3>React 19 & SSE Streaming</h3>
            <p>
              Server-Sent Events stream tokens and tool execution steps directly to the browser with microsecond latency.
            </p>
            <ul className="arch-list">
              <li><CheckCircle2 size={16} /> Real-time tool state updates</li>
              <li><CheckCircle2 size={16} /> Markdown & code syntax highlight</li>
              <li><CheckCircle2 size={16} /> Google Sign-In with Firebase Auth</li>
            </ul>
          </div>

          <div className="arch-card highlight">
            <div className="arch-step">02</div>
            <h3>Agency Director (Supervisor)</h3>
            <p>
              The primary orchestrator breaks directives into sub-tasks and dynamically delegates across registered agent tools.
            </p>
            <ul className="arch-list">
              <li><CheckCircle2 size={16} /> Dynamic multi-model switching</li>
              <li><CheckCircle2 size={16} /> Google ADK native agent-as-a-tool</li>
              <li><CheckCircle2 size={16} /> Context caching up to 30 minutes</li>
            </ul>
          </div>

          <div className="arch-card">
            <div className="arch-step">03</div>
            <h3>Specialized Sub-Agents</h3>
            <p>
              Domain agents purpose-built for specific workloads to prevent cognitive overload in a single prompt.
            </p>
            <ul className="arch-list">
              <li><CheckCircle2 size={16} /> Search Specialist (Live Google)</li>
              <li><CheckCircle2 size={16} /> Web Scraper (HTML to Markdown)</li>
              <li><CheckCircle2 size={16} /> Pluggable custom client agents</li>
            </ul>
          </div>

          <div className="arch-card">
            <div className="arch-step">04</div>
            <h3>Enterprise Safety (HITL)</h3>
            <p>
              Asynchronous approval gates stop destructive operations in their tracks until confirmed by a human supervisor.
            </p>
            <ul className="arch-list">
              <li><CheckCircle2 size={16} /> Non-blocking event loop polling</li>
              <li><CheckCircle2 size={16} /> Interactive modal approvals</li>
              <li><CheckCircle2 size={16} /> Automatic timeout safety limits</li>
            </ul>
          </div>

          <div className="arch-card">
            <div className="arch-step">05</div>
            <h3>Firestore State & Audit Trail</h3>
            <p>
              Distributed user-isolated persistence that prevents memory or session loss on serverless container cold starts.
            </p>
            <ul className="arch-list">
              <li><CheckCircle2 size={16} /> User-scoped session hierarchy</li>
              <li><CheckCircle2 size={16} /> Immutable mutation audit ledger</li>
              <li><CheckCircle2 size={16} /> Enterprise SOC2 compliance ready</li>
            </ul>
          </div>

          <div className="arch-card">
            <div className="arch-step">06</div>
            <h3>Model Provider Freedom</h3>
            <p>
              Native LiteLLM integration eliminates vendor lock-in. Switch runtime backends per request seamlessly.
            </p>
            <ul className="arch-list">
              <li><CheckCircle2 size={16} /> Google Gemini 3.1 Pro & 3.8 Flash</li>
              <li><CheckCircle2 size={16} /> OpenAI GPT-4o, o3-mini</li>
              <li><CheckCircle2 size={16} /> Anthropic Claude 3.7 & Groq LPUs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Governance & HITL Section */}
      <section id="governance" className="section-container governance-section">
        <div className="governance-inner">
          <div className="governance-text">
            <span className="section-badge">Safety & Compliance</span>
            <h2 className="section-title">Zero Runaway Actions. Absolute Human Control.</h2>
            <p className="governance-desc">
              Enterprises hesitate to deploy autonomous AI agents due to fear of hallucinated emails, 
              unapproved CRM mutations, or irreversible database edits. New Dawn enforces deterministic control.
            </p>

            <div className="governance-points">
              {/* Option 1: HITL Interception */}
              <button 
                type="button"
                className={`gov-point-btn ${govTab === 'hitl' ? 'active' : ''}`}
                onClick={() => setGovTab('hitl')}
              >
                <div className="gov-icon"><ShieldCheck size={20} /></div>
                <div className="gov-point-content">
                  <div className="gov-point-header">
                    <h4>Asynchronous Interception Gates</h4>
                    <span className="gov-tab-chip live">HITL Active</span>
                  </div>
                  <p>Critical mutations halt execution and push an immediate approval card to the user's screen.</p>
                </div>
              </button>

              {/* Option 2: Firestore Audit Ledger */}
              <button 
                type="button"
                className={`gov-point-btn ${govTab === 'audit' ? 'active' : ''}`}
                onClick={() => setGovTab('audit')}
              >
                <div className="gov-icon"><Database size={20} /></div>
                <div className="gov-point-content">
                  <div className="gov-point-header">
                    <h4>Complete Firestore Audit Ledger</h4>
                    <span className="gov-tab-chip">SOC2 Ready</span>
                  </div>
                  <p>Every tool trigger, target entity, timestamp, and human decision is permanently recorded.</p>
                </div>
              </button>

              {/* Option 3: User-Isolated Security */}
              <button 
                type="button"
                className={`gov-point-btn ${govTab === 'security' ? 'active' : ''}`}
                onClick={() => setGovTab('security')}
              >
                <div className="gov-icon"><Lock size={20} /></div>
                <div className="gov-point-content">
                  <div className="gov-point-header">
                    <h4>User-Isolated Cloud Security</h4>
                    <span className="gov-tab-chip">RBAC Bound</span>
                  </div>
                  <p>Strict Firebase UID token verification ensures agents can never access cross-tenant data.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Preview Display on the Right */}
          <div className="governance-preview-wrapper">
            {/* TAB 1: HITL Preview */}
            {govTab === 'hitl' && (
              <div className="governance-preview-card hitl-mode">
                <div className="gov-card-header">
                  <ShieldCheck size={24} style={{ color: '#f97316' }} />
                  <div>
                    <h3>Pending Operation Approval</h3>
                    <span>Session: sess_9482 · Requested by Agency Director</span>
                  </div>
                  <span className="status-live-tag">Interactive Simulation</span>
                </div>

                {hitlActionStatus === 'pending' && (
                  <>
                    <div className="gov-card-body">
                      <div className="gov-row">
                        <span className="label">Action:</span>
                        <span className="val code">email_send_executive_draft</span>
                      </div>
                      <div className="gov-row">
                        <span className="label">Target:</span>
                        <span className="val">board@client-enterprise.com</span>
                      </div>
                      <div className="gov-row">
                        <span className="label">Risk Level:</span>
                        <span className="val badge-warning">High External Visibility</span>
                      </div>
                      <div className="gov-preview-box">
                        <p className="preview-label">Generated Payload Preview:</p>
                        <p className="preview-snippet">
                          "Subject: Q3 Competitor Assessment & Autonomous Roadmap Strategy... Attached: 12-page executive synthesis."
                        </p>
                      </div>
                    </div>
                    <div className="gov-card-actions">
                      <button 
                        type="button"
                        className="btn-reject clickable" 
                        onClick={() => setHitlActionStatus('rejected')}
                      >
                        Reject Action
                      </button>
                      <button 
                        type="button"
                        className="btn-approve clickable" 
                        onClick={() => setHitlActionStatus('approved')}
                      >
                        Approve & Continue
                      </button>
                    </div>
                  </>
                )}

                {hitlActionStatus === 'approved' && (
                  <div className="gov-action-result success">
                    <div className="result-icon-box success">
                      <Check size={24} />
                    </div>
                    <h4>Operation Approved & Dispatched</h4>
                    <p className="result-desc">
                      Human confirmation received. Action <code>email_send_executive_draft</code> executed successfully. 
                      Audit ledger committed to Firestore and agent workflow resumed.
                    </p>
                    <div className="result-meta-pill">
                      <span>Recorded in sess_9482/audit/tx_9281a</span>
                    </div>
                    <button 
                      type="button"
                      className="btn-reset-simulation"
                      onClick={() => setHitlActionStatus('pending')}
                    >
                      <RotateCcw size={14} />
                      <span>Test Another Approval</span>
                    </button>
                  </div>
                )}

                {hitlActionStatus === 'rejected' && (
                  <div className="gov-action-result rejected">
                    <div className="result-icon-box warning">
                      <AlertTriangle size={24} />
                    </div>
                    <h4>Operation Intercepted & Cancelled</h4>
                    <p className="result-desc">
                      Supervisor rejected the dispatch. Zero outbound emails were sent. 
                      A cancellation event was returned to Agency Director to re-route workflow.
                    </p>
                    <div className="result-meta-pill warning">
                      <span>Cancellation permanently audited in Firestore</span>
                    </div>
                    <button 
                      type="button"
                      className="btn-reset-simulation"
                      onClick={() => setHitlActionStatus('pending')}
                    >
                      <RotateCcw size={14} />
                      <span>Reset HITL Demo</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Audit Ledger */}
            {govTab === 'audit' && (
              <div className="governance-preview-card audit-mode">
                <div className="gov-card-header">
                  <Database size={24} style={{ color: '#f97316' }} />
                  <div>
                    <h3>Immutable Firestore Audit Ledger</h3>
                    <span>Collection: sessions/sess_9482/audit_trail</span>
                  </div>
                  <span className="status-verified-tag">
                    <Check size={13} />
                    <span>SHA-256 Validated</span>
                  </span>
                </div>

                <div className="audit-timeline">
                  <div className="audit-entry">
                    <div className="entry-time">14:02:18</div>
                    <div className="entry-badge tool">TOOL_CALL</div>
                    <div className="entry-details">
                      <span className="entry-func">search_specialist_agent</span>
                      <span className="entry-target">Query: "competitor filings Q3"</span>
                    </div>
                    <span className="entry-status success">200 OK</span>
                  </div>

                  <div className="audit-entry">
                    <div className="entry-time">14:02:29</div>
                    <div className="entry-badge scrape">DOM_PARSER</div>
                    <div className="entry-details">
                      <span className="entry-func">web_scraper_agent</span>
                      <span className="entry-target">Extracted 4,200 clean tokens</span>
                    </div>
                    <span className="entry-status success">Indexed</span>
                  </div>

                  <div className="audit-entry highlight">
                    <div className="entry-time">14:02:41</div>
                    <div className="entry-badge hitl">HITL_GATE</div>
                    <div className="entry-details">
                      <span className="entry-func">email_send_executive_draft</span>
                      <span className="entry-target">Supervisor: j.reilly@enterprise.com</span>
                    </div>
                    <span className="entry-status approved">Approved</span>
                  </div>
                </div>

                <div className="audit-hash-footer">
                  <span className="hash-label">Cryptographic Proof:</span>
                  <code className="hash-code">sha256:7f9a2b84...3c11e0</code>
                  <span className="soc2-chip">SOC2 Compliance Ready</span>
                </div>
              </div>
            )}

            {/* TAB 3: User-Isolated Cloud Security */}
            {govTab === 'security' && (
              <div className="governance-preview-card security-mode">
                <div className="gov-card-header">
                  <Lock size={24} style={{ color: '#f97316' }} />
                  <div>
                    <h3>User-Isolated Cloud Security</h3>
                    <span>Strict Tenant Boundaries & RBAC Token Enforcement</span>
                  </div>
                  <span className="status-verified-tag">
                    <Check size={13} />
                    <span>Zero Data Bleed</span>
                  </span>
                </div>

                <div className="security-checks-list">
                  <div className="security-check-card">
                    <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                    <div className="check-text">
                      <strong>Cryptographic RS256 JWT Verification</strong>
                      <p>Every SSE token stream validates user claims before routing agent prompts.</p>
                    </div>
                  </div>

                  <div className="security-check-card">
                    <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                    <div className="check-text">
                      <strong>Firestore Multi-Tenant Security Rules</strong>
                      <p>All memory collections restricted strictly to <code>request.auth.uid == resource.data.userId</code>.</p>
                    </div>
                  </div>

                  <div className="security-check-card">
                    <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                    <div className="check-text">
                      <strong>Server-Side Secret Key Isolation</strong>
                      <p>API keys and credentials are never transmitted to client browsers or logs.</p>
                    </div>
                  </div>

                  <div className="security-check-card">
                    <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                    <div className="check-text">
                      <strong>Sovereign Data Protection</strong>
                      <p>Zero customer session payloads are retained for public model training.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Industry Customization Showcase */}
      <section id="customization" className="section-container customization-section">
        <div className="section-header">
          <span className="section-badge">Enterprise-Ready Solutions</span>
          <h2 className="section-title">One Multi-Agent Core. Unlimited Business Applications.</h2>
          <p className="section-subtitle">
            Whether you operate in private equity, legal compliance, commercial real estate, e-commerce, or B2B SaaS, 
            New Dawn coordinates agents, tools, and security guardrails tailored to your operational standards.
          </p>
        </div>

        {/* Industry Selector Tabs */}
        <div className="industry-tabs-nav">
          {[
            { id: 'finance' as const, name: 'Finance & PE', icon: TrendingUp },
            { id: 'legal' as const, name: 'Legal & Compliance', icon: Scale },
            { id: 'realestate' as const, name: 'Real Estate & CRE', icon: Building2 },
            { id: 'ecommerce' as const, name: 'E-Commerce & Retail', icon: ShoppingCart },
            { id: 'saas' as const, name: 'B2B SaaS & Tech', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedIndustry === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`industry-tab-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedIndustry(tab.id)}
              >
                <Icon size={17} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Industry Detail Card */}
        {(() => {
          const industryProfiles = {
            finance: {
              name: 'Finance & Private Equity',
              icon: TrendingUp,
              badge: 'Deal Sourcing & Diligence',
              headline: 'Automated 10-K Filings Analysis, Valuation Modeling & Covenant Auditing',
              description: 'Replace days of repetitive financial research. Specialized sub-agents ingest regulatory filings, benchmark sector multiples, and draft investment committee memos — protected by human approval gates before deal memos are distributed.',
              agents: [
                { name: 'SEC 10-K Extraction Agent', role: 'Automated EDGAR scraping, footnotes parsing & risk factor indexing' },
                { name: 'Valuation & Comps Specialist', role: 'EBITDA multiples, debt-to-equity ratios & growth benchmarking' },
                { name: 'Real-Time Market Monitor', role: 'Earnings call transcripts, executive quotes & sentiment detection' },
              ],
              integrations: ['PitchBook / CapIQ API', 'Internal Excel & Sheets', 'Bloomberg Web Feeds', 'Slack Deal Rooms'],
              safetyRule: 'Human Partner sign-off required prior to generating term sheets or publishing investment memos.',
              impactMetric: '14-hour deal research dossiers condensed to 90 seconds with verifiable source citations',
            },
            legal: {
              name: 'Legal & Regulatory Compliance',
              icon: Scale,
              badge: 'Contract & Risk Governance',
              headline: 'Playbook Redlining, Statute Research & Cross-Jurisdiction Audits',
              description: 'Safely accelerate contract review and regulatory tracking. Custom agents analyze complex MSAs against internal firm playbooks, identify liability anomalies, and draft standard amendment clauses with complete auditability.',
              agents: [
                { name: 'Contract Playbook Redliner', role: 'Identifies liability caps, indemnification anomalies & IP assignment gaps' },
                { name: 'Statute & Case Law Specialist', role: 'Cross-jurisdiction state & federal statutory updates via live web' },
                { name: 'DMS Conflict & Precedent Agent', role: 'Searches internal historical matters for past negotiated settlements' },
              ],
              integrations: ['Firm DMS (iManage / NetDocs)', 'DocuSign & Ironclad', 'Westlaw Feeds', 'Internal Playbook Wiki'],
              safetyRule: 'Zero drafted contractual language or letters can be transmitted without Supervising Attorney approval.',
              impactMetric: '80% reduction in first-pass contract audit time with 100% immutable Firestore audit trail',
            },
            realestate: {
              name: 'Real Estate & Property Development',
              icon: Building2,
              badge: 'Acquisitions & Underwriting',
              headline: 'Municipal Zoning Scraping, Comps Valuation & Offering Memoranda',
              description: 'Streamline commercial & multi-family acquisitions. Agents retrieve zoning classifications, tax records, and comparable sales to generate comprehensive investment summaries in minutes.',
              agents: [
                { name: 'Municipal Zoning Scraper', role: 'Extracts GIS data, permissible floor-area ratios & city planning minutes' },
                { name: 'Comps & Cap Rate Analyst', role: 'Aggregates submarket rent rolls, vacancy rates & price-per-square-foot' },
                { name: 'Underwriting Memo Generator', role: 'Compiles formatted investment committee briefs ready for review' },
              ],
              integrations: ['County Assessor Portals', 'MLS & CoStar Feeds', 'HubSpot / Salesforce CRM', 'Google Drive Vaults'],
              safetyRule: 'Automated investor outreach or underwriting distribution requires Acquisition Director approval.',
              impactMetric: 'Uncovers off-market municipal zoning opportunities and builds underwriting packets 10x faster',
            },
            ecommerce: {
              name: 'E-Commerce & Omnichannel Brands',
              icon: ShoppingCart,
              badge: 'Margin & Catalog Operations',
              headline: 'Real-Time Competitor Price Tracking, Supplier Audits & Demand Signals',
              description: 'Protect margins and automate supplier operations. Agents monitor competitor marketplace pricing, track supply chain shipment disruptions, and draft restocking orders calibrated against velocity.',
              agents: [
                { name: 'Competitor Price Tracker', role: 'Continuous scraping of Amazon, Walmart, and direct competitor catalogs' },
                { name: 'Supplier Lead-Time Auditor', role: 'Monitors vendor shipping notices, bill-of-lading updates & delivery delays' },
                { name: 'Omnichannel Voice Analyst', role: 'Synthesizes customer reviews, return reasons & product bug clusters' },
              ],
              integrations: ['Shopify / BigCommerce Admin', 'Amazon SP-API', 'Klaviyo & Gorgias', 'Warehouse WMS / ERP'],
              safetyRule: 'Price revisions exceeding ±5% or supplier purchase orders over $5,000 require Manager approval.',
              impactMetric: 'Preserves 3-5% margin through instant competitive repricing intelligence & zero stockouts',
            },
            saas: {
              name: 'B2B SaaS & Tech Enterprises',
              icon: Code2,
              badge: 'Escalations & Observability',
              headline: 'Tier-3 Technical Escalations, Code Context Mining & SOC2 Auditing',
              description: 'Empower customer success and engineering. Agents inspect bug reports, query error traces, pull relevant repository documentation, and stage draft customer explanations with human confirmation.',
              agents: [
                { name: 'Trace & Log Investigator', role: 'Correlates Sentry stack traces, Datadog metrics & deployment logs' },
                { name: 'Code & Docs Context Miner', role: 'Indexes internal Git repos and API docs to locate root causes' },
                { name: 'Incident Resolution Drafter', role: 'Drafts technical root cause analyses and customer communication' },
              ],
              integrations: ['GitHub / GitLab APIs', 'Datadog & Sentry', 'Linear / Jira Service Desk', 'Slack MCP Bot'],
              safetyRule: 'No public customer ticket response or git pull request can be merged without Engineer signoff.',
              impactMetric: 'Cuts Tier-3 technical incident turnaround from 24+ hours down to 40 minutes with zero regressions',
            },
          };

          const current = industryProfiles[selectedIndustry];
          const CurrentIcon = current.icon;

          return (
            <div className="industry-showcase-card">
              <div className="showcase-card-header">
                <div className="showcase-header-left">
                  <div className="showcase-badge-row">
                    <span className="showcase-industry-tag">
                      <CurrentIcon size={16} />
                      {current.name}
                    </span>
                    <span className="showcase-domain-badge">{current.badge}</span>
                  </div>
                  <h3 className="showcase-headline">{current.headline}</h3>
                  <p className="showcase-desc">{current.description}</p>
                </div>
                <div className="showcase-impact-box">
                  <span className="impact-label">Business Result</span>
                  <p className="impact-value">{current.impactMetric}</p>
                </div>
              </div>

              <div className="showcase-card-grid">
                {/* Custom Sub-Agents Deployed */}
                <div className="showcase-col agents-col">
                  <div className="col-header">
                    <Bot size={18} className="col-icon" />
                    <h4>Custom Sub-Agents Deployed</h4>
                  </div>
                  <div className="agents-stack">
                    {current.agents.map((ag, idx) => (
                      <div key={idx} className="agent-item-box">
                        <div className="agent-item-title">
                          <span className="agent-dot"></span>
                          <strong>{ag.name}</strong>
                        </div>
                        <p className="agent-item-role">{ag.role}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connected Internal Tooling & APIs */}
                <div className="showcase-col tools-col">
                  <div className="col-header">
                    <Workflow size={18} className="col-icon" />
                    <h4>Connected Business Tooling</h4>
                  </div>
                  <div className="tools-chip-list">
                    {current.integrations.map((tool, idx) => (
                      <div key={idx} className="tool-chip">
                        <CheckCircle2 size={15} style={{ color: '#22c55e' }} />
                        <span>{tool}</span>
                      </div>
                    ))}
                  </div>
                  <p className="tools-note">
                    Connect internal REST/GraphQL APIs, proprietary SQL/Postgres databases, or 6,000+ apps via Zapier MCP.
                  </p>
                </div>

                {/* Custom Human-in-the-Loop Safety Rule */}
                <div className="showcase-col safety-col">
                  <div className="col-header">
                    <ShieldCheck size={18} className="col-icon safety" />
                    <h4>Custom Approval Guardrail</h4>
                  </div>
                  <div className="safety-rule-box">
                    <div className="rule-badge">Interception Policy</div>
                    <p className="rule-text">"{current.safetyRule}"</p>
                    <div className="rule-footer">
                      <span className="rule-status">Configurable per operation</span>
                      <span className="rule-audit">Immutable Firestore Audit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4 Pillars of Business Customization */}
        <div className="custom-pillars-grid">
          <div className="pillar-card">
            <div className="pillar-icon"><Sliders size={22} /></div>
            <h3>1. Custom Agent Personas</h3>
            <p>
              Define your own Director and specialized sub-agents with bespoke system instructions, domain guardrails, and role boundaries tailored to your team.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon"><Database size={22} /></div>
            <h3>2. Proprietary Data & Tooling</h3>
            <p>
              Connect agents to private Postgres/BigQuery databases, internal REST APIs, cloud document drives, and external services via Model Context Protocol (MCP).
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon"><ShieldCheck size={22} /></div>
            <h3>3. Bespoke Safety Policies</h3>
            <p>
              You dictate exactly which operations run autonomously vs. which require human sign-off. High-risk writes are halted until confirmed.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon"><Cpu size={22} /></div>
            <h3>4. Zero Vendor / Model Lock-In</h3>
            <p>
              Deploy on Google Gemini 3.1 Pro, OpenAI GPT-4o, Claude 3.7 Sonnet, or self-hosted Ollama models with seamless dynamic LiteLLM switching.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-inner">
          <h2>Ready to Put Autonomous Agents to Work?</h2>
          <p>
            Test drive the live multi-agent director, observe real-time tool orchestration, 
            and experience human-in-the-loop governance firsthand.
          </p>
          <div className="cta-banner-actions">
            <button 
              className="cta-btn-primary" 
              onClick={(user || onBackToWorkspace) ? (onNavigateToWorkspace || onBackToWorkspace) : handleSignIn}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <>
                  <Loader2 size={20} className="spin-icon" />
                  <span>Connecting…</span>
                </>
              ) : (user || onBackToWorkspace) ? (
                <>
                  <span>Open Active Workspace</span>
                  <ArrowRight size={18} />
                </>
              ) : (
                <>
                  <span>Launch Live Demo</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <button 
              className="cta-btn-secondary" 
              onClick={() => setShowConsultModal(true)}
            >
              <Calendar size={18} />
              <span>Schedule Architecture Scoping</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-left">
            <div className="brand-badge">
              <Box size={20} />
              <span className="brand-title">NEW DAWN</span>
            </div>
            <p className="footer-copyright">
              New Dawn Agency OS · Enterprise Multi-Agent Architecture Powered by Google ADK & Gemini
            </p>
          </div>
        </div>
      </footer>

      {/* Consultation Modal */}
      {showConsultModal && (
        <div className="modal-backdrop" onClick={resetConsultModal}>
          <div className="consult-modal" onClick={e => e.stopPropagation()}>
            <div className="consult-modal-header">
              <div className="consult-modal-title">
                <Calendar size={22} style={{ color: '#f97316' }} />
                <div>
                  <h3>Schedule Technical Scoping Call</h3>
                  <span className="modal-subtitle">30-Minute Architecture &amp; Custom Pilot Review</span>
                </div>
              </div>
              <button className="close-btn" onClick={resetConsultModal} title="Close">
                <X size={20} />
              </button>
            </div>

            <div className="consult-modal-body">
              {formSubmitted ? (
                <div className="consult-success-view">
                  <div className="success-icon-badge">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3>Request Successfully Received!</h3>
                  <p>
                    Thank you, <strong>{formName}</strong>. Our engineering team has received your scoping details for <strong>{formCompany || 'your team'}</strong>.
                  </p>
                  <p className="success-sub">
                    We will review your workflow parameters and reach out at <strong>{formEmail}</strong> within 24 business hours with custom topology options and calendar availability.
                  </p>

                  <div className="success-actions">
                    <button className="consult-close-confirm-btn" onClick={resetConsultModal}>
                      <span>Back to Showcase</span>
                      <ArrowRight size={16} />
                    </button>
                    {import.meta.env.VITE_CALENDLY_URL && (
                      <a 
                        href={import.meta.env.VITE_CALENDLY_URL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="consult-calendar-direct-btn"
                      >
                        <Calendar size={16} />
                        <span>Book Instantly on Calendar</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <form className="consult-form" onSubmit={handleConsultSubmit}>
                  <p className="form-intro">
                    Tell us about your team's workflows. We'll assemble a tailored multi-agent topology demonstration and private sandbox.
                  </p>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label htmlFor="scoping-name">Full Name <span className="req">*</span></label>
                      <input
                        id="scoping-name"
                        type="text"
                        placeholder="e.g. Alex Morgan"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="scoping-email">Work Email <span className="req">*</span></label>
                      <input
                        id="scoping-email"
                        type="email"
                        placeholder="alex@enterprise.com"
                        required
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label htmlFor="scoping-company">Company / Organization</label>
                      <input
                        id="scoping-company"
                        type="text"
                        placeholder="e.g. Acme Capital"
                        value={formCompany}
                        onChange={e => setFormCompany(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="scoping-industry">Industry Domain</label>
                      <select
                        id="scoping-industry"
                        value={formIndustry}
                        onChange={e => setFormIndustry(e.target.value)}
                      >
                        <option value="finance">Finance &amp; Private Equity</option>
                        <option value="legal">Legal &amp; Regulatory Compliance</option>
                        <option value="realestate">Real Estate &amp; CRE</option>
                        <option value="ecommerce">E-Commerce &amp; Retail</option>
                        <option value="saas">B2B SaaS &amp; Enterprise Tech</option>
                        <option value="other">Other High-Value Domain</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="scoping-scope">
                      Workflow or Tasks to Automate <span className="opt">(Optional)</span>
                    </label>
                    <textarea
                      id="scoping-scope"
                      rows={3}
                      placeholder="e.g. Automated regulatory filing ingestion, CRM update gates, and custom multi-agent routing..."
                      value={formScope}
                      onChange={e => setFormScope(e.target.value)}
                    />
                  </div>

                  <div className="form-submit-footer">
                    <button 
                      type="submit" 
                      className="consult-submit-btn" 
                      disabled={isSubmittingForm || !formName || !formEmail}
                    >
                      {isSubmittingForm ? (
                        <>
                          <Loader2 size={18} className="spin-icon" />
                          <span>Preparing Request…</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>Request Technical Consultation</span>
                        </>
                      )}
                    </button>
                    <div className="form-privacy-note">
                      <Lock size={12} />
                      <span>Strict confidentiality guaranteed. We never share customer data.</span>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
