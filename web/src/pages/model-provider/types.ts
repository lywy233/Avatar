export type ModelProviderModel = {
  id: string
  name: string
  supportsImage: boolean | null
  supportsVideo: boolean | null
}

export type ModelProviderInfo = {
  id: string
  name: string
  source: string
  baseUrl: string
  apiKey: string
  chatModel: string
  models: ModelProviderModel[]
  generateKwargs: Record<string, unknown>
  supportConnectionCheck: boolean
}

export type ModelProviderConfigDraft = {
  apiKey: string
  baseUrl: string
  chatModel: string
  generateKwargsText: string
}

export type ActiveModelInfo = {
  providerId: string
  model: string
}

export type CreateCustomProviderInput = {
  id: string
  name: string
  defaultBaseUrl?: string
  apiKeyPrefix?: string
  chatModel?: string
}
