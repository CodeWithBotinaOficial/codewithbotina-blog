export interface ContactFormData {
  nombre: string;
  correo: string;
  mensaje: string;
}

export interface ContactRecord extends ContactFormData {
  id: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: Record<string, string>;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}
