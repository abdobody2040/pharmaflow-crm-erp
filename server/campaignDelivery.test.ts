import { afterEach, describe, expect, it, vi } from "vitest";
import { channelConfiguration } from "./services/campaignDelivery";

afterEach(() => vi.unstubAllEnvs());

describe("campaign channel configuration", () => {
  it("rejects development-only placeholder secrets from activating live delivery", () => {
    vi.stubEnv("MARKETING_EMAIL_WEBHOOK_URL", "https://example.invalid/pharmaflow/email");
    vi.stubEnv("MARKETING_EMAIL_WEBHOOK_TOKEN", "development-placeholder-email-token");
    vi.stubEnv("MARKETING_SMS_WEBHOOK_URL", "https://example.invalid/pharmaflow/sms");
    vi.stubEnv("MARKETING_SMS_WEBHOOK_TOKEN", "development-placeholder-sms-token");
    vi.stubEnv("WHATSAPP_CLOUD_ACCESS_TOKEN", "development-placeholder-whatsapp-token");
    vi.stubEnv("WHATSAPP_CLOUD_PHONE_NUMBER_ID", "000000000000000");
    vi.stubEnv("WHATSAPP_CLOUD_API_VERSION", "v0.0");
    expect(channelConfiguration("email").configured).toBe(false);
    expect(channelConfiguration("sms").configured).toBe(false);
    expect(channelConfiguration("whatsapp").configured).toBe(false);
  });
});
