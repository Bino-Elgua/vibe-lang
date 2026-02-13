/**
 * Vibe IDE - State Management (Zustand)
 * Manages code, files, compilation state, terminal, UI state
 */

import { create } from 'zustand';

export interface VibFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: 'vibe' | 'javascript' | 'python' | 'rust' | 'go';
  isFolder?: boolean;
  children?: VibFile[];
}

export interface CompilationResult {
  success: boolean;
  output?: string;
  error?: string;
  target: string;
  timestamp: number;
}

export interface TerminalState {
  isOpen: boolean;
  height: number;
  activeTab: 'terminal' | 'problems' | 'output' | 'ai-console';
}

export interface EditorState {
  currentFileId: string | null;
  openFiles: string[];
  code: string;
  target: 'javascript' | 'python' | 'rust' | 'go' | 'java' | 'cpp' | 'typescript';
  output: CompilationResult | null;
  isCompiling: boolean;
}

export interface UIState {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  theme: 'dark' | 'light';
  terminalState: TerminalState;
}

interface Store {
  // Editor state
  editorState: EditorState;
  setCode: (code: string) => void;
  setTarget: (target: EditorState['target']) => void;
  setOutput: (output: CompilationResult) => void;
  setIsCompiling: (isCompiling: boolean) => void;
  setCurrentFile: (fileId: string) => void;
  addOpenFile: (fileId: string) => void;
  removeOpenFile: (fileId: string) => void;

  // File tree
  files: VibFile[];
  setFiles: (files: VibFile[]) => void;
  addFile: (name: string, path: string) => void;
  deleteFile: (fileId: string) => void;

  // Terminal
  terminalOutput: string;
  appendTerminalOutput: (output: string) => void;
  clearTerminalOutput: () => void;
  setTerminalState: (state: Partial<TerminalState>) => void;

  // UI
  uiState: UIState;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const defaultFiles: VibFile[] = [
  {
    id: 'root-src',
    name: 'src',
    path: 'src',
    isFolder: true,
    content: '',
    language: 'vibe',
    children: [
      {
        id: 'main-vibe',
        name: 'main.vibe',
        path: 'src/main.vibe',
        content: `-- Welcome to Vibe Playground!
fn greet(name: str) -> str {
  format("Hello, {}", name)
}

fn main() {
  print(greet("World"))
}`,
        language: 'vibe'
      }
    ]
  },
  {
    id: 'root-examples',
    name: 'examples',
    path: 'examples',
    isFolder: true,
    content: '',
    language: 'vibe',
    children: [
      {
        id: 'example-fib',
        name: 'fibonacci.vibe',
        path: 'examples/fibonacci.vibe',
        content: `fn fib(n: i32) -> i32 {
  if n <= 1 { n } else { fib(n-1) + fib(n-2) }
}`,
        language: 'vibe'
      }
    ]
  }
];

export const useStore = create<Store>((set) => ({
  // Editor state
  editorState: {
    currentFileId: 'main-vibe',
    openFiles: ['main-vibe'],
    code: defaultFiles[0].children![0].content,
    target: 'javascript',
    output: null,
    isCompiling: false
  },

  setCode: (code) => set((state) => ({
    editorState: { ...state.editorState, code }
  })),

  setTarget: (target) => set((state) => ({
    editorState: { ...state.editorState, target }
  })),

  setOutput: (output) => set((state) => ({
    editorState: { ...state.editorState, output }
  })),

  setIsCompiling: (isCompiling) => set((state) => ({
    editorState: { ...state.editorState, isCompiling }
  })),

  setCurrentFile: (fileId) => set((state) => ({
    editorState: { ...state.editorState, currentFileId: fileId }
  })),

  addOpenFile: (fileId) => set((state) => ({
    editorState: {
      ...state.editorState,
      openFiles: [...new Set([...state.editorState.openFiles, fileId])]
    }
  })),

  removeOpenFile: (fileId) => set((state) => ({
    editorState: {
      ...state.editorState,
      openFiles: state.editorState.openFiles.filter(id => id !== fileId)
    }
  })),

  // Files
  files: defaultFiles,

  setFiles: (files) => set({ files }),

  addFile: (name, path) => set((state) => ({
    files: [
      ...state.files,
      {
        id: Math.random().toString(36).substring(7),
        name,
        path,
        content: '',
        language: 'vibe'
      }
    ]
  })),

  deleteFile: (fileId) => set((state) => ({
    files: state.files.filter(f => f.id !== fileId)
  })),

  // Terminal
  terminalOutput: '',

  appendTerminalOutput: (output) => set((state) => ({
    terminalOutput: state.terminalOutput + output
  })),

  clearTerminalOutput: () => set({ terminalOutput: '' }),

  setTerminalState: (partialState) => set((state) => ({
    uiState: {
      ...state.uiState,
      terminalState: {
        ...state.uiState.terminalState,
        ...partialState
      }
    }
  })),

  // UI
  uiState: {
    sidebarOpen: true,
    rightPanelOpen: false,
    theme: 'dark',
    terminalState: {
      isOpen: true,
      height: 240,
      activeTab: 'terminal'
    }
  },

  toggleSidebar: () => set((state) => ({
    uiState: {
      ...state.uiState,
      sidebarOpen: !state.uiState.sidebarOpen
    }
  })),

  toggleRightPanel: () => set((state) => ({
    uiState: {
      ...state.uiState,
      rightPanelOpen: !state.uiState.rightPanelOpen
    }
  })),

  setTheme: (theme) => set((state) => ({
    uiState: { ...state.uiState, theme }
  }))
}));
