export interface OntologyResponse {
  id: string;
  status: 'success' | 'error';
  message?: string;
  error?: string;
}
