// Which providers can run which tool. The admin picks one per tool in /admin/tools.
export type ProviderId = "fal" | "google" | "elevenlabs" | "claude" | "gemini";

export const providerInfo: Record<ProviderId, { name: string; env: string; site: string }> = {
  fal: { name: "fal.ai", env: "FAL_KEY", site: "https://fal.ai/models" },
  google: { name: "Google (Gemini API — صور Nano Banana، فيديو Veo، صوت)", env: "GEMINI_API_KEY", site: "https://ai.google.dev/gemini-api/docs/models" },
  elevenlabs: { name: "ElevenLabs", env: "ELEVENLABS_API_KEY", site: "https://elevenlabs.io/docs" },
  claude: { name: "Claude (Anthropic)", env: "ANTHROPIC_API_KEY", site: "https://docs.claude.com" },
  gemini: { name: "Gemini (Google)", env: "GEMINI_API_KEY", site: "https://ai.google.dev/gemini-api/docs/models" },
};

/** Allowed providers per tool + the default model for each. */
export const toolProviders: Record<string, Partial<Record<ProviderId, string>>> = {
  image: { fal: "fal-ai/nano-banana-2", google: "gemini-3-pro-image-preview" },
  carousel: { fal: "fal-ai/nano-banana-pro", google: "gemini-3-pro-image-preview" },
  "motion-video": { claude: "claude-sonnet-5-5", gemini: "gemini-2.5-pro" }, // writes the scenes; the worker renders
  "product-photo": { fal: "fal-ai/nano-banana-pro/edit", google: "gemini-3-pro-image-preview" },
  "ad-design": { fal: "fal-ai/nano-banana-pro", google: "gemini-3-pro-image-preview" },
  "avatar-video": { fal: "fal-ai/kling-video/ai-avatar/v2/standard" },
  "video-editing": { elevenlabs: "scribe_v1", google: "gemini-2.5-flash" },
  voice: { elevenlabs: "eleven_v3", google: "gemini-2.5-flash-preview-tts" },
  nasheed: { elevenlabs: "music" },
};

/** Text brains (ad copy, "ألهمني", "كلّم شاهين"). */
export const textProviders: Partial<Record<ProviderId, string>> = { claude: "claude-haiku-5-5", gemini: "gemini-2.5-flash" };
