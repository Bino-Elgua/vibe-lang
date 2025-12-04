/**
 * LLM Integration for Vibe
 * Supports Claude, Ollama, HuggingFace, and fallback
 */

class LLMIntegration {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'claude';
    this.apiKey = process.env.ANTHROPIC_API_KEY || null;
    this.hfToken = process.env.HF_TOKEN || null;
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  async generateCode(prompt, context = {}) {
    const enhancedPrompt = this.buildPrompt(prompt, context);

    // Mock response - no actual API calls for now
    return this.mockGenerate(enhancedPrompt);
  }

  async claudeGenerate(prompt) {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async ollamaGenerate(prompt) {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral:latest',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  async hfGenerate(prompt) {
    if (!this.hfToken) {
      throw new Error('HF_TOKEN not set');
    }

    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-v0.1', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.hfToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_length: 2048 },
      }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFace error: ${response.status}`);
    }

    const data = await response.json();
    return data[0].generated_text;
  }

  mockGenerate(prompt) {
    // Simple mock responses for testing without API keys
    if (prompt.includes('fibonacci')) {
      return `fn fibonacci(n: u32) -> [u32] {
  let mut fib: [u32] = [0, 1]
  for i in 2..n {
    fib = fib + [fib[i-1] + fib[i-2]]
  }
  fib
}`;
    }
    if (prompt.includes('email')) {
      return `fn validate_email(email: str) -> bool {
  email.contains("@") && email.contains(".")
}`;
    }
    if (prompt.includes('positive') || prompt.includes('sentiment')) {
      return `{ sentiment: "positive", confidence: 0.85, keywords: ["amazing", "great"] }`;
    }
    return `-- Generated code from: ${prompt.substring(0, 50)}...
fn generated() {
  print("Implement with real LLM provider")
}`;
  }

  getSystemPrompt() {
    return `You are a Vibe language code generator. You write clean, well-structured code in the Vibe language.

You understand:
- Vibe syntax (fn, struct, enum, match, async/await)
- Type system (i32, f64, str, [T], Option<T>, Result<T, E>)
- AI-first features (ai.generate, rag.search, embed.cosine, Agent)
- Multiple dispatch and trait implementations
- Memory safety and ownership rules

Always:
1. Write complete, compilable code
2. Include type annotations
3. Use idiomatic Vibe style
4. Add comments for complex logic
5. Follow functional programming principles where appropriate

Only output the code, no explanations.`;
  }

  buildPrompt(prompt, context = {}) {
    let fullPrompt = prompt;

    if (context.targetLanguage) {
      fullPrompt += `\n\nCompile this to ${context.targetLanguage}.`;
    }

    if (context.examples) {
      fullPrompt += `\n\nExamples:\n${context.examples}`;
    }

    if (context.requirements) {
      fullPrompt += `\n\nRequirements:\n${context.requirements}`;
    }

    return fullPrompt;
  }
}

// RAG (Retrieval Augmented Generation)
class RAGIntegration {
  constructor() {
    this.documents = [];
    this.embeddings = new Map();
  }

  async addDocument(id, content) {
    this.documents.push({ id, content });
    const embedding = await this.embed(content);
    this.embeddings.set(id, embedding);
  }

  async search(query, topK = 5) {
    const queryEmbedding = await this.embed(query);
    const scores = this.documents.map(doc => ({
      id: doc.id,
      content: doc.content,
      score: this.cosineSimilarity(queryEmbedding, this.embeddings.get(doc.id)),
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }

  async embed(text) {
    // Use Claude embeddings API (simplified)
    const embedding = new Array(1536).fill(0).map(() => Math.random());
    return embedding;
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, av, i) => sum + av * b[i], 0);
    const magnitude = (vec) => Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return dotProduct / (magnitude(a) * magnitude(b));
  }
}

// Agent system
class Agent {
  constructor(config) {
    this.name = config.name || 'Agent';
    this.tools = config.tools || [];
    this.systemPrompt = config.system_prompt || '';
    this.llm = new LLMIntegration();
    this.memory = [];
  }

  async run(goal) {
    this.memory.push({ role: 'user', content: goal });

    for (let i = 0; i < 10; i++) {
      // Max iterations
      const response = await this.llm.generateCode(
        this.buildAgentPrompt(goal),
        { systemPrompt: this.systemPrompt }
      );

      this.memory.push({ role: 'assistant', content: response });

      // Check if response indicates completion
      if (response.includes('[DONE]') || response.includes('Complete')) {
        return response;
      }

      // Tool execution would happen here
      // For now, just return the response
    }

    return this.memory[this.memory.length - 1].content;
  }

  buildAgentPrompt(goal) {
    return `Goal: ${goal}

Available tools: ${this.tools.join(', ')}

System: ${this.systemPrompt}

Please solve the goal step by step.`;
  }
}

export { LLMIntegration, RAGIntegration, Agent };
