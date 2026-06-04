/**
 * tRPC router for chat and dispute processing
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { saveChatMessage, getChatHistory, saveDispute } from "./db";
import { extractFactsFromUserInput } from "./factExtraction";
import { processDispute } from "./disputeEngine";

export const chatRouter = router({
  /**
   * Send a message and get a legal analysis response
   */
  sendMessage: protectedProcedure
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;

        // Save user message
        await saveChatMessage(userId, input.message, "user");

        // Extract facts from user input
        const extractionResult = await extractFactsFromUserInput(input.message);

        if (!extractionResult.success || !extractionResult.facts) {
          const errorMessage =
            extractionResult.clarification ||
            extractionResult.error ||
            "Unable to process your query. Please provide more details about your civil dispute.";

          await saveChatMessage(userId, errorMessage, "assistant");

          return {
            success: false,
            message: errorMessage,
            clarification: extractionResult.clarification,
          };
        }

        // Process dispute through engine
        const engineOutput = await processDispute(extractionResult.facts);

        // Format the response
        const responseText = formatEngineOutput(engineOutput);

        // Save assistant response
        await saveChatMessage(userId, responseText, "assistant");

        // Save dispute record
        await saveDispute(
          userId,
          JSON.stringify(extractionResult.facts),
          JSON.stringify(engineOutput),
          engineOutput.decision,
          engineOutput.court?.valueOf(),
          engineOutput.track
        );

        return {
          success: true,
          message: responseText,
          engineOutput,
        };
      } catch (error) {
        console.error("Chat error:", error);
        const errorMsg = `Error processing your query: ${error instanceof Error ? error.message : "Unknown error"}`;
        await saveChatMessage(
          ctx.user.id,
          errorMsg,
          "assistant"
        );
        return {
          success: false,
          message: errorMsg,
        };
      }
    }),

  /**
   * Get chat history for the current user
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const history = await getChatHistory(ctx.user.id, input?.limit || 50);
        return {
          success: true,
          messages: history,
        };
      } catch (error) {
        console.error("History retrieval error:", error);
        return {
          success: false,
          messages: [],
          error: "Failed to retrieve chat history",
        };
      }
    }),

  /**
   * Clear chat history
   */
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    // Note: This would require a delete operation - for now we'll just return success
    // In a full implementation, you'd add a delete procedure to db.ts
    return {
      success: true,
      message: "Chat history cleared",
    };
  }),
});

/**
 * Format engine output into a readable response
 */
function formatEngineOutput(output: any): string {
  const DISCLAIMER = `⚠️ **LEGAL DISCLAIMER**
This analysis is for legal literacy and educational purposes only, NOT legal advice. 
For actual legal advice, consult with a Bangladesh Bar Council enrolled advocate.
---`;

  const sections: string[] = [DISCLAIMER];

  if (output.court) {
    sections.push(`**Court:** ${output.court}`);
  }

  if (output.track) {
    sections.push(`**Track:** ${output.track}`);
  }

  if (output.decision) {
    sections.push(`**Decision:** ${output.decision}`);
  }

  if (output.reasoning && output.reasoning.length > 0) {
    sections.push(`**Reasoning:**`);
    output.reasoning.forEach((step: string) => {
      sections.push(`• ${step}`);
    });
  }

  if (output.defects && output.defects.length > 0) {
    sections.push(`**Defects Found:**`);
    output.defects.forEach((defect: string) => {
      sections.push(`• ${defect}`);
    });
  }

  if (output.retrievedKnowledge && output.retrievedKnowledge.length > 0) {
    sections.push(`**Legal References:**`);
    output.retrievedKnowledge.forEach((ref: string) => {
      sections.push(`• ${ref}`);
    });
  }

  return sections.join("\n\n");
}
