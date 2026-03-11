/**
 * Vibe Compiler
 * Compiles Vibe AST to target languages
 */

import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { LLMIntegration } from './llm-integration.js';
import { TypeInferenceEngine } from './type-inference.js';
import { IRGenerator } from './ir-generator.js';

class Compiler {
  constructor(source, targetLanguage = 'javascript') {
    this.source = source;
    this.targetLanguage = targetLanguage;
    this.llm = new LLMIntegration();
    this.typeEngine = new TypeInferenceEngine();
    this.irGenerator = new IRGenerator();
    this.ast = null;
    this.ir = null;
    this.typeErrors = [];
    this._promptDepth = 0;
    this._maxPromptDepth = 2;
  }

  async compile() {
    // Tokenize
    const lexer = new Lexer(this.source);
    const tokens = lexer.tokenize();

    // Parse
    const parser = new Parser(tokens);
    const result = parser.parse();
    this.ast = result.ast;
    this.parseErrors = result.errors;
    if (this.parseErrors.length > 0) {
      console.warn(`Parser warnings (${this.parseErrors.length}):`);
      this.parseErrors.forEach(e => console.warn(`  Line ${e.line}:${e.column} - ${e.message}`));
    }

    // Process prompts with LLM (splice generated code into AST)
    await this.processPrompts(this.ast);

    // Type inference pass
    this.typeErrors = this.runTypeInference(this.ast);
    if (this.typeErrors.length > 0) {
      console.warn(`Type warnings (${this.typeErrors.length}):`);
      this.typeErrors.forEach(e => console.warn(`  ${e}`));
    }

    // IR generation pass
    this.ir = this.generateIR(this.ast);

    // Generate code for target language
    const code = this.generateCode(this.ast);

    return code;
  }

  runTypeInference(ast) {
    const errors = [];
    if (!ast || !ast.statements) return errors;

    for (const stmt of ast.statements) {
      if (stmt.type === 'FunctionDecl') {
        this.inferFunctionTypes(stmt, errors);
      } else if (stmt.type === 'VariableDecl' && stmt.value) {
        try {
          const inferredType = this.typeEngine.infer(this.astToTypeExpr(stmt.value));
          if (stmt.type_annotation) {
            if (!this.typeEngine.isCompatible(inferredType, stmt.type_annotation)) {
              errors.push(`Type mismatch in '${stmt.name}': expected ${stmt.type_annotation}, got ${inferredType}`);
            }
          }
        } catch (e) {
          // Non-fatal type inference failure
        }
      }
    }

    this.typeEngine.solve();
    return errors;
  }

  inferFunctionTypes(fn, errors) {
    if (!fn.body || !fn.body.statements) return;

    for (const stmt of fn.body.statements) {
      if (stmt.type === 'Return' && stmt.value && fn.returnType) {
        try {
          const inferredReturn = this.typeEngine.infer(this.astToTypeExpr(stmt.value));
          const declaredReturn = typeof fn.returnType === 'string' ? fn.returnType : fn.returnType.generic || 'unknown';
          if (inferredReturn && declaredReturn && !this.typeEngine.isCompatible(inferredReturn, declaredReturn)) {
            errors.push(`Return type mismatch in '${fn.name}': declared ${declaredReturn}, inferred ${inferredReturn}`);
          }
        } catch (e) {
          // Non-fatal
        }
      }
    }
  }

  astToTypeExpr(node) {
    if (!node) return null;
    switch (node.type) {
      case 'Number': return node.value;
      case 'String': return node.value;
      case 'Boolean': return node.value;
      case 'Nil': return null;
      case 'ArrayLiteral': return node.elements.map(e => this.astToTypeExpr(e));
      case 'BinaryOp': return { type: 'binop', left: this.astToTypeExpr(node.left), op: node.op, right: this.astToTypeExpr(node.right) };
      case 'FunctionCall': return { type: 'call', fn: node.name, args: node.args.map(a => this.astToTypeExpr(a)) };
      case 'Identifier': return node.name;
      default: return null;
    }
  }

