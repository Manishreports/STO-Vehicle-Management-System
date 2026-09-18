import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  totalItems: number;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  rowOptions?: (number | 'All')[];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  totalItems,
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowOptions = [10, 25, 50, 100, 250],
}) => {
  const effectiveRowsPerPage = rowsPerPage >= 999999 ? Math.max(1, totalItems) : rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectiveRowsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * effectiveRowsPerPage + 1;
  const endItem = Math.min(totalItems, currentPage * effectiveRowsPerPage);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 select-none">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={rowsPerPage >= 999999 ? 999999 : rowsPerPage}
          onChange={(e) => {
            onRowsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {rowOptions.map((opt) => {
            const isAll = String(opt) === 'All';
            const val = isAll ? 999999 : Number(opt);
            const label = isAll ? 'All' : opt;
            return (
              <option key={String(opt)} value={val}>
                {label}
              </option>
            );
          })}
        </select>
        <span className="text-slate-400">|</span>
        <span>
          Showing <strong className="text-slate-800">{startItem}</strong> to{' '}
          <strong className="text-slate-800">{endItem}</strong> of{' '}
          <strong className="text-slate-800">{totalItems}</strong> entries
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First Page"
          className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page"
          className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="px-2 font-medium text-slate-700">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next Page"
          className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Last Page"
          className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
