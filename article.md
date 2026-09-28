# My AI Has Receipts Now — Thanks to Hindsight

The most awkward support interaction is when a returning customer says, “The payment failed again,” and the AI replies, “What payment?” Technically, the model may have answered perfectly from the prompt it received. Socially, it has the memory of a goldfish with a ticket queue.

That gap is what I wanted SupportBrain to address. A support agent needs more than a transcript of the current chat: it needs a way to carry forward useful facts, find the right ones later, and avoid pretending it remembers things it cannot actually retrieve. I built SupportBrain around Hindsight for that durable-memory layer, while keeping ordinary application records in SQLite.

## Chat history is not durable memory

SupportBrain stores customers, conversations, and messages in SQLite. That transcript is useful: it lets the app render a conversation, preserve it across restarts, and provide recent turns to the model. In `aiService.js`, the generation path includes up to the last six messages from the active conversation.

But a transcript and an agent memory solve different problems. A transcript answers, “What was said in this thread?” Durable memory should help answer, “What previous information matters to this new question?” Sending every past message on every request would also make the prompt itself responsible for finding signal in an ever-growing archive. I wanted the application to retrieve a small, relevant set of prior facts instead.

The project therefore gives the two stores different jobs:

- SQLite stores customer profiles, conversation threads, message transcripts, and recurring-issue counts.
- Hindsight stores support memories that can be recalled against a later query.
- Groq generates support replies and, when configured, extracts structured facts from an interaction.

Here is the shape of a chat turn:

```text
Browser -> Express API -> SQLite: record customer message
                       -> Hindsight: recall for this customer and query
                       -> Groq: reply using recent chat + recalled memories
                       -> Groq/fallback: extract problem, solution, outcome
                       -> Hindsight: retain useful interaction
                       -> SQLite: record reply and issue metadata
```

## One bank per customer

The Hindsight integration lives in `server/services/hindsightService.js`. SupportBrain derives a stable bank ID from the customer ID, normalizing characters outside a small allowed set:

```js
getBankId(customerId) {
  if (!customerId) return 'supportbrain_default';
  return `supportbrain_${customerId.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
}
```

For example, `CUST-001` maps to `supportbrain_cust-001`: the hyphen is preserved. Before recall or retention, `ensureBank` asks the client to create the bank with a customer-specific name and mission. The service caches bank IDs it has attempted to create in a process-local `Set` so it does not repeat that call on every turn.

This is useful logical separation: Hari’s query goes to Hari’s bank, not a shared collection of every customer’s memories. It is not a complete authorization system, though. The API accepts a customer ID from the request, and a namespaced bank ID alone does not establish that a caller is permitted to access that customer. A production deployment would need authenticated tenant authorization and a carefully managed mapping from authorized customer records to bank IDs.

## Recall first, then answer

`server/services/memoryService.js` orchestrates a turn. It validates the customer and message, finds or creates a conversation, records the incoming message, then asks Hindsight to recall against that message:

```js
const recallResult = await hindsightService.recallCustomerMemory(customerId, trimmedMsg);

const memoriesRetrieved = recallResult.available && recallResult.memories && recallResult.memories.length > 0;
const retrievedMemories = recallResult.memories || [];
```

The service passes those normalized memory objects, along with the customer name, current message, and recent conversation history, into `aiService.generateSupportResponse`. The AI service puts the issue, attempted solution, outcome, and memory text into its system prompt. When it has no memories, the prompt explicitly tells the model not to claim a previous interaction. That instruction matters: an empty recall result is not permission for the model to improvise a backstory.

Hindsight recall is configured with a 1,024-token maximum and the `world`, `experience`, and `observation` memory types. The service maps returned records into fields the app understands, using metadata where present and parsing the text as a fallback. It also keeps the returned score for display. There is a helper call that formats the raw recall response, but the reply-generation path currently uses the normalized memory objects instead; `aiService.js` constructs its own prompt section.

## A payment failure, then a return visit

The repository includes a concrete Hari scenario. A previous interaction records a payment failure, a retry with 3-D Secure, and a successful outcome. When Hari later asks, “My payment failed again,” the service queries Hari’s bank before asking the model to respond. The prompt can then acknowledge that the previous retry worked and ask whether the same failure is happening again, rather than starting as if Hari were a stranger.

That scenario appears in the README and in the test suite: the test explicitly retains a payment memory for `CUST-001`, then checks that a later payment query recalls it. The suite also checks a password query against a login memory and checks that a different customer does not receive Hari’s stored result. These are useful behavioral checks, not proof that retrieval is universally relevant or that customer authorization is production-ready.

## Retain the useful part

After the reply, `MemoryService` calls `aiService.extractInteractionMemory`. With a configured Groq client, that method asks for JSON containing a problem, solution, outcome, recurrence flag, and tags. If Groq is not configured or extraction fails, the code falls back to simple keyword heuristics for payment, login, and shipping issues.

If extraction reports useful information and includes a problem, SupportBrain retains it in Hindsight. The service turns the fields into readable text and also sends metadata:

```js
const content = `Problem: ${problem}. Solution: ${solution}. Outcome: ${outcome}.${notes ? ' Additional details: ' + notes : ''}`;

