# Vibe Language - Quick Start

## Installation

```bash
cd vibe-lang
npm install
```

## Try It Now

### 1. Interactive REPL
```bash
npm run repl
```

Then type:
```
vibe> fn greet(name: str) { print("Hello " + name) }
vibe> fn add(a: i32, b: i32) -> i32 { a + b }
vibe> add(5, 3)
```

### 2. Compile Examples
```bash
# JavaScript (default)
npm run compile examples/hello.vibe

# Python
npm run compile examples/hello.vibe -- --target python

# Rust
npm run compile examples/hello.vibe -- --target rust
```

### 3. Write Your Own File

Create `hello.vibe`:
```vibe
fn main() {
  print("Hello, Vibe!")
}

fn add(a: i32, b: i32) -> i32 {
  a + b
}

fn greet(name: str) -> str {
  "Hello, " + name
}
```

Compile:
```bash
node src/index.js compile hello.vibe
```

## Language Basics

### Functions
```vibe
fn add(x: i32, y: i32) -> i32 {
  x + y
}
```

### Types
- `i32`, `i64` - integers
- `f32`, `f64` - floats
- `str` - strings
- `bool` - booleans
- `[T]` - arrays
- `Option<T>` - nullable type

### Variables
```vibe
x = 10              -- immutable
mut y = 20          -- mutable
z: i32 = 30         -- with type annotation
```

### Structs
```vibe
struct Point {
  x: i32,
  y: i32
}

p = Point { x: 10, y: 20 }
```

### Enums
```vibe
enum Color {
  Red,
  Green,
  Blue
}
```

### Match
```vibe
match value {
  Some(n) => print(n),
  None => print("empty")
}
```

### Pipelines
```vibe
data
  |> filter(x => x > 5)
  |> map(x => x * 2)
```

## AI Features

### Prompts
Use `%%` to ask AI to generate code:
```vibe
fn fibonacci(n: i32) {
  %% generate fibonacci sequence up to n
}
```

### Voice Input
```vibe
%% [voice: "create a function that validates email addresses"]
```

### AI Generation
```vibe
response = ai.generate("write a poem about programming")
```

### RAG (Search)
```vibe
docs = rag.search("how to use vibe language", top_k=5)
```

## Compilation Targets

| Target | Status | Example |
|--------|--------|---------|
| JavaScript | ✓ Full | `vibe compile app.vibe` |
| Python | ✓ Full | `vibe compile app.vibe --target python` |
| Rust | ✓ Core | `vibe compile app.vibe --target rust` |
| Go | 🚧 WIP | Coming soon |

## Examples

### Hello World
```vibe
fn main() {
  print("Hello, World!")
}
```

### Fibonacci
```vibe
fn fibonacci(n: i32) -> [i32] {
  if n <= 1 {
    [n]
  } else {
    fib = fibonacci(n - 1)
    fib + [fib[-1] + fib[-2]]
  }
}
```

### Multiple Dispatch
```vibe
fn type_name(x: i32) -> str { "integer" }
fn type_name(x: str) -> str { "string" }
fn type_name(x: [i32]) -> str { "array" }
```

### Safe Division
```vibe
fn safe_divide(a: i32, b: i32) -> Option<i32> {
  if b == 0 { None } else { Some(a / b) }
}

match safe_divide(10, 2) {
  Some(result) => print(result),
  None => print("Cannot divide by zero")
}
```

### AI-Powered Function
```vibe
fn analyze_text(text: str) {
  %% Analyze this text for sentiment, extracting keywords: {text}
}
```

## Troubleshooting

**Syntax Error?**
- Check [VIBE_SPEC.md](VIBE_SPEC.md) for syntax rules
- Use REPL to test incrementally
- Enable debug with `DEBUG=true npm run compile`

**Compilation Issues?**
- Ensure types match function signatures
- Use type annotations for clarity
- Check target language limitations

**Want to Use Real LLM?**
- Set `ANTHROPIC_API_KEY` in `.env`
- Or use Ollama: `ollama serve`
- Or HuggingFace: set `HF_TOKEN`

## Next Steps

1. **Read** [VIBE_SPEC.md](VIBE_SPEC.md) for complete language spec
2. **Explore** `examples/` folder for more patterns
3. **Build** your own `.vibe` files
4. **Share** your creations

## Resources

- **Language Spec**: [VIBE_SPEC.md](VIBE_SPEC.md)
- **Full Guide**: [README.md](README.md)
- **Project Summary**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Examples**: `examples/hello.vibe`, `examples/ai-app.vibe`

## Questions?

Check the spec or try the REPL:
```bash
npm run repl
vibe> help
```

---

**Have fun coding in Vibe!** 🎵
