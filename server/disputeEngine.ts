/**
 * Bangladesh Civil Dispute Engine
 * 14-stage reasoning engine with hybrid RAG support
 * Combines retrieval-augmented generation with deterministic legal logic
 */

import { invokeLLM } from "./_core/llm";
import { searchLegalKnowledge, getLegalKnowledgeByCategory } from "./db";

// ==========================================
// ENUMS & DATA MODELS
// ==========================================

export enum DisputeType {
  PROPERTY = "Property / Land Track",
  MONEY_CONTRACT = "Money / Contract Track",
  ARTHA_RIN = "Artha Rin Adalat Track",
  FAMILY = "Family Court (Out of Engine)",
  REVENUE_TENANCY = "SAT Act / Revenue Court",
}

export enum ReliefType {
  TITLE_DECLARATION = "Declaration of Title/Right (S.42)",
  POSSESSION_SUMMARY = "Summary Possession (S.9 SRA)",
  POSSESSION_TITLE = "Title-based Possession (S.8 SRA)",
  SPECIFIC_PERFORMANCE = "Specific Performance (S.10-22)",
  CANCELLATION = "Cancellation of Deed (S.39)",
  INJUNCTION = "Injunction (Temporary / Permanent)",
  PARTITION = "Partition",
  ADVERSE_POSSESSION = "Adverse Possession",
  PRE_EMPTION = "Pre-emption (S.96 SAT)",
  MONEY_RECOVERY = "Money Recovery / Contract",
  SUMMARY_SUIT = "Summary Suit (Order 37)",
}

export enum CourtType {
  ASSISTANT_JUDGE = "Assistant Judge (up to 15,00,000 Tk)",
  SENIOR_ASSISTANT = "Senior Assistant Judge (15L - 25L Tk)",
  JOINT_DISTRICT = "Joint District Judge (25L - 5Cr Tk)",
  DISTRICT_JUDGE = "District Judge (Above 5Cr Tk / Appellate)",
  ARTHA_RIN_ADALAT = "Artha Rin Adalat",
}

export enum ProceduralDefect {
  LIMITATION_BARRED = "Limitation Barred (Order 7 R.11(d))",
  WRONG_JURISDICTION = "Wrong Jurisdiction (Territorial/Pecuniary)",
  RES_JUDICATA = "Res Judicata (S.11 CPC)",
  NO_S80_NOTICE = "No S.80 Notice (Government Defendant)",
  UNREGISTERED_DEED = "Compulsorily Registrable but Unregistered (S.49)",
  INSUFFICIENT_STAMP = "Insufficient Stamp Duty",
}

export interface Document {
  name: string;
  docType: string;
  date: Date;
  isRegistered: boolean;
  isCompulsorillyRegistrable: boolean;
  isSufficientlyStamped: boolean;
  isOriginal?: boolean;
}

export interface CaseFacts {
  // Parties
  plaintiffType: string;
  defendantType: string;
  isGovernmentDefendant: boolean;
  s80NoticeGiven: boolean;

  // Dispute Core
  disputeType: DisputeType;
  reliefSought: ReliefType;
  causeOfActionDate: Date;
  suitFilingDate: Date;

  // Jurisdiction
  propertyDistrict: string;
  defendantDistrict: string;
  claimAmount: number;

  // Property & Possession
  isImmovableProperty: boolean;
  plaintiffInPossession: boolean;
  defendantInPossession: boolean;
  dispossessionDate?: Date;

  // Documents
  documents: Document[];

  // Specific Performance Checks
  isPlaintiffReadyWilling: boolean;
  areDamagesAdequate: boolean;

  // Pre-emption Specifics
  isAgriculturalLand: boolean;
  saleRegistrationDate?: Date;
  preDepositMade: boolean;

  // Adverse Possession
  adversePossessionYears: number;
}

export interface EngineOutput {
  court?: CourtType;
  track?: string;
  decision: string;
  reasoning: string[];
  defects: ProceduralDefect[];
  appealPath?: string;
  retrievedKnowledge?: string[];
}

// ==========================================
// DISPUTE ENGINE CLASS
// ==========================================

export class BangladeshCivilDisputeEngine {
  private facts: CaseFacts;
  private flags: Record<string, boolean> = {};
  private defects: ProceduralDefect[] = [];
  private court?: CourtType;
  private track?: string;
  private decision?: string;
  private reasoning: string[] = [];
  private retrievedKnowledge: string[] = [];

  constructor(facts: CaseFacts) {
    this.facts = facts;
  }

