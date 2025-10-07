#!/usr/bin/env python3
"""
Dynamic locale translation script using OpenAI's structured outputs.
Detects missing/empty translations and fills them using English as source of truth.
"""

import json
import os
import sys
import re
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Optional, Tuple, Any
from dataclasses import dataclass, field
from collections import defaultdict
import shutil
from enum import Enum

from pydantic import BaseModel, Field, field_validator
from openai import OpenAI
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
LOCALES_DIR = Path("public/locales")
ENGLISH_LOCALE = "en"
DEFAULT_BATCH_SIZE = 20
DEFAULT_MODEL = "gpt-4o-mini"

# Language mapping for OpenAI
LANGUAGE_NAMES = {
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese (Simplified)',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'it': 'Italian',
    'ko': 'Korean',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'uk': 'Ukrainian',
    'cs': 'Czech',
    'sv': 'Swedish',
    'ro': 'Romanian',
    'he': 'Hebrew',
    'id': 'Indonesian',
    'fa': 'Persian/Farsi',
    'bn': 'Bengali',
    'ca': 'Catalan',
    'fi': 'Finnish',
    'am': 'Amharic',
    'my': 'Burmese',
    'si': 'Sinhala',
    'sw': 'Swahili',
    'te': 'Telugu',
    'ur': 'Urdu'
}

# ============================================================================
# Pydantic Models for Structured Outputs
# ============================================================================

class TranslationItem(BaseModel):
    """Single translation item with validation."""
    key: str = Field(description="The original key from the JSON file")
    original_english: str = Field(description="The original English text")
    translated_text: str = Field(description="The translated text in target language")
    confidence: float = Field(ge=0.0, le=1.0, description="Translation confidence score")
    notes: Optional[str] = Field(default=None, description="Any notes or warnings about the translation")
    
    @field_validator('translated_text')
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        if not v or v.strip() == "":
            raise ValueError("Translated text cannot be empty")
        return v

class TranslationBatch(BaseModel):
    """Batch of translations for a specific locale and file."""
    locale: str = Field(description="Target locale code")
    file_name: str = Field(description="Name of the JSON file being translated")
    translations: List[TranslationItem] = Field(description="List of translation items")
    
class SimpleTranslationItem(BaseModel):
    """Individual translation item for API response."""
    key: str = Field(description="The key to translate")
    translation: str = Field(description="The translated text")

class TranslationResponse(BaseModel):
    """Response model for OpenAI structured output."""
    translations: List[SimpleTranslationItem] = Field(
        description="List of translated key-value pairs"
    )

# ============================================================================
# Translation Task Management
# ============================================================================

@dataclass
class TranslationTask:
    """Represents a single translation task."""
    locale: str
    file_name: str
    key: str
    english_value: str
    is_missing: bool  # True if key is missing, False if just empty

@dataclass
class ValidationResult:
    """Results from translation validation."""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

# ============================================================================
# Locale Analyzer
# ============================================================================

