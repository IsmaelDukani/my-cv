# CV Parser - AI Integration Setup

## Overview
The CV Parser now includes AI-powered parsing using Google Gemini API with automatic fallback to manual parsing.

## Features
✅ **Multi-Format Support**: PDF, DOCX, and TXT files
✅ **AI-Powered Parsing**: Uses Google Gemini 1.5 Flash for accurate data extraction
✅ **Automatic Fallback**: Falls back to regex-based parsing if AI is unavailable
✅ **Robust Error Handling**: Comprehensive error handling at every level
✅ **Data Normalization**: Ensures all CV data is properly structured

## Setup Instructions

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add API Key to Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# Option 1: Gemini-specific naming
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here

# Option 2: Google AI Studio naming
GOOGLE_AI_API_KEY=your_api_key_here

# Option 3: Server-side naming
GEMINI_API_KEY=your_api_key_here
```

**Note:** The parser checks for API keys in this order:
1. `NEXT_PUBLIC_GEMINI_API_KEY`
2. `GEMINI_API_KEY`
3. `NEXT_PUBLIC_GOOGLE_AI_API_KEY`
4. `GOOGLE_AI_API_KEY`

### 3. Restart Development Server

```bash
npm run dev
```

## How It Works

### AI Parsing (Primary)
When a Gemini API key is available:
1. Text is extracted from the uploaded file (PDF/DOCX/TXT)
2. Text is sent to Gemini API with structured prompt
3. AI returns JSON-formatted CV data
4. Data is normalized and validated

### Manual Parsing (Fallback)
When AI parsing fails or API key is missing:
1. Uses regex patterns to detect CV sections
2. Extracts personal info, experience, education, skills, and languages
3. Returns structured CV data

## API Usage

The parser automatically handles both AI and manual parsing:

```typescript
import { parsePdf } from '@/utils/cvParser';

// Works with PDF, DOCX, and TXT files
const cvData = await parsePdf(file);
```

## Supported File Types

- **PDF** (`.pdf`) - Recommended
- **DOCX** (`.docx`) - Microsoft Word documents
- **TXT** (`.txt`) - Plain text files

## Error Handling

The parser includes comprehensive error handling:
- Invalid file types return error message
- Parsing failures fall back to manual parsing
- Empty or corrupted files return default CV structure
- All errors are logged to console for debugging

## Benefits of AI Parsing

- **Higher Accuracy**: Better understanding of CV structure and context
- **Flexible Formats**: Handles various CV layouts and formats
- **Smart Extraction**: Understands implicit information (e.g., "Present" for current jobs)
- **Language Support**: Works with CVs in different languages
- **Field Detection**: Automatically identifies and categorizes information

## Cost Considerations

- Gemini API offers a generous free tier
- Average CV parsing uses ~2,000 tokens
- Free tier: 15 requests per minute, 1500 requests per day
- Check [pricing details](https://ai.google.dev/pricing) for your usage

## Fallback Behavior

If AI parsing fails, the system automatically falls back to manual parsing:
1. API key missing → Manual parsing
2. API request fails → Manual parsing  
3. Invalid API response → Manual parsing
4. JSON parsing error → Manual parsing

This ensures **100% uptime** regardless of API availability.
