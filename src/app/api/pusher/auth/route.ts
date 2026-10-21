import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.formData();
  const socketId = data.get("socket_id") as string;
  const channel = data.get("channel_name") as string;

  const userId = session.user.id as string;
  const userName = session.user.name as string;

  let authResponse;

  if (channel.startsWith("presence-")) {
    authResponse = pusherServer.authorizeChannel(socketId, channel, {
      user_id: userId,
      user_info: { name: userName },
    });
  } else {
    authResponse = pusherServer.authorizeChannel(socketId, channel);
  }

  return NextResponse.json(authResponse);
}
