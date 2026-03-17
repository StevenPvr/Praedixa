export interface HeaderScrollState {
  hidden: boolean;
  elevated: boolean;
}

interface ResolveHeaderScrollStateInput {
  currentY: number;
  previousY: number;
  hidden: boolean;
}

const TOP_OFFSET = 18;
const HIDE_OFFSET = 80;
const DIRECTION_THRESHOLD = 10;

export function resolveHeaderScrollState({
  currentY,
  previousY,
  hidden,
}: ResolveHeaderScrollStateInput): HeaderScrollState {
  if (currentY <= TOP_OFFSET) {
    return { hidden: false, elevated: false };
  }

  if (currentY <= HIDE_OFFSET) {
    return { hidden: false, elevated: true };
  }

  const delta = currentY - previousY;

  if (Math.abs(delta) < DIRECTION_THRESHOLD) {
    return { hidden, elevated: true };
  }

  return {
    hidden: delta > 0,
    elevated: true,
  };
}
