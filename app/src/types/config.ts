export interface DatabaseConfig {
  id?: string
  name: string
  uri: string
  username: string
  password: string
}

export interface UserConfig {
  id?: string
  userEmail: string
  stagingDb: DatabaseConfig
  prodDb: DatabaseConfig
  createdAt?: string
  updatedAt?: string
}

export interface ConfigResponse {
  success: boolean
  config?: UserConfig
  error?: string
}

export interface ConfigRequest {
  userId: string
  stagingDb: DatabaseConfig
  prodDb: DatabaseConfig
}

export interface ConnectionTestResponse {
  success: boolean
  message: string
  error?: string
} 