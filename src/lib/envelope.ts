import { AxiosResponse } from 'axios';
import { ApiResponse, PaginationMeta } from '@/types/envelope';

export interface UnwrappedResult<T> {
  data: T;
  message: string;
  pagination?: PaginationMeta;
}

export class ApiError extends Error {
  statusCode?: number;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

/**
 * Unwrap an AxiosResponse containing an ApiResponse envelope.
 * Throws ApiError if response.data.success is false.
 */
export function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): UnwrappedResult<T> {
  const envelope = response.data;
  if (!envelope.success) {
    const errorDetails = (typeof envelope.data === 'object' && envelope.data !== null) 
      ? (envelope.data as Record<string, string[]>)
      : undefined;
    throw new ApiError(envelope.message || 'Permintaan gagal diproses', response.status, errorDetails);
  }
  return {
    data: envelope.data,
    message: envelope.message,
    pagination: envelope.pagination,
  };
}

/**
 * Convenience helper to directly extract the data field from an AxiosResponse envelope.
 */
export function unwrapData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return unwrap(response).data;
}
