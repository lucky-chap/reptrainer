import {
  getUserMetrics,
  saveUserMetrics,
  getAllSessions,
  getAllCallSessions,
  type Session,
} from "./db";
import { type UserMetrics, type CallSession } from "@reptrainer/shared";
import {
  calculateSessionMetrics,
  isSessionCompleted,
} from "./analytics/standardizer";
import { type SessionEvaluation } from "./db/core";

type ExtendedSession = (CallSession | Session) & {
  evaluation?: SessionEvaluation | null;
  feedbackReport?: CallSession["feedbackReport"];
  legacyEvaluation?: CallSession["legacyEvaluation"];
  trackId?: string;
};

/**
 * Recalculates all user metrics from scratch based on all existing sessions.
 * Useful when a session is deleted.
 */
export async function recalculateUserMetrics(
  userId: string,
  teamId: string,
): Promise<UserMetrics> {
  const [sessions, callSessions] = await Promise.all([
    getAllSessions(userId),
    getAllCallSessions(userId),
  ]);

  // Filter sessions by team
  const filteredSessions = sessions.filter((s: Session) => s.teamId === teamId);
  const filteredCallSessions = callSessions.filter(
    (cs: CallSession) => cs.teamId === teamId,
  );

  // Combined and de-duplicate by ID
  const sessionMap = new Map<string, CallSession | Session>();
  filteredSessions.forEach((s: Session) => sessionMap.set(s.id, s));
  filteredCallSessions.forEach((cs: CallSession) => {
    // CallSession has richer data (like transcriptMessages), so merge/overwrite
    const existing = sessionMap.get(cs.id) || {};
    sessionMap.set(cs.id, { ...existing, ...cs });
  });

  const allSessions = Array.from(sessionMap.values())
    .filter((s) => isSessionCompleted(s))
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const metrics = createInitialMetrics(userId, teamId);
  if (allSessions.length === 0) {
    await saveUserMetrics(metrics);
    return metrics;
  }

  let totalScore = 0;
  let totalDiscovery = 0;
  let totalObjection = 0;
  let totalPositioning = 0;
  let totalClosing = 0;
  let totalListening = 0;
  let totalConfidence = 0;
  let totalTalkRatio = 0;
  let talkRatioCount = 0;

  const practiceDates = new Set<string>();

  for (const session of allSessions) {
    const scores = calculateSessionMetrics(session);
    totalScore += scores.overall;
    totalDiscovery += scores.discovery;
    totalObjection += scores.objection_handling;
    totalPositioning += scores.positioning;
    totalClosing += scores.closing;
    totalListening += scores.listening;
    totalConfidence += scores.confidence;

    metrics.totalDurationSeconds += session.durationSeconds || 0;

    const talkRatio = calculateTalkRatio(session);
    if (talkRatio !== null) {
      totalTalkRatio += talkRatio;
      talkRatioCount++;
    }

    const dateStr = new Date(session.createdAt).toISOString().split("T")[0];
    practiceDates.add(dateStr);

    const ext = session as ExtendedSession;
    if (ext.trackId && !metrics.tracksCompleted.includes(ext.trackId as any)) {
      metrics.tracksCompleted.push(ext.trackId as any);
    }
  }

  const count = allSessions.length;
  metrics.totalCalls = count;
  metrics.averageScore = totalScore / count;
  metrics.discoveryAverage = totalDiscovery / count;
  metrics.objectionHandlingAverage = totalObjection / count;
  metrics.productPositioningAverage = totalPositioning / count;
  metrics.closingAverage = totalClosing / count;
  metrics.activeListeningAverage = totalListening / count;
  metrics.closingSuccessAverage = totalClosing / count;
  metrics.confidenceAverage = totalConfidence / count;
  metrics.talkTimeRatioAverage =
    talkRatioCount > 0 ? totalTalkRatio / talkRatioCount : 50;

  // Streak logic from scratch
  const sortedDates = Array.from(practiceDates).sort();
  let streak = 0;
  if (sortedDates.length > 0) {
    streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);

      // Normalize to UTC midnight to avoid DST issues
      const prevUTC = Date.UTC(
        prev.getUTCFullYear(),
        prev.getUTCMonth(),
        prev.getUTCDate(),
      );
      const currUTC = Date.UTC(
        curr.getUTCFullYear(),
        curr.getUTCMonth(),
        curr.getUTCDate(),
      );

      const diffDays = Math.round((currUTC - prevUTC) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else if (diffDays > 1) {
        streak = 1;
      }
      // if diffDays === 0, same day, streak doesn't change
    }

    // Check if the streak is still active
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    const now = new Date();
    const lastUTC = Date.UTC(
      lastDate.getUTCFullYear(),
      lastDate.getUTCMonth(),
      lastDate.getUTCDate(),
    );
    const nowUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );

    const diffDaysSinceLast = Math.round(
      (nowUTC - lastUTC) / (1000 * 60 * 60 * 24),
    );

    if (diffDaysSinceLast > 1) {
      streak = 0;
    }
  }

  metrics.practiceStreak = streak;
  metrics.lastPracticeDate =
    sortedDates.length > 0
      ? allSessions[allSessions.length - 1].createdAt
      : null;
  metrics.updatedAt = new Date().toISOString();

  await saveUserMetrics(metrics);
  return metrics;
}

