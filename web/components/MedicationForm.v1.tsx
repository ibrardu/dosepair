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
// MedRowInput - single medication row
// ---------------------------------------------------------------------------

interface MedRowInputProps {
  row: MedRow;
  index: number;
  showHeaders: boolean;
  removable: boolean;
  onUpdate: (patch: Partial<MedRow>) => void;
  onRemove: () => void;
}

function MedRowInput({ row, index, showHeaders, removable, onUpdate, onRemove }: MedRowInputProps) {
  const col = (text: string) => (showHeaders ? text : undefined);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
        gap: 'var(--space-3)',
        alignItems: 'end',
      }}
    >
      <Input
        label={col('MEDICATION')}
        placeholder="e.g. Warfarin"
        value={row.name}
        autoComplete="off"
        aria-label={`Drug name, row ${index + 1}`}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ name: e.target.value })}
      />
      <Input
        label={col('DOSE')}
        placeholder="5mg"
        value={row.dose}
        mono
        autoComplete="off"
        aria-label={`Dose, row ${index + 1}`}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ dose: e.target.value })}
      />
      <Input
        label={col('TIME')}
        placeholder="8am"
        value={row.time}
        mono
        autoComplete="off"
        aria-label={`Time, row ${index + 1}`}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ time: e.target.value })}
      />
      <Select
        label={col('ROUTE')}
        options={ROUTE_OPTIONS}
        value={row.route}
        aria-label={`Route, row ${index + 1}`}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdate({ route: e.target.value })}
      />
      {/* Remove button - hidden (opacity 0) when only one row so layout is stable */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        aria-label={`Remove ${row.name.trim() || `row ${index + 1}`}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 'var(--radius-pill)',
          cursor: removable ? 'pointer' : 'default',
          color: 'var(--text-muted)',
          opacity: removable ? 1 : 0,
          pointerEvents: removable ? 'auto' : 'none',
          transition: 'color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
          marginBottom: showHeaders ? 0 : 0,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!removable) return;
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--severity-high)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--severity-high)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MedicationForm
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

  const atMax = rows.length >= MAX_ROWS;
  const hasName = rows.some((r) => r.name.trim().length > 0);

  const setRow = useCallback((index: number, patch: Partial<MedRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => {
    if (atMax) return;
    setRows((prev) => [...prev, makeRow()]);
  }, [atMax]);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }, []);

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map((row, i) => (
          <MedRowInput
            key={row.id}
            row={row}
            index={i}
            showHeaders={i === 0}
            removable={rows.length > 1}
            onUpdate={(patch) => setRow(i, patch)}
            onRemove={() => removeRow(i)}
          />
        ))}

        {/* Disease field + action buttons row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 'var(--space-3)',
            alignItems: 'end',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--border-default)',
            marginTop: 'var(--space-1)',
          }}
        >
          <Input
            label="DISEASE / CONDITION (OPTIONAL)"
            placeholder="e.g. HIV"
            value={disease}
            hint="Unlocks the clinical research panel"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisease(e.target.value)}
          />
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              alignItems: 'center',
              paddingBottom: 22,
            }}
          >
            <div
              title={atMax ? 'Maximum 15 medications reached' : undefined}
              style={{ display: 'inline-flex' }}
            >
              <Button
                variant="secondary"
                size="md"
                disabled={atMax || loading}
                onClick={addRow}
                aria-label="Add medication row"
                aria-describedby={atMax ? 'med-max-notice' : undefined}
              >
                + Add medication
              </Button>
            </div>
            {atMax && (
              <span
                id="med-max-notice"
                role="status"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                Maximum 15 medications reached
              </span>
            )}
            <Button
              variant="primary"
              size="md"
              fullWidth={false}
              disabled={!hasName || loading}
              onClick={() => {}}
              aria-label="Analyze interactions"
              aria-busy={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze interactions'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
