import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Filter, Search, Check, X, CheckSquare, Square } from 'lucide-react';

interface ExcelColumnFilterProps {
  columnKey: string;
  title: string;
  allValues: string[]; // Distinct values available for this column (cascaded)
  selectedValues?: string[]; // Currently active filtered values (undefined = all allowed)
  onApply?: (selected: string[] | undefined) => void;
  onFilterChange?: (selected: string[] | undefined) => void;
  align?: 'left' | 'right';
}

export const ExcelColumnFilter: React.FC<ExcelColumnFilterProps> = ({
  columnKey,
  title,
  allValues,
  selectedValues,
  onApply,
  onFilterChange,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const notifyChange = (selected: string[] | undefined) => {
    if (onApply) onApply(selected);
    if (onFilterChange) onFilterChange(selected);
  };

  // Temporary selected set while popover is open
  const [tempSelected, setTempSelected] = useState<Set<string>>(() => {
    return new Set(selectedValues !== undefined ? selectedValues : allValues);
  });

  const isFiltered = Boolean(
    selectedValues &&
    selectedValues.length > 0 &&
    (allValues.length === 0 || selectedValues.length < allValues.length || !allValues.every((v) => selectedValues.includes(v)))
  );

  // Sync tempSelected whenever popover opens or selectedValues change
  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedValues !== undefined ? selectedValues : allValues));
      setSearchQuery('');
    }
  }, [isOpen, selectedValues, allValues]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Distinct sorted values for this column
  const sortedUniqueValues = useMemo(() => {
    const set = new Set<string>();
    allValues.forEach((v) => set.add(v ?? ''));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [allValues]);

  // Search filtered items in popover
  const displayedItems = useMemo(() => {
    if (!searchQuery.trim()) return sortedUniqueValues;
    const q = searchQuery.toLowerCase();
    return sortedUniqueValues.filter((v) => {
      const displayLabel = v === '' ? '(blanks)' : v.toLowerCase();
      return displayLabel.includes(q);
    });
  }, [sortedUniqueValues, searchQuery]);

  const handleToggleValue = (val: string) => {
    const next = new Set(tempSelected);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setTempSelected(next);
  };

  const handleSelectAll = () => {
    const next = new Set(tempSelected);
    displayedItems.forEach((v) => next.add(v));
    setTempSelected(next);
  };

  const handleClearAll = () => {
    const next = new Set(tempSelected);
    displayedItems.forEach((v) => next.delete(v));
    setTempSelected(next);
  };

  const handleApply = () => {
    // If all possible values are selected, it's equivalent to no filter
    if (tempSelected.size >= sortedUniqueValues.length && sortedUniqueValues.every((v) => tempSelected.has(v))) {
      notifyChange(undefined);
    } else {
      notifyChange(Array.from(tempSelected));
    }
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    notifyChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center ml-1" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={`Filter by ${title}${isFiltered ? ` (${selectedValues?.length} active)` : ''}`}
        className={`p-1 rounded transition-colors focus:outline-none ${
          isFiltered
            ? 'text-white bg-blue-700 shadow-xs ring-1 ring-blue-500'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/80'
        }`}
      >
        <Filter className={`w-3 h-3 ${isFiltered ? 'fill-current' : ''}`} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-64 bg-white border border-slate-300 rounded-md shadow-xl z-50 text-slate-800 text-xs font-normal normal-case tracking-normal`}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-800">Filter: {title}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search box inside filter */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search values..."
                className="w-full bg-white border border-slate-200 rounded pl-7 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="px-2 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-blue-700 hover:underline font-medium"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Clear
            </button>
            <span className="text-slate-400 text-[10px]">
              {tempSelected.size}/{sortedUniqueValues.length}
            </span>
          </div>

          {/* Checkbox List */}
          <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50">
            {displayedItems.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs italic">
                No matching values
              </div>
            ) : (
              displayedItems.map((val) => {
                const isChecked = tempSelected.has(val);
                const displayLabel = val === '' ? '(Blanks)' : val;

                return (
                  <label
                    key={val || '__blank__'}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer select-none text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleValue(val)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span
                      className={`truncate text-xs ${
                        val === '' ? 'italic text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {displayLabel}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handleClearFilter}
              disabled={!isFiltered}
              className={`px-2 py-1 text-[11px] rounded font-medium ${
                isFiltered
                  ? 'text-rose-700 hover:bg-rose-50'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              Clear Filter
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 py-1 text-[11px] font-semibold text-white bg-blue-700 rounded hover:bg-blue-800 shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
