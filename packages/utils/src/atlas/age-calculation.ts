/**
 * Age Calculation Utilities - Rabbit Hole Schema
 *
 * Provides age calculation, status determination, and relationship duration
 * calculations for family relationship analysis.
 */

export interface PersonAgeData {
  age: number | null;
  status: "living" | "deceased" | "unknown";
  ageAtDeath?: number;
}

export interface RelationshipDurationData {
  duration: string | null;
  years: number | null;
  isOngoing: boolean;
  startYear: number | null;
  endYear: number | null;
}

/**
 * Calculate person's age and living status
 */
export function calculatePersonAge(
  birthDate?: string,
  deathDate?: string,
  referenceDate?: string
): PersonAgeData {
  if (!birthDate) {
    return { age: null, status: "unknown" };
  }

  const birth = new Date(birthDate);

  if (deathDate) {
    const death = new Date(deathDate);
    const ageAtDeath = death.getFullYear() - birth.getFullYear();
    const monthDiff = death.getMonth() - birth.getMonth();

    const adjustedAge =
      monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())
        ? ageAtDeath - 1
        : ageAtDeath;

    return {
      age: adjustedAge,
      status: "deceased",
      ageAtDeath: adjustedAge,
    };
  }

  const now = referenceDate ? new Date(referenceDate) : new Date();
  const age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  const adjustedAge =
    monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())
      ? age - 1
      : age;

  return {
    age: adjustedAge,
    status: adjustedAge < 120 ? "living" : "unknown",
  };
}

/**
 * Calculate relationship duration with formatted display
 */
export function calculateRelationshipDuration(
  startDate?: string,
  endDate?: string
): RelationshipDurationData {
  if (!startDate) {
    return {
      duration: null,
      years: null,
      isOngoing: false,
      startYear: null,
      endYear: null,
    };
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const isOngoing = !endDate;

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const years = endYear - startYear;

  let duration: string;

  if (years < 1) {
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      end.getMonth() -
      start.getMonth();
    duration = `${months} month${months !== 1 ? "s" : ""}${isOngoing ? " (ongoing)" : ""}`;
  } else {
    duration = `${startYear}-${isOngoing ? "present" : endYear} (${years} year${years !== 1 ? "s" : ""})`;
  }

  return {
    duration,
    years: years >= 1 ? years : null,
    isOngoing,
    startYear,
    endYear: isOngoing ? null : endYear,
  };
}

/**
 * Determine person status from dates
 */
export function determinePersonStatus(
  birthDate?: string,
  deathDate?: string
): "living" | "deceased" | "unknown" {
  if (deathDate) return "deceased";
  if (birthDate) {
    const age = calculatePersonAge(birthDate).age;
    if (age !== null && age < 120) return "living";
  }
  return "unknown";
}

/**
 * Calculate average age from array of PersonAgeData
 */
export function calculateAverageAge(
  ageDataArray: PersonAgeData[]
): number | null {
  const validAges = ageDataArray
    .map((data) => data.age)
    .filter((age): age is number => age !== null);

  if (validAges.length === 0) return null;

  return validAges.reduce((sum, age) => sum + age, 0) / validAges.length;
}

/**
 * Format age for display with status indicator
 */
export function formatAgeDisplay(ageData: PersonAgeData): string {
  if (ageData.age === null) return "Age unknown";

  if (ageData.status === "deceased") {
    return `Age ${ageData.age} (deceased)`;
  }

  return `Age ${ageData.age}`;
}

/**
 * Format duration for display in relationship cards
 */
export function formatDurationDisplay(
  durationData: RelationshipDurationData
): string {
  if (!durationData.duration) return "Duration unknown";
  return durationData.duration;
}

/**
 * Get status emoji for visual indication
 */
export function getStatusEmoji(
  status: "living" | "deceased" | "unknown"
): string {
  switch (status) {
    case "living":
      return "🟢";
    case "deceased":
      return "🔴";
    case "unknown":
      return "⚪";
    default: {
      // Exhaustive checking - ensures all status values are handled
      const _exhaustiveCheck: never = status;
      return "⚪"; // fallback
    }
  }
}

/**
 * Batch calculate ages for multiple people
 */
export function batchCalculateAges(
  people: Array<{
    birthDate?: string;
    deathDate?: string;
  }>,
  referenceDate?: string
): PersonAgeData[] {
  return people.map((person) =>
    calculatePersonAge(person.birthDate, person.deathDate, referenceDate)
  );
}

/**
 * Calculate family age statistics
 */
export function calculateFamilyAgeStats(
  familyMembers: Array<{
    birthDate?: string;
    deathDate?: string;
  }>
): {
  averageAge: number | null;
  livingMembers: number;
  deceasedMembers: number;
  unknownMembers: number;
  ageRange: { min: number; max: number } | null;
} {
  const ageDataArray = batchCalculateAges(familyMembers);
  const averageAge = calculateAverageAge(ageDataArray);

  const livingMembers = ageDataArray.filter(
    (data) => data.status === "living"
  ).length;
  const deceasedMembers = ageDataArray.filter(
    (data) => data.status === "deceased"
  ).length;
  const unknownMembers = ageDataArray.filter(
    (data) => data.status === "unknown"
  ).length;

  const validAges = ageDataArray
    .map((data) => data.age)
    .filter((age): age is number => age !== null);

  const ageRange =
    validAges.length > 0
      ? {
          min: Math.min(...validAges),
          max: Math.max(...validAges),
        }
      : null;

  return {
    averageAge,
    livingMembers,
    deceasedMembers,
    unknownMembers,
    ageRange,
  };
}

/**
 * Marriage timeline analysis
 */
export function analyzeMarriageTimeline(
  marriages: Array<{
    startDate?: string;
    endDate?: string;
  }>
): {
  totalMarriages: number;
  currentMarriages: number;
  averageDuration: number | null;
  longestMarriage: RelationshipDurationData | null;
} {
  const totalMarriages = marriages.length;
  const currentMarriages = marriages.filter((m) => !m.endDate).length;

  const durations = marriages
    .map((m) => calculateRelationshipDuration(m.startDate, m.endDate))
    .filter((d) => d.years !== null);

  const averageDuration =
    durations.length > 0
      ? durations.reduce((sum, d) => sum + (d.years || 0), 0) / durations.length
      : null;

  const longestMarriage =
    durations.length > 0
      ? durations.reduce((longest, current) =>
          (current.years || 0) > (longest.years || 0) ? current : longest
        )
      : null;

  return {
    totalMarriages,
    currentMarriages,
    averageDuration,
    longestMarriage,
  };
}
