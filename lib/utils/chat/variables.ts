/**
 * Regular expression to match variables in the format {{variableName}}
 */
const VARIABLE_REGEX = /{{(.*?)}}/g;

/**
 * Parses variables from a string in the format {{variableName}}
 * Shared utility used by ChatInput and PromptDashboard
 *
 * @param content - The content string to parse
 * @returns Array of unique variable names found in the content
 *
 * @example
 * parseVariables('Hello {{name}}, welcome to {{place}}!')
 * // Returns: ['name', 'place']
 */
export const parseVariables = (content: string): string[] => {
  const foundVariables: string[] = [];
  let match: RegExpExecArray | null;

  // Create a new regex instance for each parse to reset lastIndex
  const regex = new RegExp(VARIABLE_REGEX.source, VARIABLE_REGEX.flags);

  while ((match = regex.exec(content)) !== null) {
    foundVariables.push(match[1]);
  }

  return foundVariables;
};

/**
 * Extracts unique variables from text (deduplicates)
 * Used by PromptDashboard to show variable list
 *
 * @param text - The text to extract variables from
 * @returns Array of unique variable names
 *
 * @example
 * extractVariables('{{name}} and {{age}}, {{name}} again')
 * // Returns: ['name', 'age']
 */
export const extractVariables = (text: string): string[] => {
  const regex = new RegExp(VARIABLE_REGEX.source, VARIABLE_REGEX.flags);
  const matches = text.matchAll(regex);
  const vars = Array.from(matches, (m) => m[1]).filter(
    (v, i, arr) => arr.indexOf(v) === i, // Remove duplicates
  );
  return vars;
};

/**
 * Replaces variables in content with provided values
 *
 * @param content - The content containing variables
 * @param variables - Array of variable names
 * @param values - Array of values to replace variables with (same order as variables)
 * @returns Content with variables replaced
 *
 * @example
 * replaceVariables('Hello {{name}}!', ['name'], ['World'])
 * // Returns: 'Hello World!'
 */
export const replaceVariables = (
  content: string,
  variables: string[],
  values: string[],
): string => {
  return content.replace(VARIABLE_REGEX, (match, variable) => {
    const index = variables.indexOf(variable);
    return index !== -1 ? values[index] : match;
  });
};

/**
 * Replaces variables using a variable map (key-value pairs)
 *
 * @param content - The content containing variables
 * @param variableMap - Object mapping variable names to their values
 * @returns Content with variables replaced
 *
 * @example
 * replaceVariablesWithMap('Hello {{name}}!', { name: 'World' })
 * // Returns: 'Hello World!'
 */
export const replaceVariablesWithMap = (
  content: string,
  variableMap: { [key: string]: string },
): string => {
  return content.replace(VARIABLE_REGEX, (match, variable) => {
    return variableMap[variable] ?? match;
  });
};
