#!/bin/bash

echo "=== VIBE LANGUAGE TEST SUITE ==="
echo ""

echo "1. Testing lexer and parser..."
echo "fn add(a: i32, b: i32) -> i32 { a + b }" > test.vibe
node src/index.js compile test.vibe > /dev/null 2>&1 && echo "✓ Basic syntax OK" || echo "✗ Failed"

echo ""
echo "2. Testing AI prompts..."
cat > test2.vibe << 'VIBE'
fn classify(text: str) {
  %% classify as positive or negative
}
VIBE
node src/index.js compile test2.vibe 2>&1 | grep -q "Generated from prompt" && echo "✓ Prompt processing OK" || echo "✗ Failed"

echo ""
echo "3. Testing multiple dispatch..."
cat > test3.vibe << 'VIBE'
fn process(x: i32) -> str { "int" }
fn process(x: str) -> str { "str" }
VIBE
node src/index.js compile test3.vibe 2>&1 | grep -q "function process" && echo "✓ Multiple dispatch OK" || echo "✗ Failed"

echo ""
echo "4. Testing Python compilation..."
node src/index.js compile examples/hello.vibe --target python 2>&1 | grep -q "def main" && echo "✓ Python target OK" || echo "✗ Failed"

echo ""
echo "5. Testing Rust compilation..."
node src/index.js compile examples/hello.vibe --target rust 2>&1 | grep -q "fn main" && echo "✓ Rust target OK" || echo "✗ Failed"

echo ""
echo "=== ALL TESTS COMPLETE ==="
rm -f test.vibe test2.vibe test3.vibe
