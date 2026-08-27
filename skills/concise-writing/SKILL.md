---
name: concise-writing
description: Write or revise non-trivial documents for concise, precise, readable, and logically structured communication. Use when drafting or editing reports, design docs, READMEs, proposals, or other substantive prose.
---

# Concise Writing

## Plan

- Define the document's purpose, audience, and essential questions before drafting.
- Ask the user focused questions when missing context would materially affect the purpose, audience, scope, or content; otherwise proceed with reasonable assumptions.
- Triage material: keep essential information in the main text, move useful but nonessential detail to an appendix, and remove material with no reader value.
- Organize for the reader by concepts, questions, or claims—not discovery or source order. Give each section one clear role; merge overlap and keep sibling sections at comparable abstraction levels.
- Keep semantic section depth to two levels. A single global `#` title does not count: when it is only the title, `##` and `###` are allowed; discourage `####` and deeper. Without a global title, avoid a third semantic level.
- For a long or complex document, prefer a compact table of contents when it materially improves navigation.

## Write

- Be concise and precise. State each point once; remove filler, repetition, obvious transitions, and meta-commentary without losing necessary evidence, caveats, or distinctions.
- Prefer field-standard terminology. Do not invent terms, labels, acronyms, or taxonomies when established language works; define any genuinely necessary new term before use.
- Make the document read naturally from top to bottom: introduce prerequisites before dependent ideas and do not assume unexplained concepts.
- Use Markdown actively. Choose bullets and nested bullets for parallel, hierarchical, grouped, or scannable information; use connected prose for reasoning or narrative, with short paper-style run-in labels such as `**Evaluation.**` when helpful.
- Use tables for repeated-field comparisons and figures when they make important relationships materially clearer. Do not force prose into bullets or add structure the content does not need.

## Review

- Check the main-text/appendix/remove triage, concision and precision, terminology, logical flow, section quality and depth, navigation, and choice of prose, Markdown, tables, or figures.
- For every non-trivial document, spawn a separate reviewer subagent. Give it the document and this skill, and require exactly one outcome: `ACCEPT`, or a concrete list of material violations tied to these rules. The reviewer must not rewrite the document or reject on subjective preference.
- If violations are returned, revise the document and send it back to the reviewer. Repeat until it returns `ACCEPT`; do not present the document as complete before acceptance.
