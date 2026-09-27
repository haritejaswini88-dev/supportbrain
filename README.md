# SupportBrain

> **Support that remembers.**

SupportBrain is an AI customer-support agent that remembers previous customer problems, solutions, and outcomes, utilizing that persistent memory to provide better, faster, and more personalized support in future conversations.

---

## 1. What It Is

SupportBrain bridges the gap between conversational AI and real-world customer support. Traditional support bots treat every incoming interaction as a blank slate, forcing customers to repeatedly explain previous issues and failing to track what solutions have already been attempted.

SupportBrain solves this by integrating **Hindsight**, giving the support agent persistent, long-term memory across sessions.

---

## 2. Core Problem & Solution

```
Traditional Support Bot:
Customer has problem ──> AI starts from scratch ──> Customer repeats history ──> Frustration

SupportBrain Flow:
Customer has a problem
        ↓
AI provides support
        ↓
Useful interaction info is remembered (Hindsight Retain)
        ↓
Customer returns later
        ↓
Relevant memory is retrieved (Hindsight Recall)
        ↓
AI uses previous context
        ↓
Better and personalized support
```

---

## 3. Key Features

- **🧠 Persistent Long-Term Memory (Hindsight)**: Uses the official `@vectorize-io/hindsight-client` to retain facts and recall context multi-dimensionally (semantic, keyword, and entity matching).
- **🔒 Customer Memory Isolation**: Memory banks are dynamically scoped per customer (e.g. `supportbrain_cust_001`), ensuring strict multi-tenant boundary separation.
- **✨ 4-State Real-Time Memory Panel**:
  - *State 1*: No relevant previous memory found
  - *State 2*: Searching customer memory...
  - *State 3*: Relevant memory found (displays Previous Issue, Previous Solution, Outcome, Source, and Match Score)
  - *State 4*: Memory service temporarily unavailable
- **⚡ AI Reasoning & Contextual Generation (Groq)**: Powered by Groq's high-speed Llama 3 models (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`).
- **🔍 Intelligent Memory Extraction**: Automatically filters conversational noise and only persists structured, actionable facts (Problem, Attempted Solution, and Outcome).
- **🔁 Recurring Issue Detection**: Automatically spots and flags repeating issues when a problem is encountered multiple times.
- **👥 Dynamic Customer Switching**: Switch between returning customer **Hari** (`CUST-001`), new customer **Alex Rivera** (`CUST-002`), and returning user **Sarah Chen** (`CUST-003`) with a single click.
- **📊 Agent Overview Dashboard**: Visual metrics for total conversations, returning customers, memories retrieved, and recurring issues (clearly marked *Demo Data*).
- **🔎 Memory Inspector & Live Query Simulator**: Dedicated inspection page to audit stored memories and test arbitrary queries against Hindsight.

---

## 4. Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 19 + Vite Frontend                        │
│   (Support Chat UI, Memory Panel, Dashboard, Customers, Conversations) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / REST
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Express.js Backend API                         │
├────────────────────────────────────┼───────────────────────────────────┤
│                                    │                                   │
│  ┌───────────────────────────────┐ │ ┌───────────────────────────────┐ │
│  │         Groq AI Engine        │ │ │   Hindsight Memory Service    │ │
│  │ (LLM reasoning & extraction)  │ │ │ (Retain / Recall / Bank APIs) │ │
│  └───────────────────────────────┘ │ └───────────────────────────────┘ │
│                                    │                                   │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    SQLite Database (node:sqlite)                  │ │
│  │      (Customers, Conversations, Messages, Issue Metadata)         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Responsibilities
- **Hindsight**: Long-term persistent memory engine (handles memory extraction, indexing, semantic/keyword recall, and memory bank namespaces).
- **Groq**: High-speed AI inference for conversational response generation and interaction analysis.
- **SQLite**: Structured relational application data (customers, conversation threads, message transcripts, timestamps). *Does NOT pretend to be AI memory.*
- **Express.js**: Backend REST API server coordinating the memory and AI pipelines.
- **React + Tailwind CSS**: Modern SaaS user interface with Lucide React icons.

---

## 5. Technology Stack

- **Frontend**: React 19, Vite, JavaScript, Tailwind CSS, Lucide React icons
- **Backend**: Node.js v20+, Express.js, CORS, Dotenv, UUID
- **Database**: SQLite (via built-in zero-dependency `node:sqlite`)
- **Memory Engine**: `@vectorize-io/hindsight-client`
- **AI Engine**: `groq-sdk`

---

## 6. Setup & Installation

### Prerequisites
- Node.js v20 or higher installed (`node -v`)
- npm v10 or higher (`npm -v`)

### 1. Clone & Install Dependencies
From the project root:
```bash
# Install all dependencies (root, backend, and frontend)
npm run install:all
```
*(Or run `npm install`, `cd server && npm install`, `cd ../client && npm install`)*

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your preferred settings:
```env
PORT=5000
NODE_ENV=development

# Groq API Configuration (https://console.groq.com/keys)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Hindsight Configuration
# Option A: Hindsight Cloud (https://hindsight.vectorize.io)
# HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
# HINDSIGHT_API_KEY=your_hindsight_api_key_here

# Option B: Local Hindsight Instance (Default, zero-config local engine)
HINDSIGHT_BASE_URL=http://localhost:8888
HINDSIGHT_API_KEY=
HINDSIGHT_AUTO_START_LOCAL=true
```

