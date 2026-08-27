import {createEmptyCard, fsrs, Rating, type Card, type CardInput} from "ts-fsrs";

import type {ProgressRecord} from "@/src/db/repository";

export type PromptDirection = "name_to_profile" | "code_to_name";
export type BinaryRating = "again" | "good";

export type ScheduledProgress = {
  stockId: string;
  direction: PromptDirection;
  stateJson: string;
  dueAt: string;
  repetitions: number;
  lastRating: BinaryRating;
  updatedAt: string;
};

const scheduler = fsrs({enable_fuzz: false});

function restoreCard(progress: ProgressRecord | null, now: Date): CardInput | Card {
  if (!progress) return createEmptyCard(now);
  let parsed: CardInput;
  try {
    parsed = JSON.parse(progress.stateJson) as CardInput;
  } catch {
    throw new Error("学习记录损坏，无法继续排期");
  }
  if (!parsed || parsed.due === undefined || parsed.state === undefined || parsed.reps === undefined) {
    throw new Error("学习记录损坏，无法继续排期");
  }
  return parsed;
}

export function scheduleProgress(
  stockId: string,
  direction: PromptDirection,
  previous: ProgressRecord | null,
  rating: BinaryRating,
  now: Date,
): ScheduledProgress {
  const grade = rating === "again" ? Rating.Again : Rating.Good;
  const result = scheduler.next(restoreCard(previous, now), now, grade);
  return {
    stockId,
    direction,
    stateJson: JSON.stringify(result.card),
    dueAt: result.card.due.toISOString(),
    repetitions: result.card.reps,
    lastRating: rating,
    updatedAt: now.toISOString(),
  };
}
