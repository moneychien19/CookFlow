// Scoring weights and threshold from SPEC §5. Tune here, nowhere else.

/** Extra weight for using an already-opened (partial) item. */
export const ALPHA = 2;
/** Extra weight for using an item, scaled by how soon it expires. */
export const BETA = 1;
/** Penalty per item the recipe would leave newly half-used. */
export const GAMMA = 1;
/** Penalty per ingredient the cook would have to buy. */
export const DELTA = 1.5;

/** Recipes covering less than this share of non-staple ingredients are skipped. */
export const COVERAGE_THRESHOLD = 0.6;

/** Urgency falls from 1 (expires today) to 0 over this many days. */
export const URGENCY_HORIZON_DAYS = 7;

/** Scores closer than this are a tie; the earlier recipe in input order wins. */
export const SCORE_EPSILON = 1e-9;
