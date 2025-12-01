#!/usr/bin/env tsx
import { validateInfrastructure } from '../utils/infrastructure/azure-validator';

import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

interface ValidationOptions {
  output?: string;
  verbose?: boolean;
  exitOnFailure?: boolean;
}

async function runInfrastructureValidation(options: ValidationOptions = {}) {
  console.log('🔍 Starting infrastructure validation...\n');

  try {
    const report = await validateInfrastructure();

    if (options.verbose) {
      console.log('📋 Validation Results:');
      console.log('─'.repeat(50));

      report.results.forEach((result, index) => {
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${result.name}`);

        if (result.success && result.details && options.verbose) {
          console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }

        if (!result.success && result.error) {
          console.log(`   Error: ${result.error}`);
        }

        if (index < report.results.length - 1) {
          console.log('');
        }
      });

      console.log('─'.repeat(50));
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Environment: ${report.environment}`);
    console.log(`   Timestamp: ${report.timestamp}`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);

    if (report.summary.failed > 0) {
      console.log(
        `\n❌ Infrastructure validation failed: ${report.summary.failed}/${report.summary.total} tests failed`,
      );

      if (options.exitOnFailure) {
        process.exit(1);
      }
    } else {
      console.log(
        `\n✅ Infrastructure validation passed: ${report.summary.passed}/${report.summary.total} tests passed`,
      );
    }

    // Write report to file if specified
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${outputPath}`);
    }

    return report;
  } catch (error) {
    console.error('❌ Infrastructure validation crashed:', error);

    if (options.exitOnFailure) {
      process.exit(1);
    }

    throw error;
  }
}

// CLI argument parsing
function parseArgs(): ValidationOptions {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {
    verbose: false,
    exitOnFailure: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--no-exit':
        options.exitOnFailure = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: validate-infrastructure [options]

Options:
  -o, --output <file>    Save validation report to file
  -v, --verbose          Show detailed validation results
  --no-exit              Don't exit with error code on failure
  -h, --help             Show this help message

Examples:
  validate-infrastructure
  validate-infrastructure --verbose
  validate-infrastructure --output report.json
  validate-infrastructure --verbose --output report.json --no-exit
`);
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();

  runInfrastructureValidation(options)
    .then(() => {
      console.log('\n🎉 Infrastructure validation complete!');
    })
    .catch((error) => {
      console.error('\n💥 Infrastructure validation failed:', error.message);
      process.exit(1);
    });
}

export { runInfrastructureValidation };
