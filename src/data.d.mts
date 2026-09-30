import type { Options } from "./options.mjs";

export interface Release {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  /** Changelog entries, leaving out the ignored sections. */
  changes: number;
  categories: { features: number; fixes: number; registry: number; other: number };
  /** Whether the release has notes to show. */
  notes: boolean;
  /** Issues closed by the release's pull requests; null when not counted. */
  issues: number | null;
}

export interface ReleasesData {
  repo: string;
  issuesSince: string | null;
  issuesNote: string;
  /** Oldest first. */
  releases: Release[];
}

export function defineReleasesData(overrides?: Partial<Options>): {
  watch: string[];
  load(): Promise<ReleasesData>;
};
