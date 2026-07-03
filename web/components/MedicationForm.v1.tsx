'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Button } from '../../components/actions/Button';
import { Input } from '../../components/forms/Input';
import { Select } from '../../components/forms/Select';
import { Card } from '../../components/display/Card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MedRow {
  id: string;
  name: string;
  dose: string;
  time: string;
  route: string;
}

export interface AnalyzeMedication {
  name: string;
  dose?: string;
  route?: string;
}

export interface AnalyzePayload {
  medications: AnalyzeMedication[];
  disease?: string;
}

export interface DrugProfile {
  name: string;
  rxcui: string;
  halfLife: number;
  peakOffset: number;
  metabolism: string;
  route: string;
}

export interface Interaction {
  pair: [string, string];
  severity: 'high' | 'moderate' | 'low';
  effect: string;
  mechanism: string;
}

export interface Insight {
  type: 'warning' | 'tip' | 'info';
  text: string;
  why: string;
  related_drugs: string[];
  actionable: boolean;
}

export interface ScheduleEntry {
  drug: string;
  hour: number;
  time: string;
  recommended: boolean;
  note: string;
}

export interface AnalyzeResult {
  drugs: DrugProfile[];
  interactions: Interaction[];
  insights: Insight[];
  recommended_schedule: ScheduleEntry[];
  summary: string;
}

export interface MedicationFormProps {
  /** Backend endpoint. Defaults to /api/analyze. */
  apiEndpoint?: string;
  /** Pre-populate medication rows by drug name. */
  initialDrugs?: string[];
  /** Called with the parsed API response on success. */
  onResult?: (result: AnalyzeResult) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ROWS = 15;

const ROUTE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'oral', label: 'Oral' },
  { value: 'topical', label: 'Topical' },
  { value: 'injection', label: 'Injection' },
  { value: 'inhaled', label: 'Inhaled' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'iv', label: 'IV' },
];

// Accepts: 8am, 8AM, 10pm, 14:30, 2:30pm, 0800
const TIME_RE = /^(\d{1,2})(:\d{2})?\s*(am|pm)?$/i;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Parses permissive time input into HH:MM (24h). Returns null if invalid.
 * Accepts: 8am, 10pm, 14:30, 2:30pm, 8, 0800.
 */
export function parseTime(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(TIME_RE);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const minutes = m[2] ? m[2].slice(1) : '00';
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23 || parseInt(minutes, 10) > 59) return null;
  return `${h.toString().padStart(2, '0')}:${minutes}`;
}

/** Creates a fresh medication row with a stable random id. */
export function makeRow(name = ''): MedRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    dose: '',
    time: '',
    route: 'oral',
  };
}

// ---------------------------------------------------------------------------
// MedicationForm - shell (rows, submission, and states added in later chunks)
// ---------------------------------------------------------------------------

export function MedicationForm({
  apiEndpoint = '/api/analyze',
  initialDrugs = [],
  onResult,
}: MedicationFormProps) {
  const [rows, setRows] = useState<MedRow[]>(() =>
    initialDrugs.length ? initialDrugs.map(makeRow) : [makeRow()]
  );
  const [disease, setDisease] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {rows.length} medication{rows.length !== 1 ? 's' : ''} added
        </p>
      </div>
    </Card>
  );
}
