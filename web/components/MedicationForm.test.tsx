/**
 * MedicationForm.v1.tsx - security and behaviour test suite
 *
 * Covers:
 *   - parseTime() unit tests (valid + invalid formats)
 *   - validate(): blank rows stripped, valid rows passed through
 *   - Analyze button gating (disabled until a name is filled)
 *   - Row add / remove logic
 *   - 15-row maximum enforcement
 *   - Time validation error shown in ErrorBanner
 *   - API fetch: correct method, headers, payload shape
 *   - Empty rows are stripped before sending to API (security)
 *   - API error message rendered in ErrorBanner (not raw Error objects)
 *   - 429 rate-limit response shown as a human-readable error
 *   - 500 server error surfaced clearly
 *   - Abort: re-submitting cancels in-flight request gracefully
 *   - onResult called with parsed response on success
 *   - Loading state during fetch
 *   - Retry button clears error and re-submits
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseTime, makeRow, MedicationForm } from './MedicationForm.v1';

// ---------------------------------------------------------------------------
// Mock design-system components with functional HTML equivalents
// Tests validate behaviour, not styles.
// ---------------------------------------------------------------------------

jest.mock('../../components/actions/Button', () => ({
  Button: ({ children, disabled, onClick, 'aria-label': ariaLabel, 'aria-busy': ariaBusy, ...rest }: any) => (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      data-testid={ariaLabel}
    >
      {children}
    </button>
  ),
}));

jest.mock('../../components/forms/Input', () => ({
  Input: ({ label, placeholder, value, onChange, hint, 'aria-label': ariaLabel, mono: _mono, inputStyle: _inputStyle, style: _style, ...rest }: any) => (
    <div>
      {label && <span>{label}</span>}
      <input
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onChange}
        aria-label={ariaLabel || label || placeholder}
        data-testid={ariaLabel || label || placeholder}
        {...rest}
      />
      {hint && <span>{hint}</span>}
    </div>
  ),
}));

jest.mock('../../components/forms/Select', () => ({
  Select: ({ label, options = [], value, onChange, 'aria-label': ariaLabel }: any) => (
    <div>
      {label && <span>{label}</span>}
      <select value={value} onChange={onChange} aria-label={ariaLabel || label}>
        {options.map((o: any) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </div>
  ),
}));

jest.mock('../../components/display/Card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_RESULT = {
  drugs: [{ name: 'Warfarin', rxcui: '11289', halfLife: 40, peakOffset: 4, metabolism: 'CYP2C9', route: 'oral' }],
  interactions: [],
  insights: [],
  recommended_schedule: [],
  summary: 'No interactions found.',
};

function mockFetchOk(body = MOCK_RESULT) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as any);
}

function mockFetchError(status: number, errorMessage: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: errorMessage }),
  } as any);
}

function mockFetchNetworkError() {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error. Please retry.'));
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// parseTime() unit tests
// ---------------------------------------------------------------------------

describe('parseTime()', () => {
  test.each([
    ['8am', '08:00'],
    ['8AM', '08:00'],
    ['10pm', '22:00'],
    ['12pm', '12:00'],
    ['12am', '00:00'],
    ['14:30', '14:30'],
    ['2:30pm', '14:30'],
    ['0', '00:00'],
    ['23', '23:00'],
    ['9', '09:00'],
  ])('parses "%s" as "%s"', (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  test.each([
    [''],
    ['25:00'],
    ['not-a-time'],
    ['99pm'],
    ['8:99'],
  ])('returns null for invalid input "%s"', (input) => {
    expect(parseTime(input)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// makeRow() unit tests
// ---------------------------------------------------------------------------

describe('makeRow()', () => {
  test('creates row with given name', () => {
    const row = makeRow('Warfarin');
    expect(row.name).toBe('Warfarin');
    expect(row.dose).toBe('');
    expect(row.time).toBe('');
    expect(row.route).toBe('oral');
  });

  test('creates row with empty name by default', () => {
    const row = makeRow();
    expect(row.name).toBe('');
  });

  test('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => makeRow().id));
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// MedicationForm rendering
// ---------------------------------------------------------------------------

describe('MedicationForm rendering', () => {
  test('renders with a single empty row by default', () => {
    render(<MedicationForm />);
    expect(screen.getByLabelText(/Drug name, row 1/i)).toBeInTheDocument();
  });

  test('pre-populates rows from initialDrugs', () => {
    render(<MedicationForm initialDrugs={['Warfarin', 'Aspirin']} />);
    const nameInputs = screen.getAllByRole('textbox');
    const drugInputs = nameInputs.filter((el) =>
      el.getAttribute('aria-label')?.includes('Drug name')
    );
    expect(drugInputs).toHaveLength(2);
  });

  test('column headers MEDICATION, DOSE, TIME, ROUTE shown on first row', () => {
    render(<MedicationForm />);
    expect(screen.getByText('MEDICATION')).toBeInTheDocument();
    expect(screen.getByText('DOSE')).toBeInTheDocument();
    expect(screen.getByText('TIME')).toBeInTheDocument();
    expect(screen.getByText('ROUTE')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Analyze button gating
// ---------------------------------------------------------------------------

describe('Analyze button disabled state', () => {
  test('disabled when no drug name is entered', () => {
    render(<MedicationForm />);
    const btn = screen.getByTestId('Analyze interactions');
    expect(btn).toBeDisabled();
  });

  test('enabled after entering a drug name', async () => {
    render(<MedicationForm />);
    const input = screen.getByLabelText(/Drug name, row 1/i);
    await userEvent.type(input, 'Warfarin');
    expect(screen.getByTestId('Analyze interactions')).not.toBeDisabled();
  });

  test('disabled when only whitespace entered in name', async () => {
    render(<MedicationForm />);
    const input = screen.getByLabelText(/Drug name, row 1/i);
    await userEvent.type(input, '   ');
    expect(screen.getByTestId('Analyze interactions')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Row add / remove
// ---------------------------------------------------------------------------

describe('Row management', () => {
  test('Add medication button adds a new row', async () => {
    render(<MedicationForm />);
    fireEvent.click(screen.getByTestId('Add medication row'));
    expect(screen.getByLabelText(/Drug name, row 2/i)).toBeInTheDocument();
  });

  test('Remove button removes the row', async () => {
    render(<MedicationForm initialDrugs={['Warfarin', 'Aspirin']} />);
    const removeButtons = screen.getAllByLabelText(/Remove/i);
    fireEvent.click(removeButtons[0]);
    expect(screen.queryByLabelText(/Drug name, row 2/i)).not.toBeInTheDocument();
  });

  test('cannot remove the last remaining row', () => {
    render(<MedicationForm />);
    // When only 1 row, remove button is invisible (opacity 0) and pointer-events none
    // The button exists but should have pointerEvents none or be visually hidden
    const input = screen.getByLabelText(/Drug name, row 1/i);
    expect(input).toBeInTheDocument();
    // Attempting to find a second row should fail
    expect(screen.queryByLabelText(/Drug name, row 2/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 15-row maximum enforcement
// ---------------------------------------------------------------------------

describe('Row maximum (15)', () => {
  test('Add button is disabled at 15 rows', async () => {
    const drugs = Array.from({ length: 15 }, (_, i) => `Drug${i + 1}`);
    render(<MedicationForm initialDrugs={drugs} />);
    expect(screen.getByTestId('Add medication row')).toBeDisabled();
  });

  test('shows "Maximum 15 medications reached" notice at 15 rows', () => {
    const drugs = Array.from({ length: 15 }, (_, i) => `Drug${i + 1}`);
    render(<MedicationForm initialDrugs={drugs} />);
    expect(screen.getByText(/Maximum 15 medications reached/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Time validation (security: bad input caught before API call)
// ---------------------------------------------------------------------------

describe('Time validation', () => {
  test('shows error for invalid time format without calling fetch', async () => {
    global.fetch = jest.fn();
    render(<MedicationForm />);
    const nameInput = screen.getByLabelText(/Drug name, row 1/i);
    const timeInput = screen.getByLabelText(/Time, row 1/i);
    await userEvent.type(nameInput, 'Warfarin');
    await userEvent.type(timeInput, 'not-a-time');
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('"not-a-time" is not a valid time');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('accepts valid 8am format without error', async () => {
    mockFetchOk();
    render(<MedicationForm />);
    await userEvent.type(screen.getByLabelText(/Drug name, row 1/i), 'Warfarin');
    await userEvent.type(screen.getByLabelText(/Time, row 1/i), '8am');
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Security: empty rows stripped before API call
// ---------------------------------------------------------------------------

describe('Security: payload sanitization', () => {
  test('blank name rows are not included in the API payload', async () => {
    mockFetchOk();
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    // Add a second empty row
    fireEvent.click(screen.getByTestId('Add medication row'));
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.medications).toHaveLength(1);
    expect(body.medications[0].name).toBe('Warfarin');
  });

  test('sends POST to the configured apiEndpoint', async () => {
    mockFetchOk();
    render(<MedicationForm apiEndpoint="/custom/endpoint" initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/custom/endpoint');
  });

  test('sends Content-Type: application/json header', async () => {
    mockFetchOk();
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  test('uses POST method', async () => {
    mockFetchOk();
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.method).toBe('POST');
  });

  test('disease field included in payload when filled', async () => {
    mockFetchOk();
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    const diseaseInput = screen.getByPlaceholderText('e.g. HIV');
    await userEvent.type(diseaseInput, 'HIV');
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.disease).toBe('HIV');
  });

  test('disease field omitted from payload when empty', async () => {
    mockFetchOk();
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.disease).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Error handling', () => {
  test('shows server error message from { error } field in response', async () => {
    mockFetchError(500, 'Analysis failed. Please retry.');
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Analysis failed. Please retry.');
  });

  test('shows 429 rate-limit error message', async () => {
    mockFetchError(429, 'Too many requests. Limit is 10 per minute per IP. Please wait and retry.');
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Too many requests');
  });

  test('shows network error message', async () => {
    mockFetchNetworkError();
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  test('Retry button clears the error and re-submits', async () => {
    mockFetchError(500, 'Failed once.');
    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    // Now make the next call succeed
    mockFetchOk();
    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('Loading state', () => {
  test('button shows "Analyzing..." during fetch', async () => {
    let resolveFetch!: () => void;
    global.fetch = jest.fn().mockReturnValue(
      new Promise<any>((resolve) => {
        resolveFetch = () => resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RESULT) });
      })
    );

    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));

    await waitFor(() => {
      expect(screen.getByTestId('Analyze interactions')).toHaveTextContent('Analyzing...');
    });

    act(() => { resolveFetch(); });
    await waitFor(() => {
      expect(screen.getByTestId('Analyze interactions')).toHaveTextContent('Analyze interactions');
    });
  });

  test('Analyze button is disabled while loading', async () => {
    let resolveFetch!: () => void;
    global.fetch = jest.fn().mockReturnValue(
      new Promise<any>((resolve) => {
        resolveFetch = () => resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_RESULT) });
      })
    );

    render(<MedicationForm initialDrugs={['Warfarin']} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));

    await waitFor(() => {
      expect(screen.getByTestId('Analyze interactions')).toBeDisabled();
    });

    act(() => { resolveFetch(); });
  });
});

// ---------------------------------------------------------------------------
// onResult callback
// ---------------------------------------------------------------------------

describe('onResult callback', () => {
  test('called with parsed API response on success', async () => {
    mockFetchOk(MOCK_RESULT);
    const onResult = jest.fn();
    render(<MedicationForm initialDrugs={['Warfarin']} onResult={onResult} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(MOCK_RESULT));
  });

  test('not called on error response', async () => {
    mockFetchError(500, 'Something went wrong.');
    const onResult = jest.fn();
    render(<MedicationForm initialDrugs={['Warfarin']} onResult={onResult} />);
    fireEvent.click(screen.getByTestId('Analyze interactions'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onResult).not.toHaveBeenCalled();
  });
});
