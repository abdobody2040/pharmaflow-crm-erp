export type CampaignChannel = "email" | "sms" | "whatsapp";
export type DeliveryPayload = { campaignId: string; deliveryId: string; recipient: string; subject?: string | null; messageBody: string; whatsappTemplateName?: string | null };
export type DeliveryResult = { status: "sent" | "failed"; providerMessageId?: string; failureReason?: string };

function env(key: string) { return process.env[key]?.trim(); }
function isLiveValue(value: string | undefined) { return !!value && !value.includes("development-placeholder") && !value.includes("example.invalid") && value !== "000000000000000" && value !== "v0.0"; }

export function channelConfiguration(channel: CampaignChannel) {
  if (channel === "email") return { configured: isLiveValue(env("MARKETING_EMAIL_WEBHOOK_URL")) && isLiveValue(env("MARKETING_EMAIL_WEBHOOK_TOKEN")), missing: ["MARKETING_EMAIL_WEBHOOK_URL", "MARKETING_EMAIL_WEBHOOK_TOKEN"].filter(key => !isLiveValue(env(key))) };
  if (channel === "sms") return { configured: isLiveValue(env("MARKETING_SMS_WEBHOOK_URL")) && isLiveValue(env("MARKETING_SMS_WEBHOOK_TOKEN")), missing: ["MARKETING_SMS_WEBHOOK_URL", "MARKETING_SMS_WEBHOOK_TOKEN"].filter(key => !isLiveValue(env(key))) };
  return { configured: isLiveValue(env("WHATSAPP_CLOUD_ACCESS_TOKEN")) && isLiveValue(env("WHATSAPP_CLOUD_PHONE_NUMBER_ID")) && isLiveValue(env("WHATSAPP_CLOUD_API_VERSION")), missing: ["WHATSAPP_CLOUD_ACCESS_TOKEN", "WHATSAPP_CLOUD_PHONE_NUMBER_ID", "WHATSAPP_CLOUD_API_VERSION"].filter(key => !isLiveValue(env(key))) };
}

async function webhookDelivery(channel: "email" | "sms", payload: DeliveryPayload): Promise<DeliveryResult> {
  const url = env(channel === "email" ? "MARKETING_EMAIL_WEBHOOK_URL" : "MARKETING_SMS_WEBHOOK_URL"); const token = env(channel === "email" ? "MARKETING_EMAIL_WEBHOOK_TOKEN" : "MARKETING_SMS_WEBHOOK_TOKEN");
  if (!url || !token) return { status: "failed", failureReason: `${channel.toUpperCase()} channel is not configured` };
  try { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ channel, ...payload }) }); if (!response.ok) return { status: "failed", failureReason: `${channel.toUpperCase()} gateway responded ${response.status}` }; const body = await response.json().catch(() => ({})) as { id?: string; messageId?: string }; return { status: "sent", providerMessageId: body.id ?? body.messageId }; } catch { return { status: "failed", failureReason: `${channel.toUpperCase()} gateway could not be reached` }; }
}

async function whatsappDelivery(payload: DeliveryPayload): Promise<DeliveryResult> {
  const token = env("WHATSAPP_CLOUD_ACCESS_TOKEN"), phoneNumberId = env("WHATSAPP_CLOUD_PHONE_NUMBER_ID"), version = env("WHATSAPP_CLOUD_API_VERSION"); if (!token || !phoneNumberId || !version) return { status: "failed", failureReason: "WhatsApp Business Cloud channel is not configured" }; if (!payload.whatsappTemplateName) return { status: "failed", failureReason: "WhatsApp campaigns require an approved template name" };
  try { const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messaging_product: "whatsapp", to: payload.recipient, type: "template", template: { name: payload.whatsappTemplateName, language: { code: "en_US" } } }) }); const body = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { message?: string } }; if (!response.ok) return { status: "failed", failureReason: body.error?.message ?? `WhatsApp Cloud API responded ${response.status}` }; return { status: "sent", providerMessageId: body.messages?.[0]?.id }; } catch { return { status: "failed", failureReason: "WhatsApp Cloud API could not be reached" }; }
}

export async function dispatchCampaignDelivery(channel: CampaignChannel, payload: DeliveryPayload): Promise<DeliveryResult> { return channel === "whatsapp" ? whatsappDelivery(payload) : webhookDelivery(channel, payload); }