class LocaleAnalyzer:
    """Analyzes locale files to detect missing and empty translations."""
    
    def __init__(self, locales_dir: Path = LOCALES_DIR):
        self.locales_dir = locales_dir
        self.english_data: Dict[str, Dict[str, str]] = {}
        self._load_english_reference()
    
    def _load_english_reference(self) -> None:
        """Load all English locale files as reference."""
        english_dir = self.locales_dir / ENGLISH_LOCALE
        if not english_dir.exists():
            raise FileNotFoundError(f"English locale directory not found: {english_dir}")
        
        for json_file in english_dir.glob("*.json"):
            # Skip terms.json as it contains legal terms with limited translations
            if json_file.name == 'terms.json':
                continue
            with open(json_file, 'r', encoding='utf-8') as f:
                self.english_data[json_file.name] = json.load(f)
        
        logger.info(f"Loaded {len(self.english_data)} English reference files")
    
    def get_available_locales(self) -> List[str]:
        """Get list of available locale directories."""
        locales = []
        for item in self.locales_dir.iterdir():
            if item.is_dir() and item.name != ENGLISH_LOCALE:
                locales.append(item.name)
        return sorted(locales)
    
    def analyze_locale(self, locale: str) -> List[TranslationTask]:
        """Analyze a single locale for missing/empty translations."""
        tasks = []
        locale_dir = self.locales_dir / locale
        
        if not locale_dir.exists():
            logger.warning(f"Locale directory not found: {locale_dir}")
            return tasks
        
        # Check each English file
        for file_name, english_data in self.english_data.items():
            locale_file = locale_dir / file_name
            
            if not locale_file.exists():
                # All keys are missing if file doesn't exist
                for key, value in english_data.items():
                    tasks.append(TranslationTask(
                        locale=locale,
                        file_name=file_name,
                        key=key,
                        english_value=value,
                        is_missing=True
                    ))
            else:
                # Load locale file and check for missing/empty keys
                with open(locale_file, 'r', encoding='utf-8') as f:
                    locale_data = json.load(f)
                
                for key, value in english_data.items():
                    if key not in locale_data:
                        tasks.append(TranslationTask(
                            locale=locale,
                            file_name=file_name,
                            key=key,
                            english_value=value,
                            is_missing=True
                        ))
                    elif locale_data[key] == "":
                        tasks.append(TranslationTask(
                            locale=locale,
                            file_name=file_name,
                            key=key,
                            english_value=value,
                            is_missing=False
                        ))
        
        return tasks
    
    def generate_translation_tasks(self, locales: Optional[List[str]] = None) -> Dict[str, List[TranslationTask]]:
        """Generate translation tasks for specified locales."""
        if locales is None:
            locales = self.get_available_locales()
        
        all_tasks = {}
        for locale in locales:
            tasks = self.analyze_locale(locale)
            if tasks:
                all_tasks[locale] = tasks
                logger.info(f"Found {len(tasks)} translation tasks for {locale}")
        
        return all_tasks

# ============================================================================
# Translation Validator
# ============================================================================

class TranslationValidator:
    """Validates translated content for quality and correctness."""
    
    def validate_placeholders(self, original: str, translated: str) -> ValidationResult:
        """Ensure placeholders like {{variable}} are preserved."""
        result = ValidationResult(is_valid=True)
        
        # Find all placeholders in original
        original_placeholders = re.findall(r'\{\{[^}]+\}\}', original)
        translated_placeholders = re.findall(r'\{\{[^}]+\}\}', translated)
        
        # Check if all original placeholders exist in translation
        for placeholder in original_placeholders:
            if placeholder not in translated_placeholders:
                result.is_valid = False
                result.errors.append(f"Missing placeholder {placeholder} in translation")
        
        # Warn about extra placeholders
        for placeholder in translated_placeholders:
            if placeholder not in original_placeholders:
                result.warnings.append(f"Extra placeholder {placeholder} in translation")
        
        return result
    
    def validate_length(self, original: str, translated: str, tolerance: float = 3.0) -> ValidationResult:
        """Check if translation length is reasonable compared to original."""
        result = ValidationResult(is_valid=True)
        
        if len(original) == 0:
            return result
        
        ratio = len(translated) / len(original)
        
        # Very short translations might be acronyms or abbreviations
        if len(original) <= 5:
            tolerance = 5.0
        
        if ratio < 1/tolerance or ratio > tolerance:
            result.warnings.append(
                f"Translation length ratio {ratio:.2f} may be unusual "
                f"(original: {len(original)} chars, translated: {len(translated)} chars)"
            )
        
        return result
    
    def validate_no_english_remnants(self, original: str, translated: str, locale: str) -> ValidationResult:
        """Detect if English text remains in non-English translation."""
        result = ValidationResult(is_valid=True)
        
        # Skip validation for certain technical terms
        technical_terms = {'API', 'URL', 'JSON', 'HTML', 'HTTP', 'HTTPS', 'ID', 'UI', 'OpenAI', 'ChatGPT'}
        
        # For non-Latin scripts, check if translation still contains significant Latin characters
        non_latin_scripts = ['zh', 'ja', 'ko', 'ar', 'he', 'hi', 'th', 'my', 'si', 'bn', 'te', 'ur', 'am', 'fa']
        
        if locale in non_latin_scripts:
            # Remove technical terms and placeholders
            check_text = translated
            for term in technical_terms:
                check_text = check_text.replace(term, '')
            check_text = re.sub(r'\{\{[^}]+\}\}', '', check_text)
            
            # Count Latin characters
            latin_chars = len(re.findall(r'[a-zA-Z]', check_text))
            total_chars = len(re.sub(r'\s', '', check_text))
            
            if total_chars > 0 and latin_chars / total_chars > 0.3:
                result.warnings.append(
                    f"Translation may contain untranslated English text "
                    f"({latin_chars}/{total_chars} Latin characters)"
                )
        
        return result
    
    def validate_translation(self, task: TranslationTask, translated: str) -> ValidationResult:
        """Perform all validations on a translation."""
        results = []
        
        # Run all validators
        results.append(self.validate_placeholders(task.english_value, translated))
        results.append(self.validate_length(task.english_value, translated))
        results.append(self.validate_no_english_remnants(task.english_value, translated, task.locale))
        
        # Combine results
        combined = ValidationResult(is_valid=True)
        for result in results:
            if not result.is_valid:
                combined.is_valid = False
            combined.errors.extend(result.errors)
            combined.warnings.extend(result.warnings)
        
        return combined

