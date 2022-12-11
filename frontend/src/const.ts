// https://github.com/microsoft/TypeScript/issues/28046#issuecomment-431871542
function stringLiterals<T extends string>(...args: T[]): T[] {
  return args;
}

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never;

export const MUSCLE_GROUPS = stringLiterals("neck", "chest", "shoulders", "biceps", "forearms", "abs", "thighs", "calves", "back", "triceps", "glutes", "hamstrings");
export type TMuscleGroup = ElementType<typeof MUSCLE_GROUPS>;

export const WEEK_DAY_NAMES = stringLiterals('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
export type TWeekDayName = ElementType<typeof WEEK_DAY_NAMES>;
