/**
 * Terminal Panel Component
 * Integrates xterm.js for interactive terminal with stdio, Problems, Output tabs
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { X, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { useStore } from './store';
import 'xterm/css/xterm.css';

export const TerminalPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { uiState, setTerminalState, terminalOutput, appendTerminalOutput, clearTerminalOutput } =
    useStore();

  const { terminalState } = uiState;

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      theme: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        cursor: '#60a5fa',
        cursorAccent: '#0f172a',
      },
      fontFamily: "'Monaco', 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.2,
      letterSpacing: 0,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial message
    term.writeln('\x1b[38;5;87m🎵 Vibe IDE Terminal\x1b[0m');
    term.writeln('\x1b[38;5;240mReady. Try: npm run dev, vibe compile main.vibe, python out.py\x1b[0m\r\n');

    // Handle input
    term.onData((data) => {
      handleTerminalInput(data);
    });

    // Fit to container
    try {
      fitAddon.fit();
    } catch (e) {
      console.log('FitAddon fit error:', e);
    }

    return () => {
      term.dispose();
    };
  }, []);

  // Resize observer
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {}
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleTerminalInput = (data: string) => {
    // For now, echo input and simulate output
    if (terminalRef.current) {
      terminalRef.current.write(data);

      // Handle Enter key
      if (data === '\r') {
        const command = ''; // Parse command from terminal state
        terminalRef.current.writeln('\r\n$ Command executed');
      }
    }
  };

  const handleClear = () => {
    if (terminalRef.current) {
      terminalRef.current.clear();
      clearTerminalOutput();
    }
  };

  const handleClose = () => {
    setTerminalState({ isOpen: false });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!terminalState.isOpen) {
    return null;
  }

  const tabs = [
    { id: 'terminal', label: '📟 Terminal' },
    { id: 'problems', label: '⚠️ Problems' },
    { id: 'output', label: '📊 Output' },
    { id: 'ai-console', label: '🤖 AI Console' },
  ] as const;

  return (
    <div className={`flex flex-col bg-slate-900 border-t border-slate-700/30 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      style={!isFullscreen ? { height: `${terminalState.height}px` } : {}}>
      
      {/* Header with Tabs */}
      <div className="flex items-center justify-between gap-4 px-4 py-0 border-b border-slate-700/30 bg-slate-800/50">
        {/* Tabs */}
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTerminalState({ activeTab: tab.id as any })}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                terminalState.activeTab === tab.id
                  ? 'text-blue-400 border-blue-500 bg-slate-700/20'
                  : 'text-slate-500 border-transparent hover:text-slate-400 hover:bg-slate-700/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleClear}
            className="p-2 hover:bg-slate-700/40 rounded text-slate-500 hover:text-slate-300 transition-colors"
            title="Clear terminal"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="p-2 hover:bg-slate-700/40 rounded text-slate-500 hover:text-slate-300 transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-700/40 rounded text-slate-500 hover:text-slate-300 transition-colors"
            title="Close terminal"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {terminalState.activeTab === 'terminal' && (
          <div ref={containerRef} className="w-full h-full" />
        )}

        {terminalState.activeTab === 'problems' && (
          <div className="p-4 text-slate-400 text-sm">
            <div className="text-slate-500">No problems detected</div>
          </div>
        )}

        {terminalState.activeTab === 'output' && (
          <pre className="p-4 text-slate-300 text-xs font-mono overflow-auto h-full whitespace-pre-wrap break-words">
            {terminalOutput || '(No output yet)'}
          </pre>
        )}

        {terminalState.activeTab === 'ai-console' && (
          <div className="p-4 text-slate-400 text-sm">
            <div className="mb-4">AI Assistant ready</div>
            <input
              type="text"
              placeholder="Ask AI to refine, explain, or debug code..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-300 placeholder-slate-500 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};
