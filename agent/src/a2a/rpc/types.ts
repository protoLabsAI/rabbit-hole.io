/**
 * JSON-RPC 2.0 types for the A2A transport layer.
 * Spec: https://www.jsonrpc.org/specification
 */

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccess<T = unknown> {
  jsonrpc: "2.0";
  id: string | number | null;
  result: T;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse<T = unknown> = JsonRpcSuccess<T> | JsonRpcError;

// Standard JSON-RPC 2.0 + A2A-spec error codes.
// A2A adds application-layer codes per the build-an-a2a-agent guide:
//   -32001  Task not found
//   -32002  Task already terminal (used by tasks/cancel on completed tasks)
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TASK_NOT_FOUND: -32001,
  TASK_ALREADY_TERMINAL: -32002,
} as const;

export type RpcHandler = (params: unknown, ctx: RpcContext) => Promise<unknown>;

export interface RpcContext {
  requestId: string | number | null;
  apiKey?: string | undefined;
}

export function rpcSuccess<T>(
  id: string | number | null,
  result: T
): JsonRpcSuccess<T> {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcError {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, ...(data !== undefined && { data }) },
  };
}