  generateIR(ast) {
    if (!ast || !ast.statements) return null;

    const irInput = {
      module: 'main',
      functions: [],
      types: [],
    };

    for (const stmt of ast.statements) {
      if (stmt.type === 'FunctionDecl') {
        irInput.functions.push({
          name: stmt.name,
          params: stmt.params || [],
          returns: typeof stmt.returnType === 'string' ? stmt.returnType : 'void',
          body: stmt.body?.statements?.map(s => this.astToIRStatement(s)) || [],
        });
      } else if (stmt.type === 'StructDecl') {
        irInput.types.push({ kind: 'struct', name: stmt.name, fields: stmt.fields || [] });
      } else if (stmt.type === 'EnumDecl') {
        irInput.types.push({ kind: 'enum', name: stmt.name, variants: stmt.variants || [] });
      }
    }

    const ir = this.irGenerator.generate(irInput);
    this.irGenerator.optimize();
    const validation = this.irGenerator.validate();
    if (!validation.valid) {
      console.warn('IR validation warnings:', validation.errors);
    }

    return ir;
  }

  astToIRStatement(node) {
    if (!node) return null;
    switch (node.type) {
      case 'VariableDecl': return { type: 'assignment', name: node.name, value: node.value };
      case 'Return': return { type: 'return', value: node.value };
      case 'FunctionCall': return { type: 'call', name: node.name, args: node.args || [] };
      default: return { type: 'expression', node };
    }
  }

  async processPrompts(node) {
    if (!node || typeof node !== 'object' || this._promptDepth >= this._maxPromptDepth) return;

    // Only traverse known AST child keys (avoid iterating data properties like 'code', 'name', etc.)
    const astChildKeys = ['statements', 'body', 'value', 'left', 'right', 'condition',
      'thenBranch', 'elseBranch', 'expr', 'arms', 'elements', 'args', 'object', 'index'];

    for (const key of astChildKeys) {
      if (!(key in node)) continue;
      const child = node[key];

      if (Array.isArray(child)) {
        for (let i = 0; i < child.length; i++) {
          const item = child[i];
          if (item && typeof item === 'object') {
            const replaced = await this.expandPromptNode(item);
            if (replaced) {
              child[i] = replaced;
            } else {
              await this.processPrompts(item);
            }
          }
        }
      } else if (child && typeof child === 'object') {
        const replaced = await this.expandPromptNode(child);
        if (replaced) {
          node[key] = replaced;
        } else {
          await this.processPrompts(child);
        }
      }
    }

    // Also check match arms bodies
    if (node.arms && Array.isArray(node.arms)) {
      for (const arm of node.arms) {
        if (arm.body) {
          const replaced = await this.expandPromptNode(arm.body);
          if (replaced) {
            arm.body = replaced;
          } else {
            await this.processPrompts(arm.body);
          }
        }
      }
    }
  }

  async expandPromptNode(node) {
    if (!node || !node.type) return null;

    let generatedCode = null;

    if (node.type === 'Prompt') {
      generatedCode = await this.llm.generateCode(node.text, {
        targetLanguage: 'vibe',
      });
    }

    if (node.type === 'Voice') {
      const commandMatch = node.text.match(/voice:\s*"([^"]*)"/);
      if (commandMatch) {
        generatedCode = await this.llm.generateCode(commandMatch[1], {
          targetLanguage: 'vibe',
        });
      }
    }

