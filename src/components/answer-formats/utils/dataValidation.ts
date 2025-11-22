/**
 * Validation utilities for answer format data
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate table data
 */
export function validateTableData(
  data: any[][],
  requiredRows?: number,
  requiredColumns?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('Table data must be an array');
    return { isValid: false, errors, warnings };
  }

  if (data.length === 0) {
    errors.push('Table must have at least one row');
  }

  if (requiredRows && data.length < requiredRows) {
    errors.push(`Table must have at least ${requiredRows} rows`);
  }

  if (requiredColumns) {
    const hasRequiredColumns = data.every(row =>
      Array.isArray(row) && row.length >= requiredColumns
    );
    if (!hasRequiredColumns) {
      errors.push(`All rows must have at least ${requiredColumns} columns`);
    }
  }

  // Check for empty cells
  const emptyCells = data.reduce((count, row, rowIdx) => {
    return count + row.reduce((rowCount, cell, colIdx) => {
      if (cell === null || cell === undefined || cell === '') {
        return rowCount + 1;
      }
      return rowCount;
    }, 0);
  }, 0);

  if (emptyCells > 0) {
    warnings.push(`Table has ${emptyCells} empty cell(s)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate graph data
 */
export function validateGraphData(graphData: {
  dataPoints?: any[];
  xAxis?: any;
  yAxis?: any;
  title?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!graphData.dataPoints || graphData.dataPoints.length === 0) {
    errors.push('Graph must have at least one data point');
  }

  if (!graphData.xAxis?.label) {
    warnings.push('X-axis label is missing');
  }

  if (!graphData.yAxis?.label) {
    warnings.push('Y-axis label is missing');
  }

  if (!graphData.title) {
    warnings.push('Graph title is missing');
  }

  // Validate data points
  if (graphData.dataPoints) {
    const invalidPoints = graphData.dataPoints.filter(
      point => typeof point.x !== 'number' || typeof point.y !== 'number'
    );

    if (invalidPoints.length > 0) {
      errors.push(`${invalidPoints.length} data point(s) have invalid coordinates`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate audio recording
 */
export function validateAudioRecording(
  audioBlob: Blob | null,
  minDuration?: number,
  maxDuration?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!audioBlob) {
    errors.push('No audio recording found');
    return { isValid: false, errors, warnings };
  }

  if (audioBlob.size === 0) {
    errors.push('Audio recording is empty');
  }

  // Size checks (approximate duration based on file size)
  const approximateDurationSeconds = audioBlob.size / (128000 / 8); // Assuming 128kbps

  if (minDuration && approximateDurationSeconds < minDuration) {
    errors.push(`Recording must be at least ${minDuration} seconds long`);
  }

  if (maxDuration && approximateDurationSeconds > maxDuration) {
    errors.push(`Recording must not exceed ${maxDuration} seconds`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  allowedTypes?: string[],
  maxSize?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors, warnings };
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', ''));
      }
      return file.type === type;
    });

    if (!isAllowed) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  if (maxSize && file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)} MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate code submission
 */
export function validateCode(
  code: string,
  minLines?: number,
  maxLines?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push('Code cannot be empty');
    return { isValid: false, errors, warnings };
  }

  const lines = code.split('\n');

  if (minLines && lines.length < minLines) {
    errors.push(`Code must have at least ${minLines} lines`);
  }

  if (maxLines && lines.length > maxLines) {
    warnings.push(`Code has ${lines.length} lines (maximum recommended: ${maxLines})`);
  }

  // Check for common issues
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length === 0) {
    errors.push('Code contains only empty lines');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate canvas drawing
 */
export function validateCanvasDrawing(
  canvasData: string | null,
  minObjects?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!canvasData) {
    errors.push('No drawing found');
    return { isValid: false, errors, warnings };
  }

  try {
    const data = JSON.parse(canvasData);

    if (!data.objects || data.objects.length === 0) {
      errors.push('Drawing is empty');
    } else if (minObjects && data.objects.length < minObjects) {
      errors.push(`Drawing must have at least ${minObjects} object(s)`);
    }
  } catch (e) {
    errors.push('Invalid drawing data format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate structural diagram labels
 */
export function validateStructuralDiagramLabels(
  labels: Array<{ text: string; position: { x: number; y: number } }>,
  requiredLabels?: string[],
  fuzzyMatch: boolean = true
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!labels || labels.length === 0) {
    errors.push('No labels found in diagram');
    return { isValid: false, errors, warnings };
  }

  if (requiredLabels && requiredLabels.length > 0) {
    const labelTexts = labels.map(l => l.text.toLowerCase().trim());
    const missing: string[] = [];

    requiredLabels.forEach(required => {
      const requiredLower = required.toLowerCase().trim();
      const found = fuzzyMatch
        ? labelTexts.some(label =>
            label.includes(requiredLower) || requiredLower.includes(label)
          )
        : labelTexts.includes(requiredLower);

      if (!found) {
        missing.push(required);
      }
    });

    if (missing.length > 0) {
      errors.push(`Missing required labels: ${missing.join(', ')}`);
    }
  }

  // Check for duplicate labels
  const duplicates = labels
    .map(l => l.text.toLowerCase().trim())
    .filter((text, index, arr) => arr.indexOf(text) !== index);

  if (duplicates.length > 0) {
    warnings.push(`Duplicate labels found: ${Array.from(new Set(duplicates)).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