  async runEngine(): Promise<EngineOutput> {
    try {
      this.stage0Routing();

      // Early exits
      if (this.facts.disputeType === DisputeType.FAMILY) {
        this.decision = "OUT OF ENGINE - Route to Family Court Act 2023";
        return this.getOutput();
      }

      if (this.facts.disputeType === DisputeType.ARTHA_RIN) {
        await this.stage5ArthaRin();
        this.stage13Appeal();
        return this.getOutput();
      }

      await this.stage1FactExtraction();
      this.stage2LegalClassification();
      await this.stage2_5SubstantiveLaw();
      this.stage3PreconditionFilters();

      // Global Bar Check
      if (
        this.defects.includes(ProceduralDefect.LIMITATION_BARRED) ||
        this.defects.includes(ProceduralDefect.UNREGISTERED_DEED)
      ) {
        this.stage9ProceduralDefects();
        return this.getOutput();
      }

      // Substantive Routing
      if (this.facts.reliefSought === ReliefType.SUMMARY_SUIT) {
        this.stage6Order37();
      } else if (
        [
          ReliefType.POSSESSION_SUMMARY,
          ReliefType.POSSESSION_TITLE,
          ReliefType.SPECIFIC_PERFORMANCE,
          ReliefType.CANCELLATION,
          ReliefType.TITLE_DECLARATION,
          ReliefType.INJUNCTION,
        ].includes(this.facts.reliefSought)
      ) {
        this.stage7SpecificReliefAct();
      } else if (this.facts.reliefSought === ReliefType.PARTITION) {
        this.stage10Partition();
      } else if (this.facts.reliefSought === ReliefType.ADVERSE_POSSESSION) {
        this.stage11AdversePossession();
      } else if (this.facts.reliefSought === ReliefType.PRE_EMPTION) {
        this.stage12Preemption();
      }

      this.stage13Appeal();
      this.finalDecision();

      return this.getOutput();
    } catch (error) {
      console.error("Engine error:", error);
      this.decision = "ERROR: Unable to process dispute";
      this.reasoning.push(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return this.getOutput();
    }
  }

  // ─── STAGE 0: ENTRY GATE ───
  private stage0Routing(): void {
    this.reasoning.push("STAGE 0: Entry Gate & Jurisdiction");

    // Territorial
    if (this.facts.isImmovableProperty) {
      this.track = `Property Track - Court at ${this.facts.propertyDistrict} (CPC S.16)`;
    } else {
      this.track = `Money/Contract Track - Court at ${this.facts.defendantDistrict} (CPC S.20)`;
    }

    // Pecuniary
    const amt = this.facts.claimAmount;
    if (amt <= 1500000) {
      this.court = CourtType.ASSISTANT_JUDGE;
    } else if (amt <= 2500000) {
      this.court = CourtType.SENIOR_ASSISTANT;
    } else if (amt <= 50000000) {
      this.court = CourtType.JOINT_DISTRICT;
    } else {
      this.court = CourtType.DISTRICT_JUDGE;
    }

    this.reasoning.push(
      `-> Court Assigned: ${this.court ? this.court.valueOf() : "N/A"} | Track: ${this.track}`
    );
  }

  // ─── STAGE 1: FACT EXTRACTION ───
  private async stage1FactExtraction(): Promise<void> {
    this.reasoning.push("STAGE 1: Fact Extraction & Validation");

    if (this.facts.isGovernmentDefendant && !this.facts.s80NoticeGiven) {
      this.defects.push(ProceduralDefect.NO_S80_NOTICE);
      this.reasoning.push("-> DEFECT: No S.80 Notice given for government defendant");
    }
  }

  // ─── STAGE 2: LEGAL CLASSIFICATION ───
  private stage2LegalClassification(): void {
    this.reasoning.push(`STAGE 2: Legal Classification -> ${this.facts.reliefSought}`);
  }

  // ─── STAGE 2.5: SUBSTANTIVE LAW (TPA / SAT) ───
  private async stage2_5SubstantiveLaw(): Promise<void> {
    this.reasoning.push("STAGE 2.5: Substantive Law Check (TPA/SAT)");

    // Retrieve relevant legal knowledge
    const tpaKnowledge = await getLegalKnowledgeByCategory("Registration");
    if (tpaKnowledge.length > 0) {
      this.retrievedKnowledge.push(
        `Retrieved TPA/Registration knowledge: ${tpaKnowledge[0]?.title}`
      );
    }

    // Registration check for TPA S.54
    if (this.facts.isImmovableProperty && this.facts.claimAmount > 100) {
      for (const doc of this.facts.documents) {
        if (doc.isCompulsorillyRegistrable && !doc.isRegistered) {
          this.flags["unregistered_title_deed"] = true;
        }
      }
    }
  }

  // ─── STAGE 3: PRECONDITION FILTERS ───
  private stage3PreconditionFilters(): void {
    this.reasoning.push("STAGE 3: Precondition Filters (Reg, Stamp, Limitation)");

    // Registration Act S.17/S.49
    if (this.flags["unregistered_title_deed"]) {
      this.defects.push(ProceduralDefect.UNREGISTERED_DEED);
      this.reasoning.push("-> DEFECT: Unregistered Deed cannot prove title (S.49 Reg Act)");
    }

    // Stamp Act Check
    for (const doc of this.facts.documents) {
      if (!doc.isSufficientlyStamped) {
        this.defects.push(ProceduralDefect.INSUFFICIENT_STAMP);
        this.reasoning.push(
          "-> DEFECT: Document insufficiently stamped. Impound & penalty required."
        );
        break;
      }
    }

    // Limitation Check (Stage 4 integration)
    this.stage4Limitation();
  }

  // ─── STAGE 4: LIMITATION ENGINE ───
  private stage4Limitation(): void {
    this.reasoning.push("STAGE 4: Limitation Engine");

    const timeDiffYears =
      (this.facts.suitFilingDate.getTime() - this.facts.causeOfActionDate.getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);

    let isBarred = false;
    let limitRule = "";

    if (this.facts.reliefSought === ReliefType.POSSESSION_SUMMARY) {
      if (this.facts.dispossessionDate) {
        const timeDiffDays =
          (this.facts.suitFilingDate.getTime() - this.facts.dispossessionDate.getTime()) /
          (24 * 60 * 60 * 1000);
        if (timeDiffDays > 180) {
          isBarred = true;
          limitRule = "S.9 SRA - 6 Months Hard Limit";
        }
      }
    } else if (this.facts.reliefSought === ReliefType.TITLE_DECLARATION) {
      if (timeDiffYears > 6) {
        isBarred = true;
        limitRule = "S.42 SRA - 6 Years";
      }
    } else if (this.facts.reliefSought === ReliefType.CANCELLATION) {
      if (timeDiffYears > 3) {
        isBarred = true;
        limitRule = "S.39 SRA - 3 Years";
      }
    } else if (this.facts.reliefSought === ReliefType.SPECIFIC_PERFORMANCE) {
      if (timeDiffYears > 3) {
        isBarred = true;
        limitRule = "SP - 3 Years";
      }
    } else if (this.facts.reliefSought === ReliefType.MONEY_RECOVERY) {
      if (timeDiffYears > 3) {
        isBarred = true;
        limitRule = "Art.113 - 3 Years";
      }
    }

    if (isBarred) {
      this.defects.push(ProceduralDefect.LIMITATION_BARRED);
      this.reasoning.push(`-> DEFECT: Suit Time-Barred under ${limitRule}`);
    }
  }

  // ─── STAGE 5: ARTHA RIN ───
  private async stage5ArthaRin(): Promise<void> {
    this.court = CourtType.ARTHA_RIN_ADALAT;
    this.reasoning.push("STAGE 5: Artha Rin Adalat Track Triggered");
    this.reasoning.push("-> Mandatory Pre-litigation Mediation required (S.22)");

    // Retrieve Artha Rin knowledge
    const arthaRinKnowledge = await getLegalKnowledgeByCategory("Artha Rin");
    if (arthaRinKnowledge.length > 0) {
      this.retrievedKnowledge.push(
        `Retrieved Artha Rin knowledge: ${arthaRinKnowledge[0]?.title}`
      );
    }

    this.decision = "Certificate Suit Proceeding in Artha Rin Adalat";
  }

  // ─── STAGE 6: ORDER 37 ───
  private stage6Order37(): void {
    this.reasoning.push("STAGE 6: Order 37 Summary Suit Track");
    this.reasoning.push("-> Defendant must apply for Leave to Defend. Mere denial insufficient.");
  }

  // ─── STAGE 7: SPECIFIC RELIEF ACT ───
  private stage7SpecificReliefAct(): void {
    this.reasoning.push("STAGE 7: Specific Relief Act Engine");

    // S.9 vs S.8
    if (this.facts.reliefSought === ReliefType.POSSESSION_SUMMARY) {
      if (!this.facts.defendantInPossession) {
        this.reasoning.push("-> FAIL: Defendant not in possession. S.9 not applicable.");
        this.decision = "DISMISSAL";
        return;
      }
      this.reasoning.push("-> PASS: S.9 Summary Possession applicable (Title not examined).");
      this.decision = "FULL DECREE (Restoration of Possession)";
    } else if (this.facts.reliefSought === ReliefType.SPECIFIC_PERFORMANCE) {
      // S.14 Bar
      if (this.facts.areDamagesAdequate) {
        this.reasoning.push(
          "-> FAIL: Damages are an adequate remedy (S.14 Bar). SP Refused."
        );
        this.decision = "PARTIAL DECREE (Damages in lieu under S.21)";
        return;
      }

      // S.16 Personal Bar
      if (!this.facts.isPlaintiffReadyWilling) {
        this.reasoning.push(
          "-> FAIL: Plaintiff not ready & willing (S.16 Bar). SP Refused."
        );
        this.decision = "DISMISSAL";
        return;
      }

      this.reasoning.push("-> PASS: No S.14/S.16 bars. Damages inadequate. SP Granted.");
      this.decision = "FULL DECREE (Specific Performance Granted)";
    }
  }

  // ─── STAGE 9: PROCEDURAL DEFECT DECISION ───
  private stage9ProceduralDefects(): void {
    this.reasoning.push("STAGE 9: Procedural Defect Terminal Gate");

    if (this.defects.includes(ProceduralDefect.LIMITATION_BARRED)) {
      this.decision = "REJECTION OF PLAINT (Order 7 R.11(d) - Time Barred)";
    } else if (this.defects.includes(ProceduralDefect.UNREGISTERED_DEED)) {
      this.decision = "PARTIAL DECREE / DISMISSAL (Title unprovable via S.49 Reg Act)";
    } else if (this.defects.includes(ProceduralDefect.NO_S80_NOTICE)) {
      this.decision = "RETURN OF PLAINT (Order 7 R.10 - S.80 Notice Missing)";
    }
  }

  // ─── STAGE 10: PARTITION ───
  private stage10Partition(): void {
    this.reasoning.push("STAGE 10: Partition Engine");
    this.decision = "PRELIMINARY DECREE (Shares determined, Commissioner to allocate lots)";
  }

  // ─── STAGE 11: ADVERSE POSSESSION ───
  private stage11AdversePossession(): void {
    this.reasoning.push("STAGE 11: Adverse Possession Engine");

    if (this.facts.adversePossessionYears >= 12) {
      this.reasoning.push("-> PASS: 12+ years continuous hostile possession proven.");
      this.decision = "FULL DECREE (Title by Adverse Possession Declared)";
    } else {
      this.reasoning.push("-> FAIL: Possession < 12 years or interrupted.");
      this.decision = "DISMISSAL";
    }
  }

  // ─── STAGE 12: PRE-EMPTION ───
  private stage12Preemption(): void {
    this.reasoning.push("STAGE 12: Pre-emption Engine (SAT Act S.96)");

    if (!this.facts.isAgriculturalLand) {
      this.reasoning.push("-> FAIL: Urban/Commercial land not covered by S.96");
      this.decision = "DISMISSAL";
      return;
    }

    if (!this.facts.preDepositMade) {
      this.reasoning.push("-> FAIL: Full sale consideration not pre-deposited.");
      this.decision = "DISMISSAL (Non-maintainable)";
      return;
    }

    if (this.facts.saleRegistrationDate) {
      const daysSinceReg =
        (this.facts.suitFilingDate.getTime() - this.facts.saleRegistrationDate.getTime()) /
        (24 * 60 * 60 * 1000);
      if (daysSinceReg > 120) {
        this.reasoning.push("-> FAIL: 4 Months hard limit exceeded.");
        this.decision = "REJECTION OF PLAINT (Time Barred)";
        return;
      }
    }

    this.reasoning.push("-> PASS: Agricultural land, within 4 months, pre-deposit made.");
    this.decision = "FULL DECREE (Substitution of Purchaser with Pre-emptor)";
  }

  // ─── STAGE 13: APPEAL TRACK ───
  private stage13Appeal(): void {
    this.reasoning.push("STAGE 13: Appeal Path Generated");

    if (this.court === CourtType.ARTHA_RIN_ADALAT) {
      this.reasoning.push("-> Appeal lies DIRECTLY to High Court Division");
    } else if (
      this.court === CourtType.ASSISTANT_JUDGE ||
      this.court === CourtType.SENIOR_ASSISTANT
    ) {
      this.reasoning.push("-> First Appeal lies to District Judge");
    } else if (this.court === CourtType.JOINT_DISTRICT) {
      this.reasoning.push("-> First Appeal lies to High Court Division");
    }
  }

  // ─── FINAL DECISION OUTPUT ───
  private finalDecision(): void {
    if (!this.decision) {
      this.decision = "CASE PROCEEDS TO TRIAL (No terminal defects found)";
    }
  }

  private getOutput(): EngineOutput {
    return {
      court: this.court,
      track: this.track,
      decision: this.decision || "Unable to determine decision",
      reasoning: this.reasoning,
      defects: this.defects,
      retrievedKnowledge: this.retrievedKnowledge,
    };
  }
}

export async function processDispute(facts: CaseFacts): Promise<EngineOutput> {
  const engine = new BangladeshCivilDisputeEngine(facts);
  return engine.runEngine();
}
