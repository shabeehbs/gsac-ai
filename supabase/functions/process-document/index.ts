import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessDocumentRequest {
  documentId: string;
  fileType: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { documentId, fileType }: ProcessDocumentRequest = await req.json();

    await supabaseClient
      .from("incident_documents")
      .update({ ocr_status: "processing" })
      .eq("id", documentId);

    const { data: document } = await supabaseClient
      .from("incident_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (!document) {
      throw new Error("Document not found");
    }

    const { data: fileData } = await supabaseClient.storage
      .from("incident-documents")
      .download(document.storage_path);

    if (!fileData) {
      throw new Error("File not found in storage");
    }

    let ocrText = "";
    let aiDescription = "";

    if (fileType.startsWith("image/")) {
      const arrayBuffer = await fileData.arrayBuffer();
      const base64Image = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      aiDescription = await generateImageDescription(base64Image, fileType);
      ocrText = await extractTextFromImage(base64Image);
    } else if (fileType === "application/pdf") {
      ocrText = await extractTextFromPDF(fileData);
      aiDescription = "PDF document processed for text extraction";
    }

    await supabaseClient
      .from("incident_documents")
      .update({
        ocr_text: ocrText,
        ai_description: aiDescription,
        ocr_status: "completed",
      })
      .eq("id", documentId);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    await supabaseClient.from("audit_logs").insert({
      incident_id: document.incident_id,
      action_type: "DOCUMENT_PROCESSED",
      action_details: {
        document_id: documentId,
        file_name: document.file_name,
        ocr_completed: true,
      },
      entity_type: "incident_document",
      entity_id: documentId,
      performed_by: user?.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        ocrText,
        aiDescription,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process document",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function generateImageDescription(
  base64Image: string,
  fileType: string
): Promise<string> {
  try {
    const prompt = `You are an HSE (Health, Safety, and Environment) incident investigation assistant. Analyze this image and provide a detailed, objective description focusing on:

1. Visible hazards or safety concerns
2. Equipment, machinery, or tools visible
3. Environmental conditions
4. People and their safety equipment (PPE)
5. Any visible damage or unsafe conditions
6. Location characteristics

Provide a factual, professional description suitable for an incident investigation report.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${fileType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    const result = await response.json();
    return result.choices[0]?.message?.content || "Unable to generate image description";
  } catch (error) {
    console.error("Error generating image description:", error);
    return "Error: Could not generate image description. Image uploaded successfully.";
  }
}

async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all visible text from this image. Include signs, labels, documents, handwritten notes, and any other text. Return only the extracted text without additional commentary.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    const result = await response.json();
    return result.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return "";
  }
}

async function extractTextFromPDF(fileData: Blob): Promise<string> {
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Pdf = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this PDF document. Include all visible text, tables, and structured data. Return the extracted text maintaining logical reading order. If the PDF contains images with text, describe what you see.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
      }),
    });

    const result = await response.json();
    const extractedText = result.choices[0]?.message?.content;

    if (extractedText && extractedText.trim().length > 20) {
      return extractedText;
    }

    const text = new TextDecoder().decode(arrayBuffer);
    const textMatch = text.match(/stream\s*([\s\S]*?)\s*endstream/g);
    if (textMatch) {
      const basicExtract = textMatch
        .map((m) => m.replace(/stream\s*|\s*endstream/g, ""))
        .join(" ")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (basicExtract.length > 20) {
        return basicExtract;
      }
    }

    return "PDF uploaded successfully. Document contains visual content that may require manual review.";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);

    try {
      const arrayBuffer = await fileData.arrayBuffer();
      const text = new TextDecoder().decode(arrayBuffer);
      const textMatch = text.match(/stream\s*([\s\S]*?)\s*endstream/g);
      if (textMatch) {
        return textMatch
          .map((m) => m.replace(/stream\s*|\s*endstream/g, ""))
          .join(" ")
          .replace(/[^\x20-\x7E]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    } catch (fallbackError) {
      console.error("Fallback extraction failed:", fallbackError);
    }

    return "PDF uploaded. Text extraction encountered issues. File is available for download and manual review.";
  }
}