    if (generatedCode) {
      this._promptDepth++;
      try {
        const lexer = new Lexer(generatedCode);
        const tokens = lexer.tokenize();
        // Bail if generated code has too many tokens (likely complex/unparseable)
        if (tokens.length > 200) {
          return { type: 'GeneratedCode', source: node.type, prompt: node.text, code: generatedCode };
        }
        const parser = new Parser(tokens);
        const { ast, errors } = parser.parse();
        // Filter out Error nodes from recovered parse
        const validStatements = ast.statements.filter(s => s.type !== 'Error');
        if (validStatements.length > 0) {
          if (validStatements.length === 1) {
            return validStatements[0];
          }
          return { type: 'Block', statements: validStatements };
        }
        // All statements errored — return as raw generated code
        return { type: 'GeneratedCode', source: node.type, prompt: node.text, code: generatedCode };
      } catch (e) {
        return { type: 'GeneratedCode', source: node.type, prompt: node.text, code: generatedCode };
      } finally {
        this._promptDepth--;
      }
    }

    return null;
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
      case 'julia':
        return this.genJulia(node);
      case 'idris':
        return this.genIdris(node);
      case 'move':
        return this.genMove(node);
      case 'r':
        return this.genR(node);
      case 'prolog':
        return this.genProlog(node);
      case 'lisp':
        return this.genLisp(node);
      case 'haskell':
        return this.genHaskell(node);
      case 'lua':
        return this.genLua(node);
      case 'matlab':
        return this.genMatlab(node);
      case 'scala':
        return this.genScala(node);
      case 'clojure':
        return this.genClojure(node);
      case 'ocaml':
        return this.genOCaml(node);
      case 'scheme':
        return this.genScheme(node);
      case 'wolfram':
        return this.genWolfram(node);
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

      case 'Assignment':
        return `${node.name} = ${this.genJavaScript(node.value)};`;

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

      case 'GeneratedCode':
        return `/* Generated from ${node.source}: ${node.prompt} */\n${node.code}`;

      case 'Error':
        return `/* Parse error: ${node.message} */`;

      case 'SwarmDecl':
        return this.genJSSwarm(node);

      case 'SkillDecl':
        return this.genJSSkill(node);

      case 'SecureBlock':
        return `/* SECURE BLOCK */\n(() => {\n  "use strict";\n${this.genJavaScript(node.body)}\n})();`;

      case 'LoopUntil':
        return `await (async () => {\n  const __goal = ${this.genJavaScript(node.goal)};\n  let __i = 0;\n  while (__i++ < 100) {\n${this.genJavaScript(node.body)}\n  }\n})();`;

      case 'UseStatement':
        return `import { ${node.path[node.path.length - 1]} } from './${node.path.join('/')}';`;

      case 'ForLoop':
        return `for (const ${node.variable} of ${this.genJavaScript(node.iterable)}) ${this.genJavaScript(node.body)}`;

      case 'WhileLoop':
        return `while (${this.genJavaScript(node.condition)}) ${this.genJavaScript(node.body)}`;

      case 'Break':
        return 'break;';

      case 'Continue':
        return 'continue;';

      case 'AwaitExpr':
        return `await ${this.genJavaScript(node.expr)}`;

      case 'SpawnExpr':
        return `Promise.resolve().then(() => ${this.genJavaScript(node.expr)})`;

      case 'TraitDecl': {
        let code = `// Trait: ${node.name}\n`;
        code += `const ${node.name} = {\n`;
        for (const m of node.methods) {
          const params = m.params.map(p => p.name).join(', ');
          if (m.body) {
            code += `  ${m.name}(${params}) ${this.genJavaScript(m.body)},\n`;
          } else {
            code += `  ${m.name}: null, // abstract\n`;
          }
        }
        code += `};`;
        return code;
      }

      case 'ImplDecl': {
        let code = `// impl ${node.trait ? node.trait + ' for ' : ''}${node.typeName}\n`;
        for (const m of node.methods) {
          const params = m.params.map(p => p.name).join(', ');
          const asyncPrefix = m.isAsync ? 'async ' : '';
          code += `${node.typeName}.prototype.${m.name} = ${asyncPrefix}function(${params}) ${this.genJavaScript(m.body)};\n`;
        }
        return code;
      }

