export interface BalarDiagnostic {
  file: string;
  line: number;
  column: number;
  code: number;
  message: string;
  category: string;
}
