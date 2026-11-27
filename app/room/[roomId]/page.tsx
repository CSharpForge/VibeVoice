import { RoomShell } from "@/components/room-shell";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

// The room key lives in the URL fragment (#key=...), which browsers never send
// to the server, so it is read client-side in RoomShell.
export default async function RoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return <RoomShell roomId={roomId} />;
}
