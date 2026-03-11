/**
 * Vibe Language Parser
 * Builds AST from tokens
 */

import { TokenType } from './lexer.js';

class ASTNode {
  constructor(type, props = {}) {
    this.type = type;
    Object.assign(this, props);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
  }

  current() {
    if (this.pos >= this.tokens.length) {
      return { type: TokenType.EOF, value: null, line: 0, column: 0 };
    }
    return this.tokens[this.pos];
  }

  peek(offset = 1) {
    return this.tokens[this.pos + offset];
  }

  advance() {
    this.pos++;
  }

  expect(type) {
    if (this.current().type !== type) {
      throw new Error(
        `Expected ${type}, got ${this.current().type} at ${this.current().line}:${this.current().column}`
      );
    }
    const token = this.current();
    this.advance();
    return token;
  }

  match(...types) {
    if (types.includes(this.current().type)) {
      const token = this.current();
      this.advance();
      return token;
    }
    return null;
  }

  synchronize() {
    this.advance();
    while (this.current().type !== TokenType.EOF) {
      if ([
        TokenType.FN,
        TokenType.STRUCT,
        TokenType.ENUM,
        TokenType.IF,
        TokenType.MATCH,
        TokenType.RETURN,
        TokenType.LET,
        TokenType.CONST,
        TokenType.FOR,
        TokenType.WHILE,
        TokenType.LOOP,
        TokenType.TRAIT,
        TokenType.IMPL,
        TokenType.USE,
        TokenType.SWARM,
        TokenType.SKILL,
        TokenType.SECURE,
      ].includes(this.current().type)) {
        return;
      }
      if (this.tokens[this.pos - 1]?.type === TokenType.RBRACE) {
        return;
      }
      this.advance();
    }
  }

  addError(message, token = null) {
    const t = token || this.current();
    this.errors.push({
      message,
      line: t?.line || 0,
      column: t?.column || 0,
      token: t?.type || 'EOF',
    });
  }

  parse() {
    const statements = [];
    while (this.current().type !== TokenType.EOF) {
      statements.push(this.parseStatement());
    }
    const program = new ASTNode('Program', { statements });
    return { ast: program, errors: this.errors };
  }

  parseStatement() {
    try {
      const token = this.current();

      if (token.type === TokenType.FN) {
        return this.parseFunctionDecl();
      }
      if (token.type === TokenType.STRUCT) {
        return this.parseStructDecl();
      }
      if (token.type === TokenType.ENUM) {
        return this.parseEnumDecl();
      }
      if (token.type === TokenType.IF) {
        return this.parseIfStatement();
      }
      if (token.type === TokenType.MATCH) {
        return this.parseMatchStatement();
      }
      if (token.type === TokenType.RETURN) {
        this.advance();
        const value = this.parseExpression();
        this.match(TokenType.SEMICOLON);
        return new ASTNode('Return', { value });
      }
      if (token.type === TokenType.LET || token.type === TokenType.CONST) {
        return this.parseVariableDecl();
      }

      // Swarm declaration
      if (token.type === TokenType.SWARM) {
        return this.parseSwarmDecl();
      }

      // Skill declaration
      if (token.type === TokenType.SKILL) {
        return this.parseSkillDecl();
      }

      // Secure block
      if (token.type === TokenType.SECURE) {
        return this.parseSecureBlock();
      }

      // Loop until
      if (token.type === TokenType.LOOP) {
        if (this.peek()?.type === TokenType.UNTIL) {
          return this.parseLoopUntil();
        }
      }

      // Use/import
      if (token.type === TokenType.USE) {
        return this.parseUseStatement();
      }

      // For loop
      if (token.type === TokenType.FOR) {
        return this.parseForLoop();
      }

      // While loop
      if (token.type === TokenType.WHILE) {
        return this.parseWhileLoop();
      }

      // Async function
      if (token.type === TokenType.ASYNC) {
        return this.parseAsyncFunction();
      }

      // Trait declaration
      if (token.type === TokenType.TRAIT) {
        return this.parseTraitDecl();
      }

      // Impl block
      if (token.type === TokenType.IMPL) {
        return this.parseImplDecl();
      }

      // Break
      if (token.type === TokenType.BREAK) {
        this.advance();
        this.match(TokenType.SEMICOLON);
        return new ASTNode('Break', {});
      }

      // Continue
      if (token.type === TokenType.CONTINUE) {
        this.advance();
        this.match(TokenType.SEMICOLON);
        return new ASTNode('Continue', {});
      }

      // Check for assignment: identifier = expr (including `mut x = ...`)
      if (token.type === TokenType.MUT) {
        this.advance();
        const name = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.ASSIGN);
        const value = this.parseExpression();
        this.match(TokenType.SEMICOLON);
        return new ASTNode('VariableDecl', { name, type: null, value, isMut: true });
      }

      if (token.type === TokenType.IDENTIFIER && this.peek()?.type === TokenType.ASSIGN) {
        const name = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.ASSIGN);
        const value = this.parseExpression();
        this.match(TokenType.SEMICOLON);
        return new ASTNode('Assignment', { name, value });
      }

