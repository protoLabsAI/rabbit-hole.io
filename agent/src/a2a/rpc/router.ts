import {
  JSON_RPC_ERRORS,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type RpcContext,
  type RpcHandler,
  rpcError,
  rpcSuccess,
} from "./types.js";

/**
 * JSON-RPC 2.0 method router.
 * Missing methods return -32601 (method not found) per spec.
 */
export class RpcRouter {
  private handlers = new Map<string, RpcHandler>();

  register(method: string, handler: RpcHandler): this {
    this.handlers.set(method, handler);
    return this;
  }

  has(method: string): boolean {
    return this.handlers.has(method);
  }

  /** Returns the currently-registered handler (if any) so callers can wrap it. */
  unwrap(method: string): RpcHandler | undefined {
    return this.handlers.get(method);
  }

  async dispatch(
    request: unknown,
    ctx: RpcContext
  ): Promise<JsonRpcResponse | null> {
    // Validate JSON-RPC 2.0 envelope
    if (!isJsonRpcRequest(request)) {
      return rpcError(
        null,
        JSON_RPC_ERRORS.INVALID_REQUEST,
        "Invalid JSON-RPC 2.0 request"
      );
    }

    const req = request;
    const id = req.id ?? null;

    // Notifications (no id) don't get responses per spec.
    // A2A workstacean contract uses ids for everything, but we honor the spec.
    const isNotification = req.id === undefined;

    const handler = this.handlers.get(req.method);
    if (!handler) {
      return isNotification
        ? null
        : rpcError(
            id,
            JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            `Method not found: ${req.method}`
          );
    }

    try {
      const result = await handler(req.params, { ...ctx, requestId: id });
      return isNotification ? null : rpcSuccess(id, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        err instanceof RpcHandlerError
          ? err.code
          : JSON_RPC_ERRORS.INTERNAL_ERROR;
      return isNotification ? null : rpcError(id, code, message);
    }
  }
}

export class RpcHandlerError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "RpcHandlerError";
  }
}

function isJsonRpcRequest(x: unknown): x is JsonRpcRequest {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as { jsonrpc?: unknown }).jsonrpc === "2.0" &&
    typeof (x as { method?: unknown }).method === "string"
  );
}
