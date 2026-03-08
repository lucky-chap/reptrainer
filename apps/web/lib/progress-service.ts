import { getUserMetrics, saveUserMetrics, type CallSession } from "./db";
import { type UserMetrics, type TrainingTrackId } from "@reptrainer/shared";
import { v4 as uuidv4 } from "uuid";

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

  const score =
    "overall_score" in evaluation
      ? (evaluation as any).overall_score
      : "overallScore" in evaluation
        ? (evaluation as any).overallScore
        : (((evaluation as any).objectionHandling.score +
            (evaluation as any).productPositioning.score +
            (evaluation as any).closing.score) /
            3) *
          10;

  const discoveryScore =
    (evaluation as any).discovery?.score ??
    ((evaluation as any).confidence_score ||
      (evaluation as any).overallScore ||
      0);
  const objectionScore =
    "objection_handling_score" in evaluation
      ? (evaluation as any).objection_handling_score
      : ((evaluation as any).objectionHandling?.score ?? 0);
  const positioningScore =
    (evaluation as any).productPositioning?.score ??
    ((evaluation as any).confidence_score || 0);
  const closingScore =
    "closing_effectiveness_score" in evaluation
      ? (evaluation as any).closing_effectiveness_score
      : ((evaluation as any).closing?.score ?? 0);
  const listeningScore = (evaluation as any).activeListening?.score ?? 0;

  const confidenceScore =
    "confidence_score" in evaluation
      ? (evaluation as any).confidence_score
      : positioningScore;

  // Calculate talk-time ratio from transcript
  const userChars = session.transcriptMessages
    .filter((m) => m.role === "user")
    .reduce((sum, m) => sum + m.text.length, 0);
  const totalChars = session.transcriptMessages.reduce(
    (sum, m) => sum + m.text.length,
    0,
  );
  const talkRatio = totalChars > 0 ? (userChars / totalChars) * 100 : 50;

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
      (currentMetrics.averageScore * currentMetrics.totalCalls + score) /
      newTotalCalls,
    discoveryAverage:
      (currentMetrics.discoveryAverage * currentMetrics.totalCalls +
        discoveryScore) /
      newTotalCalls,
    objectionHandlingAverage:
      (currentMetrics.objectionHandlingAverage * currentMetrics.totalCalls +
        objectionScore) /
      newTotalCalls,
    productPositioningAverage:
      (currentMetrics.productPositioningAverage * currentMetrics.totalCalls +
        positioningScore) /
      newTotalCalls,
    closingAverage:
      (currentMetrics.closingAverage * currentMetrics.totalCalls +
        closingScore) /
      newTotalCalls,
    activeListeningAverage:
      (currentMetrics.activeListeningAverage * currentMetrics.totalCalls +
        listeningScore) /
      newTotalCalls,
    // legacy support
    closingSuccessAverage:
      (currentMetrics.closingSuccessAverage * currentMetrics.totalCalls +
        closingScore) /
      newTotalCalls,
    confidenceAverage:
      (currentMetrics.confidenceAverage * currentMetrics.totalCalls +
        confidenceScore) /
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
    // In a real app, we'd check if all scenarios in the track are done.
    // For now, we'll mark it as completed if a session was done in that track.
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
