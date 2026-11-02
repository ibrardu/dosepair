'use client';

import { useState } from 'react';
import { MedicationForm, type AnalyzeResult } from '../../components/MedicationForm.v1';

export default function AnalyzePage() {
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <MedicationForm onResult={setResult} />
      {result && (
        <pre data-testid="result" style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
