import { describe, it, expect } from "vitest";
import {
  BangladeshCivilDisputeEngine,
  CaseFacts,
  DisputeType,
  ReliefType,
  CourtType,
  ProceduralDefect,
} from "./disputeEngine";

describe("BangladeshCivilDisputeEngine", () => {
  it("should correctly route a property dispute to Assistant Judge for low claim amount", async () => {
    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Individual",
      isGovernmentDefendant: false,
      s80NoticeGiven: false,
      disputeType: DisputeType.PROPERTY,
      reliefSought: ReliefType.TITLE_DECLARATION,
      causeOfActionDate: new Date("2020-01-01"),
      suitFilingDate: new Date("2024-01-01"),
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 500000,
      isImmovableProperty: true,
      plaintiffInPossession: false,
      defendantInPossession: true,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: false,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 0,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.court).toBe(CourtType.ASSISTANT_JUDGE);
    expect(output.track).toContain("Property Track");
    expect(output.reasoning.length).toBeGreaterThan(0);
  });

  it("should detect time-barred summary possession (exceeds 6 months)", async () => {
    const dispossessionDate = new Date("2023-01-01");
    const suitFilingDate = new Date("2024-01-01");

    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Individual",
      isGovernmentDefendant: false,
      s80NoticeGiven: false,
      disputeType: DisputeType.PROPERTY,
      reliefSought: ReliefType.POSSESSION_SUMMARY,
      causeOfActionDate: dispossessionDate,
      suitFilingDate,
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 1000000,
      isImmovableProperty: true,
      plaintiffInPossession: false,
      defendantInPossession: true,
      dispossessionDate,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: false,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 0,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.defects).toContain(ProceduralDefect.LIMITATION_BARRED);
    expect(output.decision).toContain("Time Barred");
  });

  it("should grant specific performance when damages are inadequate and plaintiff is ready", async () => {
    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Individual",
      isGovernmentDefendant: false,
      s80NoticeGiven: false,
      disputeType: DisputeType.PROPERTY,
      reliefSought: ReliefType.SPECIFIC_PERFORMANCE,
      causeOfActionDate: new Date("2022-01-01"),
      suitFilingDate: new Date("2024-01-01"),
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 2000000,
      isImmovableProperty: true,
      plaintiffInPossession: false,
      defendantInPossession: false,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: false,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 0,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.decision).toContain("FULL DECREE");
    expect(output.decision).toContain("Specific Performance");
  });

  it("should reject specific performance when damages are adequate", async () => {
    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Individual",
      isGovernmentDefendant: false,
      s80NoticeGiven: false,
      disputeType: DisputeType.PROPERTY,
      reliefSought: ReliefType.SPECIFIC_PERFORMANCE,
      causeOfActionDate: new Date("2022-01-01"),
      suitFilingDate: new Date("2024-01-01"),
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 2000000,
      isImmovableProperty: true,
      plaintiffInPossession: false,
      defendantInPossession: false,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: true,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 0,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.decision).toContain("PARTIAL DECREE");
    expect(output.decision).toContain("Damages");
  });

  it("should handle adverse possession with 12+ years", async () => {
    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Individual",
      isGovernmentDefendant: false,
      s80NoticeGiven: false,
      disputeType: DisputeType.PROPERTY,
      reliefSought: ReliefType.ADVERSE_POSSESSION,
      causeOfActionDate: new Date("2010-01-01"),
      suitFilingDate: new Date("2024-01-01"),
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 1500000,
      isImmovableProperty: true,
      plaintiffInPossession: true,
      defendantInPossession: false,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: false,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 14,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.decision).toContain("FULL DECREE");
    expect(output.decision).toContain("Adverse Possession");
  });

  it("should dismiss adverse possession with less than 12 years", async () => {
    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Individual",
      isGovernmentDefendant: false,
      s80NoticeGiven: false,
      disputeType: DisputeType.PROPERTY,
      reliefSought: ReliefType.ADVERSE_POSSESSION,
      causeOfActionDate: new Date("2020-01-01"),
      suitFilingDate: new Date("2024-01-01"),
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 1500000,
      isImmovableProperty: true,
      plaintiffInPossession: true,
      defendantInPossession: false,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: false,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 4,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.decision).toContain("DISMISSAL");
  });

  it("should route family disputes out of engine", async () => {
    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Individual",
      isGovernmentDefendant: false,
      s80NoticeGiven: false,
      disputeType: DisputeType.FAMILY,
      reliefSought: ReliefType.TITLE_DECLARATION,
      causeOfActionDate: new Date("2020-01-01"),
      suitFilingDate: new Date("2024-01-01"),
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 0,
      isImmovableProperty: false,
      plaintiffInPossession: false,
      defendantInPossession: false,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: false,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 0,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.decision).toContain("OUT OF ENGINE");
    expect(output.decision).toContain("Family Court");
  });

  it("should detect missing S.80 notice for government defendant", async () => {
    const facts: CaseFacts = {
      plaintiffType: "Individual",
      defendantType: "Government",
      isGovernmentDefendant: true,
      s80NoticeGiven: false,
      disputeType: DisputeType.PROPERTY,
      reliefSought: ReliefType.TITLE_DECLARATION,
      causeOfActionDate: new Date("2020-01-01"),
      suitFilingDate: new Date("2024-01-01"),
      propertyDistrict: "Dhaka",
      defendantDistrict: "Dhaka",
      claimAmount: 1000000,
      isImmovableProperty: true,
      plaintiffInPossession: false,
      defendantInPossession: true,
      documents: [],
      isPlaintiffReadyWilling: true,
      areDamagesAdequate: false,
      isAgriculturalLand: false,
      preDepositMade: false,
      adversePossessionYears: 0,
    };

    const engine = new BangladeshCivilDisputeEngine(facts);
    const output = await engine.runEngine();

    expect(output.defects).toContain(ProceduralDefect.NO_S80_NOTICE);
  });
});
