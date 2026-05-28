# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**

- Basically just SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**

- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. E.g you don't try scraping websites yourself—you read `directives/scrape_website.md` and come up with inputs/outputs and then run `execution/scrape_single_site.py`

**Layer 3: Execution (Doing the work)**

- Deterministic Python scripts in `execution/`
- Environment variables, api tokens, etc are stored in `.env`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Use scripts instead of manual work. Commented well.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution is push complexity into deterministic code. That way you just focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**

- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
- Update the directive with what you learned (API limits, timing, edge cases)
- Example: you hit an API rate limit → you then look into API → find a batch endpoint that would fix → rewrite script to accommodate → test → update directive.

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to. Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

**4. Use automation for mirrored docs and translations**
To maintain project consistency:

- **Mirrored Docs**: Always use `python3 execution/sync_docs.py --source <file>` after updating instructions in `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`.
- **Translations**: Always run `python3 execution/check_translations.py` after adding new UI strings to ensure parity between `en.json` and `vi.json`.

## Self-annealing loop

Errors are learning opportunities. When something breaks:

1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Deliverables vs Intermediates:**

- **Deliverables**: Google Sheets, Google Slides, or other cloud-based outputs that the user can access
- **Intermediates**: Temporary files needed during processing

**Directory structure:**

- `.tmp/` - All intermediate files (dossiers, scraped data, temp exports). Never commit, always regenerated.
- `execution/` - Python scripts (the deterministic tools)
- `directives/` - SOPs in Markdown (the instruction set)
- `.env` - Environment variables and API keys
- `credentials.json`, `token.json` - Google OAuth credentials (required files, in `.gitignore`)

**Key principle:** Local files are only for processing. Deliverables live in cloud services (Google Sheets, Slides, etc.) where the user can access them. Everything in `.tmp/` can be deleted and regenerated.

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.

---

# Gigglegram Project Onboarding

Welcome to the **Gigglegram** project. As an autonomous AI agent assisting in this repository, you must familiarize yourself with the architectural decisions, constraints, and pipelines outlined in this document before taking action.

## 1. Project Context

- **Name:** Gigglegram
- **Type:** Graduation Project (Multimedia Social Network)
- **Core Goal:** High-performance video and image sharing with real-time interactions.

**Vision:** Gigglegram is a feature-rich, multimedia social networking platform (an Instagram clone workflow) currently being developed as a graduation project. The platform focuses on seamless sharing of multimedia content with a highly refined user experience, prioritizing mobile interfaces and efficient media delivery.

## 2. Tech Stack & Standards

- **Backend**: NestJS operating in a microservices architecture.
- **Database**: PostgreSQL with Drizzle ORM mapping.
- **Frontend**: Next.js App Router, styled with Tailwind CSS, utilizing `shadcn/ui` for modular component design.
- **Infrastructure**: Google Kubernetes Engine (GKE) for orchestration, leveraging Kafka and Redis for inter-service communication and caching.
- **Cloud Services**: Google Cloud Storage (for media object storage) and Google Cloud Run Functions (for event-driven execution based on object creation/deletion).
- **Media Processing**: Google Cloud Transcoder API is utilized to transcode videos into HLS formats (expanding upon local FFmpeg processes).

## 3. Core Architecture

The backend is structured as a suite of decoupled microservices. These services communicate asynchronously (often leveraging brokers like Kafka and Redis). The notification system, in particular, relies on this event-driven architecture to instantly broadcast post updates, likes, and interactions across the network without blocking the core execution threads.

## 4. Data Patterns

- **Drizzle ORM**: Used extensively for strict typing and explicit relationship mapping across tables.
- **PostgreSQL Patterns**: The project implements structured SQL patterns optimized for social network relationship mapping (e.g., following/followers, interactions, and media metadata indexing). Always respect existing schema relationships and serialization formats (e.g., handling boolean conversions accurately over `FormData` transports).
- **Type Safety**: Always generate code with strict type safety. Never use `any` as a type annotation. Use explicit types, interfaces, or type utilities to define the shape of your data. If a type is unknown, use `unknown` and perform necessary type guards.

## 5. Development Workflow

Because the infrastructure relies on a **Google Cloud Free Trial environment**, resources are strictly monitored.

- **Local Development**: Remote services in GKE (like Kafka `9092` and Redis `6379`) are often port-forwarded to the local machine so the NestJS `dev` environment can interface properly without spinning up heavy local containers.
- **Deployments**: CI/CD pipelines automate deployment targeting GKE. Check the Kubernetes manifests and GitHub Actions before making broad infrastructural changes.

