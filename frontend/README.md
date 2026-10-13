# New Dawn — Frontend Client Portal & Workspace

The user interface for **New Dawn**, built with **React 19**, **TypeScript**, and **Vite**. It features a dual-mode interface: a public-facing client showcase landing page and an authenticated streaming multi-agent chat workspace.

---

## 🎨 Architecture & Components

```
frontend/src/
├── components/
│   ├── LandingPage.tsx       # Enterprise showcase, industry switcher & HITL simulator
│   ├── LandingPage.css       # Premium glassmorphic dark sunset theme styles
│   ├── ChatInterface.tsx     # Real-time SSE streaming workspace with tool activity
│   ├── ModelSelector.tsx     # Multi-model catalog switcher (Gemini, GPT-4o, Claude)
│   ├── AuditLogPanel.tsx     # Firestore immutable audit ledger inspector
│   ├── SettingsModal.tsx     # Integration credentials & connection settings
│   └── LoginPage.tsx         # Fallback Google Sign-In card
├── contexts/
│   └── AuthContext.tsx       # Firebase Auth / Local Mock Auth provider
├── lib/
│   └── firebase.ts           # Dynamic Firebase client SDK initialization
├── App.tsx                   # Main app shell & Showcase/Workspace view routing
├── index.css                 # Global CSS variables, reset, and animation keyframes
└── main.tsx                  # React DOM root entry point
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env.development` or `.env.production`:

```ini
# Backend API Base URL (empty for relative proxy or port 8000)
VITE_API_BASE=http://localhost:8000

# Firebase Client Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Note**: If `MOCK_AUTH=true` is set on the backend, you can test the workspace locally without configuring live Firebase credentials.

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
Compiles TypeScript and bundles production assets into `dist/` with zero warnings.

---

## 🌟 Key Features

1. **Interactive Industry Customization Studio**:
   - Visitors can toggle between Finance, Legal, Real Estate, E-Commerce, and SaaS to inspect bespoke sub-agent rosters and approval policies.
2. **Live Human-in-the-Loop Simulator**:
   - Prospective clients can test approving and rejecting staged actions with instant feedback.
3. **Microsecond SSE Token Streaming**:
   - Real-time token streaming with live tool execution pills and Markdown rendering.
4. **Dynamic Model Switching**:
   - Seamlessly switch between Gemini 3.1 Pro, GPT-4o, and Claude 3.7 Sonnet on a per-session basis.
