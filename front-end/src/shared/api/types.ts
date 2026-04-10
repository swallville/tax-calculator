/**
 * Configuration for a single `apiClient` call.
 *
 * Kept intentionally minimal — headers, body, and advanced fetch options are
 * not exposed here because all current endpoints are read-only GET requests.
 * Extend this interface when mutation endpoints are introduced.
 */
export interface ApiClientProps {
  url: string;
  /** Defaults to `'GET'` when omitted. */
  method?: string;
}