      default:
        return '';
    }
  }

  genJSSwarm(node) {
    const name = node.name || 'Swarm';
    let code = `class ${name} {\n  constructor() {\n    this.agents = {};\n    this.pipeline = [];\n  }\n\n`;
    code += `  async run(input) {\n    let result = input;\n`;
    for (const agent of node.agents) {
      code += `    result = await this.execute_${agent.name}(result);\n`;
    }
    code += `    return result;\n  }\n`;
    for (const agent of node.agents) {
      const role = typeof agent.role === 'string' ? agent.role : 'process input';
      code += `\n  async execute_${agent.name}(input) {\n    // Role: ${role}\n    return input;\n  }\n`;
    }
    code += `}\n`;
    return code;
  }

  genJSSkill(node) {
    let code = `const ${node.name} = {\n`;
    for (const [key, value] of Object.entries(node.properties)) {
      code += `  ${key}: ${this.genJavaScript(value)},\n`;
    }
    code += `  async execute(input) {\n    return input;\n  }\n};\n`;
    return code;
  }

  genJSFunction(node) {
    const params = node.params.map(p => p.name).join(', ');
    const asyncPrefix = node.isAsync ? 'async ' : '';
    return `${asyncPrefix}function ${node.name}(${params}) ${this.genJavaScript(node.body)}`;
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

      case 'Assignment':
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

      case 'SwarmDecl': {
        const name = node.name || 'Swarm';
        let code = `class ${name}:\n    def __init__(self):\n        self.agents = {}\n        self.pipeline = []\n\n`;
        code += `    async def run(self, input):\n        result = input\n`;
        for (const agent of node.agents) {
          code += `        result = await self.execute_${agent.name}(result)\n`;
        }
        code += `        return result\n`;
        for (const agent of node.agents) {
          const role = typeof agent.role === 'string' ? agent.role : 'process input';
          code += `\n    async def execute_${agent.name}(self, input):\n        """${role}"""\n        return input\n`;
        }
        return code;
      }

      case 'SkillDecl': {
        let code = `${node.name} = {\n`;
        for (const [key, value] of Object.entries(node.properties)) {
          code += `    "${key}": ${this.genPython(value)},\n`;
        }
        code += `}\n`;
        return code;
      }

      case 'SecureBlock':
        return `# SECURE BLOCK\ntry:\n${this.indentCode(this.genPython(node.body), 4)}\nexcept Exception as e:\n    raise RuntimeError(f"Secure block violation: {e}")`;

      case 'LoopUntil':
        return `# Loop until: ${this.genPython(node.goal)}\n__i = 0\nwhile __i < 100:\n    __i += 1\n${this.indentCode(this.genPython(node.body), 4)}`;

      case 'UseStatement':
        return node.path.length > 1 ? `from ${node.path.slice(0, -1).join('.')} import ${node.path[node.path.length - 1]}` : `import ${node.path[0]}`;

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
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return 'package main\n\nimport "fmt"\n\n' + node.statements.map(s => this.genGo(s)).join('\n\n');

      case 'FunctionDecl':
        const isMain = node.name === 'main';
        const returnType = node.returnType ? ` ${this.typeToGo(node.returnType)}` : '';
        return (
          `func ${node.name}(${node.params.map(p => `${p.name} ${this.typeToGo(p.type)}`).join(', ')})${returnType} ${this.genGo(node.body)}`
        );

      case 'VariableDecl':
        return `${node.name} := ${this.genGo(node.value)}`;

      case 'Block':
        return (
          '{\n' + node.statements.map(s => '  ' + this.genGo(s)).join('\n') + '\n}'
        );

      case 'Return':
        return `return ${this.genGo(node.value)}`;

      case 'FunctionCall':
        if (node.name === 'print') {
          return `fmt.Println(${node.args.map(a => this.genGo(a)).join(', ')})`;
        }
        return `${node.name}(${node.args.map(a => this.genGo(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'BinaryOp':
        return `${this.genGo(node.left)} ${node.op} ${this.genGo(node.right)}`;

      default:
        return '';
    }
  }

  genJulia(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genJulia(s)).join('\n\n');

      case 'FunctionDecl':
        return (
          `function ${node.name}(${node.params.map(p => `${p.name}::${this.typeToJulia(p.type)}`).join(', ')})\n` +
          this.indentCode(this.genJulia(node.body), 2) +
          '\nend'
        );

      case 'VariableDecl':
        return `${node.name} = ${this.genJulia(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genJulia(s)).join('\n');

      case 'Return':
        return `return ${this.genJulia(node.value)}`;

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genJulia(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `[${node.elements.map(e => this.genJulia(e)).join(', ')}]`;

      case 'BinaryOp':
        return `${this.genJulia(node.left)} ${node.op} ${this.genJulia(node.right)}`;

      default:
        return '';
    }
  }

  genIdris(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genIdris(s)).join('\n\n');

      case 'FunctionDecl':
        const params = node.params.map(p => `(${p.name} : ${this.typeToIdris(p.type)})`).join(' ');
        const returnType = node.returnType ? ` -> ${this.typeToIdris(node.returnType)}` : '';
        return (
          `${node.name} : ${params}${returnType}\n` +
          `${node.name} ${node.params.map(p => p.name).join(' ')} = ${this.genIdris(node.body)}`
        );

      case 'VariableDecl':
        return `let ${node.name} = ${this.genIdris(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genIdris(s)).join('\n');

      case 'Return':
        return this.genIdris(node.value);

      case 'FunctionCall':
        return `${node.name} ${node.args.map(a => this.genIdris(a)).join(' ')}`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'BinaryOp':
        return `(${this.genIdris(node.left)} ${node.op} ${this.genIdris(node.right)})`;

      default:
        return '';
    }
  }

  genMove(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return 'module main {\n' + node.statements.map(s => '  ' + this.genMove(s)).join('\n') + '\n}';

      case 'FunctionDecl':
        const returnType = node.returnType ? `: ${this.typeToMove(node.returnType)}` : '';
        return (
          `fun ${node.name}(${node.params.map(p => `${p.name}: ${this.typeToMove(p.type)}`).join(', ')})${returnType} ${this.genMove(node.body)}`
        );

      case 'VariableDecl':
        return `let ${node.isMut ? 'mut ' : ''}${node.name} = ${this.genMove(node.value)};`;

      case 'Block':
        return (
          '{\n' + node.statements.map(s => '  ' + this.genMove(s)).join('\n') + '\n}'
        );

      case 'Return':
        return `${this.genMove(node.value)}`;

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genMove(a)).join(', ')})`;

      case 'StructDecl':
        return (
          `struct ${node.name} {\n` +
          node.fields.map(f => `  ${f.name}: ${this.typeToMove(f.type)},`).join('\n') +
          '\n}'
        );

      case 'Number':
        return String(node.value);

      case 'String':
        return `b"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'BinaryOp':
        return `${this.genMove(node.left)} ${node.op} ${this.genMove(node.right)}`;

      default:
        return '';
    }
  }

  typeToGo(type) {
    if (typeof type === 'string') {
      const typeMap = {
        i32: 'int32',
        i64: 'int64',
        f32: 'float32',
        f64: 'float64',
        str: 'string',
        bool: 'bool'
      };
      return typeMap[type] || 'interface{}';
    }
    if (type.array) {
      return `[]${this.typeToGo(type.array)}`;
    }
    return 'interface{}';
  }

  typeToJulia(type) {
    if (typeof type === 'string') {
      const typeMap = {
        i32: 'Int32',
        i64: 'Int64',
        f32: 'Float32',
        f64: 'Float64',
        str: 'String',
        bool: 'Bool'
      };
      return typeMap[type] || 'Any';
    }
    if (type.array) {
      return `Vector{${this.typeToJulia(type.array)}}`;
    }
    return 'Any';
  }

  typeToIdris(type) {
    if (typeof type === 'string') {
      const typeMap = {
        i32: 'Int',
        i64: 'Integer',
        f32: 'Double',
        f64: 'Double',
        str: 'String',
        bool: 'Bool'
      };
      return typeMap[type] || 'Type';
    }
    if (type.array) {
      return `List (${this.typeToIdris(type.array)})`;
    }
    return 'Type';
  }

  typeToMove(type) {
    if (typeof type === 'string') {
      const typeMap = {
        i32: 'u64',
        i64: 'u64',
        f32: 'u64',
        f64: 'u64',
        str: 'vector<u8>',
        bool: 'bool'
      };
      return typeMap[type] || 'u64';
    }
    if (type.array) {
      return `vector<${this.typeToMove(type.array)}>`;
    }
    return 'u64';
  }

  genR(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genR(s)).join('\n\n');

      case 'FunctionDecl':
        return (
          `${node.name} <- function(${node.params.map(p => p.name).join(', ')}) {\n` +
          this.indentCode(this.genR(node.body), 2) +
          '\n}'
        );

      case 'VariableDecl':
        return `${node.name} <- ${this.genR(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genR(s)).join('\n');

      case 'Return':
        return this.genR(node.value);

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genR(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `c(${node.elements.map(e => this.genR(e)).join(', ')})`;

      case 'BinaryOp':
        return `${this.genR(node.left)} ${node.op} ${this.genR(node.right)}`;

      default:
        return '';
    }
  }

  genProlog(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genProlog(s)).join('.\n') + '.';

      case 'FunctionDecl':
        const params = node.params.map(p => p.name.toUpperCase()).join(', ');
        return `${node.name}(${params}) :- ${this.genProlog(node.body)}`;

      case 'VariableDecl':
        return `${node.name.toUpperCase()} = ${this.genProlog(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genProlog(s)).join(', ');

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genProlog(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `'${node.value}'`;

      case 'Identifier':
        return node.name.charAt(0).toUpperCase() === node.name.charAt(0) ? node.name : node.name;

      case 'BinaryOp':
        return `(${this.genProlog(node.left)} ${node.op} ${this.genProlog(node.right)})`;

      default:
        return '';
    }
  }

  genLisp(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genLisp(s)).join('\n');

      case 'FunctionDecl':
        const params = node.params.map(p => p.name).join(' ');
        return `(defun ${node.name} (${params})\n  ${this.genLisp(node.body)}\n)`;

      case 'VariableDecl':
        return `(setq ${node.name} ${this.genLisp(node.value)})`;

      case 'Block':
        return `(progn\n  ${node.statements.map(s => this.genLisp(s)).join('\n  ')}\n)`;

      case 'FunctionCall':
        return `(${node.name} ${node.args.map(a => this.genLisp(a)).join(' ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return node.value ? 't' : 'nil';

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `'(${node.elements.map(e => this.genLisp(e)).join(' ')})`;

      case 'BinaryOp':
        return `(${node.op} ${this.genLisp(node.left)} ${this.genLisp(node.right)})`;

      default:
        return '';
    }
  }

  genHaskell(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genHaskell(s)).join('\n\n');

      case 'FunctionDecl':
        const params = node.params.map(p => p.name).join(' ');
        const returnType = node.returnType ? ` :: ${this.typeToHaskell(node.returnType)}` : '';
        return (
          `${node.name}${returnType}\n` +
          `${node.name} ${params} = ${this.genHaskell(node.body)}`
        );

      case 'VariableDecl':
        return `${node.name} = ${this.genHaskell(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genHaskell(s)).join('\n');

      case 'Return':
        return this.genHaskell(node.value);

      case 'FunctionCall':
        return `${node.name} ${node.args.map(a => this.genHaskell(a)).join(' ')}`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `[${node.elements.map(e => this.genHaskell(e)).join(', ')}]`;

      case 'BinaryOp':
        return `(${this.genHaskell(node.left)} ${node.op} ${this.genHaskell(node.right)})`;

      default:
        return '';
    }
  }

  genLua(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genLua(s)).join('\n\n');

      case 'FunctionDecl':
        return (
          `function ${node.name}(${node.params.map(p => p.name).join(', ')})\n` +
          this.indentCode(this.genLua(node.body), 2) +
          '\nend'
        );

      case 'VariableDecl':
        return `local ${node.name} = ${this.genLua(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genLua(s)).join('\n');

      case 'Return':
        return `return ${this.genLua(node.value)}`;

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genLua(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `{${node.elements.map(e => this.genLua(e)).join(', ')}}`;

      case 'BinaryOp':
        return `${this.genLua(node.left)} ${node.op} ${this.genLua(node.right)}`;

      default:
        return '';
    }
  }

  genMatlab(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genMatlab(s)).join('\n\n');

      case 'FunctionDecl':
        return (
          `function ${this.typeToMatlab(node.returnType)} = ${node.name}(${node.params.map(p => p.name).join(', ')})\n` +
          this.indentCode(this.genMatlab(node.body), 4) +
          '\nend'
        );

      case 'VariableDecl':
        return `${node.name} = ${this.genMatlab(node.value)};`;

      case 'Block':
        return node.statements.map(s => this.genMatlab(s)).join('\n');

      case 'Return':
        return this.genMatlab(node.value);

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genMatlab(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `'${node.value}'`;

      case 'Boolean':
        return node.value ? 'true' : 'false';

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `[${node.elements.map(e => this.genMatlab(e)).join(', ')}]`;

      case 'BinaryOp':
        return `${this.genMatlab(node.left)} ${node.op} ${this.genMatlab(node.right)}`;

      default:
        return '';
    }
  }

  typeToHaskell(type) {
    if (typeof type === 'string') {
      const typeMap = {
        i32: 'Int',
        i64: 'Integer',
        f32: 'Float',
        f64: 'Double',
        str: 'String',
        bool: 'Bool'
      };
      return typeMap[type] || 'a';
    }
    if (type.array) {
      return `[${this.typeToHaskell(type.array)}]`;
    }
    return 'a';
  }

  typeToMatlab(type) {
    return 'varargout';
  }

  genScala(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genScala(s)).join('\n\n');

      case 'FunctionDecl':
        const returnType = node.returnType ? `: ${this.typeToScala(node.returnType)}` : '';
        return (
          `def ${node.name}(${node.params.map(p => `${p.name}: ${this.typeToScala(p.type)}`).join(', ')})${returnType} = {\n` +
          this.indentCode(this.genScala(node.body), 2) +
          '\n}'
        );

      case 'VariableDecl':
        return `val ${node.name} = ${this.genScala(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genScala(s)).join('\n');

      case 'Return':
        return this.genScala(node.value);

      case 'FunctionCall':
        return `${node.name}(${node.args.map(a => this.genScala(a)).join(', ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `Vector(${node.elements.map(e => this.genScala(e)).join(', ')})`;

      case 'BinaryOp':
        return `${this.genScala(node.left)} ${node.op} ${this.genScala(node.right)}`;

      default:
        return '';
    }
  }

  genClojure(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genClojure(s)).join('\n\n');

      case 'FunctionDecl':
        const params = node.params.map(p => p.name).join(' ');
        return `(defn ${node.name} [${params}]\n  ${this.genClojure(node.body)}\n)`;

      case 'VariableDecl':
        return `(def ${node.name} ${this.genClojure(node.value)})`;

      case 'Block':
        return `(do\n  ${node.statements.map(s => this.genClojure(s)).join('\n  ')}\n)`;

      case 'Return':
        return this.genClojure(node.value);

      case 'FunctionCall':
        return `(${node.name} ${node.args.map(a => this.genClojure(a)).join(' ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `[${node.elements.map(e => this.genClojure(e)).join(' ')}]`;

      case 'BinaryOp':
        return `(${node.op} ${this.genClojure(node.left)} ${this.genClojure(node.right)})`;

      default:
        return '';
    }
  }

  genOCaml(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genOCaml(s)).join('\n\n;;');

      case 'FunctionDecl':
        return (
          `let ${node.name} ${node.params.map(p => p.name).join(' ')} =\n` +
          this.indentCode(this.genOCaml(node.body), 2)
        );

      case 'VariableDecl':
        return `let ${node.name} = ${this.genOCaml(node.value)}`;

      case 'Block':
        return node.statements.map(s => this.genOCaml(s)).join('\n');

      case 'Return':
        return this.genOCaml(node.value);

      case 'FunctionCall':
        return `${node.name} ${node.args.map(a => this.genOCaml(a)).join(' ')}`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `[|${node.elements.map(e => this.genOCaml(e)).join('; ')}|]`;

      case 'BinaryOp':
        return `(${this.genOCaml(node.left)} ${node.op} ${this.genOCaml(node.right)})`;

      default:
        return '';
    }
  }

  genScheme(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genScheme(s)).join('\n');

      case 'FunctionDecl':
        const params = node.params.map(p => p.name).join(' ');
        return `(define (${node.name} ${params})\n  ${this.genScheme(node.body)}\n)`;

      case 'VariableDecl':
        return `(define ${node.name} ${this.genScheme(node.value)})`;

      case 'Block':
        return `(begin\n  ${node.statements.map(s => this.genScheme(s)).join('\n  ')}\n)`;

      case 'Return':
        return this.genScheme(node.value);

      case 'FunctionCall':
        return `(${node.name} ${node.args.map(a => this.genScheme(a)).join(' ')})`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `'(${node.elements.map(e => this.genScheme(e)).join(' ')})`;

      case 'BinaryOp':
        return `(${node.op} ${this.genScheme(node.left)} ${this.genScheme(node.right)})`;

      default:
        return '';
    }
  }

  genWolfram(node) {
    if (!node) return '';

    switch (node.type) {
      case 'Program':
        return node.statements.map(s => this.genWolfram(s)).join('\n');

      case 'FunctionDecl':
        return (
          `${node.name}[${node.params.map(p => p.name).join(', ')}] := ` +
          this.genWolfram(node.body)
        );

      case 'VariableDecl':
        return `${node.name} = ${this.genWolfram(node.value)}`;

      case 'Block':
        return `Block[{}, ${node.statements.map(s => this.genWolfram(s)).join('; ')}]`;

      case 'Return':
        return this.genWolfram(node.value);

      case 'FunctionCall':
        return `${node.name}[${node.args.map(a => this.genWolfram(a)).join(', ')}]`;

      case 'Number':
        return String(node.value);

      case 'String':
        return `"${node.value}"`;

      case 'Boolean':
        return String(node.value);

      case 'Identifier':
        return node.name;

      case 'ArrayLiteral':
        return `{${node.elements.map(e => this.genWolfram(e)).join(', ')}}`;

      case 'BinaryOp':
        return `${this.genWolfram(node.left)} ${node.op} ${this.genWolfram(node.right)}`;

      default:
        return '';
    }
  }

  typeToScala(type) {
    if (typeof type === 'string') {
      const typeMap = {
        i32: 'Int',
        i64: 'Long',
        f32: 'Float',
        f64: 'Double',
        str: 'String',
        bool: 'Boolean'
      };
      return typeMap[type] || 'Any';
    }
    if (type.array) {
      return `Vector[${this.typeToScala(type.array)}]`;
    }
    return 'Any';
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
