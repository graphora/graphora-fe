/**
 * Base URL for the backend API
 */
export const API_BASE_URL = `${process.env.BACKEND_API_URL || 'http://localhost:8000'}/api/v1`

/**
 * Default pagination limit for list endpoints
 */
export const DEFAULT_PAGE_SIZE = 10

/**
 * Maximum number of items to show in a dropdown
 */
export const MAX_DROPDOWN_ITEMS = 100

/**
 * Default debounce time for search inputs (in milliseconds)
 */
export const SEARCH_DEBOUNCE_TIME = 300