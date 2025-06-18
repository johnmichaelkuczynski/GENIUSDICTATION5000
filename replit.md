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
- 2025-06-18: Added math graphing functionality with SVG-based visualization
- 2025-06-18: Integrated MathGraphViewer component into main tabs interface
- 2025-06-18: Fixed voice dictation for custom instructions - essential mobile feature
- 2025-06-18: Enhanced OCR with AI-powered extraction for superior accuracy
- 2025-06-18: Implemented file upload with drag-and-drop support

## Current Issues
- Math graph not displaying properly - investigating SVG rendering and console errors
- Need to debug expression evaluation and point generation

## User Preferences
- Focus on clean, readable text extraction without markup or code
- Mobile-first approach for voice dictation features
- SVG-based visualizations for mathematical content
- Professional, academic writing style for transformations

## Architecture
- Frontend: React with TypeScript, Tailwind CSS, shadcn/ui components
- Backend: Express server with AI service integrations
- Real-time processing with chunk management for large texts
- Multi-provider AI support (OpenAI, Anthropic, Perplexity)
- Enhanced OCR pipeline with AI prioritization over Tesseract