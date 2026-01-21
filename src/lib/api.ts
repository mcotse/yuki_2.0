/**
 * REST API Client for Oracle Backend
 * Provides a similar interface to Supabase for easier migration
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface ApiResponse<T> {
  data: T | null
  error: { message: string } | null
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      return { data: null, error: { message: error.error || response.statusText } }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } }
  }
}

// Query builder to match Supabase-like syntax
function createQueryBuilder<T>(tableName: string) {
  let queryParams: Record<string, string> = {}
  let selectFields = '*'

  const builder = {
    select(fields = '*') {
      selectFields = fields
      return builder
    },

    eq(column: string, value: unknown) {
      queryParams[column] = String(value)
      return builder
    },

    order(column: string, options?: { ascending?: boolean }) {
      queryParams['_order'] = `${column}:${options?.ascending === false ? 'desc' : 'asc'}`
      return builder
    },

    async single(): Promise<ApiResponse<T>> {
      const params = new URLSearchParams(queryParams).toString()
      const endpoint = `/${tableName}${params ? `?${params}` : ''}`
      const result = await request<T[]>(endpoint)
      if (result.error) return { data: null, error: result.error }
      if (!result.data || result.data.length === 0) {
        return { data: null, error: { message: 'No rows returned' } }
      }
      return { data: result.data[0] ?? null, error: null }
    },

    async then<TResult>(
      onfulfilled?: ((value: ApiResponse<T[]>) => TResult) | null
    ): Promise<TResult> {
      const params = new URLSearchParams(queryParams).toString()
      const endpoint = `/${tableName}${params ? `?${params}` : ''}`
      const result = await request<T[]>(endpoint)
      return onfulfilled ? onfulfilled(result) : (result as unknown as TResult)
    },
  }

  return builder
}

// Mutation builder for inserts/updates
function createMutationBuilder<T>(tableName: string, method: 'POST' | 'PATCH' | 'DELETE') {
  let body: unknown = null
  let idValue: string | null = null

  const builder = {
    eq(column: string, value: string) {
      if (column === 'id') idValue = value
      return builder
    },

    select() {
      return builder
    },

    async single(): Promise<ApiResponse<T>> {
      const endpoint = idValue ? `/${tableName}/${idValue}` : `/${tableName}`
      const result = await request<T>(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      })
      return result
    },

    async then<TResult>(
      onfulfilled?: ((value: ApiResponse<T>) => TResult) | null
    ): Promise<TResult> {
      const endpoint = idValue ? `/${tableName}/${idValue}` : `/${tableName}`
      const result = await request<T>(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      })
      return onfulfilled ? onfulfilled(result) : (result as unknown as TResult)
    },
  }

  return {
    ...builder,
    _setBody(data: unknown) {
      body = data
      return builder
    },
  }
}

// Main API client with Supabase-like interface
export const api = {
  from<T>(tableName: string) {
    return {
      select(fields = '*') {
        return createQueryBuilder<T>(tableName).select(fields)
      },

      insert(data: unknown) {
        const mutation = createMutationBuilder<T>(tableName, 'POST')
        return mutation._setBody(data)
      },

      update(data: unknown) {
        const mutation = createMutationBuilder<T>(tableName, 'PATCH')
        return mutation._setBody(data)
      },

      delete() {
        return createMutationBuilder<T>(tableName, 'DELETE')
      },
    }
  },
}

/**
 * Check if API is properly configured
 */
export function isApiConfigured(): boolean {
  return Boolean(API_BASE)
}

// Re-export for compatibility
export type { ApiResponse }
