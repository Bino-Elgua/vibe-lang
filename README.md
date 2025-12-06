# Vibe Language

A cutting-edge, AI-native programming language where voice/prompts are first-class citizens. Code in natural language or traditional syntax, compile to 18 languages, and integrate with 20+ AI tools including TensorFlow, PyTorch, Claude, OpenAI, HuggingFace, Pinecone, and more.

## Features

- **Prompt-First Syntax**: Use `%%` for AI-generated code blocks
- **Voice Input**: `[voice: "describe what you want to build"]`
- **AI as First-Class**: Native LLM, RAG, embeddings, agents
- **Multi-Language Compilation**: 18 targets (JS, Python, Go, Rust, Julia, Idris, Move, R, Prolog, Lisp, Haskell, Lua, MATLAB, Scala, Clojure, OCaml, Scheme, Wolfram)
- **AI Tools Integration**: TensorFlow, PyTorch, OpenAI, Claude, Groq, HuggingFace, Pinecone, Weaviate, Pandas, OpenCV, and 10+ more
- **Type Safe**: Inspired by Rust, Idris, Julia
- **No Nulls**: Option/Result types
- **Multiple Dispatch**: Like Julia
- **Async/Concurrent**: Goroutine-like spawning

## Quick Start

```bash
npm install
npm run dev

# REPL
npm run repl

# Compile examples
npm run compile examples/hello.vibe
npm run compile examples/ai-app.vibe -- --target python
```

## Syntax Examples

### Basic Function
```vibe
fn add(a: i32, b: i32) -> i32 {
  a + b
}
```

### AI-Generated Code
```vibe
fn classify(text: str) {
  %% classify this text as positive, negative, or neutral
}
```

### Voice Input
```vibe
%% [voice: "create a fibonacci generator"]
```

### Multiple Dispatch
```vibe
fn process(x: i32) -> str { "int" }
fn process(x: str) -> str { "string" }
fn process(x: [f64]) -> str { "array" }
```

### No Nulls - Option Types
```vibe
fn safe_divide(a: i32, b: i32) -> Option<i32> {
  if b == 0 { None } else { Some(a / b) }
}

match result {
  Some(n) => print(n),
  None => print("error")
}
```

### AI Integration
```vibe
-- LLM call
response = ai.generate("write a poem about Vibe")

-- RAG search
docs = rag.search("how to use Vibe", top_k=5)

-- Embeddings
similarity = embed.cosine(text1, text2)

-- Multi-tool agent
agent = Agent {
  name: "CodeWriter",
  tools: [search, execute, refine],
  system_prompt: %% "You are an expert programmer"
}
result = agent.run("build a todo app")
```

### Pipeline Operations
```vibe
data
  |> filter(x => x.year > 2020)
  |> map(x => x.value * 2)
  |> group_by(x => x.category)
```

## Language Features

### Type System
- `i32`, `i64`, `u32`, `f32`, `f64`, `bool`, `str`
- `[T]` - Arrays
- `Option<T>`, `Result<T, E>` - No nulls
- Generics: `fn first<T>(arr: [T]) -> T`
- Multiple dispatch (like Julia)

### Memory Safety
- Immutable by default: `x = 10`
- Mutable: `mut y = 20`
- Borrowing: `ref = &value`
- Move semantics for linear types

### Async/Concurrency
- `async fn` - async functions
- `await` - wait for async
- `spawn { ... }` - goroutine-like
- `channel<T>()` - message passing

### Data Structures
```vibe
struct User { id: u64, name: str }
enum Status { Active, Inactive }
protocol Drawable { fn draw(self) }
```

## Compilation Targets

```bash
# JavaScript (default)
vibe compile hello.vibe

# Python
vibe compile hello.vibe --target python

# Rust
vibe compile hello.vibe --target rust

# Go
vibe compile hello.vibe --target go
```

## LLM Providers

Configure in environment:

```bash
export LLM_PROVIDER=claude      # Default, requires ANTHROPIC_API_KEY
export LLM_PROVIDER=ollama      # Free local, requires `ollama serve`
export LLM_PROVIDER=hf          # Cheap, requires HF_TOKEN
```

Vibe automatically falls back through providers if one is unavailable.

## Project Structure

```
vibe-lang/
├── src/
│   ├── lexer.js           # Tokenization
│   ├── parser.js          # AST building
│   ├── compiler.js        # Code generation
│   ├── llm-integration.js # AI features
│   ├── repl.js            # Interactive shell
│   └── index.js           # Entry point
├── examples/
│   ├── hello.vibe         # Basic examples
│   └── ai-app.vibe        # AI examples
├── VIBE_SPEC.md           # Full language spec
└── README.md              # This file
```

## Development

```bash
# Watch mode
npm run dev

# Tests
npm test

# Linting
npm run lint

# Format
npm run format
```

## Next Steps

1. **Type Checker** - Full type system validation
2. **Optimization** - IR optimization passes
3. **Standard Library** - Built-in functions/modules
4. **WASM Backend** - Compile to WebAssembly
5. **Package Manager** - Vibe package ecosystem
6. **IDE Support** - VSCode extension

## Inspiration

- **Julia**: Multiple dispatch, scientific computing
- **Rust**: Memory safety, ownership, pattern matching
- **Go**: Simplicity, concurrency
- **Python**: Readability, rapid development
- **Idris**: Dependent types, proof systems
- **Move**: Linear types, resource management

## License

MIT

---

**Status**: Pre-alpha. Actively developing core language features.
