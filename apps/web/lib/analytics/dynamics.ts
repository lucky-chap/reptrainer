import type { Session, CallSession } from "../db";
import type { ConversationalDynamics } from "./scoring";
/**
 * Calculates conversational dynamics for a single session.
 */
export function calculateDynamics(
  session: Session | CallSession,
): ConversationalDynamics {
  let userChars = 0;
  let aiChars = 0;
  let wordCount = 0;

  if (
    "transcriptMessages" in session &&
    session.transcriptMessages.length > 0
  ) {
    session.transcriptMessages.forEach((msg) => {
      if (msg.role === "user") {
        userChars += msg.text.length;
        wordCount += msg.text.split(/\s+/).length;
      } else if (msg.role === "model") {
        aiChars += msg.text.length;
      }
    });
  } else {
    // Fallback for legacy transcript string (approximate)
    const transcript =
      ("transcript" in session ? session.transcript : "") || "";
    const lines = transcript.split("\n\n");
    lines.forEach((line: string) => {
      if (line.toLowerCase().startsWith("user:") || line.includes(" (You):")) {
        userChars += line.length;
        wordCount += line.split(/\s+/).length;
      } else {
        aiChars += line.length;
      }
    });
  }

  const total = userChars + aiChars;
  const talkRatio = total > 0 ? Math.round((userChars / total) * 100) : 50;

  const durationSeconds =
    "durationSeconds" in session
      ? session.durationSeconds
      : (session as any).durationSeconds;
  const durationMinutes = (durationSeconds || 0) / 60;
  const pace =
    durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;

  return {
    talkToListenRatio: { user: talkRatio, ai: 100 - talkRatio },
    paceWPM: pace,
    fillerWords: Math.floor(Math.random() * 5), // Mocked for now
    interruptions: Math.floor(Math.random() * 3), // Mocked for now
  };
}

/**
 * Aggregates dynamics across multiple sessions.
 */
export function aggregateDynamics(
  sessions: (Session | CallSession)[],
): ConversationalDynamics {
  if (sessions.length === 0) {
    return {
      talkToListenRatio: { user: 50, ai: 50 },
      paceWPM: 0,
      fillerWords: 0,
      interruptions: 0,
    };
  }

  const allDynamics = sessions.map(calculateDynamics);
  const count = allDynamics.length;

  return {
    talkToListenRatio: {
      user: Math.round(
        allDynamics.reduce((sum, d) => sum + d.talkToListenRatio.user, 0) /
          count,
      ),
      ai: Math.round(
        allDynamics.reduce((sum, d) => sum + d.talkToListenRatio.ai, 0) / count,
      ),
    },
    paceWPM: Math.round(
      allDynamics.reduce((sum, d) => sum + d.paceWPM, 0) / count,
    ),
    fillerWords: Math.round(
      allDynamics.reduce((sum, d) => sum + d.fillerWords, 0) / count,
    ),
    interruptions: Math.round(
      allDynamics.reduce((sum, d) => sum + d.interruptions, 0) / count,
    ),
  };
}
