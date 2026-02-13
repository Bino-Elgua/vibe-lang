/**
 * Output Panel Component
 * Shows compilation output or errors
 */

import React from 'react';
import { Copy, Download } from 'lucide-react';
import { useStore } from './store';

export const OutputPanel: React.FC = () => {
  const { editorState } = useStore();
  const { output } = editorState;

  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-400">
        <div className="text-center">
          <p className="text-sm mb-2">Compile your code to see output</p>
          <p className="text-xs text-slate-500">Press Ctrl+Enter or click Compile</p>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    if (output.output) {
      navigator.clipboard.writeText(output.output);
    }
  };

  const handleDownload = () => {
    if (output.output) {
      const ext = {
        javascript: 'js',
        python: 'py',
        rust: 'rs',
        go: 'go',
        java: 'java',
        cpp: 'cpp',
        typescript: 'ts'
      }[output.target] || 'txt';

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(output.output));
      element.setAttribute('download', `output.${ext}`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${output.success ? 'text-green-400' : 'text-red-400'}`}>
            {output.success ? '✓ Compiled' : '✗ Error'}
          </span>
          <span className="text-xs text-slate-500">
            {output.target.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 transition-colors"
            title="Copy output"
          >
            <Copy size={16} />
          </button>
          {output.success && (
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 transition-colors"
              title="Download output"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <pre className="flex-1 overflow-auto p-4 text-slate-300 text-xs font-mono whitespace-pre-wrap break-words">
        {output.success ? output.output : `Error:\n\n${output.error}`}
      </pre>
    </div>
  );
};
