import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function useMatrixWindow(dates: string[]) {
  const [size, setSize] = useState(7);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const lastPage = size ? Math.max(0, Math.ceil(dates.length / size) - 1) : 0;
  const activePage = Math.min(page, lastPage);
  const visibleDates = size ? dates.slice(activePage * size, activePage * size + size) : dates;
  const search = query.trim().toLocaleLowerCase();
  const matchesName = (name: string) => name.toLocaleLowerCase().includes(search);

  const controls = (
    <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Matrix filters" role="group">
      <input
        type="search" className="duty-control min-w-0 w-full sm:w-52"
        aria-label="Find staff by name" placeholder="Find staff by name"
        value={query} onChange={event => setQuery(event.target.value)}
      />
      <select
        className="duty-control" aria-label="Days shown" value={size}
        onChange={event => { setSize(Number(event.target.value)); setPage(0); }}
      >
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
        <option value={0}>{dates.length === 28 ? '28 days' : 'Full period'}</option>
      </select>
      <button type="button" className="duty-control" aria-label="Previous dates" disabled={activePage === 0} onClick={() => setPage(activePage - 1)}>
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="duty-control" aria-label="Next dates" disabled={activePage >= lastPage} onClick={() => setPage(activePage + 1)}>
        <ChevronRight size={18} />
      </button>
      {visibleDates.length > 0 && (
        <span className="text-sm tabular-nums text-slate-300" aria-live="polite">
          {visibleDates[0]} – {visibleDates.at(-1)}
        </span>
      )}
    </div>
  );

  const dateHeading = (date: string, weekday: string, day: number) => (
    <button type="button" className="duty-date-heading" aria-label={`Highlight ${date}`}
      aria-pressed={highlightedDate === date} onClick={() => setHighlightedDate(current => current === date ? null : date)}>
      <span className="block text-xs">{weekday}</span>
      <span className="block text-sm font-semibold tabular-nums">{day}</span>
    </button>
  );

  return { visibleDates, matchesName, search, controls, highlightedDate, dateHeading };
}
