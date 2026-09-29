# FraudGraph — Relationship-Based Financial Fraud Investigation Prototype

> **Team:** CODE_BLOODED  
> **Cohort:** Build with AI: The AI Builder’s Operating Kit  
> **Theme:** Fintech  
> **Path in Submission:** `/prototype` inside `CodeBlooded_Fintech_Module1.zip`  
> **One-Line Flow:** Ingests transaction data, constructs an entity-relationship graph, detects coordinated suspicious clusters, visualizes connections, and surfaces evidence for human investigator review.

---

## 1. Master System Flowchart

```mermaid
flowchart TD
    %% INPUT LAYER
    subgraph S1["1. DATA INGESTION LAYER"]
        A["Transaction Dataset\n(Txn ID, Sender, Receiver, Amount, Timestamp, Device ID, IP, Status)"]
    end

    %% RELATIONSHIP GRAPH ENGINE
    subgraph S2["2. ENTITY RELATIONSHIP ENGINE"]
        A --> B1["Entity Extraction & Normalization\n(Accounts, Devices, IPs, Cards)"]
        B1 --> B2["Multi-Hop Graph Construction\n(Shared Devices, Shared IPs, Rapid Cycles)"]
        B2 --> B3["Cluster & Community Detection\n(Coordinated Rings & Synthetic Identities)"]
    end

    %% RISK & EVIDENCE ANALYSIS
    subgraph S3["3. DETECTION & EVIDENCE LAYER"]
        B3 --> C1["Risk Scoring & Signal Weighting"]
        C1 --> C2["Signal Categorization:\n• Evidence (Direct Graph Link)\n• Inference (Statistical Anomaly)\n• Hypothesis (Unconfirmed Flag)"]
        C2 --> C3["Explainable Flag Generation\n(Why pattern was flagged)"]
    end

    %% PRESENTATION & REVIEW
    subgraph S4["4. INVESTIGATOR UI & ACTION LAYER"]
        C3 --> D1["Interactive Graph Visualization\n(Nodes: Accounts, Devices, IPs | Edges: Transactions)"]
        C3 --> D2["Cluster Detail & Supporting Evidence Panel"]
        D1 & D2 --> D3{"Human Investigator Decision"}
        D3 --> E1["Confirm Suspicious Activity"]
        D3 --> E2["Dismiss as False Positive"]
        D3 --> E3["Escalate for Deep Audit"]
    end
```

---

## 2. The One Build Flow (MVP)

```mermaid
flowchart LR
    L1["1. Load Data\n(Transactions)"] --> L2["2. Analyze\n(Relationships)"]
    L2 --> L3["3. Identify\n(Suspicious Cluster)"]
    L3 --> L4["4. Visualize\n(Connected Network)"]
    L4 --> L5["5. Show Evidence\n(Graph Connections)"]
    L5 --> L6["6. Investigator Review\n(Human Decision)"]
```

### What It Does
- Ingests structured transaction records (Sender, Receiver, Amount, Timestamp, Device ID, IP).
- Connects disparate entities across shared devices, shared IPs, and cyclic payment flows.
- Identifies coordinated networks where individual transactions appear normal in isolation.
- Displays an interactive relationship graph with flagged risk paths.
- Provides an explainability panel detailing why a cluster was flagged.

### What It Deliberately Does NOT Do
- ❌ **No Real Payment Processing:** Prototype only; does not move live money.
- ❌ **No Direct Bank Integration:** Does not access real-time core banking networks.
- ❌ **No Automatic Account Freezing:** Never takes unilateral blocking actions.
- ❌ **No Legal Fraud Determinations:** Flags *potential* risks; does not establish legal guilt.
- ❌ **No KYC Processing:** Does not perform customer identity verification.
- ❌ **No Replacement of Human Analysts:** Augments investigator workflow; final decision is human.

---

## 3. Problem Statement & Evolution

```mermaid
flowchart TD
    subgraph V1["Problem Statement v1 (Activity 1)"]
        A1["Small merchants and individuals struggle to identify fraud because fraudulent transactions look legitimate in isolation. Transaction-level detection misses coordinated multi-account patterns."]
    end

    subgraph UNWIND["Critical Design Thinking (Activity 4)"]
        U1["Five Whys: Can investigators actually act on graph signals?"]
        U2["Reframe 1 (Disbeliever): Do existing tools already solve this?"]
        U3["Reframe 2 (Technical Lead): Handling shared devices, false positives & scale."]
    end

    subgraph V2["Problem Statement v2 (Final - Activity 4)"]
        A2["Financial-fraud investigation becomes difficult when suspicious activity is distributed across multiple accounts, devices, and transactions. Investigators need to connect these entities to detect coordinated patterns, but existing workflows and the incremental value of graph tools must be evaluated before assuming added value."]
    end

    V1 --> UNWIND --> V2
```

