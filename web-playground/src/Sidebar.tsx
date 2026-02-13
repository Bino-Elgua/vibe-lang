/**
 * Sidebar Component - File tree explorer
 * Shows project structure with collapse/expand
 */

import React, { useState } from 'react';
import { ChevronRight, Folder, FileCode, Plus, Trash2 } from 'lucide-react';
import { useStore, VibFile } from './store';

interface FileNodeProps {
  file: VibFile;
  level: number;
}

const FileNode: React.FC<FileNodeProps> = ({ file, level }) => {
  const [expanded, setExpanded] = useState(!file.isFolder);
  const { setCurrentFile, editorState } = useStore();
  const isActive = editorState.currentFileId === file.id;

  const handleClick = () => {
    if (file.isFolder) {
      setExpanded(!expanded);
    } else {
      setCurrentFile(file.id);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${
          isActive
            ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
            : 'text-slate-300 hover:bg-slate-700/50'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {file.isFolder ? (
          <>
            <ChevronRight
              size={16}
              className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            <Folder size={16} className="text-amber-400" />
          </>
        ) : (
          <>
            <div className="w-4" />
            <FileCode size={16} className="text-slate-400" />
          </>
        )}
        <span className="flex-1 truncate">{file.name}</span>
      </div>

      {file.isFolder && expanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileNode key={child.id} file={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { files, toggleSidebar, uiState } = useStore();

  if (!uiState.sidebarOpen) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-r border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <FileCode size={16} className="text-purple-400" />
          Explorer
        </h2>
        <button
          onClick={() => toggleSidebar()}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
          title="Hide sidebar"
        >
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <FileNode key={file.id} file={file} level={0} />
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 p-3 border-t border-slate-700/50">
        <button
          className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-xs bg-slate-700/50 hover:bg-slate-600 rounded text-slate-300 transition-colors"
          title="New file"
        >
          <Plus size={14} />
          New
        </button>
      </div>
    </div>
  );
};
