export interface Options {
  /** "owner/name" of the GitHub repository. */
  repo: string;
  /** The repository root; default: the current directory. */
  root?: string;
  /** Default: CHANGELOG.md */
  changelog?: string;
  /** Where release notes are snapshotted; default: release-notes */
  notesDir?: string;
  /** YYYY-MM-DD the issue tracker started to be used; omit for no issue counts. */
  issuesSince?: string;
  /** Where issue counts are kept; default: releases-issues.json */
  issuesFile?: string;
  /** Text shown under the issues chart. */
  issuesNote?: string;
  /** Regex source; a release body is cut from its first match on. */
  trimFrom?: string;
  /** Regex source for changelog sections that are not changes. */
  ignoredSections?: string;
}