- **Core Difference:** v1 assumed graph AI was automatically better; v2 grounds the problem in investigator workflow reality, false-positive risks, and incremental utility over existing tools.

---

## 4. 4D AI Fluency Framework (Activity 2)

```mermaid
flowchart LR
    D1["1. Delegation\nAI mines relationships;\nHuman retains interpretation."] --> D2["2. Description\nContext: Fintech fraud.\nConstraint: Never infer fraud from 1 event."]
    D2 --> D3["3. Discernment\nCompare AI findings against\nraw underlying dataset."]
    D3 --> D4["4. Diligence\nTest normal vs suspicious\nscenarios before approval."]
```

| 4D Dimension | Application to FraudGraph |
| :--- | :--- |
| **Delegation** | AI parses transaction batches and surfaces entity links; investigator owns fraud judgment. |
| **Description** | Explicit instructions: identify clusters, trace links, surface evidence; never hallucinate links. |
| **Discernment** | Verify that every flagged graph edge maps to a real timestamped transaction. |
| **Diligence** | Run edge-case tests (empty inputs, high volume, normal behavior) prior to deployment. |

---

## 5. PMF Case & Target ICP (Activity 5)

```mermaid
flowchart LR
    subgraph ICP_BOX["TARGET USER"]
        I1["Fraud/Risk Investigation Teams\n• Digital Banks & Payment Gateways\n• (e.g. Razorpay, PayU, PhonePe, Paytm)\n• High transaction volume environments"]
    end

    subgraph SUB_BOX["CURRENT SUBSTITUTES"]
        S1["• Isolated transaction alert rules\n• Manual SQL queries across tables\n• Excel spreadsheet pivot tables\n• Fragmented investigation logs"]
    end

    subgraph COST_BOX["CURRENT COSTS"]
        C1["• Delayed detection (days vs minutes)\n• High investigator fatigue\n• High false-positive rates\n• Coordinated rings slip through"]
    end

    ICP_BOX --> SUB_BOX --> COST_BOX
```

- **Value Hypothesis:** By grouping accounts by shared device/IP relationships, investigators discover coordinated fraud rings 5x faster than by reviewing isolated alerts.
- **Opportunity Formula:** `Findable Users × Realistic Price × Realistic Adoption` *(No invented market statistics).*

---

## 6. Evidence vs. Assumption Standard (Activity 3 & 4)

```mermaid
flowchart TD
    Claim["Investigator Finding / Signal"] --> T1{"Verified against raw dataset?"}
    T1 -- "Yes, direct record link" --> E1["[EVIDENCE]\nDirect transaction, device ID, or IP match"]
    T1 -- "Calculated pattern" --> E2["[INFERENCE]\nStatistical velocity anomaly or cyclic path"]
    T1 -- "Predicted relation" --> E3["[HYPOTHESIS]\nSuspected mule account awaiting confirmation"]
    T1 -- "Unproven belief" --> E4["[ASSUMPTION]\nBelief that user finds visualization usable"]
```

### Top 3 Ranked Assumptions & 48-Hour Tests
1. **Assumption 1:** Relationship analysis provides useful fraud signals that rule alerts miss.  
   - *Test:* Run synthetic ring dataset through rules vs graph; measure cluster detection delta.
2. **Assumption 2:** Financial platforms have access to clean, linked device and IP identifiers.  
   - *Test:* Review public payment gateway schemas to confirm device/IP field availability.
3. **Assumption 3:** Investigators prefer graph visual exploration over tabular filtered views.  
   - *Test:* Stranger test with 2 analysts comparing graph view vs tabular view on identical tasks.

---

## 7. Recommended Prototype Architecture (Activity 6)

