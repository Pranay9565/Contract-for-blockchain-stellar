Project: "UniPot"

Mission: A decentralized "Splitwise" for student groups. It's a shared wallet where a majority or all have to approve reimbursements, making shared expenses transparent, instant, and globally interoperable for near-zero fees.

A democratic way to manage shared expenses.

Use Cases (The "Why")
Global Group Payments (Cross-Border Collaboration):
Scenario: A student team has members in India, Nigeria, and Brazil. They receive a $5,000 grant in USDC.
Action: The grant is sent to their 3-of-3 vault. When they need to pay for a $100 server bill, they all sign a single transaction. The $100 is paid instantly with a sub-cent fee.
Benefit: No one has to deal with slow, expensive international wire transfers.

Community Grant Management:
Scenario: A community DAO votes to fund a project.
Action: The funds are moved to a 4-of-4 vault controlled by 4 trusted, public community members.
Benefit: This ensures the grant money is spent exactly as the community intended, with full, public accountability for every transaction.
3. The University Club Treasury (Transparent & Low-Fee):
Scenario: The 10-person "IIT Mandi Robotics Team" has a small budget.
Problem: They need to make frequent, small purchases ($10 for screws, $30 for a motor). Using a traditional bank requires one person to use their personal card and get reimbursed, which is slow and messy.
"UniPot" Solution:
They create a 3-of-10 "UniPot" (only 3 board members need to approve).
A team member buys a $30 motor. They submit a proposal with the receipt.
Two other board members approve it. The student is paid back instantly.
Impact: The club has a 100% transparent, auditable treasury for low-level expenses, all made possible by Stellar's non-existent fees.

Why Stellar is Integral to This Idea
It Makes Micropayments Viable:
The Problem: On other blockchains, a simple multi-sig withdrawal can cost $20 - $100+ in gas fees. You would never use a 5-person vault to approve a $10 server bill; the fee would cost more than the bill itself. This limits those wallets to only large, rare treasury movements.
The Stellar Solution: Stellar's fee is less than a fraction of a cent. This is the most critical feature. It means your N-of-N vault can be used for daily operations. A 5-person team can securely approve a $10 server bill, a $5 domain renewal (e.g., a family subscription to an OTT/music streaming platform), or a $1.50 API key purchase. The fee is irrelevant, so the only thing that matters is security.
It's Built for Cross-Border Payments:
The Problem: Sending $500 from a US bank to an Indian bank is slow (3-5 days) and expensive. Wire transfer fees and high exchange rates can "cost" 5-10% of the money.
The Stellar Solution: Stellar is a payments network first. It can settle a cross-border transaction in 5 seconds. A user can hold USDC, and the recipient can receive it and instantly swap it for a tokenized Indian Rupee (INR) on the Stellar Decentralized Exchange (SDEX) at near-perfect exchange rates. You lose almost nothing to friction.
25-Day "UniPot" Launch Roadmap

This roadmap builds a complete N-of-M (majority-rules) app.
Phase 1: Foundation & MVP Contract (Days 1-7)
Day(s)
Task
Key Functions/Goal

1-2
Spec out "UniPot" Flow
Define the user story: A 5-person dorm creates a "Pot." They set the approval threshold to 3-of-5.

3-5
Implement the N-of-M Contract
initialize, deposit, propose, approve, execute.

6-7
Intensive Testing
Write tests for the entire proposal lifecycle. Crucial Test: Prove that a 2-of-5 approval fails and a 3-of-5 approval succeeds.

Phase 2: Front-End & Core Flow (Days 8-15)
Day(s)
Task
Goal

8-9
App Skeleton & Deployment
Deploy the contract to Testnet. Build the app skeleton with wallet connection.

10-12
"Create Pot" & Dashboard UI
Build the "Create Pot" UI (calls initialize) and the "Pot Dashboard" (shows balance, owners, and threshold).

13-15
Live Proposal Feed
Implement the deposit UI. The Dashboard must now fetch and display a live feed of pending proposals from the contract. This is the app's "home screen."

Phase 3: The "UniPot" Experience (Days 16-22)
Day(s)
Task
Goal

16-18
"Request Reimbursement" UI
Build a simple form that calls the propose function.

19-20
"Approve" Logic
Each item in the proposal feed gets an "Approve" button that calls the approve function.

21-22
"Execute" Logic & Demo
A proposal with enough approvals gets a bright green "Execute Payment" button. This calls the execute function, pays the student, and removes the item from the UI.

Demo Goal: Alice pays $15 for pizza, submits a proposal. Bob and Carol approve. Alice (or anyone) clicks "Execute," and she instantly gets her 15 USDC back.

Phase 4: Launch (Days 23-25)
Day(s)
Task
Outcome

23
Final Deployment
Deploy the final, tested contract to the Stellar Mainnet.

24
Landing Page
Create a simple landing page (on Vercel/Netlify) explaining the use cases.

25
Launch
Post the app in your university's student forums, the Stellar subreddit, and developer communities. Get your first real student house to use it.


💰 Pathways to Monetization
"Freemium" Model (Best for MVP):
Free Tier: "UniPots" are 100% free for groups of 3 or less.
Pro Tier (One-Time Fee): To create a "Club Pot" (4-15 members), our front-end charges a one-time $1.00 fee (in USDC). This fee is tiny, affordable for any student group, and covers our deployment cost. This model only works because the Stellar network fee is near-zero.

💻 The Tech Stack
This is the set of tools you'll use to build the application.
Blockchain: Stellar Blockchain
Smart Contract: 1x Soroban (Rust/Wasm) contract, which we'll call UniPotManager. (This is built in Phase 1).
Front-End: TBD
Wallet Integration: 🛰️ Freighter. The primary browser extension for the Stellar network or stellar’s own wallet.
JS/TS SDK: TBD
UI Library: TBD
Deployment: TBD