const response = await this.client.retain(bankId, content, {
  async: false,
  tags: ['support', customerId, ...(tags || [])],
  metadata: { problem, solution, outcome, source: 'customer_interaction', timestamp: new Date().toISOString() }
});
```

The text makes the memory readable and gives the local implementation something to match against. The metadata lets the app display structured fields without parsing prose in the common case. Retention is synchronous in this call, and the app reports whether it succeeded. If Hindsight is unavailable during recall, the recall service returns an unavailable state and an empty memory list; the turn can still proceed to response generation without historical context. A retention failure is reported separately and does not turn an otherwise successful support response into a failed chat request.

One detail worth being precise about: the recurring-issue count is stored in SQLite, not inferred by Hindsight. Whenever the extractor returns a useful problem, `MemoryService` updates the customer’s matching issue count. The UI reports it as recurring after the count exceeds one. The extractor’s `recurring` field is not what drives that counter today.

## A memory store you can inspect

The frontend does not hide memory behind a prompt. `MemoryPanel.jsx` shows whether recall is searching, found, empty, or unavailable, and displays the problem, solution, outcome, source, and memory text for results. The Memory Inspector in `client/src/pages/MemoryPage.jsx` lists a customer’s retained memories, lets me submit an arbitrary recall query and inspect returned scores, and supports manually retaining a confirmed problem and solution.

That visibility is practical, not just a demo flourish. If the agent says it remembers a payment issue, I can inspect which record came back. If a password query returns payment context, I have a concrete retrieval result to investigate. The inspector is also a reminder that memory is data with behavior: it deserves the same debugging affordances as any other dependency.

## The local Hindsight-compatible server

For local development, `server/services/localHindsightServer.js` starts an Express service on port 8888. It implements the REST endpoints this project uses for bank creation, retain, recall, listing memories, and version checks. The official `@vectorize-io/hindsight-client` still makes HTTP requests to that service; SupportBrain does not swap in a different client for local mode.

There is an important caveat in the word “compatible.” This repository’s local implementation stores banks and memories in its own SQLite tables and ranks recall candidates using token overlap plus hand-written topic associations for payment, login, shipping, and refunds. It applies a relevance floor, sorts the results, and returns at most five. That is a small local retrieval approximation for development and repeatable examples. It is not the full Hindsight engine, and it should not be described as equivalent semantic or vector retrieval. For a real Hindsight deployment, the environment can point the client at a configured Hindsight endpoint and API key instead.

The project’s Hindsight integration is built on the [Hindsight GitHub repository](https://github.com/vectorize-io/hindsight), the [Hindsight documentation](https://hindsight.vectorize.io/), and Vectorize’s overview of [agent memory](https://vectorize.io/what-is-agent-memory).

## What I learned, and what I’d change

1. **A transcript is not a memory policy.** I had to decide what is useful enough to retain, how it should be represented, and which customer it belongs to. Keeping those decisions explicit makes the behavior easier to inspect.
2. **Retrieval quality depends on the backend.** The local topic scorer is intentionally limited. Passing its tests shows that the covered examples work; it does not establish broad relevance quality. I would add evaluations with paraphrases, ambiguous queries, and deliberately similar-but-wrong memories, then run them against the actual Hindsight deployment too.
3. **Extraction is only as grounded as its input.** The current extraction request uses the customer’s latest message and the agent response. Although the method accepts `recentMessages`, it does not include them in the extraction prompt. I would use the relevant conversation turns and require clear evidence before marking an outcome successful. The heuristic fallback is intentionally narrow and can misclassify a message based on keywords.
4. **I need to tighten the prompt boundary.** The incoming message is stored before `MemoryService` loads conversation history, and the AI service also appends that message separately. That means the latest customer message can appear twice in the prompt. I would exclude the current turn from the history slice or stop appending it a second time, then add a focused test for the exact prompt messages.
5. **Namespacing is not tenant security.** Separate banks help keep retrieved memories scoped, but I would add request-level authorization, test bank-ID normalization for collisions, and make bank-creation errors distinguish “already exists” from real failures. `ensureBank` currently treats any create error as if the bank were already acceptable, which can hide a genuine setup problem until a later operation. I would also isolate tests with temporary database paths: the current suite clears the local Hindsight memory table and reseeds the application database, which is too destructive for routine runs against developer data.

That is the current shape of SupportBrain: recent chat remains ordinary application history; durable, customer-scoped facts live in Hindsight; and the model only receives memories that the recall step returns. It is not a magic “the AI remembers everything” switch. It is a pipeline with explicit boundaries, inspectable records, and a few very clear next steps. The useful part is that when Hari says “again,” the system has a place to look before it answers.