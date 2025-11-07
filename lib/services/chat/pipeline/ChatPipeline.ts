import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { ErrorSeverity, PipelineError } from '@/lib/types/errors';

import { ChatContext } from './ChatContext';
import { PipelineStage } from './PipelineStage';

/**
 * ChatPipeline orchestrates the execution of pipeline stages.
 *
 * Responsibilities:
 * - Executes stages in order
 * - Skips stages that shouldn't run
 * - Handles errors gracefully
 * - Tracks performance metrics
 * - Provides debugging information
 *
 * Usage:
 * ```typescript
 * const pipeline = new ChatPipeline([
 *   new FileProcessor(...),
 *   new RAGEnricher(...),
 *   new StandardChatHandler(...),
 * ]);
 *
 * const result = await pipeline.execute(context);
 * ```
 */
export class ChatPipeline {
  constructor(private stages: PipelineStage[]) {}

  /**
   * Executes all pipeline stages in order.
   *
   * Flow:
   * 1. For each stage:
   *    a. Check if it should run
   *    b. If yes, execute it
   *    c. Pass modified context to next stage
   * 2. Return final context
   *
   * Error Handling:
   * - Errors are caught and added to context.errors
   * - Pipeline continues (fail-fast is opt-in per stage)
   * - Final context includes all errors
   *
   * @param initialContext - The initial chat context
   * @returns The final chat context after all stages
   */
  async execute(initialContext: ChatContext): Promise<ChatContext> {
    const startTime = Date.now();
    let context: ChatContext = {
      ...initialContext,
      // Respect existing metrics from middleware, don't overwrite
      metrics: initialContext.metrics || {
        startTime,
        stageTimings: new Map(),
      },
    };

    console.log('[Pipeline] Starting execution with stages:', {
      stageCount: this.stages.length,
      stageNames: this.stages.map((s) => s.name),
    });

    for (const stage of this.stages) {
      try {
        // Check if stage should run
        const shouldRun = stage.shouldRun(context);

        if (!shouldRun) {
          console.log(`[Pipeline] Skipping stage: ${stage.name}`);
          continue;
        }

        // Execute stage
        console.log(`[Pipeline] Running stage: ${stage.name}`);
        context = await stage.execute(context);

        // Check for critical errors that should stop the pipeline
        if (context.errors && context.errors.length > 0) {
          const criticalError = context.errors.find(
            (e) =>
              e instanceof PipelineError &&
              e.severity === ErrorSeverity.CRITICAL,
          );
          if (criticalError) {
            console.error(
              `[Pipeline] Critical error in stage ${stage.name}, stopping pipeline:`,
              sanitizeForLog(criticalError),
            );
            break;
          }
        }
      } catch (error) {
        // Stage execution threw an error that wasn't caught
        console.error(
          `[Pipeline] Uncaught error in stage ${stage.name}:`,
          sanitizeForLog(error),
        );

        // Add to errors
        const errors = context.errors || [];
        errors.push(
          error instanceof Error
            ? error
            : new Error(`Uncaught error in ${stage.name}: ${String(error)}`),
        );
        context = { ...context, errors };

        // Continue to next stage
      }
    }

    // Finalize metrics
    const endTime = Date.now();
    context.metrics = {
      ...context.metrics,
      startTime,
      endTime,
    };

    const totalTime = endTime - startTime;
    console.log('[Pipeline] Execution completed:', {
      totalTime: `${totalTime}ms`,
      stagesRun: Array.from(context.metrics.stageTimings?.keys() || []),
      errorCount: context.errors?.length || 0,
    });

    return context;
  }

  /**
   * Returns the list of stages in this pipeline.
   * Useful for debugging and testing.
   */
  getStages(): readonly PipelineStage[] {
    return [...this.stages];
  }

  /**
   * Returns the names of all stages.
   * Useful for logging and debugging.
   */
  getStageNames(): string[] {
    return this.stages.map((s) => s.name);
  }
}
