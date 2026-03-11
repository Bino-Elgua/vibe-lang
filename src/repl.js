/**
 * Vibe REPL
 * Interactive shell for Vibe language
 */

import readline from 'readline';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { Compiler } from './compiler.js';
import { LLMIntegration, RAGIntegration, Agent } from './llm-integration.js';

class VibeREPL {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.context = {};
    this.llm = new LLMIntegration();
    this.rag = new RAGIntegration();
    this.history = [];
  }

  start() {
    console.log('🎵 Vibe Language REPL v0.1.0');
    console.log('Type "help" for commands, "exit" to quit\n');

    this.prompt();
  }

  prompt() {
    this.rl.question('vibe> ', async (input) => {
      input = input.trim();

      if (!input) {
        this.prompt();
        return;
      }

      this.history.push(input);

      try {
        await this.execute(input);
      } catch (error) {
        console.error(`Error: ${error.message}`);
      }

      this.prompt();
    });
  }

  async execute(input) {
    if (input === 'exit') {
      console.log('Goodbye!');
      this.rl.close();
      process.exit(0);
    }

    if (input === 'help') {
      this.showHelp();
      return;
    }

    if (input === 'history') {
      this.history.forEach((cmd, i) => console.log(`${i}: ${cmd}`));
      return;
    }

    if (input.startsWith('compile ')) {
      const code = input.substring(8);
      await this.compileCode(code);
      return;
    }

    if (input.startsWith('ai ')) {
      const prompt = input.substring(3);
      await this.generateWithAI(prompt);
      return;
    }

    if (input.startsWith('rag ')) {
      const query = input.substring(4);
      await this.ragSearch(query);
      return;
    }

    if (input.startsWith('load ')) {
      const file = input.substring(5);
      await this.loadFile(file);
      return;
    }

    // Try to parse as Vibe code
    try {
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const { ast, errors } = parser.parse();
      if (errors.length > 0) {
        errors.forEach(e => console.warn(`  Line ${e.line}:${e.column} - ${e.message}`));
      }

      console.log('✓ Parsed successfully');
      console.log(JSON.stringify(ast, null, 2).substring(0, 500) + '...');
    } catch (error) {
      console.error(`Parse error: ${error.message}`);
    }
  }

  async compileCode(code) {
    console.log('Compiling...');
    const compiler = new Compiler(code, 'javascript');
    try {
      const compiled = await compiler.compile();
      console.log('JavaScript output:');
      console.log(compiled);
    } catch (error) {
      console.error(`Compilation error: ${error.message}`);
    }
  }

  async generateWithAI(prompt) {
    console.log('Generating code from prompt...');
    try {
      const code = await this.llm.generateCode(prompt, {
        targetLanguage: 'vibe',
      });
      console.log('Generated code:');
      console.log(code);
    } catch (error) {
      console.error(`Generation error: ${error.message}`);
    }
  }

  async ragSearch(query) {
    console.log('Searching knowledge base...');
    try {
      const results = await this.rag.search(query, 5);
      console.log(`Found ${results.length} results:`);
      results.forEach((r, i) => {
        console.log(`${i + 1}. Score: ${r.score.toFixed(2)}`);
        console.log(`   ${r.content.substring(0, 100)}...`);
      });
    } catch (error) {
      console.error(`RAG error: ${error.message}`);
    }
  }

  async loadFile(file) {
    console.log(`Loading ${file}...`);
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(file, 'utf-8');
      const compiler = new Compiler(content, 'javascript');
      const compiled = await compiler.compile();
      console.log('Compiled:');
      console.log(compiled);
    } catch (error) {
      console.error(`Load error: ${error.message}`);
    }
  }

  showHelp() {
    console.log(`
Vibe REPL Commands:
  help              - Show this help
  history           - Show command history
  exit              - Exit REPL
  
  compile <code>    - Compile Vibe code to JavaScript
  ai <prompt>       - Generate code from natural language
  rag <query>       - Search knowledge base
  load <file>       - Load and compile a .vibe file
  
Examples:
  vibe> fn add(a: i32, b: i32) -> i32 { a + b }
  vibe> ai create a fibonacci function
  vibe> compile fn main() { print("hello") }
  vibe> load examples/hello.vibe
    `);
  }
}

// Main
async function main() {
  const repl = new VibeREPL();
  repl.start();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { VibeREPL };
