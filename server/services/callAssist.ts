import { z } from "zod";

export const callAssistOutputSchema = {
  type: "object",
  properties: {
    objective: { type: "string" },
    productsDiscussed: { type: "array", items: { type: "string" } },
    samplesGiven: { type: "array", items: { type: "string" } },
    nextSteps: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: ["objective", "productsDiscussed", "samplesGiven", "nextSteps", "confidence"],
  additionalProperties: false,
};

export const callAssistDraftSchema = z.object({
  objective: z.string().max(3000), productsDiscussed: z.array(z.string().max(255)).max(30),
  samplesGiven: z.array(z.string().max(255)).max(30), nextSteps: z.string().max(3000), confidence: z.number().int().min(0).max(100),
});

export type CallAssistDraft = z.infer<typeof callAssistDraftSchema>;
export function parseCallAssistDraft(content: string): CallAssistDraft { return callAssistDraftSchema.parse(JSON.parse(content)); }
