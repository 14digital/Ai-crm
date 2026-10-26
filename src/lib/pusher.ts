import Pusher from "pusher";

const globalForPusher = globalThis as unknown as { pusherServer: Pusher };

export const pusherServer =
  globalForPusher.pusherServer ||
  new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  });

if (process.env.NODE_ENV !== "production")
  globalForPusher.pusherServer = pusherServer;

// Real-time delivery is best-effort — an unconfigured or unreachable Pusher
// must never break message persistence or the AI reply flow, so .trigger()
// swallows its own errors. (.authorizeChannel() is left as-is: that one's
// result is returned straight to the client, so it should fail loudly.)
const realTrigger = pusherServer.trigger.bind(pusherServer);
pusherServer.trigger = (async (...args: Parameters<typeof realTrigger>) => {
  try {
    return await realTrigger(...args);
  } catch (err) {
    console.warn(
      "[pusher] trigger failed (real-time update skipped):",
      err instanceof Error ? err.message : err
    );
    return undefined;
  }
}) as typeof pusherServer.trigger;
