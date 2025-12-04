/**
 * Vibe Compiler
 * Compiles Vibe AST to target languages
 */

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { LLMIntegration } from './llm-integration.js';

class Compiler {
  constructor(source, targetLanguage = 'javascript') {
    this.source = source;
    this.targetLanguage = targetLanguage;
    this.llm = new LLMIntegration();
    this.ast = null;
  }

  async compile() {
    // Tokenize
    const lexer = new Lexer(this.source);
    const tokens = lexer.tokenize();

    // Parse
    const parser = new Parser(tokens);
    this.ast = parser.parse();

    // Process prompts with LLM
    await this.processPrompts(this.ast);

    // Generate code for target language
    const code = this.generateCode(this.ast);

    return code;
  }

  async processPrompts(node) {
    if (!node) return;

    if (node.type === 'Prompt') {
      // Generate code from prompt
      const generated = await this.llm.generateCode(node.text, {
        targetLanguage: this.targetLanguage,
      });
      // Parse and replace with generated AST
      console.log(`Generated from prompt: ${generated}`);
    }

    if (node.type === 'Voice') {
      // Extract command from voice format
      const commandMatch = node.text.match(/voice:\s*"([^"]*)"/);
      if (commandMatch) {
        const command = commandMatch[1];
        const generated = await this.llm.generateCode(command, {
          targetLanguage: this.targetLanguage,
        });
        console.log(`Generated from voice: ${generated}`);
      }
    }

