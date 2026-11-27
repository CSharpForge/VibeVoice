"use client";

import {
  KeyRound,
  Maximize,
  Mic,
  MicOff,
  Minimize,
  MonitorUp,
  PhoneOff,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  LocalTrack,
  Participant,
  RemoteTrack,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
} from "livekit-client";
import Link from "next/link";
import {
  clampZoom,
  INITIAL_ZOOM,
  MIN_ZOOM,
  zoomAt,
  type ZoomState,
} from "../lib/zoom";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

type ParticipantView = {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isSharing: boolean;
};

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  mine: boolean;
};

type TokenResponse = {
  token: string;
  url: string;
};

export function RoomShell({
  roomId,
}: {
  roomId: string;
}) {
  const roomRef = useRef<Room | null>(null);
  const audioSinkRef = useRef<HTMLDivElement | null>(null);
  const [roomKey, setRoomKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [micIntro, setMicIntro] = useState(false);
  const [micNotice, setMicNotice] = useState("");
  const [audioBlocked, setAudioBlocked] = useState(false);
  // getDisplayMedia is missing on iOS and most phone browsers: viewers can
  // still watch a share there, they just can't start one.
  const [canShare, setCanShare] = useState(false);
  const [screenTrack, setScreenTrack] = useState<LocalTrack | RemoteTrack | null>(
    null,
  );

  const connected = connectionState === "connected";

  useEffect(() => {
    // Browser-only capability, known only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.mediaDevices?.getDisplayMedia === "function");
  }, []);

  // Pick the key up from the URL fragment (never sent to the server), then
  // remove it from the address bar so it doesn't linger in screenshots/history.
  useEffect(() => {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("key");
    if (fromHash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoomKey(fromHash);
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect(true);
      roomRef.current = null;
    };
  }, []);

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Browsers show their own microphone prompt and a page cannot replace it.
    // When it is about to appear, explain it first so it isn't a surprise.
    try {
      const status = await navigator.permissions?.query({
        name: "microphone" as PermissionName,
      });
      if (status?.state === "prompt") {
        setMicIntro(true);
        return;
      }
    } catch {
      // Permissions API unavailable for "microphone": just join.
    }
    await startJoin(true);
  }

  async function startJoin(withMic: boolean) {
    setMicIntro(false);
    setConnectionState("connecting");
    setError("");
    setMicNotice("");

    try {
      const response = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, roomKey, displayName }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Unable to join this room.");
      }

      const { token, url } = (await response.json()) as TokenResponse;
      const room = new Room({
        adaptiveStream: { pixelDensity: "screen" },
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
      });

      roomRef.current = room;
      bindRoomEvents(room);
      await room.connect(url, token);
      await room.startAudio();
      if (withMic) {
        await enableMicrophone(room);
      } else {
        setMuted(true);
      }
      refreshParticipants(room);
      setConnectionState("connected");
    } catch (caught) {
      setConnectionState("error");
      setError(caught instanceof Error ? caught.message : "Unable to join.");
    }
  }

  // A refused or missing microphone must not stop someone from joining and
  // listening: stay connected, muted, and say why.
  async function enableMicrophone(room: Room) {
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      setMuted(false);
      setMicNotice("");
    } catch {
      setMuted(true);
      setMicNotice(
        "Microphone is blocked. Allow it in your browser's site settings to talk.",
      );
    }
  }

  function bindRoomEvents(room: Room) {
    room
      .on(RoomEvent.ParticipantConnected, () => refreshParticipants(room))
      .on(RoomEvent.ParticipantDisconnected, () => refreshParticipants(room))
      .on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants(room))
      .on(RoomEvent.AudioPlaybackStatusChanged, () =>
        setAudioBlocked(!room.canPlaybackAudio),
      )
      .on(RoomEvent.TrackMuted, () => refreshParticipants(room))
      .on(RoomEvent.TrackUnmuted, () => refreshParticipants(room))
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare && publication.track) {
          setScreenTrack(publication.track);
          setSharing(true);
        }
        refreshParticipants(room);
      })
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) {
          setScreenTrack(null);
          setSharing(false);
        }
        refreshParticipants(room);
      })
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (publication.source === Track.Source.ScreenShare) {
          setScreenTrack(track);
        }
        if (track.kind === Track.Kind.Audio && audioSinkRef.current) {
          const element = track.attach();
          element.dataset.participant = participant.identity;
          audioSinkRef.current.appendChild(element);
        }
        refreshParticipants(room);
      })
      .on(RoomEvent.TrackUnsubscribed, (track, publication) => {
        track.detach().forEach((element) => element.remove());
        if (publication.source === Track.Source.ScreenShare) {
          setScreenTrack(null);
        }
        refreshParticipants(room);
      })
      .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        if (topic !== "chat") {
          return;
        }
        const decoded = decodeMessage(payload);
        if (!decoded) {
          return;
        }
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            sender: participant?.name || participant?.identity || "Friend",
            text: decoded,
            mine: false,
          },
        ]);
      })
      .on(RoomEvent.Disconnected, () => {
        setConnectionState("idle");
        setScreenTrack(null);
        setSharing(false);
        setParticipants([]);
      });
  }

  function refreshParticipants(room: Room) {
    const active = new Set(room.activeSpeakers.map((speaker) => speaker.identity));
    const all: Participant[] = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()),
    ];

    setParticipants(
      all.map((participant) => ({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isLocal: participant.identity === room.localParticipant.identity,
        isSpeaking: active.has(participant.identity),
        isSharing: participant.isScreenShareEnabled,
      })),
    );
  }

  async function toggleMute() {
    const room = roomRef.current;
    if (!room) {
      return;
    }
    if (muted) {
      await enableMicrophone(room);
      return;
    }
    await room.localParticipant.setMicrophoneEnabled(false);
    setMuted(true);
  }

  async function toggleScreenShare() {
    const room = roomRef.current;
    if (!room) {
      return;
    }
    await room.localParticipant.setScreenShareEnabled(
      !sharing,
      {
        audio: true,
        selfBrowserSurface: "include",
        systemAudio: "include",
        // Capture at 1080p30 and tell the encoder text legibility matters more
        // than smooth motion.
        resolution: ScreenSharePresets.h1080fps30.resolution,
        contentHint: "detail",
      },
      {
        // LiveKit defaults to 1080p15 @ 2.5 Mbps plus a low-res simulcast layer
        // that viewers with a smaller stage get switched to (blurry text).
        // Publish a single full-quality layer instead.
        screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
        screenShareSimulcastLayers: [],
      },
    );
    setSharing(!sharing);
  }

  async function leaveRoom() {
    await roomRef.current?.disconnect(true);
    roomRef.current = null;
    setConnectionState("idle");
    setScreenTrack(null);
    setSharing(false);
    setParticipants([]);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    const room = roomRef.current;
    if (!text || !room) {
      return;
    }
    const payload = new TextEncoder().encode(text);
    await room.localParticipant.publishData(payload, {
      reliable: true,
      topic: "chat",
    });
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sender: displayName.trim() || "You",
        text,
        mine: true,
      },
    ]);
    setDraft("");
  }

  const heading = useMemo(() => {
    if (connected) {
      return "Room live";
    }
    if (connectionState === "connecting") {
      return "Joining";
    }
    return "Join private room";
  }, [connected, connectionState]);

  // Remote audio is attached from RoomEvent.TrackSubscribed, which LiveKit fires for
  // already-published tracks while room.connect() is still pending (before we are
  // "connected"). This container must therefore exist in every view, at the same
  // position in the tree so React keeps the same DOM node across the join transition.
  const audioSink = <div aria-hidden="true" ref={audioSinkRef} />;

  if (!connected) {
    return (
      <>
      <main className="app-shell">
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark">
              <Sparkles size={18} />
            </span>
            <span>VibeVoice</span>
          </Link>
          <div className="privacy-chip">
            <ShieldCheck size={16} />
            Room key required
          </div>
        </header>

        <section className="stage">
          <form className="join-card" onSubmit={joinRoom}>
            <p className="kicker">Room {roomId}</p>
            <h1>{heading}</h1>
            <p>
              Your name and key are used only to enter this LiveKit room. No
              account is created.
            </p>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="display-name">Display name</label>
                <input
                  className="input"
                  id="display-name"
                  maxLength={42}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="How friends see you"
                  required
                  value={displayName}
                />
              </div>
              <div className="field">
                <label htmlFor="room-key">Room key</label>
                <input
                  className="input"
                  id="room-key"
                  onChange={(event) => setRoomKey(event.target.value)}
                  placeholder="Paste room key"
                  required
                  value={roomKey}
                />
              </div>
              <button
                className="button"
                disabled={connectionState === "connecting"}
                type="submit"
              >
                <KeyRound size={18} />
                {connectionState === "connecting" ? "Joining" : "Join room"}
              </button>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </form>
        </section>
      </main>
      {audioSink}
      {micIntro ? (
        <div className="modal-backdrop">
          <div
            aria-labelledby="mic-intro-title"
            aria-modal="true"
            className="modal"
            role="dialog"
          >
            <Mic size={28} />
            <h2 id="mic-intro-title">Allow your microphone</h2>
            <p>
              VibeVoice needs your microphone so the room can hear you. Your
              browser will ask for permission next: choose <strong>Allow</strong>.
              Audio goes only to people in this room and is never recorded.
            </p>
            <div className="modal-actions">
              <button
                autoFocus
                className="button"
                onClick={() => void startJoin(true)}
                type="button"
              >
                Continue
              </button>
              <button
                className="button secondary"
                onClick={() => void startJoin(false)}
                type="button"
              >
                Listen only
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </>
    );
  }

  return (
    <>
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Sparkles size={18} />
          </span>
          <span>VibeVoice</span>
        </Link>
        <div className="privacy-chip">
          <ShieldCheck size={16} />
          Ephemeral room active
        </div>
      </header>

      <section className="room-layout">
        <aside className="participants-panel" aria-label="Participants">
          <div className="panel-title">
            <span>People</span>
            <span>{participants.length}</span>
          </div>
          <div className="participant-list">
            {participants.map((participant) => (
              <div className="participant" key={participant.identity}>
                <div className="avatar">{participant.name.slice(0, 1)}</div>
                <div className="participant-name">
                  {participant.name}
                  {participant.isLocal ? " (you)" : ""}
                </div>
                {participant.isSpeaking ? <Mic size={14} /> : null}
                {participant.isSharing ? <MonitorUp size={14} /> : null}
              </div>
            ))}
          </div>
        </aside>

        <section className="stage" aria-label="Screen share stage">
          {screenTrack ? (
            <ScreenTrack track={screenTrack} />
          ) : (
            <div className="empty-stage">
              <MonitorUp size={42} />
              <h2>No screen is being shared.</h2>
              <p>
                Voice is live. Start screen sharing when you want the room to
                focus on what you are working on.
              </p>
            </div>
          )}

          {audioBlocked ? (
            <button
              className="button audio-unlock"
              onClick={() => {
                void roomRef.current?.startAudio();
              }}
              type="button"
            >
              Tap to enable audio
            </button>
          ) : null}
          {micNotice ? (
            <p className="mic-notice" role="status">
              {micNotice}
            </p>
          ) : null}

          <div className="controls" aria-label="Call controls">
            <button
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
              className={muted ? "icon-button danger" : "icon-button active"}
              onClick={toggleMute}
              title={muted ? "Unmute microphone" : "Mute microphone"}
              type="button"
            >
              {muted ? <MicOff /> : <Mic />}
            </button>
            {canShare ? (
              <button
                aria-label={sharing ? "Stop screen share" : "Start screen share"}
                className={sharing ? "icon-button active" : "icon-button"}
                onClick={toggleScreenShare}
                title={sharing ? "Stop screen share" : "Start screen share"}
                type="button"
              >
                <MonitorUp />
              </button>
            ) : null}
            <button
              aria-label="Leave room"
              className="icon-button danger"
              onClick={leaveRoom}
              title="Leave room"
              type="button"
            >
              <PhoneOff />
            </button>
          </div>
        </section>

        <aside className="chat-panel" aria-label="Ephemeral chat">
          <div className="panel-title">
            <span>Ephemeral chat</span>
            <Users size={16} />
          </div>
          <div className="messages" role="log">
            {messages.length === 0 ? (
              <p className="note">
                Messages appear here only while this browser tab is in the room.
              </p>
            ) : (
              messages.map((message) => (
                <div className="message" key={message.id}>
                  <strong>{message.mine ? "You" : message.sender}</strong>
                  <span>{message.text}</span>
                </div>
              ))
            )}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <input
              className="input"
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Send without history"
              value={draft}
            />
            <button aria-label="Send message" className="button" type="submit">
              <Send size={18} />
            </button>
          </form>
        </aside>
      </section>
    </main>
    {audioSink}
    </>
  );
}

function ScreenTrack({ track }: { track: LocalTrack | RemoteTrack }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const [zoom, setZoom] = useState<ZoomState>(INITIAL_ZOOM);
  const [fullscreen, setFullscreen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  // Wheel zoom toward the cursor. Registered natively because React's onWheel
  // is passive and cannot stop the page from scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = viewport!.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.002);
      setZoom((current) =>
        zoomAt(
          current,
          factor,
          event.clientX - rect.left,
          event.clientY - rect.top,
          rect.width,
          rect.height,
        ),
      );
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    function onChange() {
      setFullscreen(document.fullscreenElement === viewportRef.current);
      // The viewport size changes, so the old offset may be out of range.
      setZoom(INITIAL_ZOOM);
    }

    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Mouse drag and touch (one finger pans when zoomed, two fingers pinch).
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const next = { x: event.clientX, y: event.clientY };
    const others = [...pointers.entries()].filter(
      ([id]) => id !== event.pointerId,
    );
    pointers.set(event.pointerId, next);

    if (others.length >= 1) {
      // Pinch: scale by the change in finger distance around their midpoint.
      const other = others[0][1];
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before < 1) {
        return;
      }
      const mid = {
        x: (next.x + other.x) / 2 - rect.left,
        y: (next.y + other.y) / 2 - rect.top,
      };
      const shift = {
        x: (next.x - previous.x) / 2,
        y: (next.y - previous.y) / 2,
      };
      setZoom((current) => {
        const zoomedIn = zoomAt(current, after / before, mid.x, mid.y, rect.width, rect.height);
        return clampZoom(
          { ...zoomedIn, x: zoomedIn.x + shift.x, y: zoomedIn.y + shift.y },
          rect.width,
          rect.height,
        );
      });
      return;
    }

    setZoom((current) =>
      current.scale === MIN_ZOOM
        ? current
        : clampZoom(
            {
              ...current,
              x: current.x + next.x - previous.x,
              y: current.y + next.y - previous.y,
            },
            rect.width,
            rect.height,
          ),
    );
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
  }

  async function toggleFullscreen() {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    // iPhone Safari only allows fullscreen on <video>, so fall back to a
    // CSS-maximized view that fills the screen.
    if (typeof viewport.requestFullscreen !== "function") {
      setMaximized((current) => !current);
      setZoom(INITIAL_ZOOM);
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await viewport.requestFullscreen();
    }
  }

  const zoomed = zoom.scale > MIN_ZOOM;
  const expanded = fullscreen || maximized;

  return (
    <div
      className={`zoom-viewport${zoomed ? " zoomed" : ""}${maximized ? " maximized" : ""}`}
      onDoubleClick={() => setZoom(INITIAL_ZOOM)}
      onPointerCancel={endPointer}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      ref={viewportRef}
    >
      <video
        autoPlay
        muted
        playsInline
        ref={videoRef}
        style={{
          transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
        }}
      />
      <div className="stage-controls">
        {zoomed ? (
          <button
            aria-label="Reset zoom"
            onClick={() => setZoom(INITIAL_ZOOM)}
            title="Reset zoom (double-click)"
            type="button"
          >
            {Math.round(zoom.scale * 100)}%
          </button>
        ) : null}
        <button
          aria-label={expanded ? "Exit full screen" : "Maximize screen share"}
          onClick={toggleFullscreen}
          title={expanded ? "Exit full screen" : "Maximize"}
          type="button"
        >
          {expanded ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </div>
  );
}

function decodeMessage(payload: Uint8Array): string | null {
  try {
    const decoded = new TextDecoder().decode(payload).trim();
    return decoded.length > 0 && decoded.length <= 500 ? decoded : null;
  } catch {
    return null;
  }
}