/**
 * Helper to extract various scores from any evaluation format.
 * @deprecated Use calculateSessionMetrics from standardizer instead.
 */
function extractScores(
  evaluation: CallSession["feedbackReport"] | CallSession["legacyEvaluation"],
) {
  // Use a mock session object to satisfy standardizer
  const mockSession = { evaluation } as unknown as CallSession;
  const metrics = calculateSessionMetrics(mockSession);
  return {
    overall: metrics.overall,
    discovery: metrics.discovery,
    objection: metrics.objection_handling,
    positioning: metrics.positioning,
    closing: metrics.closing,
    listening: metrics.listening,
    confidence: metrics.confidence,
  };
}

/**
 * Helper to calculate talk-to-listen ratio from transcript messages.
 */
function calculateTalkRatio(session: CallSession | Session): number | null {
  const transcriptMessages = (session as CallSession).transcriptMessages;
  if (
    !transcriptMessages ||
    !Array.isArray(transcriptMessages) ||
    transcriptMessages.length === 0
  ) {
    return null;
  }

  const userChars = transcriptMessages
    .filter((m) => m.role === "user")
    .reduce((sum: number, m) => sum + (m.text?.length || 0), 0);
  const totalChars = transcriptMessages.reduce(
    (sum: number, m) => sum + (m.text?.length || 0),
    0,
  );

  return totalChars > 0 ? (userChars / totalChars) * 100 : 50;
}

/**
 * Updates user metrics based on a new call session result.
 */
export async function updateUserMetrics(
  userId: string,
  session: CallSession,
): Promise<UserMetrics> {
  const currentMetrics =
    (await getUserMetrics(userId, session.teamId)) ||
    createInitialMetrics(userId, session.teamId);
  if (!isSessionCompleted(session)) return currentMetrics;

  const evaluation = session.feedbackReport || session.legacyEvaluation;

  const scores = extractScores(
    evaluation as
      | CallSession["feedbackReport"]
      | CallSession["legacyEvaluation"],
  );
  const talkRatio = calculateTalkRatio(session) ?? 50;

  const newTotalCalls = currentMetrics.totalCalls + 1;

  // Streak logic
  const today = new Date().toISOString().split("T")[0];
  const lastDate = currentMetrics.lastPracticeDate
    ? currentMetrics.lastPracticeDate.split("T")[0]
    : null;

  let newStreak = currentMetrics.practiceStreak;
  if (!lastDate) {
    newStreak = 1;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDate === yesterdayStr) {
      newStreak += 1;
    } else if (lastDate !== today) {
      newStreak = 1;
    }
  }

  const updatedMetrics: UserMetrics = {
    ...currentMetrics,
    totalCalls: newTotalCalls,
    totalDurationSeconds:
      currentMetrics.totalDurationSeconds + (session.durationSeconds || 0),
    averageScore:
      (currentMetrics.averageScore * currentMetrics.totalCalls +
        scores.overall) /
      newTotalCalls,
    discoveryAverage:
      (currentMetrics.discoveryAverage * currentMetrics.totalCalls +
        scores.discovery) /
      newTotalCalls,
    objectionHandlingAverage:
      (currentMetrics.objectionHandlingAverage * currentMetrics.totalCalls +
        scores.objection) /
      newTotalCalls,
    productPositioningAverage:
      (currentMetrics.productPositioningAverage * currentMetrics.totalCalls +
        scores.positioning) /
      newTotalCalls,
    closingAverage:
      (currentMetrics.closingAverage * currentMetrics.totalCalls +
        scores.closing) /
      newTotalCalls,
    activeListeningAverage:
      (currentMetrics.activeListeningAverage * currentMetrics.totalCalls +
        scores.listening) /
      newTotalCalls,
    // legacy support
    closingSuccessAverage:
      (currentMetrics.closingSuccessAverage * currentMetrics.totalCalls +
        scores.closing) /
      newTotalCalls,
    confidenceAverage:
      (currentMetrics.confidenceAverage * currentMetrics.totalCalls +
        scores.confidence) /
      newTotalCalls,
    talkTimeRatioAverage:
      (currentMetrics.talkTimeRatioAverage * currentMetrics.totalCalls +
        talkRatio) /
      newTotalCalls,
    practiceStreak: newStreak,
    lastPracticeDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (
    session.trackId &&
    !updatedMetrics.tracksCompleted.includes(session.trackId)
  ) {
    updatedMetrics.tracksCompleted.push(session.trackId);
  }

  await saveUserMetrics(updatedMetrics);
  return updatedMetrics;
}

function createInitialMetrics(userId: string, teamId: string): UserMetrics {
  return {
    userId,
    teamId,
    totalCalls: 0,
    totalDurationSeconds: 0,
    averageScore: 0,
    practiceStreak: 0,
    lastPracticeDate: null,
    discoveryAverage: 0,
    objectionHandlingAverage: 0,
    productPositioningAverage: 0,
    closingAverage: 0,
    activeListeningAverage: 0,
    closingSuccessAverage: 0,
    confidenceAverage: 0,
    talkTimeRatioAverage: 0,
    tracksCompleted: [],
    updatedAt: new Date().toISOString(),
  };
}
