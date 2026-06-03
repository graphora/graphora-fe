export type ProviderName = 'gemini' | 'openai' | 'anthropic' | 'ollama'

export interface AIProvider {
  id?: string
  name: string
  display_name: string
  is_active: boolean
}

export interface AIModel {
  id?: string
  provider_id: string
  name: string
  display_name: string
  version?: string
  is_active: boolean
}

/**
 * Generic provider config payload — matches graphora-api's
 * `ProviderConfigRequest`. Used against `POST/PUT /ai-config/{provider}`.
 *
 * - `base_url` is only honored for `ollama` (server URL) and `openai`
 *   (custom Azure / OpenRouter endpoint). Ignored for `gemini` and
 *   `anthropic`.
 * - `default_model_name` may be a name outside the curated catalog —
 *   backend auto-registers free-form entries as `version='custom'` so
 *   the UI dropdown surfaces them on the next session.
 */
export interface ProviderConfigRequest {
  api_key: string
  default_model_name: string
  base_url?: string
}

/**
 * @deprecated Use `ProviderConfigRequest`. Kept for any external callers
 * importing the old shape; structurally compatible (no `base_url`).
 */
export type GeminiConfigRequest = Omit<ProviderConfigRequest, 'base_url'>

export interface UserAIConfigDisplay {
  id?: string
  user_id: string
  provider_name: string
  provider_display_name: string
  api_key_masked: string
  default_model_name: string
  default_model_display_name: string
  created_at?: string
  updated_at?: string
}

export interface AIConfigResponse {
  success: boolean
  message?: string
  error?: string
  user_config?: UserAIConfigDisplay
  providers?: AIProvider[]
  models?: AIModel[]
}
