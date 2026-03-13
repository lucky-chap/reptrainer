import {
  LlmAgent,
  InvocationContext,
  LiveRequestQueue,
  functionsExportedForTestingOnly,
  createEvent,
  createEventActions,
} from "@google/adk";

const { handleFunctionCallList } = functionsExportedForTestingOnly;

/**
 * Custom LlmAgent that implements runLiveFlow.
 * This bridges the gap in ADK 0.5.0 where runLiveFlow is not implemented.
 */
export class GeminiLiveAgent extends LlmAgent {
  /**
   * Overrides runLiveImpl to provide a streaming implementation.
   */
  protected override async *runLiveImpl(
    ctx: InvocationContext,
  ): AsyncGenerator<any> {
    // In ADK, runLiveImpl is expected to be a generator that yields events.
    // We delegate the heavy lifting to run_live helper.
    yield* run_live(ctx);
  }
}

/**
 * Bridge function to provide run_live functionality in ADK 0.5.0.
 * It orchestrates the bidirectional connection between the client and Gemini.
 */
export async function* run_live(ctx: InvocationContext): AsyncGenerator<any> {
  const agent = ctx.agent as GeminiLiveAgent;
  const model = agent.canonicalModel;

  // 1. Establish connection via ADK model
  // We use the model's connect method, which returns a GeminiLlmConnection
  const connection = (await model.connect({
    liveConnectConfig: agent.generateContentConfig as any,
    config: {
      systemInstruction:
        typeof agent.instruction === "string"
          ? agent.instruction
          : await agent.instruction(ctx as any),
      tools: (await agent.canonicalTools(ctx as any)) as any,
    },
  } as any)) as any;

  // The connection object contains the underlying GenAI session
  const geminiSession = connection.geminiSession;

  // 2. Setup message queue for yielding
  const messageQueue: any[] = [];
  let resolveNextMessage: ((value: any) => void) | null = null;

  // IMPORTANT: We override the onmessage callback that ADK set to empty
  geminiSession.callbacks.onmessage = (msg: any) => {
    if (resolveNextMessage) {
      const resolve = resolveNextMessage;
      resolveNextMessage = null;
      resolve(msg);
    } else {
      messageQueue.push(msg);
    }
  };

  // Handle errors and closing
  const originalOnClose = geminiSession.callbacks.onclose;
  geminiSession.callbacks.onclose = (e: any) => {
    if (originalOnClose) originalOnClose(e);
    // Push a sentinel to terminate the loop
    if (resolveNextMessage) {
      const resolve = resolveNextMessage;
      resolveNextMessage = null;
      resolve(null);
    } else {
      messageQueue.push(null);
    }
  };

  // 3. Setup bidirectional message flow
  const requestQueue = ctx.liveRequestQueue;
  if (!requestQueue) {
    throw new Error("LiveRequestQueue is missing from InvocationContext.");
  }

  // Send loop: Pull from ADK LiveRequestQueue and send to GenAI session
  const sendLoop = async () => {
    try {
      for await (const req of requestQueue) {
        if (req.close) {
          await connection.close();
          break;
        }
        if (req.content) {
          await connection.sendContent(req.content);
        }
        if (req.blob) {
          await connection.sendRealtime(req.blob);
        }
      }
    } catch (err) {
      console.error("[run_live] Request queue processing error:", err);
    }
  };

  // Start sending in background
  sendLoop();

  // 4. Yield loop: Pull from our message queue and yield to the runner
  while (true) {
    if (messageQueue.length === 0) {
      await new Promise((resolve) => {
        resolveNextMessage = resolve;
      });
    }
    const msg = messageQueue.shift();
    if (msg === null) break; // Session closed
    yield msg;
  }
}
