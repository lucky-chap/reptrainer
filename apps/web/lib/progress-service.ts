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
      ? evaluation.overall_score
      : ((evaluation.objectionHandlingScore +
          evaluation.confidenceScore +
          evaluation.clarityScore) /
          3) *
        10;

  const objectionScore =
    "objection_handling_score" in evaluation
      ? evaluation.objection_handling_score
      : evaluation.objectionHandlingScore * 10;
  const closingScore =
    "closing_effectiveness_score" in evaluation
      ? evaluation.closing_effectiveness_score
      : evaluation.confidenceScore * 10; // Fallback
  const confidenceScore =
    "confidence_score" in evaluation
      ? evaluation.confidence_score
      : evaluation.confidenceScore * 10;

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
    objectionHandlingAverage:
      (currentMetrics.objectionHandlingAverage * currentMetrics.totalCalls +
        objectionScore) /
      newTotalCalls,
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
    objectionHandlingAverage: 0,
    closingSuccessAverage: 0,
    confidenceAverage: 0,
    talkTimeRatioAverage: 0,
    tracksCompleted: [],
    updatedAt: new Date().toISOString(),
  };
}
