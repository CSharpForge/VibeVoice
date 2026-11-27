// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

type Handler = (...args: unknown[]) => void;

// Regression test for the "late joiner cannot hear people already in the room" bug:
// LiveKit fires TrackSubscribed for tracks that are already published *while*
// room.connect() is still pending, i.e. before the in-room view exists.
vi.mock("livekit-client", async () => {
  const actual = await vi.importActual<typeof import("livekit-client")>(
    "livekit-client",
  );

  class FakeRoom {
    handlers = new Map<string, Handler>();
    activeSpeakers: unknown[] = [];
    remoteParticipants = new Map();
    localParticipant = {
      identity: "me",
      name: "Me",
      isScreenShareEnabled: false,
      setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
    };

    on(event: string, handler: Handler) {
      this.handlers.set(event, handler);
      return this;
    }

    async connect() {
      const remoteAudio = {
        kind: actual.Track.Kind.Audio,
        attach: () => document.createElement("audio"),
        detach: () => [],
      };
      // Delivered during connect(), exactly like a real server does for
      // participants who were already in the room.
      this.handlers.get(actual.RoomEvent.TrackSubscribed)?.(
        remoteAudio,
        { source: actual.Track.Source.Microphone },
        { identity: "alice" },
      );
    }

    startAudio = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn().mockResolvedValue(undefined);
  }

  return { ...actual, Room: FakeRoom };
});

import { RoomShell } from "./room-shell";

describe("remote audio", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plays audio from participants who were in the room before we joined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "t", url: "ws://livekit.test" }),
      }),
    );

    const { container } = render(<RoomShell roomId="room_123456" />);
    await userEvent.type(screen.getByLabelText(/display name/i), "Bob");
    await userEvent.type(screen.getByLabelText(/room key/i), "key_123456789012345");
    await userEvent.click(screen.getByRole("button", { name: /join room/i }));

    expect(await screen.findByText(/ephemeral room active/i)).toBeInTheDocument();
    expect(container.querySelectorAll("audio")).toHaveLength(1);
    expect(container.querySelector("audio")?.dataset.participant).toBe("alice");
  });
});
