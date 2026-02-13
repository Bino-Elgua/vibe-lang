/**
 * Vibe IDE - Main App Component
 * Professional IDE dashboard with resizable panels
 */

import React, { useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useStore } from './store';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { EditorTabs } from './EditorTabs';
import { CodeEditor } from './Editor';
import { OutputPanel } from './OutputPanel';
import { TerminalPanel } from './TerminalPanel';
import './App.css';

function App() {
  const { uiState, editorState } = useStore();

  return (
    <div className={`flex flex-col h-screen w-screen bg-slate-950 text-slate-300 ${uiState.theme}`}>
      {/* Top Bar */}
      <TopBar />

      {/* Main Content */}
      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Sidebar */}
        {uiState.sidebarOpen && (
          <>
            <Panel defaultSize={20} minSize={15} maxSize={35} className="bg-slate-900">
              <Sidebar />
            </Panel>
            <PanelResizeHandle className="w-1 bg-slate-700/30 hover:bg-slate-500/50 transition-colors" />
          </>
        )}

        {/* Editor & Output */}
        <Panel defaultSize={uiState.sidebarOpen ? 55 : 75} minSize={30}>
          <PanelGroup direction="vertical" className="h-full">
            {/* Editor Area */}
            <Panel defaultSize={60} minSize={30}>
              <div className="flex flex-col h-full overflow-hidden">
                {/* File Tabs */}
                <EditorTabs />

                {/* Monaco Editor */}
                <CodeEditor />
              </div>
            </Panel>

            {/* Resizer */}
            <PanelResizeHandle className="h-1 bg-slate-700/30 hover:bg-slate-500/50 transition-colors" />

            {/* Output Panel */}
            <Panel defaultSize={40} minSize={20}>
              <OutputPanel />
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Terminal (if open) */}
        {uiState.terminalState.isOpen && (
          <>
            <PanelResizeHandle className="w-1 bg-slate-700/30 hover:bg-slate-500/50 transition-colors" />
            <Panel defaultSize={25} minSize={15} maxSize={50} className="bg-slate-900">
              <TerminalPanel />
            </Panel>
          </>
        )}
      </PanelGroup>

      {/* Terminal Bottom (alternative layout) */}
      {/* Uncomment to use bottom terminal instead of right panel */}
      {/* <PanelGroup direction="vertical" className="flex-1">
        <Panel>... Editor panels above ...</Panel>
        <PanelResizeHandle />
        <Panel defaultSize={25}>
          <TerminalPanel />
        </Panel>
      </PanelGroup> */}
    </div>
  );
}

export default App;
