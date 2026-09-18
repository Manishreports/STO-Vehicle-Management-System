import React, { useState } from 'react';
import { Clipboard, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface PasteModalProps {
  isOpen: boolean;
  title: string;
  expectedFormatHelp: string;
  samplePlaceholder: string;
  onClose: () => void;
  onParse: (text: string, mode: 'APPEND' | 'REPLACE') => { count: number; rawRows: number } | null;
}

export const PasteModal: React.FC<PasteModalProps> = ({
  isOpen,
  title,
  expectedFormatHelp,
  samplePlaceholder,
  onClose,
  onParse,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [mode, setMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const handleProcess = () => {
    if (!pasteText.trim()) {
      setIsError(true);
      setResultMessage('Please paste text data before submitting.');
      return;
    }

    try {
      const res = onParse(pasteText, mode);
      if (res) {
        setIsError(false);
        setResultMessage(`Successfully processed ${res.count} items from ${res.rawRows} raw rows.`);
        setTimeout(() => {
          setPasteText('');
          setResultMessage(null);
          onClose();
        }, 900);
      }
    } catch (err: any) {
      setIsError(true);
      setResultMessage(`Parse error: ${err.message || 'Invalid format'}`);
    }
  };

  const handleClear = () => {
    setPasteText('');
    setResultMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-300 shadow-2xl rounded-md max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
          <div className="flex items-center space-x-2">
            <Clipboard className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm tracking-wide">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs text-slate-700">
          <div className="bg-blue-50/80 border border-blue-200 rounded p-2.5 text-blue-900 leading-relaxed font-sans">
            <div className="font-semibold mb-1 text-blue-950">Supported Paste Formats:</div>
            {expectedFormatHelp}
          </div>

          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-800">
              Paste Data (Tab, Excel, Comma, Pipe):
            </label>
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-600">Import Mode:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === 'APPEND'}
                  onChange={() => setMode('APPEND')}
                  className="text-blue-600"
                />
                <span>Append to Existing</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === 'REPLACE'}
                  onChange={() => setMode('REPLACE')}
                  className="text-rose-600"
                />
                <span className="text-rose-800 font-medium">Replace Entire Dataset</span>
              </label>
            </div>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setResultMessage(null);
            }}
            placeholder={samplePlaceholder}
            rows={10}
            className="w-full font-mono text-xs p-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 leading-relaxed resize-y"
          />

          <div className="flex justify-between items-center text-slate-500">
            <span>
              Lines detected: <strong>{pasteText ? pasteText.trim().split('\n').length : 0}</strong>
            </span>
            <button
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear Text
            </button>
          </div>

          {resultMessage && (
            <div
              className={`p-2.5 rounded border flex items-center gap-2 text-xs ${
                isError
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {isError ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{resultMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 bg-slate-100 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcess}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 rounded hover:bg-blue-800 transition-colors shadow-xs"
          >
            Parse & Apply Data
          </button>
        </div>
      </div>
    </div>
  );
};
