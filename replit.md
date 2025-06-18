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
- None - all major features working correctly

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