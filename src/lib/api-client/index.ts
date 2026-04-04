/**
 * API Layer Client
 * 
 * Architecture: Frontend → Railway API → Supabase Database
 * 
 * This module provides a unified API client that:
 * - Routes requests through Railway backend
 * - Handles authentication headers
 * - Provides request/response logging
 * - Supports both internal and external API calls
 */

import { getConfig, isProduction } from '@/lib/config';
import { apiLogger } from '@/lib/logger';

// ============================================
// TYPES
// ============================================

export interface ApiClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  withAuth?: boolean;
}

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

// ============================================
// API CLIENT CLASS
// ============================================

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(options: ApiClientOptions = {}) {
    const config = getConfig();
    
    // In production, use Railway API URL; in dev, use relative paths
    this.baseUrl = options.baseUrl ?? (
      isProduction() 
        ? config.bot.whatsappUrl  // Railway backend
        : ''  // Relative path for Next.js API routes
    );
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    this.defaultTimeout = options.timeout ?? 30000; // 30 seconds default
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Core request method with logging and error handling
   */
  private async request<T>(
    method: string,
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const timer = apiLogger.startTimer();
    const url = this.buildUrl(path, options.params);
    
    // Merge headers
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };
    
    // Log request
    apiLogger.request(method, url, { headers: this.sanitizeHeaders(headers) });
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = options.timeout ?? this.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Make request
      const response = await fetch(url, {
        method,
        headers,
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Parse response
      const data = await this.parseResponse<T>(response);
      
      // Log response
      apiLogger.response(method, url, response.status, timer());
      
      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      const duration = timer();
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          apiLogger.error(`Request timeout: ${method} ${url}`, error, { duration });
          throw new ApiError('Request timeout', 408, url, method);
        }
        
        apiLogger.error(`Request failed: ${method} ${url}`, error, { duration });
        throw new ApiError(error.message, 500, url, method);
      }
      
      throw error;
    }
  }

  /**
   * Build URL with query params
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    
    if (!params || Object.keys(params).length === 0) {
      return url;
    }
    
    const searchParams = new URLSearchParams(params);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${searchParams.toString()}`;
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';
    
    if (contentType.includes('application/json')) {
      return response.json();
    }
    
    if (contentType.includes('text/')) {
      return response.text() as Promise<T>;
    }
    
    return response.arrayBuffer() as Promise<T>;
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

// ============================================
// API ERROR CLASS
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
    public method: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

/**
 * Main API client for internal API routes (Next.js)
 */
export const apiClient = new ApiClient();

/**
 * Bot API client for WhatsApp/Discord bot communication (Railway)
 */
export const botApiClient = new ApiClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create API response with consistent format
 */
export function apiResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create API error response
 */
export function apiErrorResponse(message: string, status = 500, details?: Record<string, unknown>): Response {
  return apiResponse({
    success: false,
    error: message,
    ...(details && { details }),
  }, status);
}

/**
 * Create success response
 */
export function apiSuccessResponse<T>(data: T, message?: string): Response {
  return apiResponse({
    success: true,
    ...(message && { message }),
    data,
  });
}