## 6. Key Constraints

- **UI/UX**: The application strictly demands a **mobile-first UI**. All components generated must be fully responsive, mirroring modern mobile social application patterns (e.g., Instagram-like UI). All media (images and videos) must always be displayed in a **3:4 aspect ratio**. Always use the Next.js built-in `Image` component for rendering images to ensure optimal performance, lazy loading, and layout stability.
- **Design System Adherence**: All UI components must strictly utilize the styling tokens and utilities defined in `apps/web/app/globals.css`. This includes using OKLCH color variables (e.g., `primary`, `secondary`), font variables (`--font-sans`), shadow tokens, and custom utilities (e.g., `bg-grid-fade`) to ensure visual consistency and a premium feel.
- **Styling Guidelines**: Always check for and use **shadcn/ui built-in components** whenever possible to avoid reinventing the wheel. Always use semantic brand styles (CSS variables) from `globals.css` (e.g., `text-foreground` instead of `text-white`). Avoid hardcoded color utilities. Always style UI as close to the `shadcn/ui` aesthetic as possible. Maintain consistent visual tokens and avoid custom ad-hoc designs. For all image assets, always prefer the `Next.js Image` component over the standard `<img>` tag.
- **React State & Data Fetching**: Avoid using `useEffect` as much as possible for data fetching or complex state synchronization. Since this is Next.js 16.1, prioritize fetching data in Server Components and passing it down to Client Components whenever sufficient. When client-side fetching is necessary, use modern abstractions like **TanStack Query** for server state. When prefetching data on the server with TanStack Query, use the **HydrationBoundary** and `dehydrate` pattern to pass state to the client.
- **Video Delivery**: All video content must be processed into **HLS streaming formats** to ensure minimal latency and adaptive bitrate delivery on varied network connections. Efficient processing (compression, resizing) during the upload pipeline is mandatory.
- **Loading Skeletons**: Always use loading skeletons for page components during data-fetching states to enhance perceived performance and minimize layout shift. Skeletons should accurately mirror the layout of the final content.
- **Error Handling**: Always propagate errors to the Next.js built-in `error.js` mechanism. Do not handle error states locally within page components (e.g., by returning custom error fragments based on an `error` flag). If data is missing, use the `notFound()` function from `next/navigation`. This ensures consistent error recovery and global error reporting across the application.

## 7. Current Objectives

When jumping into tasks, be aware that our immediate focus revolves around:

- **Refining the Video Pipeline**: Addressing `.ffmpeg` stream processing, fixing byte-size loss during transformations, and optimizing video resizing performance (cutting down times from ~20 seconds to be much faster).
- **UI Components & Workflows**: Enhancing the Image Editor performance (removing Canvas filter application lag) and styling the Video Frame Picker to mirror established Instagram clone UX mechanics.
- **Data Serialization**: Ensuring accurate typed data boundaries between the Next.js `FormData` submissions and NestJS microservice validation pipes (especially fixing boolean and JSON string parsing bugs on Post Creation).

## 8. API & Network Routing Guidelines

- **Frontend Axios Calls**: The Next.js frontend uses a powerful `rewrites` layer in `next.config.js`. Do not hardcode external API router URLs in Axios. Always use relative paths starting with `/api` (e.g., `axiosGateway.get('/api/posts/feed')`). Next.js naturally intercepts `/api/*` and forwards it securely to the `API_GATEWAY_URL`.
- **Static Media Delivery**: Avoid compiling full Google Cloud Storage URLs in components manually. Use the local path structures `/video/*` and `/images/*`. Next.js handles `.m3u8`, `.mp4`, and image delivery by rewriting those to `STATIC_VIDEO_ASSETS_URL` and `STATIC_IMAGE_ASSETS_URL` respectively, solving CORS barriers efficiently.
- **Gateway Proxy Mapping**: The backend API Gateway (`apps/api-gateway`) relies on NestJS `MiddlewareConsumer` mappings to proxy inbound HTTP traffic directly to decouple microservices. Standard endpoints currently intercepted include `/auth`, `/posts`, `/feed`, `/users`, `/settings`, and `/real-time`. When drafting new services, assure they are correctly injected into the gateway with `AuthProtectMiddleware` to enforce security.

## 9. Import Standards

- **Path Aliases**: Always use the `@` alias for all internal imports within the `apps/web` directory (e.g., use `@/components/...` instead of `../../components/...` or `./`). This ensures consistency, improves readability, and makes refactoring easier across the codebase.
