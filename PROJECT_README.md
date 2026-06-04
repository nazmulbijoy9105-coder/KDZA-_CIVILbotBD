# KDZA Legal Literacy Bot - Bangladesh Civil Dispute Engine

A commercial web application providing legal literacy and structured analysis of Bangladesh civil disputes through AI-powered fact extraction, a 14-stage civil dispute reasoning engine, and persistent chat history with governance-level security.

## Overview

KDZA is a specialized legal analysis tool designed for Bangladesh civil law. It combines conversational AI with a sophisticated 14-stage dispute reasoning engine to help users understand their civil disputes, identify applicable law, determine jurisdiction, and assess procedural requirements.

**Key Principle:** This tool is for **legal literacy only, not legal advice**. For actual legal representation, users must consult with a Bangladesh Bar Council enrolled advocate.

## Architecture

### Technology Stack

- **Frontend:** React 19 + Tailwind CSS 4 + TypeScript
- **Backend:** Express 4 + tRPC 11 + TypeScript
- **Database:** MySQL/TiDB with Drizzle ORM
- **Authentication:** Manus OAuth + Bangladesh mobile login
- **LLM Integration:** Built-in Forge API for fact extraction and text extraction
- **File Storage:** S3-compatible storage via Manus platform

### Core Components

#### 1. **14-Stage Bangladesh Civil Dispute Engine** (`server/disputeEngine.ts`)

The engine implements a sophisticated multi-stage analysis pipeline:

| Stage | Purpose | Key Decisions |
|-------|---------|---------------|
| 0 | Entry Gate & Jurisdiction | Routes disputes to appropriate court (District Judge, Assistant Judge, Artha Rin Adalat) |
| 1 | Fact Extraction & Validation | Parses user input into structured CaseFacts |
| 2 | Legal Classification | Identifies dispute type (property, money, contract, etc.) |
| 2.5 | Substantive Law Check | Applies Transfer of Property Act, Succession Act, etc. |
| 3 | Precondition Filters | Checks prerequisites (government defendant notice, pre-deposit, etc.) |
| 4 | Limitation Engine | Determines if claim is time-barred under applicable statutes |
| 5 | Artha Rin Adalat Track | Routes certificate suits to specialized track |
| 6 | Order 37 Summary Suit | Evaluates summary suit eligibility |
| 7 | Specific Relief Act | Applies specific performance, injunction rules |
| 9 | Procedural Defect Decision | Identifies defects requiring dismissal or rejection |
| 10 | Partition | Handles partition suit rules |
| 11 | Adverse Possession | Evaluates 12-year possession requirement |
| 12 | Pre-emption | Applies pre-emption rights |
| 13 | Appeal Track | Determines appeal jurisdiction and procedure |

**Hybrid RAG Implementation:** The engine combines:
- **Retrieval:** Legal knowledge base queries for applicable statutes and precedents
- **Generation:** LLM-powered reasoning for case-specific analysis
- **Reasoning:** Deterministic business logic for jurisdiction and limitation calculations

#### 2. **LLM-Powered Fact Extraction** (`server/factExtraction.ts`)

Automatically parses user input to extract:
- Dispute type and relief sought
- Parties (plaintiff, defendant, government involvement)
- Property details (location, type, value)
- Claim amount and dates
- Documents and evidence
- Procedural history

Maps extracted facts to the `CaseFacts` data model for engine processing.

#### 3. **Text Extraction Service** (`server/textExtraction.ts`)

Automated extraction from multiple file types:
- **Images:** OCR via LLM vision API
- **PDFs:** PDF parsing via LLM file_url capability
- **Word Documents:** DOCX parsing via LLM file_url capability
- **Plain Text:** Direct text reading

Each file is extracted once and stored separately to prevent duplication.

#### 4. **Chat Interface** (`client/src/pages/Chat.tsx`)

Dark-themed conversational UI featuring:
- Real-time message streaming
- Bilingual labels (Bengali/English) for all legal terms
- Legal disclaimer on every response
- Persistent chat history
- Markdown rendering for structured outputs
- Responsive mobile-first design

#### 5. **Landing Page** (`client/src/pages/Landing.tsx`)

Brutalist typography design with:
- Massive black-on-white sans-serif typography
- High-contrast asymmetric layout
- Thick geometric borders and lines
- Feature highlights with bilingual labels
- Prominent legal disclaimer
- Call-to-action to start analysis

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, openId, name, email, role, lastSignedIn |
| `chat_messages` | Chat history | id, userId, content, role, createdAt |
| `disputes` | Dispute analysis records | id, userId, factsJson, engineOutput, createdAt |
| `subscription_tiers` | Subscription plans | id, name, fileUploadLimit, textExtractionEnabled |
| `user_subscriptions` | User subscription status | id, userId, tierId, status, expiryDate |
| `files` | Uploaded files | id, userId, fileName, fileType, storageKey, fileSize |
| `extracted_texts` | Extracted text from files | id, fileId, userId, extractedContent, extractionMethod |
| `audit_logs` | Governance audit trail | id, userId, action, resourceType, resourceId, status, timestamp |
| `legal_knowledge_base` | Legal reference data | id, category, title, content, bengaliLabel |

