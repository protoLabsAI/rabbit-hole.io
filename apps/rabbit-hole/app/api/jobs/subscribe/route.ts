/**
 * Job Completion Subscription API (Server-Sent Events)
 *
 * GET /api/jobs/subscribe
 *
 * Real-time job completion notifications via PostgreSQL LISTEN/NOTIFY.
 * Streams completion events to clients with <100ms latency.
 * User authentication is obtained from Clerk's auth() function.
 */

import { NextRequest } from "next/server";

import { getJobQueuePool } from "@proto/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
    const userId = "local-user";
=======
    const { userId } = { userId: "local-user" };
>>>>>>> origin/main

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const pool = getJobQueuePool();
        let client;
        let keepAliveInterval: NodeJS.Timeout | null = null;

        try {
          client = await pool.connect();

          // Listen for job completion notifications
          await client.query("LISTEN job_completion");

          // Handle notifications - capture listener for cleanup
          const notificationListener = (msg: any) => {
            if (msg.channel === "job_completion" && msg.payload) {
              try {
                const data = JSON.parse(msg.payload);

                // Filter by authenticated user
                if (data.userId === userId) {
                  const event = `data: ${JSON.stringify(data)}\n\n`;
                  controller.enqueue(encoder.encode(event));
                }
              } catch (error) {
                console.error("Failed to parse notification:", error);
              }
            }
          };

          client.on("notification", notificationListener);

          // Immediate keep-alive to flush proxies
          controller.enqueue(encoder.encode(": keepalive\n\n"));

          // Keep-alive ping every 30s
          keepAliveInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(": keepalive\n\n"));
            } catch (error) {
              if (keepAliveInterval) clearInterval(keepAliveInterval);
            }
          }, 30000);

          // Cleanup on client disconnect
          request.signal.addEventListener("abort", async () => {
            if (keepAliveInterval) clearInterval(keepAliveInterval);
            try {
              client.removeListener("notification", notificationListener);
              await client.query("UNLISTEN job_completion");
              client.release();
            } catch (error) {
              console.error("Error during SSE cleanup:", error);
            }
            try {
              controller.close();
            } catch (closeError) {
              // Controller already closed, ignore
            }
          });
        } catch (error) {
          console.error("SSE connection error:", error);
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          if (client) {
            try {
              await client.query("UNLISTEN job_completion");
              client.release();
            } catch (cleanupError) {
              console.error("Error during error cleanup:", cleanupError);
              client.release();
            }
          }
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Failed to create SSE connection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
