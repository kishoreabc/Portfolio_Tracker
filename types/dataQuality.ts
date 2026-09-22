export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCategory = 'missing' | 'invalid' | 'duplicate' | 'unknown' | 'future-dated';

export interface DataIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  field: string;
  message: string;
  /** Name / ISIN / date of the affected record, for drill-down display */
  affectedRecord?: string;
}

export interface DataQualityReport {
  issues: DataIssue[];
  /** 0-100 completeness score */
  completenessPercent: number;
  equityOk: boolean;
  bondsOk: boolean;
  transactionsOk: boolean;
}
