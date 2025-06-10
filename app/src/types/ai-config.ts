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

export interface GeminiConfigRequest {
  api_key: string
  default_model_name: string
}

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