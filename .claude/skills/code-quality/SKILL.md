---
name: check-code-quality
description: >
  Evaluate and enforce code quality based on five core principles: KISS (Keep It Simple, Stupid),
  YAGNI (You Aren't Gonna Need It), DRY (Don't Repeat Yourself), "best code is no code",
  efficiency/optimization awareness, and security mindfulness.

  Use this skill in TWO situations:
  1. **After generating code** — automatically self-review before delivering it to the user.
  2. **When the user asks for a code review** — e.g. "review my code", "check this", "is this clean?", "any issues?", "can you improve this?", "audit this code".

  Always trigger this skill when any non-trivial block of code is involved, even if the user doesn't explicitly ask for a review. If you just wrote more than ~15 lines of code, run this skill on it before presenting it.
---

# check-code-quality

Language-agnostic code quality checker. Evaluates code against five principles and returns a **score + short summary**.

---

## The Five Principles

### 1. KISS — Keep It Simple, Stupid
- Is the logic as straightforward as it could be?
- Are there unnecessary abstractions, indirection, or clever tricks that obscure intent?
- Would a junior dev understand this in under a minute?

### 2. YAGNI — You Aren't Gonna Need It
- Is any code written "just in case" without a current requirement?
- Are there unused parameters, over-engineered options, premature generalization?
- Does every piece of code serve an immediate, concrete purpose?

### 3. DRY — Don't Repeat Yourself
- Is logic duplicated across functions, files, or components?
- Are there magic values or strings that should be constants?
- Could repeated patterns be unified without over-abstracting (watch for DRY violations that create KISS violations)?

### 4. Best Code Is No Code At All
- Does this code solve a problem that could be avoided entirely?
- Could a native API, built-in method, or existing library handle this?
- Is there dead code, commented-out blocks, or no-op operations?

### 5. Efficiency & Security
**Efficiency:**
- Are there obvious performance issues? (unnecessary loops, redundant computations, unneeded network calls, memory leaks)
- Is the data structure appropriate for the access patterns?

**Security:**
- Are user inputs validated/sanitized?
- Are secrets or sensitive values hardcoded?
- Are there obvious injection vectors, unsafe deserialization, or insecure defaults?
- Is error handling leaking internal information?

---

## Output Format

Always produce a **score block** followed by a **short summary**. Keep it tight — no long essays.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CODE QUALITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 KISS        ██████████  10/10
 YAGNI       ████████░░   8/10
 DRY         ██████░░░░   6/10
 No-code     █████████░   9/10
 Efficiency  ███████░░░   7/10
 Security    ████████░░   8/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OVERALL     ████████░░   8/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Strengths
- [1–3 bullet points max]

⚠️ Issues
- [Only flag real problems, not nitpicks. Max 3 bullets.]

💡 Quick wins
- [Concrete, actionable suggestions. Max 2 bullets.]
```

**Scoring guide:**
- 9–10: Excellent, ship it
- 7–8: Good, minor improvements possible
- 5–6: Acceptable, but notable issues worth fixing
- 3–4: Needs rework before merging
- 1–2: Significant problems, recommend rewrite

**Tone rules:**
- Be direct, not diplomatic. "This is duplicated." not "You might consider..."
- Only list issues that actually matter. Don't pad with nitpicks.
- If the code is genuinely good, say so — don't invent problems.
- If reviewing AI-generated code (i.e. code Claude just wrote), be especially honest about YAGNI and over-engineering traps.

---

## Triggering Behavior

### When Claude just generated code
After writing a non-trivial block of code (>~15 lines), silently apply this skill and append the score block below the code. No need to announce you're doing a review — just include it naturally.

### When user requests a review
Apply this skill to the user's code. If the code is spread across multiple files or snippets, evaluate holistically rather than file-by-file.

---

## Edge Cases

- **Very short code (<10 lines):** Skip the full scorecard. Just add a one-liner note if something is off.
- **Boilerplate / generated code (e.g. migrations, scaffolding):** Lower the bar on KISS/YAGNI — this code isn't meant to be handcrafted. Focus on security and DRY.
- **WIP / prototype code:** Note it's a prototype; flag only security issues as blocking, treat others as advisory.
- **Multiple files:** Give one overall score, not per-file scores. Note the worst offenders by filename.