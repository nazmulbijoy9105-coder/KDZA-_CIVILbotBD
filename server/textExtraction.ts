/**
 * Text extraction service for various file types
 * Supports: images (OCR), PDFs, Word documents, and plain text
 */

import { invokeLLM } from "./_core/llm";

export interface ExtractionResult {
  success: boolean;
  text?: string;
  method?: string;
  error?: string;
}

/**
 * Extract text from an image using OCR via LLM vision
 */
export async function extractTextFromImage(imageUrl: string): Promise<ExtractionResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "Please extract all text from this image. Return only the extracted text without any additional commentary.",
            },
          ] as any,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      return {
        success: false,
        error: "Failed to extract text from image",
      };
    }

    const text = typeof content === "string" ? content : JSON.stringify(content);
    return {
      success: true,
      text,
      method: "ocr_vision",
    };
  } catch (error) {
    console.error("Image extraction error:", error);
    return {
      success: false,
      error: `Image extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Extract text from a PDF file
 * Note: This uses the LLM's file_url capability to process PDFs
 */
export async function extractTextFromPDF(pdfUrl: string): Promise<ExtractionResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file_url",
              file_url: {
                url: pdfUrl,
                mime_type: "application/pdf",
              },
            },
            {
              type: "text",
              text: "Please extract all text from this PDF document. Return only the extracted text without any additional commentary.",
            },
          ] as any,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      return {
        success: false,
        error: "Failed to extract text from PDF",
      };
    }

    const text = typeof content === "string" ? content : JSON.stringify(content);
    return {
      success: true,
      text,
      method: "pdf_parser",
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    return {
      success: false,
      error: `PDF extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Extract text from a Word document
 * Note: This uses the LLM's file_url capability to process Word docs
 */
export async function extractTextFromWord(docUrl: string): Promise<ExtractionResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file_url",
              file_url: {
                url: docUrl,
                mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              },
            },
            {
              type: "text",
              text: "Please extract all text from this Word document. Return only the extracted text without any additional commentary.",
            },
          ] as any,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      return {
        success: false,
        error: "Failed to extract text from Word document",
      };
    }

    const text = typeof content === "string" ? content : JSON.stringify(content);
    return {
      success: true,
      text,
      method: "docx_parser",
    };
  } catch (error) {
    console.error("Word extraction error:", error);
    return {
      success: false,
      error: `Word extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Extract text from a plain text file
 * For text files, we simply read the content
 */
export async function extractTextFromPlainText(textContent: string): Promise<ExtractionResult> {
  try {
    if (!textContent || textContent.trim().length === 0) {
      return {
        success: false,
        error: "Text file is empty",
      };
    }

    return {
      success: true,
      text: textContent,
      method: "text_read",
    };
  } catch (error) {
    console.error("Text extraction error:", error);
    return {
      success: false,
      error: `Text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Main extraction dispatcher based on file type
 */
export async function extractTextFromFile(
  fileUrl: string,
  fileType: "image" | "pdf" | "word" | "text"
): Promise<ExtractionResult> {
  switch (fileType) {
    case "image":
      return extractTextFromImage(fileUrl);
    case "pdf":
      return extractTextFromPDF(fileUrl);
    case "word":
      return extractTextFromWord(fileUrl);
    case "text":
      // For text files, we need the actual content, not a URL
      // This will be handled differently in the router
      return {
        success: false,
        error: "Use extractTextFromPlainText for text files",
      };
    default:
      return {
        success: false,
        error: `Unsupported file type: ${fileType}`,
      };
  }
}
