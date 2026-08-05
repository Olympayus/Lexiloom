export interface Category {
  id: string
  name: string
  color: string        // 8 色色板 hex
  description?: string
  isDefault?: boolean
}

export interface CategoryInput {
  name: string
  color: string
  description?: string
  isDefault?: boolean
}

export interface CategoryUpdate {
  name?: string
  color?: string
  description?: string | null
  isDefault?: boolean
}
