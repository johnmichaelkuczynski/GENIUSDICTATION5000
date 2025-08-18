# Genius Dictation - Project Overview

## Project Description
Advanced AI-powered text and mathematical content processing platform that enables intelligent, multi-modal content transformation with specialized cross-platform support.

## Key Features
- Multi-modal Input Processing: Voice, text, document, mathematical notation support
- Intelligent Transformation Modes: Advanced text cleaning and formatting capabilities
- Real-time Chunk Processing: Immediate streaming of transformed content
- Cross-Platform Compatibility: Enhanced mobile and web experience
- AI Services: Multiple AI provider integrations (OpenAI, Anthropic, Perplexity)
- Advanced OCR with intelligent text formatting
- Math graphing capabilities with SVG visualization

## Recent Changes
- 2025-08-17: COMPLETED - Implemented intelligence evaluation protocol with exact four-phase process
- 2025-08-17: COMPLETED - Added originality evaluation using specified question sets
- 2025-08-17: COMPLETED - Created /api/evaluate-intelligence and /api/evaluate-originality endpoints
- 2025-08-17: COMPLETED - Followed precise instructions: never tell LLM to "evaluate intelligence"
- 2025-08-17: COMPLETED - Added complete Intelligence Analysis Tool UI at bottom of app
- 2025-08-17: COMPLETED - Added DeepSeek and Perplexity to AI provider options with DeepSeek as default
- 2025-08-17: COMPLETED - UI matches uploaded design with document upload, provider selection, and analysis buttons
- 2025-08-17: COMPLETED - Replaced transformation logic with Genius Rewrite Engine system
- 2025-08-17: COMPLETED - Eliminated banned phrases: "in the realm of," "has undergone a transformation," etc.
- 2025-08-17: COMPLETED - Implemented direct, signal-maximizing writing approach across all AI providers
- 2025-08-17: COMPLETED - Replaced terrible puffery-filled transformation logic with Genius Rewrite Engine system
- 2025-08-17: COMPLETED - Eliminated banned phrases: "in the realm of," "has undergone a transformation," etc.
- 2025-08-17: COMPLETED - Implemented direct, signal-maximizing writing approach across all AI providers
- 2025-08-17: COMPLETED - Fixed TTS "Failed to fetch voices" error by resolving Azure Speech API format mismatch
- 2025-08-17: COMPLETED - Added ElevenLabsVoice interface and transformed Azure voices for frontend compatibility
- 2025-08-17: COMPLETED - All core features now operational: text transformation, GPT Bypass, and TTS voices
- 2025-08-16: COMPLETED - GPT Bypass functionality fixed with correct style transfer logic
- 2025-08-16: COMPLETED - Replaced complex prompts with simple "rewrite in style of Box B" instruction
- 2025-08-16: COMPLETED - Removed all preset/humanization filters that were blocking success
- 2025-08-16: COMPLETED - AI scores now drop from 100% to 1% (successfully bypassing detection)
- 2025-06-18: COMPLETED - Dual-document graph system working perfectly with radioactive decay detection
- 2025-06-18: COMPLETED - GraphDisplayPanel shows graphs above text, extraction working with 101-point curves
- 2025-06-18: COMPLETED - Browser-based Print/Save PDF function with optimized formatting
- 2025-06-18: COMPLETED - Mathematical graph generation with proper SVG curve rendering
- 2025-06-18: COMPLETED - LaTeX math notation display in app interface and PDF downloads
- 2025-06-18: COMPLETED - Enhanced PDF generation with embedded SVG graphs and readable math notation
- 2025-06-18: COMPLETED - Mathematical expression parsing and evaluation for accurate graphing
- 2025-06-18: COMPLETED - Voice dictation for custom instructions - essential mobile feature
- 2025-06-18: COMPLETED - OCR with AI-powered extraction for superior accuracy

## Current Issues
- None - all major features working correctly including GPT Bypass, main transformation, and TTS voices

## User Preferences
- Focus on clean, readable text extraction without markup or code
- Mobile-first approach for voice dictation features
- SVG-based visualizations for mathematical content with proper curve rendering
- Professional, academic writing style for transformations
- LaTeX math notation must display correctly in both app interface and PDF downloads
- Print/Save PDF functionality for immediate document generation

## Architecture
- Frontend: React with TypeScript, Tailwind CSS, shadcn/ui components
- Backend: Express server with AI service integrations
- Real-time processing with chunk management for large texts
- Multi-provider AI support (OpenAI, Anthropic, Perplexity)
- Enhanced OCR pipeline with AI prioritization over Tesseract