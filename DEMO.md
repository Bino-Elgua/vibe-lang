# Vibe Language - Live Demo

## Quick Demo (Copy & Paste)

### 1. Basic Function
```bash
cat > demo.vibe << 'VIBE'
fn add(a: i32, b: i32) -> i32 { a + b }
fn multiply(a: i32, b: i32) -> i32 { a * b }
VIBE

node src/index.js compile demo.vibe
```

Output:
```javascript
function add(a, b) {
  a + b
}

function multiply(a, b) {
  a * b
}
```

### 2. Structs and Pattern Matching
```bash
cat > demo2.vibe << 'VIBE'
struct Point {
  x: i32,
  y: i32
}

enum Color {
  Red,
  Green,
  Blue
}
VIBE

node src/index.js compile demo2.vibe
```

Output:
```javascript
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

const Color = { Red: 'Red', Green: 'Green', Blue: 'Blue' };
```

### 3. AI Generation (with prompts)
```bash
cat > demo3.vibe << 'VIBE'
fn fibonacci(n: i32) {
  %% generate fibonacci sequence up to n
}
VIBE

node src/index.js compile demo3.vibe
```

Output includes:
```javascript
/* Generated from prompt: generate fibonacci sequence up to n */
```

### 4. Compile to Python
```bash
cat > demo.vibe << 'VIBE'
fn greet(name: str) {
  print("Hello, " + name)
}
VIBE

node src/index.js compile demo.vibe --target python
```

Output:
```python
def greet(name):
  print("Hello, " + name)
```

### 5. Compile to Rust
```bash
node src/index.js compile demo.vibe --target rust
```

Output:
```rust
fn greet(name: String) {
  println!("Hello, {}", name);
}
```

## Interactive REPL Demo

```bash
npm run repl
```

Then try:
```
vibe> fn hello() { print("world") }
vibe> hello()
world

vibe> struct User { id: u64, name: str }
vibe> user = User { id: 1, name: "Alice" }

vibe> fn double(x: i32) -> i32 { x * 2 }
vibe> double(21)
42

vibe> %% write a function that checks if a number is prime
```

## Advanced Examples

### Multiple Dispatch
```vibe
fn process(x: i32) -> str { "integer" }
fn process(x: str) -> str { "string" }
fn process(x: [f64]) -> str { "float array" }
```

Compiles to:
```javascript
function process(x) { return "integer"; }
function process(x) { return "string"; }
function process(x) { return "float array"; }
```

### Option Types (No Nulls)
```vibe
fn divide(a: i32, b: i32) -> Option<i32> {
  if b == 0 { None } else { Some(a / b) }
}

match divide(10, 2) {
  Some(n) => print(n),
  None => print("error")
}
```

### Pipelines
```vibe
data
  |> filter(x => x > 5)
  |> map(x => x * 2)
  |> print()
```

## Performance Demo

Compile 100 functions:
```bash
node -e "
const { Compiler } = require('./src/compiler.js');

let code = '';
for(let i = 0; i < 100; i++) {
  code += \`fn func\${i}(x: i32) -> i32 { x + \${i} }\n\`;
}

const start = Date.now();
const c = new Compiler(code);
const result = c.compile();
const time = Date.now() - start;

console.log('Compiled 100 functions in ' + time + 'ms');
console.log('Output size: ' + result.length + ' bytes');
"
```

## Feature Showcase

### All Type Annotations
```vibe
-- Primitives
x: i32 = 42
y: f64 = 3.14
name: str = "Vibe"
flag: bool = true

-- Collections
arr: [i32] = [1, 2, 3]
opt: Option<i32> = Some(42)

-- Custom types
point: Point = Point { x: 0, y: 0 }
color: Color = Color.Red

-- Generics
first: fn<T>(arr: [T]) -> T
```

### All Operators
```vibe
a + b      -- addition
a - b      -- subtraction
a * b      -- multiplication
a / b      -- division
a % b      -- modulo

a == b     -- equality
a != b     -- inequality
a < b      -- less than
a <= b     -- less or equal
a > b      -- greater than
a >= b     -- greater or equal

a && b     -- logical AND
a || b     -- logical OR
!a         -- logical NOT

x |> f     -- pipeline
```

### All Control Flow
```vibe
if condition {
  -- then
} else {
  -- else
}

match value {
  pattern1 => result1,
  pattern2 => result2
}

for i in range {
  -- loop
}

while condition {
  -- loop
}
```

## One-Liners

```bash
# Compile and run
node src/index.js compile hello.vibe | node -

# Count tokens
node -e "const {Lexer}=require('./src/lexer.js');const l=new Lexer(require('fs').readFileSync('hello.vibe','utf8'));console.log(l.tokenize().length)"

# Test multiple targets
for target in javascript python rust; do echo "=== $target ==="; node src/index.js compile examples/hello.vibe --target $target | head -3; done
```

## Copy-Paste to Try Now

```bash
# 1. Create test file
echo 'fn main() { print("Hello Vibe!") }' > test.vibe

# 2. Compile to JavaScript
node vibe-lang/src/index.js compile test.vibe

# 3. Compile to Python
node vibe-lang/src/index.js compile test.vibe --target python

# 4. View examples
cat vibe-lang/examples/hello.vibe
cat vibe-lang/examples/ai-app.vibe

# 5. Run REPL
npm run repl
```

---

**That's the demo! Ready to build with Vibe?**
