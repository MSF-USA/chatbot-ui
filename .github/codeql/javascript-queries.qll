/**
 * Custom CodeQL library to mark our sanitization functions as sanitizers
 */

import javascript

/**
 * A call to our custom sanitizeForLog function that sanitizes tainted data
 */
class CustomLogSanitizer extends DataFlow::Node {
  CustomLogSanitizer() {
    exists(DataFlow::CallNode call |
      call = this and
      (
        call.getCalleeName() = "sanitizeForLog" or
        call.getCalleeName() = "sanitizeForLogMultiple"
      )
    )
  }
}

/**
 * Mark sanitizeForLog as a sanitizer for log injection
 */
class CustomLogSanitizerBarrier extends TaintTracking::SanitizerGuardNode, DataFlow::CallNode {
  CustomLogSanitizerBarrier() {
    this.getCalleeName() = "sanitizeForLog" or
    this.getCalleeName() = "sanitizeForLogMultiple"
  }

  override predicate sanitizes(boolean outcome, Expr e) {
    outcome = true and
    e = this.getAnArgument().asExpr()
  }
}
