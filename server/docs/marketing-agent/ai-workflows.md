# AI Workflow Specification

## Overview

The current system uses `AI Stage A` and `AI Stage B`. The canonical architecture should use named AI workflows with explicit contracts, structured output validation, and versioned prompts.

## Workflow List

### 1. Business Analysis

**Purpose**:
- convert onboarding answers and brand documents into structured brand understanding

**Inputs**:
- onboarding transcript
- website summary
- uploaded notes or product docs

**Outputs**:
- business summary
- target audience segments
- value propositions
- objections and pain points
- tone and positioning
- content pillar candidates

### 2. Strategy Generation

**Purpose**:
- create a 30-day marketing strategy for a brand

**Inputs**:
- brand profile
- business goals
- active channels
- preferred posting frequency

**Outputs**:
- strategy objective
- weekly themes
- channel cadence
- funnel mapping
- slot suggestions

### 3. Brief Generation

**Purpose**:
- generate a concise brief for one planned slot

**Inputs**:
- strategy slot
- content pillar
- recent content history
- audience and tone data

**Outputs**:
- content idea title
- angle
- objective
- CTA
- asset direction

### 4. Post Generation

**Purpose**:
- generate channel-native drafts for one brief

**Inputs**:
- approved brief
- platform rules
- brand voice
- recent published history to avoid repetition

**Outputs**:
- hook
- body
- CTA
- hashtags or keyword hints
- variant metadata

### 5. Quality Review

**Purpose**:
- evaluate generated content before it enters review queue

**Checks**:
- repetitive wording
- unsupported claims
- tone mismatch
- platform mismatch
- weak CTA

**Outputs**:
- pass or fail
- revision reasons
- confidence score

### 6. Optimization Recommendation

**Purpose**:
- suggest strategy and content improvements from performance data

**Inputs**:
- post metrics
- approval patterns
- rejected topics
- channel engagement trends

**Outputs**:
- increase or reduce pillar usage
- preferred post format suggestions
- time slot recommendations
- experiment ideas

## Prompting Principles

- use structured JSON outputs where possible
- keep prompts separated by workflow
- version prompts explicitly
- include current business state, not raw transcript dumps only
- apply platform-specific constraints before generation

## Context Hierarchy

Each generation should use a bounded context bundle:

1. workspace and brand metadata
2. normalized brand profile
3. active strategy
4. recent approved and published content
5. platform rules
6. current generation target

## Validation Requirements

Every workflow should validate:
- required fields exist
- field length constraints
- enum values
- platform compatibility
- no empty or placeholder outputs

## Storage Requirements

Store for every AI run:
- workflow name
- model
- prompt version
- prompt token count
- completion token count
- output snapshot
- status
- trace linkage

## Fallback Rules

### If AI generation fails
- mark workflow run as failed
- keep upstream entity in retryable state
- expose failure reason for internal operators

### If quality review fails
- either auto-regenerate once or move to manual review state

### If analytics are missing
- continue strategy generation with historical internal data only

## Recommended Model Policy

### Lower-cost models
- business analysis summarization
- slot and brief generation
- quality review

### Higher-quality models
- strategy generation
- final post generation
- optimization recommendation

## Prompt Versioning

Store prompt versions in settings or code constants:
- `marketing.business_analysis.v1`
- `marketing.strategy_generation.v1`
- `marketing.brief_generation.v1`
- `marketing.post_generation.v1`
- `marketing.quality_review.v1`

## Safety Guidelines

- avoid unverifiable claims about product performance
- avoid regulated advice unless explicitly supported
- avoid repetitive spam patterns
- allow tenant-specific banned terms and compliance rules
