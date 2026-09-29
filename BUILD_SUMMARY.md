# FraudGraph — Build Summary

## Theme
Fintech

## Problem Statement
Financial-fraud investigation can become difficult when suspicious activity is distributed across multiple accounts, devices, and transactions and individual events appear legitimate in isolation. Investigators may need to connect these entities to understand whether apparently separate events form a coordinated pattern. Existing workflows and the usefulness of relationship-based investigation need to be evaluated before assuming that a new system would provide additional value.

## How It Changed
Version 1 assumed that graph analysis was inherently superior to existing tools for small merchants and individuals. Version 2 grounded the scope to enterprise risk teams processing high transaction volumes, acknowledged that existing tools already analyze multiple signals, and recognized that investigator workflow integration and false-positive rates must be proven before claiming added value.

## What We Built
**The One Flow:** Load transaction data ➔ Analyze relationships across accounts, devices, and IPs ➔ Identify potentially suspicious clusters ➔ Visualize connected entities in a relationship graph ➔ Show supporting evidence and flags ➔ Allow investigator review and decision.

## What It Deliberately Does Not Do
- No real payment processing or real-time money movement.
- No direct bank network or core banking integration.
- No automatic account blocking or unilateral account actions.
- No legal fraud determination or formal compliance reporting.
- No customer identity verification (KYC).
- No replacement of human investigators (strictly decision augmentation).

## Tech Stack
- **Frontend (React):** Interactive investigation dashboard and dynamic component state management.
- **Graph Visualization (Cytoscape.js / React Flow):** Node-edge rendering for multi-hop entity relationships.
- **Backend (Node.js Express / Java):** REST API for data parsing, cluster analysis, and evidence payload serving.
- **Data Store (Relational / In-Memory):** Ingestion and indexing of accounts, devices, timestamps, and transactions.
- **Test Runner (Node Native Test Runner):** Deterministic verification of graph logic and edge cases.

## Evidence Position

### Supported / Observed
- Entities sharing device IDs and IP addresses across rapid transaction sequences can be deterministically clustered and surfaced without relying on probabilistic LLM arithmetic.
- Edge-case testing confirms reliable error handling on empty, malformed, and high-volume inputs without crashes.
- Visual link presentation reduces the manual steps required to trace a multi-account connection compared to raw tabular SQL queries.

### Still Assumptions / Unverified
- We have not established that real-world enterprise fraud teams will adopt an external graph tool rather than extending internal Databricks/Snowflake queries.
- We have not verified the false-positive rate on high-density production datasets with shared family devices or public Wi-Fi IPs.
- We have not proven that visual graphs are faster than filtered tabular views for seasoned tier-2 investigators under high-volume time pressure.

## What We Would Build Next
**Automated Rule-to-Graph Feedback Loop:** A bidirectional integration allowing investigators to convert a confirmed graph cluster into a one-click transaction-monitoring rule.  
*Evidence required to justify building it:* At least 70% of stranger-test participants express frustration that after identifying a suspicious cluster, they must manually transcribe findings back into their legacy rule engine.