      // AI keywords used as statements: agent X = { ... }
      if ([TokenType.AI, TokenType.RAG, TokenType.EMBED, TokenType.AGENT].includes(token.type)) {
        this.advance(); // skip keyword
        if (this.current().type === TokenType.IDENTIFIER) {
          const name = this.expect(TokenType.IDENTIFIER).value;
          if (this.current().type === TokenType.ASSIGN) {
            this.advance();
            const value = this.parseExpression();
            this.match(TokenType.SEMICOLON);
            return new ASTNode('Assignment', { name, value });
          }
        }
        // Fall through to expression parsing if not assignment
      }

      const expr = this.parseExpression();
      this.match(TokenType.SEMICOLON);
      return expr;
    } catch (error) {
      this.addError(error.message);
      this.synchronize();
      return new ASTNode('Error', { message: error.message });
    }
  }

  parseFunctionDecl() {
    this.expect(TokenType.FN);
    const name = this.expect(TokenType.IDENTIFIER).value;

    // Type parameters (generics)
    let typeParams = [];
    if (this.current().type === TokenType.LT) {
      this.advance();
      typeParams = this.parseTypeParamList();
      this.expect(TokenType.GT);
    }

    // Parameters
    this.expect(TokenType.LPAREN);
    const params = this.parseParamList();
    this.expect(TokenType.RPAREN);

    // Return type
    let returnType = null;
    if (this.current().type === TokenType.ARROW) {
      this.advance();
      returnType = this.parseType();
    }

    // Body
    const body = this.parseBlock();

    return new ASTNode('FunctionDecl', {
      name,
      params,
      returnType,
      body,
      typeParams,
    });
  }

  parseParamList() {
    const params = [];
    while (this.current().type !== TokenType.RPAREN) {
      const name = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);
      const type = this.parseType();
      params.push({ name, type });

      if (this.current().type !== TokenType.RPAREN) {
        this.expect(TokenType.COMMA);
      }
    }
    return params;
  }

  parseTypeParamList() {
    const params = [];
    while (this.current().type !== TokenType.GT) {
      const name = this.expect(TokenType.IDENTIFIER).value;
      params.push(name);
      if (this.current().type !== TokenType.GT) {
        this.expect(TokenType.COMMA);
      }
    }
    return params;
  }

  parseType() {
    let type = this.expect(TokenType.IDENTIFIER).value;

    // Generic types (e.g., Option<i32>)
    if (this.current().type === TokenType.LT) {
      this.advance();
      const innerType = this.parseType();
      this.expect(TokenType.GT);
      type = { generic: type, inner: innerType };
    }

    // Array types
    if (this.current().type === TokenType.LBRACKET) {
      this.advance();
      this.expect(TokenType.RBRACKET);
      type = { array: type };
    }

    return type;
  }

  parseStructDecl() {
    this.expect(TokenType.STRUCT);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const fields = [];
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      const fieldName = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);
      const fieldType = this.parseType();
      fields.push({ name: fieldName, type: fieldType });

      if (this.current().type !== TokenType.RBRACE) {
        this.expect(TokenType.COMMA);
      }
    }

    this.expect(TokenType.RBRACE);

    return new ASTNode('StructDecl', { name, fields });
  }

  parseEnumDecl() {
    this.expect(TokenType.ENUM);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const variants = [];
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      variants.push(this.expect(TokenType.IDENTIFIER).value);
      if (this.current().type !== TokenType.RBRACE) {
        this.expect(TokenType.COMMA);
      }
    }

    this.expect(TokenType.RBRACE);

    return new ASTNode('EnumDecl', { name, variants });
  }

  parseIfStatement() {
    this.expect(TokenType.IF);
    const condition = this.parseExpression();
    const thenBranch = this.parseBlock();

    let elseBranch = null;
    if (this.current().type === TokenType.ELSE) {
      this.advance();
      elseBranch = this.parseBlock();
    }

    return new ASTNode('If', { condition, thenBranch, elseBranch });
  }

  parseMatchStatement() {
    this.expect(TokenType.MATCH);
    const expr = this.parseExpression();
    this.expect(TokenType.LBRACE);

    const arms = [];
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      const pattern = this.parsePattern();
      this.expect(TokenType.FAT_ARROW);
      const body = this.parseExpression();
      arms.push({ pattern, body });

      if (this.current().type !== TokenType.RBRACE) {
        this.expect(TokenType.COMMA);
      }
    }

    this.expect(TokenType.RBRACE);

    return new ASTNode('Match', { expr, arms });
  }

  parsePattern() {
    if (this.current().type === TokenType.IDENTIFIER) {
      const name = this.expect(TokenType.IDENTIFIER).value;

      // Some(x) pattern
      if (this.current().type === TokenType.LPAREN) {
        this.advance();
        const inner = this.parsePattern();
        this.expect(TokenType.RPAREN);
        return new ASTNode('ConstructorPattern', {
          constructor: name,
          args: [inner],
        });
      }

      return new ASTNode('IdentifierPattern', { name });
    }

    throw new Error(`Unexpected pattern: ${this.current().type}`);
  }

  parseVariableDecl() {
    const isMut = this.match(TokenType.MUT);
    this.expect(TokenType.LET);
    const name = this.expect(TokenType.IDENTIFIER).value;

    let type = null;
    if (this.current().type === TokenType.COLON) {
      this.advance();
      type = this.parseType();
    }

    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    this.match(TokenType.SEMICOLON);

    return new ASTNode('VariableDecl', { name, type, value, isMut });
  }

  parseSwarmDecl() {
    this.expect(TokenType.SWARM);
    let name = null;
    if (this.current().type === TokenType.IDENTIFIER) {
      name = this.expect(TokenType.IDENTIFIER).value;
    }
    this.expect(TokenType.LBRACE);

    const agents = [];
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      const agentName = this.expect(TokenType.IDENTIFIER).value;
      let role = null;

      if (this.current().type === TokenType.COLON) {
        this.advance();
        if (this.current().type === TokenType.STRING) {
          role = this.expect(TokenType.STRING).value;
        } else if (this.current().type === TokenType.PROMPT) {
          role = this.current().value;
          this.advance();
        } else {
          role = this.parseExpression();
        }
      }

      agents.push({ name: agentName, role });

      if (this.current().type === TokenType.FAT_ARROW) {
        this.advance();
      } else if (this.current().type === TokenType.COMMA) {
        this.advance();
      }
    }

    if (this.current().type === TokenType.RBRACE) {
      this.advance();
    } else {
      this.addError('Unterminated swarm block — expected }');
    }

    return new ASTNode('SwarmDecl', { name, agents });
  }

  parseSkillDecl() {
    this.expect(TokenType.SKILL);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const properties = {};
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      const key = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);
      const value = this.parseExpression();
      properties[key] = value;

      if (this.current().type === TokenType.COMMA) {
        this.advance();
      }
    }

    if (this.current().type === TokenType.RBRACE) {
      this.advance();
    } else {
      this.addError('Unterminated skill block — expected }');
    }

    return new ASTNode('SkillDecl', { name, properties });
  }

  parseSecureBlock() {
    this.expect(TokenType.SECURE);
    const body = this.parseBlock();
    return new ASTNode('SecureBlock', { body });
  }

  parseLoopUntil() {
    this.expect(TokenType.LOOP);
    this.expect(TokenType.UNTIL);

    let goal = null;
    if (this.current().type === TokenType.IDENTIFIER && this.current().value === 'goal') {
      this.advance();
      this.expect(TokenType.COLON);
    }
    goal = this.parseExpression();

    const body = this.parseBlock();
    return new ASTNode('LoopUntil', { goal, body });
  }

  parseUseStatement() {
    this.expect(TokenType.USE);
    const parts = [this.expect(TokenType.IDENTIFIER).value];

    while (this.current().type === TokenType.DOUBLE_COLON || this.current().type === TokenType.DOT) {
      this.advance();
      parts.push(this.expect(TokenType.IDENTIFIER).value);
    }

    this.match(TokenType.SEMICOLON);
    return new ASTNode('UseStatement', { path: parts });
  }

  parseForLoop() {
    this.expect(TokenType.FOR);
    const variable = this.expect(TokenType.IDENTIFIER).value;
    const inToken = this.current();
    if (inToken.type === TokenType.IDENTIFIER && inToken.value === 'in') {
      this.advance();
    } else {
      this.addError('Expected "in" in for loop');
    }
    const iterable = this.parseExpression();
    const body = this.parseBlock();
    return new ASTNode('ForLoop', { variable, iterable, body });
  }

  parseWhileLoop() {
    this.expect(TokenType.WHILE);
    const condition = this.parseExpression();
    const body = this.parseBlock();
    return new ASTNode('WhileLoop', { condition, body });
  }

  parseAsyncFunction() {
    this.expect(TokenType.ASYNC);
    this.expect(TokenType.FN);
    const name = this.expect(TokenType.IDENTIFIER).value;

    let typeParams = [];
    if (this.current().type === TokenType.LT) {
      this.advance();
      typeParams = this.parseTypeParamList();
      this.expect(TokenType.GT);
    }

    this.expect(TokenType.LPAREN);
    const params = this.parseParamList();
    this.expect(TokenType.RPAREN);

    let returnType = null;
    if (this.current().type === TokenType.ARROW) {
      this.advance();
      returnType = this.parseType();
    }

    const body = this.parseBlock();
    return new ASTNode('FunctionDecl', { name, params, returnType, body, typeParams, isAsync: true });
  }

  parseTraitDecl() {
    this.expect(TokenType.TRAIT);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const methods = [];
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      this.expect(TokenType.FN);
      const methodName = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.LPAREN);
      const params = this.parseParamList();
      this.expect(TokenType.RPAREN);

      let returnType = null;
      if (this.current().type === TokenType.ARROW) {
        this.advance();
        returnType = this.parseType();
      }

      let body = null;
      if (this.current().type === TokenType.LBRACE) {
        body = this.parseBlock();
      } else {
        this.match(TokenType.SEMICOLON);
      }

      methods.push({ name: methodName, params, returnType, body });
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode('TraitDecl', { name, methods });
  }

  parseImplDecl() {
    this.expect(TokenType.IMPL);
    const traitOrType = this.expect(TokenType.IDENTIFIER).value;

    let traitName = null;
    let typeName = traitOrType;

    if (this.current().type === TokenType.FOR || (this.current().type === TokenType.IDENTIFIER && this.current().value === 'for')) {
      this.advance();
      traitName = traitOrType;
      typeName = this.expect(TokenType.IDENTIFIER).value;
    }

    this.expect(TokenType.LBRACE);

    const methods = [];
    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      if (this.current().type === TokenType.ASYNC) {
        methods.push(this.parseAsyncFunction());
      } else {
        methods.push(this.parseFunctionDecl());
      }
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode('ImplDecl', { trait: traitName, typeName, methods });
  }

  parseBlock() {
    this.expect(TokenType.LBRACE);
    const statements = [];

    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      statements.push(this.parseStatement());
    }

    if (this.current().type === TokenType.RBRACE) {
      this.advance();
    } else {
      this.addError('Unterminated block — expected }');
    }

    return new ASTNode('Block', { statements });
  }

  parseExpression() {
    return this.parsePipeline();
  }

  parsePipeline() {
    let left = this.parseLogicalOr();

    while (this.current().type === TokenType.PIPE) {
      this.advance();
      const right = this.parseLogicalOr();
      left = new ASTNode('Pipeline', { left, right });
    }

    return left;
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();

    while (this.current().type === TokenType.OR) {
      this.advance();
      const right = this.parseLogicalAnd();
      left = new ASTNode('BinaryOp', { op: '||', left, right });
    }

    return left;
  }

  parseLogicalAnd() {
    let left = this.parseEquality();

    while (this.current().type === TokenType.AND) {
      this.advance();
      const right = this.parseEquality();
      left = new ASTNode('BinaryOp', { op: '&&', left, right });
    }

    return left;
  }

  parseEquality() {
    let left = this.parseRelational();

    while (this.current().type === TokenType.EQ || this.current().type === TokenType.NE) {
      const op = this.current().value;
      this.advance();
      const right = this.parseRelational();
      left = new ASTNode('BinaryOp', { op, left, right });
    }

    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();

    while (
      this.current().type === TokenType.LT ||
      this.current().type === TokenType.LE ||
      this.current().type === TokenType.GT ||
      this.current().type === TokenType.GE
    ) {
      const op = this.current().value;
      this.advance();
      const right = this.parseAdditive();
      left = new ASTNode('BinaryOp', { op, left, right });
    }

    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();

    while (this.current().type === TokenType.PLUS || this.current().type === TokenType.MINUS) {
      const op = this.current().value;
      this.advance();
      const right = this.parseMultiplicative();
      left = new ASTNode('BinaryOp', { op, left, right });
    }

    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();

    while (
      this.current().type === TokenType.STAR ||
      this.current().type === TokenType.SLASH ||
      this.current().type === TokenType.PERCENT
    ) {
      const op = this.current().value;
      this.advance();
      const right = this.parseUnary();
      left = new ASTNode('BinaryOp', { op, left, right });
    }

    return left;
  }

  parseUnary() {
    if (this.current().type === TokenType.AWAIT) {
      this.advance();
      const expr = this.parseUnary();
      return new ASTNode('AwaitExpr', { expr });
    }

    if (this.current().type === TokenType.SPAWN) {
      this.advance();
      const expr = this.parseUnary();
      return new ASTNode('SpawnExpr', { expr });
    }

    if (this.current().type === TokenType.NOT) {
      this.advance();
      const expr = this.parseUnary();
      return new ASTNode('UnaryOp', { op: '!', expr });
    }

    if (this.current().type === TokenType.MINUS) {
      this.advance();
      const expr = this.parseUnary();
      return new ASTNode('UnaryOp', { op: '-', expr });
    }

    if (this.current().type === TokenType.AMPERSAND) {
      this.advance();
      const expr = this.parseUnary();
      return new ASTNode('UnaryOp', { op: '&', expr });
    }

    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();

    while (true) {
      if (this.current().type === TokenType.DOT) {
        this.advance();
        const field = this.expect(TokenType.IDENTIFIER).value;

        if (this.current().type === TokenType.LPAREN) {
          // Method call
          this.advance();
          const args = this.parseArgumentList();
          this.expect(TokenType.RPAREN);
          expr = new ASTNode('MethodCall', { object: expr, method: field, args });
        } else {
          // Field access
          expr = new ASTNode('FieldAccess', { object: expr, field });
        }
      } else if (this.current().type === TokenType.LBRACKET) {
        this.advance();
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET);
        expr = new ASTNode('Index', { object: expr, index });
      } else if (this.current().type === TokenType.LPAREN && expr.type === 'Identifier') {
        // Function call
        this.advance();
        const args = this.parseArgumentList();
        this.expect(TokenType.RPAREN);
        expr = new ASTNode('FunctionCall', { name: expr.name, args });
      } else {
        break;
      }
    }

    return expr;
  }

  parseArgumentList() {
    const args = [];
    while (this.current().type !== TokenType.RPAREN) {
      args.push(this.parseExpression());
      if (this.current().type !== TokenType.RPAREN) {
        this.expect(TokenType.COMMA);
      }
    }
    return args;
  }

  parsePrimary() {
    const token = this.current();

    // Literals
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return new ASTNode('Number', { value: parseFloat(token.value) });
    }

    if (token.type === TokenType.STRING) {
      this.advance();
      return new ASTNode('String', { value: token.value });
    }

    if (token.type === TokenType.TRUE) {
      this.advance();
      return new ASTNode('Boolean', { value: true });
    }

    if (token.type === TokenType.FALSE) {
      this.advance();
      return new ASTNode('Boolean', { value: false });
    }

    if (token.type === TokenType.NIL || token.type === TokenType.NONE) {
      this.advance();
      return new ASTNode('Nil', {});
    }

    // Prompt
    if (token.type === TokenType.PROMPT) {
      this.advance();
      return new ASTNode('Prompt', { text: token.value });
    }

    // Voice
    if (token.type === TokenType.VOICE) {
      this.advance();
      return new ASTNode('Voice', { text: token.value });
    }

    // Identifier
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return new ASTNode('Identifier', { name: token.value });
    }

    // Array literal
    if (token.type === TokenType.LBRACKET) {
      this.advance();
      const elements = [];
      while (this.current().type !== TokenType.RBRACKET) {
        elements.push(this.parseExpression());
        if (this.current().type !== TokenType.RBRACKET) {
          this.expect(TokenType.COMMA);
        }
      }
      this.expect(TokenType.RBRACKET);
      return new ASTNode('ArrayLiteral', { elements });
    }

    // Grouped expression
    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    // Struct literal
    if (token.type === TokenType.IDENTIFIER) {
      const name = token.value;
      if (this.peek().type === TokenType.LBRACE) {
        this.advance();
        this.advance();
        const fields = {};
        while (this.current().type !== TokenType.RBRACE) {
          const fieldName = this.expect(TokenType.IDENTIFIER).value;
          this.expect(TokenType.COLON);
          fields[fieldName] = this.parseExpression();
          if (this.current().type !== TokenType.RBRACE) {
            this.expect(TokenType.COMMA);
          }
        }
        this.expect(TokenType.RBRACE);
        return new ASTNode('StructLiteral', { name, fields });
      }
    }

    throw new Error(`Unexpected token: ${token.type} at ${token.line}:${token.column}`);
  }
}

export { Parser, ASTNode };