```mermaid
flowchart TD
    UI["Frontend: React + Cytoscape.js / React Flow\n(Interactive Dashboard & Entity Graph)"]
    API["Backend: REST API Framework\n(Express.js / Spring Boot)"]
    DB["Data Store: Relational / In-Memory Graph\n(PostgreSQL / JSON Graph Store)"]
    SYNTH["AI / Heuristic Engine\n(Cluster Detection, Explainable Risk Scoring)"]

    UI <-->|REST / JSON| API
    API <--> DB
    API <--> SYNTH
```

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React | Responsive investigation dashboard and component state. |
| **Graph Visualization** | Cytoscape.js / React Flow | Interactive node-edge relationship clustering. |
| **Backend API** | Node.js (Express) / Java | Lightweight, reproducible REST API endpoints. |
| **Data Layer** | In-Memory / PostgreSQL | Structured storage for transactions, accounts, and metadata. |
| **Testing** | Automated Native Test Runner | Fast, deterministic verification of graph logic. |

---

## 8. Setup & Quickstart Instructions

### Prerequisites
- Node.js `v18.0.0+`
- npm `v9.0.0+`

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Run prototype development server
npm run dev

# 3. Execute automated test suite
npm test
```

### Access Points
- **Web Dashboard:** `http://localhost:5173/`
- **Backend API:** `http://localhost:3001/`

---

## 9. Testing Plan (Activity 6)

| Test Case | Scenario / Input | Expected Handling | Verified Result |
| :--- | :--- | :--- | :--- |
| **Empty Input** | Zero transactions supplied | Clear error message; zero application crash | Pass |
| **Very Long Input** | High transaction volume | Smooth render; graph handles node density | Pass |
| **Unsupported Input** | Missing mandatory columns | Reject with explicit field validation error | Pass |
| **Normal Scenario** | Clean, regular transactions | Low risk score; no false fraud accusations | Pass |
| **Suspicious Scenario** | Controlled multi-hop ring | Correctly isolates cluster and tags links | Pass |

---

## 10. Stranger Test Protocol

```mermaid
sequenceDiagram
    actor Stranger as Stranger Tester (No Prior Context)
    participant App as FraudGraph UI
    participant Doc as Observer Log

    Note over Stranger,App: Task 1: "Find the suspicious activity in this dataset."
    Stranger->>App: Interacts with dataset & graph
    App-->>Stranger: Displays node clusters & risk indicators
    Stranger->>Doc: Logs hesitations, misconceptions & time-to-find

    Note over Stranger,App: Task 2: "Investigate this account and explain why it was flagged."
    Stranger->>App: Clicks flagged account node
    App-->>Stranger: Displays connection details & evidence card
    Stranger->>Doc: Validates whether explanation is clear without guidance
```

- **Rule:** Do not guide the testers. Document every wrong click, confusion point, and UX friction.

---

## 11. Reusable Workflow (Section 11)

```mermaid
flowchart LR
    In["INPUT\nNew project idea &\navailable evidence"] --> Proc["PROCESS\nDefine problem ➔\nIdentify user ➔\nSubstitute ➔\nList assumptions"]
    Proc --> Ver["VERIFICATION\nCheck claims against reliable sources;\nLabel unverified assumptions"]
    Ver --> Out["OUTPUT\nStructured evaluation &\nNext build decision"]
```

- **Task:** Systematic evaluation of new fintech/AI hypotheses.
- **Verification Rule:** Never accept ungrounded assertions; tag as Evidence, Inference, Hypothesis, or Assumption.

---

## 12. Final ZIP Submission Checklist (Section 12)

```
CodeBlooded_Fintech_Module1.zip
├── prototype/                      <-- Source code folder
│   ├── README.md                   <-- This file (Setup, flow, limitations)
│   ├── package.json
│   ├── server.js
│   ├── vite.config.js
│   ├── src/
│   ├── tests/
│   └── (node_modules, .env, build folders STRIPPED)
├── Build-Log.pdf                   <-- Compiled Entries 1 through 6
└── Build-Summary.md                <-- 1-page standalone summary
```

- [x] Filename: `CodeBlooded_Fintech_Module1.zip`
- [x] `prototype/` contains clean runnable source code
- [x] Stripped `node_modules/`, `dist/`, `.env`, and secret keys
- [x] `Build-Log` contains Entries 1–6 in order
- [x] Claims labeled as Evidence, Inference, Hypothesis, or Assumption
- [x] `Build-Summary.md` is exactly one page and readable standalone
- [x] Incomplete functionality and constraints explicitly disclosed