> **Note on Zero-Config Local Memory**: When `HINDSIGHT_BASE_URL` is set to `http://localhost:8888` and `HINDSIGHT_AUTO_START_LOCAL=true`, SupportBrain automatically boots an embedded Hindsight HTTP REST server on port 8888. The official `@vectorize-io/hindsight-client` connects to it via real HTTP calls.

### 3. Seed Demo Data
```bash
npm run seed
```

### 4. Run the Application
```bash
# Starts both Backend (port 5000) and Frontend (port 5173) concurrently
npm run dev
```
Open your browser to: **`http://localhost:5173`**

---

## 7. Critical Demo Scenarios

SupportBrain is designed to demonstrate persistent memory in 4 distinct steps:

### STEP 1 — First Conversation (Problem & Retention)
1. Select **Customer: Hari** (`CUST-001`) from the header switcher.
2. In the chat input, type or click:
   ```
   My payment failed.
   ```
3. SupportBrain provides troubleshooting (e.g. suggesting checking 3D Secure or retrying).
4. Send:
   ```
   Retrying the payment with 3D Secure worked! Thank you.
   ```
5. Notice that SupportBrain identifies:
   - **Problem**: `Payment failure`
   - **Solution**: `Payment retry`
   - **Outcome**: `Successful`
   and retains this memory in Hari's Hindsight bank.

### STEP 2 — Return Later (Memory Recalled)
1. Click the **"New Conversation"** button in the header.
2. Hari returns with a subsequent inquiry. Type or click:
   ```
   My payment failed again.
   ```
3. Observe what happens:
   - The **Memory Panel** pulses: `Searching customer memory...`
   - The state transitions to: **`🧠 Relevant Memory Found`**
   - Displays:
     - *Previous issue*: `Payment failure`
     - *Previous solution*: `Payment retry`
     - *Outcome*: `Successful`
     - *Source*: `Previous customer interaction`
   - The AI responds contextually referencing the previous interaction without the customer needing to repeat themselves!
   - A **Recurring Issue Alert** appears on the panel!

### STEP 3 — New Customer Test (Memory Isolation)
1. Switch to **Alex Rivera** (`CUST-002`) using the customer switcher.
2. Notice Alex is marked **`New Customer — No Memory`**.
3. Send:
   ```
   My payment failed.
   ```
4. Observe the Memory Panel: **`🧠 No relevant previous memory found`**.
5. The AI provides standard, helpful assistance **without claiming any prior history**. This proves memories are strictly customer-specific!

### STEP 4 — Irrelevant Memory Filtering Test
1. Switch back to **Hari** (`CUST-001`).
2. Send:
   ```
   I forgot my password.
   ```
3. Observe that Hindsight retrieves only login/account memories. It does **not** inject unrelated payment memories into the conversation!

---

## 8. Verification & Automated Tests

SupportBrain includes an automated test suite verifying all 14 criteria:
```bash
npm test
```

### Verified Test Cases:
- [x] **Test 1**: New customer sends message (no previous memory assumed)
- [x] **Test 2**: Returning customer receives contextual recall on same issue
- [x] **Test 3**: Relevant Hindsight memory is retrieved with metadata
- [x] **Test 4**: Irrelevant memories are filtered out
- [x] **Test 5**: New customer does not inherit another customer's memory
- [x] **Test 6**: Useful interaction information is extracted and retained
- [x] **Test 7**: Solution and outcome tracking is verified
- [x] **Test 8**: Empty messages are rejected with HTTP 400
- [x] **Test 9**: Hindsight failure degrades gracefully with *"Memory service temporarily unavailable"*
- [x] **Test 10**: Groq failure degrades gracefully with *"AI support is temporarily unavailable"*
- [x] **Test 11**: Frontend and backend API integrity confirmed
- [x] **Test 12**: Database persistence across restarts confirmed
- [x] **Test 13**: Environment variables correctly documented and loaded
- [x] **Test 14**: No secrets exposed in client code or tracked in git

---

## 9. Troubleshooting

| Issue | Resolution |
| :--- | :--- |
| **"Memory service temporarily unavailable"** | Check that `HINDSIGHT_BASE_URL` is set to `http://localhost:8888` (default local) or your Hindsight Cloud endpoint with a valid `HINDSIGHT_API_KEY`. |
| **"AI support is temporarily unavailable. Please try again."** | Check your `GROQ_API_KEY` in `.env`. Ensure your Groq API key is valid and has not exceeded rate limits. In development mode without a key, the system provides contextual simulation. |
| **Port 5000 in use** | Set `PORT=5001` in `.env`. Vite will automatically proxy to the configured port. |
| **Reset Demo Database** | Run `npm run seed` to re-seed the demo database and memory banks. |
