/**
 * LLM-powered fact extraction service
 * Parses user input and maps to CaseFacts data model
 */

import { invokeLLM } from "./_core/llm";
import { searchLegalKnowledge } from "./db";
import {
  CaseFacts,
  DisputeType,
  ReliefType,
  Document,
} from "./disputeEngine";

interface ExtractedFacts {
  success: boolean;
  facts?: CaseFacts;
  error?: string;
  clarification?: string;
}

const FACT_EXTRACTION_SYSTEM_PROMPT = `You are a legal facts extraction assistant for Bangladesh civil law disputes. 
Your task is to parse user input and extract structured legal facts that can be processed by a civil dispute engine.

Extract the following information:
1. Dispute Type: Property, Money/Contract, Artha Rin, Family, or Revenue/Tenancy
2. Relief Sought: Declaration of Title, Summary Possession, Specific Performance, Cancellation, Injunction, Partition, Adverse Possession, Pre-emption, Money Recovery, or Summary Suit
3. Parties: Plaintiff type, Defendant type, whether government is defendant
4. Dates: Cause of action date, suit filing date, dispossession date if applicable
5. Jurisdiction: Property district, defendant district, claim amount
6. Property: Is it immovable property? Possession status
7. Documents: Any deeds, agreements, or documents mentioned
8. Special factors: S.80 notice, damages adequacy, agricultural land, adverse possession years, etc.

Return a JSON object with all extracted facts. If information is missing or unclear, indicate it with null or ask for clarification.`;

