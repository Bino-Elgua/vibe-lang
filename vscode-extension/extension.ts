/**
 * Vibe Language VSCode Extension
 * Syntax highlighting, completion, hover info, diagnostics
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join('out', 'server.js'));
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'vibe' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.vibe')
    }
  };

  client = new LanguageClient('vibe', 'Vibe Language Server', serverOptions, clientOptions);

  // Start language server
  client.start();

  // Register hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider('vibe', new VibeHoverProvider())
  );

  // Register completion provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('vibe', new VibeCompletionProvider(), '.', '[')
  );

  // Register definition provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider('vibe', new VibeDefinitionProvider())
  );

  // Register symbol provider
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider('vibe', new VibeSymbolProvider())
  );

  // Compile command
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe.compile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const vibeModule = await import('./vibe-compiler');
      const output = vibeModule.compile(editor.document.getText());
      
      const channel = vscode.window.createOutputChannel('Vibe Compiler');
      channel.appendLine(output);
      channel.show();
    })
  );

  // Format command
  context.subscriptions.push(
    vscode.commands.registerCommand('vibe.format', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const vibeModule = await import('./vibe-compiler');
      const formatted = vibeModule.format(editor.document.getText());
      
      editor.edit(editBuilder => {
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        );
        editBuilder.replace(fullRange, formatted);
      });
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

class VibeHoverProvider implements vscode.HoverProvider {
  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null> {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return null;

    const word = document.getText(range);
    const builtins: { [key: string]: string } = {
      'fn': 'Function declaration',
      'struct': 'Struct definition',
      'enum': 'Enumeration type',
      'match': 'Pattern matching',
      'if': 'Conditional branch',
      'else': 'Alternative branch',
      'while': 'Loop statement',
      'for': 'Iterator loop',
      'break': 'Exit loop',
      'continue': 'Skip iteration',
      'return': 'Return from function',
      'mut': 'Mutable binding',
      'async': 'Asynchronous function',
      'await': 'Wait for async result',
      'print': 'Output to console',
      'len': 'Get length',
      'type': 'Get type information',
    };

    if (builtins[word]) {
      return new vscode.Hover(new vscode.MarkdownString(`**${word}** - ${builtins[word]}`));
    }

    return null;
  }
}

class VibeCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    // Keywords
    const keywords = [
      'fn', 'struct', 'enum', 'match', 'if', 'else', 'while', 'for', 'break', 'continue',
      'return', 'mut', 'async', 'await', 'pub', 'impl', 'trait', 'type'
    ];

    keywords.forEach(keyword => {
      const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
      item.insertText = keyword;
      completions.push(item);
    });

    // Built-in functions
    const builtins = [
      'print', 'println', 'len', 'type', 'push', 'pop', 'map', 'filter',
      'reduce', 'range', 'zip', 'enumerate', 'panic', 'assert'
    ];

    builtins.forEach(builtin => {
      const item = new vscode.CompletionItem(builtin, vscode.CompletionItemKind.Function);
      item.insertText = builtin + '()';
      completions.push(item);
    });

    return completions;
  }
}

class VibeDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Location | null {
    // Parse document and find definitions
    // Return location of definition
    return null;
  }
}

class VibeSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      // Functions
      const fnMatch = line.match(/^\s*fn\s+(\w+)\s*\(/);
      if (fnMatch) {
        symbols.push(new vscode.DocumentSymbol(
          fnMatch[1],
          'function',
          vscode.SymbolKind.Function,
          new vscode.Range(index, 0, index, line.length),
          new vscode.Range(index, 0, index, line.length)
        ));
      }

      // Structs
      const structMatch = line.match(/^\s*struct\s+(\w+)/);
      if (structMatch) {
        symbols.push(new vscode.DocumentSymbol(
          structMatch[1],
          'struct',
          vscode.SymbolKind.Struct,
          new vscode.Range(index, 0, index, line.length),
          new vscode.Range(index, 0, index, line.length)
        ));
      }

      // Enums
      const enumMatch = line.match(/^\s*enum\s+(\w+)/);
      if (enumMatch) {
        symbols.push(new vscode.DocumentSymbol(
          enumMatch[1],
          'enum',
          vscode.SymbolKind.Enum,
          new vscode.Range(index, 0, index, line.length),
          new vscode.Range(index, 0, index, line.length)
        ));
      }
    });

    return symbols;
  }
}
