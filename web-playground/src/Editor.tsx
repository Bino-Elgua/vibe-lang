/**
 * Monaco Editor Wrapper Component
 * Handles code editing with syntax highlighting and features
 */

import React from 'react';
import Editor from '@monaco-editor/react';
import { useStore, VibFile } from './store';

export const CodeEditor: React.FC = () => {
  const { editorState, setCode, files, uiState } = useStore();

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

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-slate-900 overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="vibe"
        language={currentFile?.language === 'vibe' ? 'vibe' : 'javascript'}
        theme="vs-dark"
        value={editorState.code}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Monaco', 'Courier New', monospace",
          wordWrap: 'on',
          formatOnPaste: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          cursorBlinking: 'blink',
          cursorStyle: 'line',
          lineNumbers: 'on',
          folding: true
        } as any}
      />
    </div>
  );
};
