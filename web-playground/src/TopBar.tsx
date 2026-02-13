/**
 * Top Bar Component
 * Header with title, breadcrumbs, target dropdown, compile button, LLM status
 */

import React from 'react';
import { Play, Share2, Trash2, Menu, Code2, Bot, Zap } from 'lucide-react';
import { useStore, VibFile } from './store';

export const TopBar: React.FC = () => {
  const {
    editorState,
    setTarget,
    setIsCompiling,
    setOutput,
    toggleSidebar,
    uiState,
    files
  } = useStore();

  const getFileById = (id: string): VibFile | undefined => {
    const search = (fileList: VibFile[]): VibFile | undefined => {
      for (const file of fileList) {
        if (file.id === id) return file;
        if (file.children) {
          const found = search(file.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(files);
  };

  const currentFile = editorState.currentFileId
    ? getFileById(editorState.currentFileId)
    : null;

  const handleCompile = async () => {
    setIsCompiling(true);

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editorState.code,
          target: editorState.target,
          filename: currentFile?.name || 'code.vibe'
        })
      });

      const data = await response.json();

      if (data.success) {
        setOutput({
          success: true,
          output: data.output,
          target: editorState.target,
          timestamp: Date.now()
        });
      } else {
        setOutput({
          success: false,
          error: data.error,
          target: editorState.target,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      setOutput({
        success: false,
        error: String(error),
        target: editorState.target,
        timestamp: Date.now()
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?code=${btoa(editorState.code)}&target=${editorState.target}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Share link copied!');
  };

  const handleClear = () => {
    if (confirm('Clear all code?')) {
      // Implementation would clear code
    }
  };

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-4 bg-slate-800 border-b border-slate-700/50 shadow-md">
      {/* Left: Logo & Menu */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => toggleSidebar()}
          className="p-2 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-300 transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-xl">🎵</span>
          <h1 className="text-sm font-semibold text-slate-300">Vibe IDE</h1>
        </div>
      </div>

      {/* Breadcrumbs */}
      {currentFile && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 flex-1 px-4 border-l border-r border-slate-700/50">
          <span>project</span>
          <span>›</span>
          <span className="text-slate-400">{currentFile.path}</span>
        </div>
      )}

      {/* Center: Target Selector & Compile */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <select
          value={editorState.target}
          onChange={(e) => setTarget(e.target.value as any)}
          className="px-3 py-2 bg-slate-700/60 border border-slate-600/50 rounded text-xs text-slate-300 hover:border-slate-500 transition-colors cursor-pointer font-medium"
        >
          <option value="javascript">JS</option>
          <option value="python">Python</option>
          <option value="rust">Rust</option>
          <option value="go">Go</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="typescript">TS</option>
        </select>

        <button
          onClick={handleCompile}
          disabled={editorState.isCompiling}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Zap size={14} />
          <span>{editorState.isCompiling ? 'Compiling...' : 'Compile'}</span>
        </button>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleShare}
          className="p-2 hover:bg-slate-700/60 rounded text-slate-400 hover:text-blue-400 transition-colors"
          title="Share"
        >
          <Share2 size={16} />
        </button>

        <button
          onClick={handleClear}
          className="p-2 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-300 transition-colors"
          title="Clear"
        >
          <Trash2 size={16} />
        </button>

        {/* LLM Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/40 rounded text-xs text-slate-400 border border-slate-600/30 ml-2">
          <Bot size={12} className="text-green-400 flex-shrink-0" />
          <span className="text-slate-400">Claude</span>
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
        </div>
      </div>
    </header>
  );
};