export async function extractFactsFromUserInput(userInput: string): Promise<ExtractedFacts> {
  try {
    // First, retrieve relevant legal knowledge for context
    const relevantKnowledge = await searchLegalKnowledge(userInput);
    const knowledgeContext = relevantKnowledge
      .map((k) => `${k.section}: ${k.title}`)
      .join("\n");

    // Prepare the extraction prompt
    const extractionPrompt = `User's legal query:
"${userInput}"

Relevant legal knowledge:
${knowledgeContext || "No specific knowledge retrieved"}

Please extract the structured legal facts from this query. Return a JSON object with the following structure:
{
  "disputeType": "Property|Money/Contract|Artha Rin|Family|Revenue/Tenancy",
  "reliefSought": "Declaration of Title|Summary Possession|Title-based Possession|Specific Performance|Cancellation|Injunction|Partition|Adverse Possession|Pre-emption|Money Recovery|Summary Suit",
  "plaintiffType": "Individual|Business|Government",
  "defendantType": "Individual|Business|Government",
  "isGovernmentDefendant": boolean,
  "s80NoticeGiven": boolean,
  "causeOfActionDate": "YYYY-MM-DD or null",
  "suitFilingDate": "YYYY-MM-DD or null",
  "propertyDistrict": "District name or null",
  "defendantDistrict": "District name or null",
  "claimAmount": number or null,
  "isImmovableProperty": boolean,
  "plaintiffInPossession": boolean,
  "defendantInPossession": boolean,
  "dispossessionDate": "YYYY-MM-DD or null",
  "documents": [{"name": "string", "docType": "string", "isRegistered": boolean, "isCompulsorillyRegistrable": boolean, "isSufficientlyStamped": boolean}],
  "isPlaintiffReadyWilling": boolean,
  "areDamagesAdequate": boolean,
  "isAgriculturalLand": boolean,
  "saleRegistrationDate": "YYYY-MM-DD or null",
  "preDepositMade": boolean,
  "adversePossessionYears": number or null,
  "clarification": "Any missing information or clarification needed"
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: FACT_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: extractionPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extracted_facts",
          strict: true,
          schema: {
            type: "object",
            properties: {
              disputeType: { type: "string" },
              reliefSought: { type: "string" },
              plaintiffType: { type: "string" },
              defendantType: { type: "string" },
              isGovernmentDefendant: { type: "boolean" },
              s80NoticeGiven: { type: "boolean" },
              causeOfActionDate: { type: ["string", "null"] },
              suitFilingDate: { type: ["string", "null"] },
              propertyDistrict: { type: ["string", "null"] },
              defendantDistrict: { type: ["string", "null"] },
              claimAmount: { type: ["number", "null"] },
              isImmovableProperty: { type: "boolean" },
              plaintiffInPossession: { type: "boolean" },
              defendantInPossession: { type: "boolean" },
              dispossessionDate: { type: ["string", "null"] },
              documents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    docType: { type: "string" },
                    isRegistered: { type: "boolean" },
                    isCompulsorillyRegistrable: { type: "boolean" },
                    isSufficientlyStamped: { type: "boolean" },
                  },
                  required: ["name", "docType", "isRegistered"],
                },
              },
              isPlaintiffReadyWilling: { type: "boolean" },
              areDamagesAdequate: { type: "boolean" },
              isAgriculturalLand: { type: "boolean" },
              saleRegistrationDate: { type: ["string", "null"] },
              preDepositMade: { type: "boolean" },
              adversePossessionYears: { type: ["number", "null"] },
              clarification: { type: ["string", "null"] },
            },
            required: [
              "disputeType",
              "reliefSought",
              "plaintiffType",
              "defendantType",
              "isGovernmentDefendant",
              "s80NoticeGiven",
              "isImmovableProperty",
              "plaintiffInPossession",
              "defendantInPossession",
              "isPlaintiffReadyWilling",
              "areDamagesAdequate",
              "isAgriculturalLand",
              "preDepositMade",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      return {
        success: false,
        error: "Failed to extract facts from LLM response",
      };
    }

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const extractedData = JSON.parse(contentStr);

    // Map dispute type
    const disputeTypeMap: Record<string, DisputeType> = {
      "Property": DisputeType.PROPERTY,
      "Money/Contract": DisputeType.MONEY_CONTRACT,
      "Artha Rin": DisputeType.ARTHA_RIN,
      "Family": DisputeType.FAMILY,
      "Revenue/Tenancy": DisputeType.REVENUE_TENANCY,
    };

    // Map relief type
    const reliefTypeMap: Record<string, ReliefType> = {
      "Declaration of Title": ReliefType.TITLE_DECLARATION,
      "Summary Possession": ReliefType.POSSESSION_SUMMARY,
      "Title-based Possession": ReliefType.POSSESSION_TITLE,
      "Specific Performance": ReliefType.SPECIFIC_PERFORMANCE,
      "Cancellation": ReliefType.CANCELLATION,
      "Injunction": ReliefType.INJUNCTION,
      "Partition": ReliefType.PARTITION,
      "Adverse Possession": ReliefType.ADVERSE_POSSESSION,
      "Pre-emption": ReliefType.PRE_EMPTION,
      "Money Recovery": ReliefType.MONEY_RECOVERY,
      "Summary Suit": ReliefType.SUMMARY_SUIT,
    };

    const disputeType = disputeTypeMap[extractedData.disputeType] || DisputeType.PROPERTY;
    const reliefSought = reliefTypeMap[extractedData.reliefSought] || ReliefType.TITLE_DECLARATION;

    // Parse dates
    const parseDate = (dateStr: string | null | undefined): Date => {
      if (!dateStr) return new Date();
      try {
        return new Date(dateStr);
      } catch {
        return new Date();
      }
    };

    // Convert documents
    const documents: Document[] = (extractedData.documents || []).map((doc: any) => ({
      name: doc.name || "Unknown Document",
      docType: doc.docType || "Other",
      date: new Date(),
      isRegistered: doc.isRegistered || false,
      isCompulsorillyRegistrable: doc.isCompulsorillyRegistrable || false,
      isSufficientlyStamped: doc.isSufficientlyStamped !== false,
      isOriginal: true,
    }));

    const facts: CaseFacts = {
      plaintiffType: extractedData.plaintiffType || "Individual",
      defendantType: extractedData.defendantType || "Individual",
      isGovernmentDefendant: extractedData.isGovernmentDefendant || false,
      s80NoticeGiven: extractedData.s80NoticeGiven || false,
      disputeType,
      reliefSought,
      causeOfActionDate: parseDate(extractedData.causeOfActionDate),
      suitFilingDate: parseDate(extractedData.suitFilingDate),
      propertyDistrict: extractedData.propertyDistrict || "Dhaka",
      defendantDistrict: extractedData.defendantDistrict || "Dhaka",
      claimAmount: extractedData.claimAmount || 0,
      isImmovableProperty: extractedData.isImmovableProperty !== false,
      plaintiffInPossession: extractedData.plaintiffInPossession || false,
      defendantInPossession: extractedData.defendantInPossession || true,
      dispossessionDate: parseDate(extractedData.dispossessionDate),
      documents,
      isPlaintiffReadyWilling: extractedData.isPlaintiffReadyWilling !== false,
      areDamagesAdequate: extractedData.areDamagesAdequate || false,
      isAgriculturalLand: extractedData.isAgriculturalLand || false,
      saleRegistrationDate: parseDate(extractedData.saleRegistrationDate),
      preDepositMade: extractedData.preDepositMade || false,
      adversePossessionYears: extractedData.adversePossessionYears || 0,
    };

    return {
      success: true,
      facts,
      clarification: extractedData.clarification,
    };
  } catch (error) {
    console.error("Fact extraction error:", error);
    return {
      success: false,
      error: `Fact extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
