export type Diagnostic = {
  name: string;
  ok: boolean;
  detail?: string;
};

export function buildDiagnostic(name: string, ok: boolean, detail?: string): Diagnostic {
  return { name, ok, detail };
}
