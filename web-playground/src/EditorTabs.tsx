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
    <div className="flex items-center bg-slate-800 border-b border-slate-700/50 overflow-x-auto">
      {openFileObjects.map((file) => (
        <div
          key={file.id}
          onClick={() => setCurrentFile(file.id)}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-r border-slate-700/30 cursor-pointer transition-colors ${
            currentFileId === file.id
              ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:bg-slate-700/25'
          }`}
        >
          <FileCode size={14} />
          <span>{file.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeOpenFile(file.id);
              if (currentFileId === file.id && openFiles.length > 1) {
                const nextFile = openFiles.find((id) => id !== file.id);
                if (nextFile) setCurrentFile(nextFile);
              }
            }}
            className="ml-1 p-0.5 hover:bg-slate-600 rounded"
            title="Close file"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