## Security & Access Control

### Admin Access
- **Owner:** nazmulbijoy9105 (identified by openId)
- **Access:** Full system access, audit log viewing, subscription management
- **Enforcement:** Checked in file router and audit procedures

### Subscription-Based Features
- **File Uploads:** Subscription users only
- **Text Extraction:** Subscription users with extraction-enabled tier
- **Limits:** Per-tier file upload limits enforced

### Audit Logging
All operations logged with:
- User ID and action type
- Resource type and ID
- IP address and user agent
- Success/failure status
- Timestamp
- Detailed operation notes

## API Endpoints

### Chat Operations
```typescript
trpc.chat.sendMessage({ message: string })
trpc.chat.getHistory()
```

### File Operations
```typescript
trpc.files.uploadFile({ fileName, fileType, fileContent })
trpc.files.extractText({ fileId, fileUrl, fileType })
trpc.files.getUserFiles()
```

### Admin Operations
```typescript
trpc.files.getAuditLogs({ userId?, limit? })
```

## Data Models

### CaseFacts
```typescript
interface CaseFacts {
  plaintiffType: "Individual" | "Company" | "Government";
  defendantType: "Individual" | "Company" | "Government";
  isGovernmentDefendant: boolean;
  s80NoticeGiven: boolean;
  disputeType: DisputeType;
  reliefSought: ReliefType;
  causeOfActionDate: Date;
  suitFilingDate: Date;
  claimAmount: number;
  // ... additional fields for property, documents, etc.
}
```

### DisputeOutput
```typescript
interface DisputeOutput {
  court: CourtType;
  track: string;
  reasoning: string[];
  defects: ProceduralDefect[];
  decision: string;
}
```

## Bilingual Support

All key legal terms include Bengali translations:
- বিবাদের ধরন (Dispute Type)
- প্রার্থিত প্রতিকার (Relief Sought)
- দাবির পরিমাণ (Claim Amount)
- আইনি সীমাবদ্ধতা (Limitation)
- অধিক্ষেত্র (Jurisdiction)

## Legal Disclaimer

**This is for legal literacy only, not legal advice.** KDZA provides educational analysis of Bangladesh civil law for general understanding purposes. It is not a substitute for professional legal advice.

For actual legal advice, representation, or proceedings, users must consult with a lawyer enrolled with the Bangladesh Bar Council. Only a qualified advocate can provide legal advice tailored to specific situations.

## Testing

### Test Coverage
- **Dispute Engine:** 8 vitest tests covering jurisdiction routing, limitation analysis, specific performance, adverse possession, and family court routing
- **Authentication:** Logout functionality tested
- **Total:** 9 tests passing

### Running Tests
```bash
pnpm test
```

## Deployment

### Environment Variables
```
DATABASE_URL=mysql://...
JWT_SECRET=...
VITE_APP_ID=...
OAUTH_SERVER_URL=...
VITE_OAUTH_PORTAL_URL=...
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
```

### Build & Start
```bash
pnpm build
pnpm start
```

## Development

### Project Structure
```
client/
  src/
    pages/
      Landing.tsx          # Brutalist landing page
      Chat.tsx             # Dark-themed chat interface
    components/            # Reusable UI components
    lib/trpc.ts           # tRPC client
    App.tsx               # Route definitions
    index.css             # Global styles
drizzle/
  schema.ts               # Database schema
  migrations/             # SQL migrations
server/
  disputeEngine.ts        # 14-stage reasoning engine
  factExtraction.ts       # LLM fact extraction
  textExtraction.ts       # File text extraction
  fileRouter.ts           # File upload/extraction API
  chatRouter.ts           # Chat API
  db.ts                   # Database queries
  routers.ts              # tRPC router definitions
```

### Development Server
```bash
pnpm dev
```

Server runs on `http://localhost:3000` with hot reload enabled.

## Future Enhancements

- Admin dashboard UI for audit log viewing and subscription management
- Bangladesh mobile number validation and SMS OTP authentication
- File management UI for users to view and manage uploaded documents
- Seed data for subscription tiers (Free, Premium, Enterprise)
- Security headers and CORS configuration
- Expanded audit logging for user access and data modifications
- Reusable admin procedure middleware
- Chat persistence verification tests
- Comprehensive RBAC implementation

## Support & Feedback

For inquiries, bug reports, or feature requests, please contact the development team.

---

**Owner:** nazmulbijoy9105  
**Created:** May 2026  
**License:** Commercial - All rights reserved
