📘 SnapShelf — Product Requirements Document (FINAL)
1. Product Summary

Product Name: SnapShelf
Category: Consumer productivity / food waste reduction
Platform: Mobile-first (iOS / Android), API-driven backend
Business Model: Freemium → subscription

SnapShelf helps households reduce food waste by making food tracking frictionless, trustworthy, and actionable, using AI strictly as an assistant rather than an authority.

The product emphasizes:

low-effort ingestion

transparent expiry tracking

explicit user control over all trusted data

2. Problem Statement

Household food waste is primarily caused by:

forgetting what food exists

uncertainty about expiry and safety

lack of planning around soon-to-expire items

friction in tracking inventory consistently

Existing solutions fail because they:

require excessive manual input

over-automate with untrustworthy AI

hide assumptions and logic

do not integrate naturally into shopping and cooking habits

3. Product Goals
Primary Goals

Reduce household food waste

Minimize effort required to track food

Maintain user trust through explicit confirmation

Provide actionable insights (what to eat next, what to buy less)

Secondary Goals

Serve as a defensible final-year engineering project

Be realistically launchable as a real product

Be maintainable by a solo developer

4. Non-Goals (Explicitly Out of Scope)

The following are deliberately excluded to prevent overengineering:

Smart fridge or IoT hardware integration

Fully automated inventory creation without user confirmation

Enterprise / B2B features

Social features (shared inventories, social feeds)

Recipe originality or culinary creativity as a primary goal

Perfect food recognition accuracy

5. Target Users
Primary Users

Students and young professionals

Small households (1–4 people)

Budget-conscious users

Users who shop weekly and cook at home

Secondary Users

Environmentally conscious households

Users interested in meal planning and food optimization

6. Core Product Principles (Hard Rules)

These principles override convenience and must be enforced at all layers:

AI is advisory, never authoritative

No trusted data without explicit user confirmation

Backend is the single source of truth

Draft data is disposable; inventory data is sacred

Clarity > automation

7. Core Domain Model
Entities
User

Represents a single household account.

id (UUID)

email

created_at

DraftItem (Untrusted)

Represents food items inferred from user input or AI processing.

id (UUID)

user_id (UUID)

name (nullable)

category (nullable)

quantity (nullable)

unit (nullable)

storage_location (nullable)

predicted_expiry_date (nullable)

confidence_score (nullable)

source (manual | barcode | image | receipt)

created_at

updated_at

Rules:

Can be incomplete or inaccurate

Can be edited freely

Can be discarded without side effects

Never used for alerts, analytics, or recommendations

InventoryItem (Trusted)

Represents confirmed food items stored in the user’s inventory.

id (UUID)

user_id (UUID)

name

category

quantity

unit

storage_location

expiry_date

created_at

Rules:

Created only via explicit confirmation of DraftItems

Used for alerts, analytics, and recipes

Core fields immutable after creation (except quantity adjustments)

8. Canonical Data Flow
User Input
(text | barcode | image | receipt)
        ↓
Ingestion Adapter
(NLP / Vision / Barcode / OCR)
        ↓
DraftItem(s)
        ↓
User Review & Confirmation
        ↓
InventoryItem(s)


No shortcuts. No exceptions.

9. Ingestion Methods
9.1 Manual / Natural Language

Free-text input

LLM parses items into DraftItems

User reviews and edits before confirmation

9.2 Barcode Scan

Phone camera barcode scanning

Product metadata lookup (e.g. OpenFoodFacts)

DraftItem created with low confidence

9.3 Image Capture

YOLO-based multi-object detection

Detects food categories, not brands

Produces multiple DraftItems

9.4 Receipt Scan

OCR + LLM parsing

Converts receipt items into DraftItems

Requires full user review

10. Expiry Prediction
Design

Modular expiry prediction service

Supports:

rule-based heuristics

lightweight regression models

Inputs may include:

category

storage location

packaging state

food type

Rules

All expiry predictions are suggestions

User can override before confirmation

Prediction logic must be independently testable and deterministic where possible

11. Alerts & Insights
Alerts

Push notifications before expiry

User-configurable thresholds

Insights

Most wasted categories

Consumption speed per category

Suggested purchase reduction (e.g. “Buy fewer bananas”)

Insights are derived only from InventoryItems.

12. Recipe Recommendation (Important Clarification)
Approach (Locked)

No custom recipe ML model

Recipe recommendations use:

deterministic filtering of InventoryItems

LLM-based generation constrained by inventory data

Rules

Recipes prioritize soon-to-expire InventoryItems

LLM may not invent ingredients silently

Output must list:

used ingredients

missing ingredients (if any)

Recipes are suggestions, not guarantees

Justification

LLMs outperform small custom models without proprietary data

Deterministic constraints ensure correctness and trust

Clear separation between system state and AI output

13. Mobile App (Client)
Core Screens

Home (urgent items)

Add food (4 ingestion options)

Draft review & confirmation

Inventory list

Insights dashboard

Settings

Requirements

Offline-friendly ingestion

Sync on reconnect

Minimal friction for common actions

14. Authentication (Deferred)
Phase 1

Single-user mode or stub user

No JWT

Focus on core flows

Phase 2

Email-based authentication

JWT

Passwordless preferred

15. Monetization (Corrected)
Free Tier (Core Mission)

Unlimited inventory items

Manual and barcode ingestion

Basic expiry tracking

Basic alerts

Core waste-reduction functionality must remain free.

Premium Tier (AI & Convenience)

AI recipe recommendations

Meal planning

Receipt scanning

Image-based multi-item detection

Advanced analytics and insights

Priority AI features

Monetization is based on compute-heavy convenience, not limiting core functionality.

16. Technical Architecture
Backend

FastAPI

SQLAlchemy

PostgreSQL (production)

SQLite (local development)

AI

YOLO for vision

LLMs for parsing and recipes

No trained ML models

Deployment

Cloud deployment TBD

Platform-agnostic (e.g. Vercel, managed services)

No infrastructure assumptions baked into code

17. Testing Strategy
High Priority

Draft → Inventory confirmation

Expiry prediction determinism

User scoping and isolation

Cascade deletes

Low Priority

Vision accuracy benchmarking

LLM creativity

UI automation

18. Risks & Mitigations
Risk	Mitigation
AI hallucinations	DraftItem system
Scope creep	PRD enforcement
Overengineering	Single-service backend
Time constraints	Incremental milestones
19. Milestones (Realistic)

Core models + confirmation flow

Manual ingestion MVP

Expiry prediction v1

Mobile app MVP

Analytics & alerts

Auth + monetization

20. Success Criteria

User can add food in <10 seconds

No InventoryItem created without confirmation

System explainable in academic defense

Backend maintainable by one developer

END OF PRD