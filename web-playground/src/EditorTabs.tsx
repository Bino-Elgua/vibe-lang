/**
 * Editor Tabs Component
 * Shows open files with close button
 */

import React from 'react';
import { X, FileCode } from 'lucide-react';
import { useStore, VibFile } from './store';

export const EditorTabs: React.FC = () => {
  const { editorState, files, setCurrentFile, removeOpenFile } = useStore();
  const { openFiles, currentFileId } = editorState;

  // Find file objects by ID
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

  const openFileObjects = openFiles
    .map((id) => getFileById(id))
    .filter((file) => file !== undefined) as VibFile[];

  if (openFileObjects.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center bg-slate-800/50 border-b border-slate-700/30 overflow-x-auto">
      {openFileObjects.map((file) => (
        <div
          key={file.id}
          onClick={() => setCurrentFile(file.id)}
          className={`group flex items-center gap-2 px-4 py-2.5 text-sm border-r border-slate-700/20 cursor-pointer transition-all whitespace-nowrap ${
            currentFileId === file.id
              ? 'bg-slate-700/40 text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-500 hover:bg-slate-700/20 hover:text-slate-400'
          }`}
        >
          <FileCode size={13} className="flex-shrink-0" />
          <span className="text-xs font-medium max-w-[120px] truncate">{file.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeOpenFile(file.id);
              if (currentFileId === file.id && openFiles.length > 1) {
                const nextFile = openFiles.find((id) => id !== file.id);
                if (nextFile) setCurrentFile(nextFile);
              }
            }}
            className="ml-auto p-0.5 hover:bg-slate-600/50 rounded text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all"
            title="Close file"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
