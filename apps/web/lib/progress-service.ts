import {
  getUserMetrics,
  saveUserMetrics,
  getAllSessions,
  getAllCallSessions,
  type CallSession,
  type Session,
} from "./db";
import { type UserMetrics, type TrainingTrackId } from "@reptrainer/shared";
import { v4 as uuidv4 } from "uuid";

/**
 * Recalculates all user metrics from scratch based on all existing sessions.
 * Useful when a session is deleted.
 */
export async function recalculateUserMetrics(
  userId: string,
): Promise<UserMetrics> {
  const [sessions, callSessions] = await Promise.all([
    getAllSessions(userId),
    getAllCallSessions(userId),
  ]);

  // Combined and de-duplicate by ID
  const sessionMap = new Map<string, any>();
  sessions.forEach((s: Session) => sessionMap.set(s.id, s));
  callSessions.forEach((cs: CallSession) => {
    // CallSession has richer data (like transcriptMessages), so merge/overwrite
    const existing = sessionMap.get(cs.id) || {};
    sessionMap.set(cs.id, { ...existing, ...cs });
  });

  const allSessions = Array.from(sessionMap.values())
    .filter((s) => s.evaluation || s.feedbackReport || s.legacyEvaluation)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const metrics = createInitialMetrics(userId);
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
    const evaluation =
      session.feedbackReport || session.legacyEvaluation || session.evaluation;
    if (!evaluation) continue;

    const scores = extractScores(evaluation);
    totalScore += scores.overall;
    totalDiscovery += scores.discovery;
    totalObjection += scores.objection;
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

    const dateStr = session.createdAt.split("T")[0];
    practiceDates.add(dateStr);

    if (session.trackId && !metrics.tracksCompleted.includes(session.trackId)) {
      metrics.tracksCompleted.push(session.trackId);
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
      const diffDays =
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1.1) {
        // approx 1 day (handles slight DST shifts)
        streak++;
      } else {
        streak = 1;
      }
    }

    // Check if the streak is still active (was it practiced today or yesterday?)
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    const now = new Date();
    // Normalize to midnight for comparison
    const lastPracticeMidnight = new Date(lastDate).setHours(0, 0, 0, 0);
    const todayMidnight = new Date(now).setHours(0, 0, 0, 0);
    const diffDaysSinceLast =
      (todayMidnight - lastPracticeMidnight) / (1000 * 60 * 60 * 24);

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
 */
function extractScores(evaluation: any) {
  const overall =
    "overall_score" in evaluation
      ? evaluation.overall_score
      : "overallScore" in evaluation
        ? evaluation.overallScore
        : (((evaluation.objectionHandling?.score ?? 0) +
            (evaluation.productPositioning?.score ?? 0) +
            (evaluation.closing?.score ?? 0)) /
            3) *
          10;

  const discovery =
    evaluation.discovery?.score ??
    (evaluation.confidence_score || evaluation.overallScore || 0);

  const objection =
    "objection_handling_score" in evaluation
      ? evaluation.objection_handling_score
      : (evaluation.objectionHandling?.score ?? 0);

  const positioning =
    evaluation.productPositioning?.score ?? (evaluation.confidence_score || 0);

  const closing =
    "closing_effectiveness_score" in evaluation
      ? evaluation.closing_effectiveness_score
      : (evaluation.closing?.score ?? 0);

  const listening = evaluation.activeListening?.score ?? 0;

  const confidence =
    "confidence_score" in evaluation
      ? evaluation.confidence_score
      : positioning;

  return {
    overall,
    discovery,
    objection,
    positioning,
    closing,
    listening,
    confidence,
  };
}

/**
 * Helper to calculate talk-to-listen ratio from transcript messages.
 */
function calculateTalkRatio(session: any): number | null {
  if (
    !session.transcriptMessages ||
    !Array.isArray(session.transcriptMessages) ||
    session.transcriptMessages.length === 0
  ) {
    return null;
  }

  const userChars = session.transcriptMessages
    .filter((m: any) => m.role === "user")
    .reduce((sum: number, m: any) => sum + (m.text?.length || 0), 0);
  const totalChars = session.transcriptMessages.reduce(
    (sum: number, m: any) => sum + (m.text?.length || 0),
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
    (await getUserMetrics(userId)) || createInitialMetrics(userId);
  const evaluation = session.feedbackReport || session.legacyEvaluation;

  if (!evaluation) return currentMetrics;

  const scores = extractScores(evaluation);
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

function createInitialMetrics(userId: string): UserMetrics {
  return {
    userId,
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
