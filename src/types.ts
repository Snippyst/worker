export interface RenderRequest {
  timeout?: number;
  content?: string;
  version?: string;
}

export interface SuccessResponse {
  success: true;
  time: number;
  content: string;
  version: string;
}

export interface ErrorResponse {
  success: false;
  time: number;
  message: string;
}

export type RenderResult =
  | { success: true; content: string; version: string }
  | { success: false; message: string };