# ============================================================================
# Translation Engine
# ============================================================================

class TranslationEngine:
    """Handles translation using OpenAI's API with structured outputs."""
    
    def __init__(self, api_key: str, model: str = DEFAULT_MODEL):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.validator = TranslationValidator()
        self.translation_cache: Dict[Tuple[str, str, str], str] = {}  # (locale, key, english) -> translation
    
    def translate_batch(self, tasks: List[TranslationTask], max_retries: int = 3) -> List[Tuple[TranslationTask, str, ValidationResult]]:
        """Translate a batch of tasks using structured outputs."""
        if not tasks:
            return []
        
        locale = tasks[0].locale
        file_name = tasks[0].file_name
        language_name = LANGUAGE_NAMES.get(locale, locale)
        
        # Check cache first
        results = []
        uncached_tasks = []
        
        for task in tasks:
            cache_key = (task.locale, task.key, task.english_value)
            if cache_key in self.translation_cache:
                translated = self.translation_cache[cache_key]
                validation = self.validator.validate_translation(task, translated)
                results.append((task, translated, validation))
            else:
                uncached_tasks.append(task)
        
        if not uncached_tasks:
            return results
        
        # Prepare the translation request
        items_to_translate = [
            {"key": task.key, "text": task.english_value}
            for task in uncached_tasks
        ]
        
        # Determine context based on file name
        context_map = {
            'chat.json': 'Chat interface labels and messages',
            'common.json': 'Common UI elements and general terms',
            'settings.json': 'Settings and configuration interface',
            'sidebar.json': 'Sidebar navigation elements',
            'promptbar.json': 'Prompt bar and search interface',
            'transcribeModal.json': 'Transcription modal dialog',
            'storage.json': 'Storage management interface',
            'terms.json': 'Terms of service and legal text',
            'markdown.json': 'Markdown editor interface',
            'agents.json': 'AI agent configuration interface'
        }
        context = context_map.get(file_name, 'User interface elements')
        
        system_prompt = f"""You are a professional translator specializing in software localization.
Translate the following English UI texts to {language_name}.

IMPORTANT RULES:
1. Preserve ALL placeholders exactly as they appear (e.g., {{{{name}}}}, {{{{count}}}})
2. Maintain the tone and style appropriate for a professional application
3. Use natural, idiomatic {language_name} expressions
4. For technical terms (API, URL, JSON, etc.), keep them as-is if commonly used in {language_name}
5. Ensure translations are culturally appropriate
6. Context: These are {context} for a chat application

Return a JSON array where each object has 'key' and 'translation' fields."""

        user_prompt = f"Translate these UI texts to {language_name}:\n{json.dumps(items_to_translate, indent=2)}"
        
        for attempt in range(max_retries):
            try:
                response = self.client.beta.chat.completions.parse(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format=TranslationResponse,
                    temperature=0.3,  # Lower temperature for more consistent translations
                )
                
                if response.choices[0].message.parsed:
                    translations = response.choices[0].message.parsed.translations
                    
                    # Process each translation
                    for task, trans_item in zip(uncached_tasks, translations):
                        translated = trans_item.translation
                        
                        # Validate the translation
                        validation = self.validator.validate_translation(task, translated)
                        
                        # If critical errors, retry with more context
                        if not validation.is_valid and attempt < max_retries - 1:
                            logger.warning(f"Translation validation failed for {task.key}: {validation.errors}")
                            time.sleep(1)  # Brief delay before retry
                            continue
                        
                        # Cache the translation
                        cache_key = (task.locale, task.key, task.english_value)
                        self.translation_cache[cache_key] = translated
                        
                        results.append((task, translated, validation))
                    
                    return results
                    
            except Exception as e:
                logger.error(f"Translation attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
        
        return results

# ============================================================================
# Safe File Updater
# ============================================================================

class SafeFileUpdater:
    """Safely updates locale files with new translations."""
    
    def __init__(self, backup_dir: Optional[Path] = None):
        self.backup_dir = backup_dir or Path("backups") / datetime.now().strftime("%Y%m%d_%H%M%S")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def backup_file(self, file_path: Path) -> Path:
        """Create a backup of the original file."""
        if not file_path.exists():
            return None
        
        # Convert to relative path from project root if it's absolute
        if file_path.is_absolute():
            try:
                rel_path = file_path.relative_to(Path.cwd())
            except ValueError:
                # If not relative to cwd, just use the path as-is
                rel_path = Path(*file_path.parts[-3:]) if len(file_path.parts) > 3 else file_path
        else:
            rel_path = file_path
            
        backup_path = self.backup_dir / rel_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        return backup_path
    
    def update_locale_file(self, locale: str, file_name: str, translations: Dict[str, str], dry_run: bool = False) -> bool:
        """Update a locale file with new translations."""
        file_path = LOCALES_DIR / locale / file_name
        
        # Load existing data or create new
        if file_path.exists():
            # Backup first
            if not dry_run:
                backup_path = self.backup_file(file_path)
                logger.debug(f"Backed up {file_path} to {backup_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = {}
            if not dry_run:
                file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Update with new translations
        updates_made = 0
        for key, value in translations.items():
            if key not in data or data[key] == "":
                data[key] = value
                updates_made += 1
                logger.debug(f"  Updated {key}: {value[:50]}...")
        
        if updates_made > 0:
            if not dry_run:
                # Write atomically using temp file
                temp_path = file_path.with_suffix('.tmp')
                with open(temp_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                temp_path.replace(file_path)
                logger.info(f"Updated {file_path} with {updates_made} translations")
            else:
                logger.info(f"[DRY RUN] Would update {file_path} with {updates_made} translations")
        
        return True

# ============================================================================
# Main Orchestrator
# ============================================================================

class LocaleTranslator:
    """Main orchestrator for the translation process."""
    
    def __init__(self, api_key: str, model: str = DEFAULT_MODEL):
        self.analyzer = LocaleAnalyzer()
        self.engine = TranslationEngine(api_key, model)
        self.updater = SafeFileUpdater()
        self.model = model  # Store model for reference
        self.stats = {
            'total_tasks': 0,
            'translated': 0,
            'failed': 0,
            'warnings': 0,
            'api_calls': 0,
            'estimated_cost': 0.0
        }
    
    def group_tasks_into_batches(self, tasks: List[TranslationTask], batch_size: int) -> List[List[TranslationTask]]:
        """Group tasks into batches by locale and file."""
        grouped = defaultdict(list)
        for task in tasks:
            key = (task.locale, task.file_name)
            grouped[key].append(task)
        
        batches = []
        for (locale, file_name), file_tasks in grouped.items():
            # Split into chunks of batch_size
            for i in range(0, len(file_tasks), batch_size):
                batches.append(file_tasks[i:i + batch_size])
        
        return batches
    
    def run(self, locales: Optional[List[str]] = None, batch_size: int = DEFAULT_BATCH_SIZE, 
            dry_run: bool = False, verbose: bool = False) -> Dict[str, Any]:
        """Run the translation process."""
        
        # Generate translation tasks
        logger.info("Analyzing locales for missing/empty translations...")
        all_tasks = self.analyzer.generate_translation_tasks(locales)
        
        if not all_tasks:
            logger.info("No translation tasks found!")
            return self.stats
        
        # Calculate total tasks
        total_tasks = sum(len(tasks) for tasks in all_tasks.values())
        self.stats['total_tasks'] = total_tasks
        logger.info(f"Found {total_tasks} total translation tasks across {len(all_tasks)} locales")
        
        # Estimate cost (rough estimate: ~$0.001 per 1000 tokens, ~50 tokens per translation)
        estimated_api_calls = total_tasks // batch_size + (1 if total_tasks % batch_size else 0)
        self.stats['estimated_cost'] = estimated_api_calls * 0.001 * batch_size * 50 / 1000
        logger.info(f"Estimated cost: ${self.stats['estimated_cost']:.2f} (using {self.model})")
        
        if dry_run:
            logger.info("DRY RUN MODE - No files will be modified")
        
        # Process each locale
        for locale, tasks in all_tasks.items():
            logger.info(f"\nProcessing {locale} ({LANGUAGE_NAMES.get(locale, locale)})...")
            
            # Group tasks into batches
            batches = self.group_tasks_into_batches(tasks, batch_size)
            
            # Track translations by file
            file_translations = defaultdict(dict)
            
            # Process each batch
            for i, batch in enumerate(batches, 1):
                logger.info(f"  Batch {i}/{len(batches)}: {len(batch)} items from {batch[0].file_name}")
                
                try:
                    # Translate the batch
                    results = self.engine.translate_batch(batch)
                    self.stats['api_calls'] += 1
                    
                    # Process results
                    for task, translated, validation in results:
                        if validation.is_valid or (validation.errors == [] and validation.warnings):
                            file_translations[task.file_name][task.key] = translated
                            self.stats['translated'] += 1
                            
                            if validation.warnings:
                                self.stats['warnings'] += len(validation.warnings)
                                if verbose:
                                    for warning in validation.warnings:
                                        logger.warning(f"    {task.key}: {warning}")
                        else:
                            self.stats['failed'] += 1
                            logger.error(f"    Failed: {task.key}: {', '.join(validation.errors)}")
                    
                except Exception as e:
                    logger.error(f"  Batch failed: {e}")
                    self.stats['failed'] += len(batch)
                
                # Brief delay between batches
                if i < len(batches):
                    time.sleep(0.5)
            
            # Update files with translations
            for file_name, translations in file_translations.items():
                if translations:
                    self.updater.update_locale_file(locale, file_name, translations, dry_run)
        
        # Final report
        logger.info("\n" + "="*60)
        logger.info("TRANSLATION COMPLETE")
        logger.info("="*60)
        logger.info(f"Total tasks: {self.stats['total_tasks']}")
        logger.info(f"Successfully translated: {self.stats['translated']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"Warnings: {self.stats['warnings']}")
        logger.info(f"API calls made: {self.stats['api_calls']}")
        logger.info(f"Backups saved to: {self.updater.backup_dir}")
        
        return self.stats

# ============================================================================
# CLI Interface
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Translate missing/empty locale entries using OpenAI"
    )
    parser.add_argument(
        '--locales',
        type=str,
        help='Comma-separated list of locales to process (e.g., "es,fr,de")'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Process all available locales'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f'Number of translations per API call (default: {DEFAULT_BATCH_SIZE})'
    )
    parser.add_argument(
        '--model',
        type=str,
        default=DEFAULT_MODEL,
        help=f'OpenAI model to use (default: {DEFAULT_MODEL})'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying files'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed validation warnings'
    )
    parser.add_argument(
        '--api-key',
        type=str,
        help='OpenAI API key (or set OPENAI_API_KEY env variable)'
    )
    
    args = parser.parse_args()
    
    # Get API key
    api_key = args.api_key or os.environ.get('OPENAI_API_KEY')
    if not api_key:
        logger.error("OpenAI API key not provided. Set OPENAI_API_KEY or use --api-key")
        sys.exit(1)
    
    # Determine which locales to process
    if args.all:
        locales = None  # Process all available
    elif args.locales:
        locales = [l.strip() for l in args.locales.split(',')]
    else:
        # Default to major languages
        locales = ['es', 'fr', 'de', 'zh', 'ru', 'pt', 'ja', 'ar', 'hi', 'it', 'ko', 'nl']
        logger.info(f"No locales specified, using default major languages: {', '.join(locales)}")
    
    # Run the translator
    translator = LocaleTranslator(api_key, args.model)
    translator.run(
        locales=locales,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        verbose=args.verbose
    )

if __name__ == "__main__":
    main()