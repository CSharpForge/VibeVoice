import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice · VibeVoice",
  description: "What VibeVoice processes, what it keeps, and what it does not.",
};

// Read at request time so the operator can set it without rebuilding.
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const contact = process.env.PRIVACY_CONTACT?.trim();

  return (
    <main className="app-shell">
      <article className="legal">
        <Link className="legal-back" href="/">
          ← Back to VibeVoice
        </Link>
        <h1>Privacy notice</h1>
        <p className="note">
          VibeVoice is built to keep as little as possible. This page says
          plainly what that means, including the parts that are not zero.
        </p>

        <h2>What we do not keep</h2>
        <ul>
          <li>No accounts, passwords or profiles.</li>
          <li>No database. Rooms and participants are not stored.</li>
          <li>
            No recordings of audio, video or screen sharing, and no saved chat.
            Text chat exists only in the memory of the browsers connected to the
            room and disappears when they leave or reload.
          </li>
          <li>
            No analytics, advertising, tracking cookies or third-party scripts,
            fonts or CDNs.
          </li>
        </ul>

        <h2>What is processed while you are in a room</h2>
        <ul>
          <li>
            The display name you type, your microphone audio, and any screen
            share or chat you send. These are relayed live to the other people
            in the room by our own LiveKit server and are not written to disk.
          </li>
          <li>
            Calls are encrypted in transit, but they are not end-to-end
            encrypted: the server that relays them can technically access the
            media while it passes through.
          </li>
          <li>
            Your room key is kept in the part of the link after the{" "}
            <code>#</code>, which your browser never sends to the server. It is
            used once to request a short-lived access token.
          </li>
        </ul>

        <h2>What servers may log</h2>
        <p>
          Like any web service, the web server, reverse proxy and media server
          can write technical logs containing your IP address, the time of the
          request and basic connection errors. We use them only for security and
          troubleshooting. Web server access logs are rotated automatically and
          kept for roughly five weeks, and error logs for roughly ten weeks;
          media server logs are limited to warnings and errors and are
          discarded much sooner. They do not contain call content, chat text or
          room keys.
        </p>

        <h2>Who runs it</h2>
        <p>
          The application and the media server run on infrastructure operated by
          the site owner. No third-party media, signalling or STUN/TURN service
          is used, so call data and connection metadata are not sent to other
          companies. The hosting provider of the server can see network-level
          traffic metadata, as with any hosted service.
        </p>

        <h2>Your rights and contact</h2>
        <p>
          Because nothing is tied to an account, we generally cannot look up or
          delete data about a particular person. If you believe a server log
          contains your data, or you have a question about this notice, contact
          the operator
          {contact ? (
            <>
              : <a href={`mailto:${contact}`}>{contact}</a>
            </>
          ) : (
            "."
          )}
        </p>

        <p className="note">
          If this notice changes, the updated version will be published on this
          page.
        </p>
      </article>
    </main>
  );
}