    // Recursively process child nodes
    for (const key in node) {
      if (Array.isArray(node[key])) {
        for (const item of node[key]) {
          await this.processPrompts(item);
        }
      } else if (typeof node[key] === 'object') {
        await this.processPrompts(node[key]);
      }
    }
  }

  generateCode(node) {
    switch (this.targetLanguage) {
      case 'javascript':
        return this.genJavaScript(node);
      case 'python':
        return this.genPython(node);
      case 'rust':
        return this.genRust(node);
      case 'go':
        return this.genGo(node);
      default:
        return this.genJavaScript(node);
    }
  }

  genJavaScript(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genJavaScript(s)).join('\n\n');

      case 'FunctionDecl':
        return this.genJSFunction(node);

      case 'StructDecl':
        return this.genJSStruct(node);

      case 'EnumDecl':
        return this.genJSEnum(node);

      case 'VariableDecl':
        return `${node.isMut ? 'let' : 'const'} ${node.name} = ${this.genJavaScript(node.value)};`;

      case 'Return':
        return `return ${this.genJavaScript(node.value)};`;

      case 'Block':
        return (
          '{\n' + node.statements.map(s => '  ' + this.genJavaScript(s)).join('\n') + '\n}'
        );

      case 'If':
        return (
          `if (${this.genJavaScript(node.condition)}) ${this.genJavaScript(node.thenBranch)}` +
          (node.elseBranch ? ` else ${this.genJavaScript(node.elseBranch)}` : '')
        );

      case 'Match':
        return this.genJSMatch(node);

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genJavaScript(a)).join(', ')})`;

      case 'MethodCall':
        return `${this.genJavaScript(node.object)}.${node.method}(${node.args.map(a => this.genJavaScript(a)).join(', ')})`;

      case 'FieldAccess':
        return `${this.genJavaScript(node.object)}.${node.field}`;

      case 'Index':
        return `${this.genJavaScript(node.object)}[${this.genJavaScript(node.index)}]`;

      case 'BinaryOp':
        return `${this.genJavaScript(node.left)} ${node.op} ${this.genJavaScript(node.right)}`;

      case 'UnaryOp':
        return `${node.op}${this.genJavaScript(node.expr)}`;

      case 'Pipeline':
        return `${this.genJavaScript(node.left)} |> ${this.genJavaScript(node.right)}`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Nil':
        return 'null';

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `[${node.elements.map(e => this.genJavaScript(e)).join(', ')}]`;

      case 'StructLiteral':
        return `{ ${Object.entries(node.fields).map(([k, v]) => `${k}: ${this.genJavaScript(v)}`).join(', ')} }`;

      case 'Prompt':
        return `/* Generated from prompt: ${node.text} */`;

      case 'Voice':
        return `/* Generated from voice: ${node.text} */`;

      default:
        return '';
    }
  }

  genJSFunction(node) {
    const params = node.params.map(p => p.name).join(', ');
    return `function ${node.name}(${params}) ${this.genJavaScript(node.body)}`;
  }

  genJSStruct(node) {
    return (
      `class ${node.name} {\n` +
      `  constructor(${node.fields.map(f => f.name).join(', ')}) {\n` +
      node.fields.map(f => `    this.${f.name} = ${f.name};`).join('\n') +
      '\n  }\n}\n'
    );
  }

  genJSEnum(node) {
    return `const ${node.name} = { ${node.variants.map(v => `${v}: '${v}'`).join(', ')} };`;
  }

  genJSMatch(node) {
    let code = `(() => { const __val = ${this.genJavaScript(node.expr)}; `;
    for (const arm of node.arms) {
      code += `if (__val === '${arm.pattern.name}') return ${this.genJavaScript(arm.body)}; `;
    }
    code += `})()`;
    return code;
  }

  genPython(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genPython(s)).join('\n\n');

      case 'FunctionDecl':
        return (
          `def ${node.name}(${node.params.map(p => p.name).join(', ')}):\n` +
          this.indentCode(this.genPython(node.body), 2)
        );

      case 'Block':
        return node.statements.map(s => this.genPython(s)).join('\n');

      case 'VariableDecl':
        return `${node.name} = ${this.genPython(node.value)}`;

      case 'Return':
        return `return ${this.genPython(node.value)}`;

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genPython(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return node.value ? 'True' : 'False';

      case 'Nil':
        return 'None';

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `[${node.elements.map(e => this.genPython(e)).join(', ')}]`;

      default:
        return '';
    }
  }

  genRust(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genRust(s)).join('\n\n');

      case 'FunctionDecl':
        return (
          `fn ${node.name}(${node.params.map(p => `${p.name}: ${this.typeToRust(p.type)}`).join(', ')})` +
          (node.returnType ? ` -> ${this.typeToRust(node.returnType)}` : '') +
          ` ${this.genRust(node.body)}`
        );

      case 'VariableDecl':
        return `${node.isMut ? 'let mut' : 'let'} ${node.name} = ${this.genRust(node.value)};`;

      case 'Return':
        return `${this.genRust(node.value)}`;

      case 'Block':
        return (
          '{\n' + node.statements.map(s => '  ' + this.genRust(s)).join('\n') + '\n}'
        );

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}".to_string()`;

      case 'Identifier':
        return node.name;

      default:
        return '';
    }
  }

  genGo(node) {
    // Go generation logic
    if (!node) return '';
    return '// Go generation not yet implemented';
  }

  typeToRust(type) {
    if (typeof type === 'string') {
      const typeMap = { i32: 'i32', f64: 'f64', str: 'String' };
      return typeMap[type] || 'i32';
    }
    if (type.array) {
      return `Vec<${this.typeToRust(type.array)}>`;
    }
    if (type.generic) {
      return `${type.generic}<${this.typeToRust(type.inner)}>`;
    }
    return 'i32';
  }

  indentCode(code, spaces) {
    const indent = ' '.repeat(spaces);
    return code
      .split('\n')
      .map(line => (line ? indent + line : line))
      .join('\n');
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: vibe compile <file> [--target language]');
    process.exit(1);
  }

  const file = args[0];
  let target = 'javascript';

  if (args.includes('--target')) {
    target = args[args.indexOf('--target') + 1];
  }

  const fs = await import('fs');
  const source = fs.readFileSync(file, 'utf-8');

  const compiler = new Compiler(source, target);
  const code = await compiler.compile();

  console.log(code);
}

export { Compiler };
