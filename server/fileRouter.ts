/**
 * tRPC router for file uploads, text extraction, and file management
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  saveFile,
  getUserFiles,
  saveExtractedText,
  getExtractedTextByFileId,
  getUserSubscription,
  getSubscriptionTier,
  logAuditEvent,
} from "./db";
import { extractTextFromFile, extractTextFromPlainText } from "./textExtraction";
import { storagePut } from "./storage";

const OWNER_OPEN_ID = "nazmulbijoy9105"; // Owner identifier

export const fileRouter = router({
  /**
   * Upload a file (subscription users only)
   */
  uploadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["image", "pdf", "word", "text"]),
        fileContent: z.string(), // Base64 encoded or text content
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;
        const ipAddress = ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
        const userAgent = ctx.req.headers["user-agent"] || "unknown";

        // Check if user is admin or has active subscription
        const isAdmin = ctx.user.openId === OWNER_OPEN_ID;
        if (!isAdmin) {
          const subscription = await getUserSubscription(userId);
          if (!subscription || subscription.status !== "active") {
            await logAuditEvent(
              userId,
              "file_upload",
              "file",
              undefined,
              `Attempted upload without active subscription`,
              ipAddress,
              userAgent,
              "failure"
            );
            return {
              success: false,
              error: "File uploads require an active subscription",
            };
          }

          // Check file upload limit
          if (subscription.tierId) {
            const tier = await getSubscriptionTier(subscription.tierId);
            if (tier && tier.fileUploadLimit && tier.fileUploadLimit > 0) {
              const userFiles = await getUserFiles(userId);
              if (userFiles.length >= (tier.fileUploadLimit || 0)) {
                await logAuditEvent(
                  userId,
                  "file_upload",
                  "file",
                  undefined,
                  `File upload limit exceeded (${tier.fileUploadLimit})`,
                  ipAddress,
                  userAgent,
                  "failure"
                );
                return {
                  success: false,
                  error: `File upload limit reached (${tier.fileUploadLimit} files)`,
                };
              }
            }
          }
        }

        // Upload file to storage
        const buffer = Buffer.from(input.fileContent, "base64");
        const mimeType = getMimeType(input.fileType);
        const { key, url } = await storagePut(
          `uploads/${userId}/${Date.now()}-${input.fileName}`,
          buffer,
          mimeType
        );

        // Save file metadata
        const fileResult = await saveFile(
          userId,
          input.fileName,
          input.fileType,
          key,
          buffer.length
        );

        await logAuditEvent(
          userId,
          "file_upload",
          "file",
          undefined,
          `Uploaded ${input.fileType} file: ${input.fileName}`,
          ipAddress,
          userAgent,
          "success"
        );

        return {
          success: true,
          fileId: (fileResult as any).insertId,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: buffer.length,
          storageUrl: url,
        };
      } catch (error) {
        console.error("File upload error:", error);
        const ipAddress = ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
        const userAgent = ctx.req.headers["user-agent"] || "unknown";
        await logAuditEvent(
          ctx.user.id,
          "file_upload",
          "file",
          undefined,
          `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          ipAddress,
          userAgent,
          "failure"
        );
        return {
          success: false,
          error: `File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Extract text from a file (subscription users only)
   */
  extractText: protectedProcedure
    .input(
      z.object({
        fileId: z.number(),
        fileUrl: z.string(),
        fileType: z.enum(["image", "pdf", "word", "text"]),
        textContent: z.string().optional(), // For text files
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;
        const ipAddress = ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
        const userAgent = ctx.req.headers["user-agent"] || "unknown";

        // Check if user is admin or has active subscription with extraction enabled
        const isAdmin = ctx.user.openId === OWNER_OPEN_ID;
        if (!isAdmin) {
          const subscription = await getUserSubscription(userId);
          if (!subscription || subscription.status !== "active") {
            await logAuditEvent(
              userId,
              "text_extract",
              "file",
              input.fileId,
              `Attempted extraction without active subscription`,
              ipAddress,
              userAgent,
              "failure"
            );
            return {
              success: false,
              error: "Text extraction requires an active subscription",
            };
          }

          // Check if extraction is enabled for this tier
          if (subscription.tierId) {
            const tier = await getSubscriptionTier(subscription.tierId);
            if (!tier || !tier.textExtractionEnabled) {
              await logAuditEvent(
                userId,
                "text_extract",
                "file",
                input.fileId,
                `Text extraction not enabled for this subscription tier`,
                ipAddress,
                userAgent,
                "failure"
              );
              return {
                success: false,
                error: "Text extraction is not enabled for your subscription tier",
              };
            }
          }
        }

        // Check if extraction already exists
        const existingExtraction = await getExtractedTextByFileId(input.fileId);
        if (existingExtraction) {
          await logAuditEvent(
            userId,
            "text_extract",
            "file",
            input.fileId,
            `Extraction already exists for this file`,
            ipAddress,
            userAgent,
            "success"
          );
          return {
            success: true,
            message: "Text already extracted for this file",
            extractedText: existingExtraction.extractedContent,
            method: existingExtraction.extractionMethod,
          };
        }

        // Extract text based on file type
        let extractionResult;
        if (input.fileType === "text" && input.textContent) {
          extractionResult = await extractTextFromPlainText(input.textContent);
        } else {
          extractionResult = await extractTextFromFile(input.fileUrl, input.fileType);
        }

        if (!extractionResult.success) {
          await logAuditEvent(
            userId,
            "text_extract",
            "file",
            input.fileId,
            `Extraction failed: ${extractionResult.error}`,
            ipAddress,
            userAgent,
            "failure"
          );
          return {
            success: false,
            error: extractionResult.error,
          };
        }

        // Save extracted text
        await saveExtractedText(
          input.fileId,
          userId,
          extractionResult.text || "",
          extractionResult.method || "unknown"
        );

        await logAuditEvent(
          userId,
          "text_extract",
          "file",
          input.fileId,
          `Successfully extracted text using ${extractionResult.method}`,
          ipAddress,
          userAgent,
          "success"
        );

        return {
          success: true,
          extractedText: extractionResult.text,
          method: extractionResult.method,
        };
      } catch (error) {
        console.error("Text extraction error:", error);
        const ipAddress = ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
        const userAgent = ctx.req.headers["user-agent"] || "unknown";
        await logAuditEvent(
          ctx.user.id,
          "text_extract",
          "file",
          input.fileId,
          `Extraction error: ${error instanceof Error ? error.message : "Unknown error"}`,
          ipAddress,
          userAgent,
          "failure"
        );
        return {
          success: false,
          error: `Text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Get user's files
   */
  getUserFiles: protectedProcedure.query(async ({ ctx }) => {
    try {
      const files = await getUserFiles(ctx.user.id);
      return {
        success: true,
        files,
      };
    } catch (error) {
      console.error("Get files error:", error);
      return {
        success: false,
        files: [],
        error: "Failed to retrieve files",
      };
    }
  }),

  /**
   * Get audit logs (admin only)
   */
  getAuditLogs: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Only admin can access audit logs
        if (ctx.user.openId !== OWNER_OPEN_ID) {
          return {
            success: false,
            logs: [],
            error: "Only administrators can access audit logs",
          };
        }

        const { getAuditLogs } = await import("./db");
        const logs = await getAuditLogs(input.userId, input.limit);

        return {
          success: true,
          logs,
        };
      } catch (error) {
        console.error("Get audit logs error:", error);
        return {
          success: false,
          logs: [],
          error: "Failed to retrieve audit logs",
        };
      }
    }),
});

function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    image: "image/jpeg",
    pdf: "application/pdf",
    word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    text: "text/plain",
  };
  return mimeTypes[fileType] || "application/octet-stream";
}
