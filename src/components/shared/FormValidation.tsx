import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle as CircleCheck, Info } from 'lucide-react';

// Types for validation
export type ValidationRule = {
  validator: (value: any) => boolean;
  message: string;
  type?: 'error' | 'warning' | 'info';
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  infos: string[];
};

export type FieldState = {
  value: any;
  touched: boolean;
  dirty: boolean;
  validating: boolean;
  validated: boolean;
  result: ValidationResult;
};

// Validation context
interface ValidationContextType {
  register: (name: string, options?: { 
    rules?: ValidationRule[],
    required?: boolean,
    zodSchema?: z.ZodType<any>,
    validateOnChange?: boolean,
    validateOnBlur?: boolean,
    initialValue?: any
  }) => {
    name: string;
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  };
  getFieldState: (name: string) => FieldState | undefined;
  validateField: (name: string) => Promise<ValidationResult>;
  validateForm: () => Promise<boolean>;
  setFieldValue: (name: string, value: any) => void;
  resetField: (name: string) => void;
  resetForm: () => void;
  formState: {
    isValid: boolean;
    isSubmitting: boolean;
    isSubmitted: boolean;
    submitCount: number;
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
    infos: Record<string, string[]>;
  };
}

const ValidationContext = React.createContext<ValidationContextType | undefined>(undefined);

// Form provider component
interface ValidationProviderProps {
  children: React.ReactNode;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  revalidateOnChange?: boolean;
}

export function ValidationProvider({
  children,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  revalidateOnChange = true,
}: ValidationProviderProps) {
  const [fields, setFields] = useState<Record<string, FieldState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const fieldRefs = React.useRef<Record<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>>({});
  const fieldOptions = React.useRef<Record<string, any>>({});

  // Calculate form state
  const formState = React.useMemo(() => {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    const infos: Record<string, string[]> = {};
    let isValid = true;

    Object.entries(fields).forEach(([name, field]) => {
      if (field.result.errors.length > 0) {
        errors[name] = field.result.errors;
        isValid = false;
      }
      if (field.result.warnings.length > 0) {
        warnings[name] = field.result.warnings;
      }
      if (field.result.infos.length > 0) {
        infos[name] = field.result.infos;
      }
    });

    return {
      isValid,
      isSubmitting,
      isSubmitted,
      submitCount,
      errors,
      warnings,
      infos,
    };
  }, [fields, isSubmitting, isSubmitted, submitCount]);

  // Validate a single field
  const validateField = async (name: string): Promise<ValidationResult> => {
    const field = fields[name];
    const options = fieldOptions.current[name] || {};
    
    if (!field) {
      return { isValid: true, errors: [], warnings: [], infos: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const infos: string[] = [];

    // Check required
    if (options.required && (field.value === '' || field.value === null || field.value === undefined)) {
      errors.push('This field is required');
    }

    // Check Zod schema
    if (options.zodSchema && field.value !== undefined && field.value !== null) {
      try {
        options.zodSchema.parse(field.value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push(err.message);
          });
        }
      }
    }

    // Check custom rules
    if (options.rules) {
      for (const rule of options.rules) {
        const isValid = rule.validator(field.value);
        if (!isValid) {
          const type = rule.type || 'error';
          if (type === 'error') errors.push(rule.message);
          else if (type === 'warning') warnings.push(rule.message);
          else if (type === 'info') infos.push(rule.message);
        }
      }
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
    };

    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        validating: false,
        validated: true,
        result,
      },
    }));

    return result;
  };

  // Validate the entire form
  const validateForm = async (): Promise<boolean> => {
    const validationPromises = Object.keys(fields).map(name => validateField(name));
    const results = await Promise.all(validationPromises);
    return results.every(result => result.isValid);
  };

  // Register a field
  const register = (name: string, options = {}) => {
    if (!fieldRefs.current[name]) {
      fieldRefs.current[name] = React.createRef();
    }

    fieldOptions.current[name] = options;

    // Initialize field state if it doesn't exist
    if (!fields[name]) {
      const initialValue = options.initialValue !== undefined ? options.initialValue : '';
      setFields(prev => ({
        ...prev,
        [name]: {
          value: initialValue,
          touched: false,
          dirty: false,
          validating: false,
          validated: false,
          result: { isValid: true, errors: [], warnings: [], infos: [] },
        },
      }));
    }

    return {
      name,
      value: fields[name]?.value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const newValue = e.target.value;
        setFields(prev => ({
          ...prev,
          [name]: {
            ...prev[name],
            value: newValue,
            dirty: true,
          },
        }));

        // Validate on change if enabled
        const shouldValidate = options.validateOnChange !== undefined 
          ? options.validateOnChange 
          : validateOnChange;
          
        if (shouldValidate || (revalidateOnChange && fields[name]?.validated)) {
          setTimeout(() => validateField(name), 0);
        }
      },
      onBlur: () => {
        setFields(prev => ({
          ...prev,
          [name]: {
            ...prev[name],
            touched: true,
          },
        }));

        // Validate on blur if enabled
        const shouldValidate = options.validateOnBlur !== undefined 
          ? options.validateOnBlur 
          : validateOnBlur;
          
        if (shouldValidate) {
          setTimeout(() => validateField(name), 0);
        }
      },
      ref: fieldRefs.current[name],
    };
  };

  // Get field state
  const getFieldState = (name: string): FieldState | undefined => {
    return fields[name];
  };

  // Set field value programmatically
  const setFieldValue = (name: string, value: any) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        dirty: true,
      },
    }));

    // Validate if the field has been validated before
    if (fields[name]?.validated || revalidateOnChange) {
      setTimeout(() => validateField(name), 0);
    }
  };

  // Reset a field
  const resetField = (name: string) => {
    const initialValue = fieldOptions.current[name]?.initialValue !== undefined 
      ? fieldOptions.current[name].initialValue 
      : '';
      
    setFields(prev => ({
      ...prev,
      [name]: {
        value: initialValue,
        touched: false,
        dirty: false,
        validating: false,
        validated: false,
        result: { isValid: true, errors: [], warnings: [], infos: [] },
      },
    }));
  };

  // Reset the entire form
  const resetForm = () => {
    const resetFields: Record<string, FieldState> = {};
    
    Object.keys(fields).forEach(name => {
      const initialValue = fieldOptions.current[name]?.initialValue !== undefined 
        ? fieldOptions.current[name].initialValue 
        : '';
        
      resetFields[name] = {
        value: initialValue,
        touched: false,
        dirty: false,
        validating: false,
        validated: false,
        result: { isValid: true, errors: [], warnings: [], infos: [] },
      };
    });
    
    setFields(resetFields);
    setIsSubmitted(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitCount(prev => prev + 1);
    
    const isValid = await validateForm();
    
    if (isValid && onSubmit) {
      const formData: Record<string, any> = {};
      
      Object.entries(fields).forEach(([name, field]) => {
        formData[name] = field.value;
      });
      
      try {
        await onSubmit(formData);
        setIsSubmitted(true);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  };

  const contextValue: ValidationContextType = {
    register,
    getFieldState,
    validateField,
    validateForm,
    setFieldValue,
    resetField,
    resetForm,
    formState,
  };

  return (
    <ValidationContext.Provider value={contextValue}>
      <form onSubmit={handleSubmit} noValidate>
        {children}
      </form>
    </ValidationContext.Provider>
  );
}

// Hook to use validation context
export function useValidation() {
  const context = React.useContext(ValidationContext);
  
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  
  return context;
}

// Validated input component
interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
  rules?: ValidationRule[];
  required?: boolean;
  zodSchema?: z.ZodType<any>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  helperText?: string;
  showErrors?: boolean;
  showWarnings?: boolean;
  showInfos?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  warningClassName?: string;
  infoClassName?: string;
}

export function ValidatedInput({
  name,
  label,
  rules,
  required,
  zodSchema,
  validateOnChange,
  validateOnBlur,
  helperText,
  showErrors = true,
  showWarnings = true,
  showInfos = true,
  className,
  labelClassName,
  inputClassName,
  errorClassName,
  warningClassName,
  infoClassName,
  ...props
}: ValidatedInputProps) {
  const { register, getFieldState } = useValidation();
  const fieldState = getFieldState(name);
  
  const { value, onChange, onBlur, ref } = register(name, {
    rules,
    required,
    zodSchema,
    validateOnChange,
    validateOnBlur,
    initialValue: props.defaultValue || '',
  });

  const hasError = fieldState?.result.errors.length > 0;
  const hasWarning = fieldState?.result.warnings.length > 0;
  const hasInfo = fieldState?.result.infos.length > 0;

  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <label 
          htmlFor={name} 
          className={cn(
            "block text-sm font-medium mb-1",
            hasError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300",
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={name}
        ref={ref as React.RefObject<HTMLInputElement>}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={cn(
          "w-full px-3 py-2 border rounded-md shadow-sm text-sm transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          hasError 
            ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500" 
            : "border-gray-300 dark:border-gray-600",
          inputClassName
        )}
        aria-invalid={hasError}
        aria-describedby={`${name}-error ${name}-warning ${name}-info ${name}-helper`}
        {...props}
      />
      
      {helperText && !hasError && !hasWarning && !hasInfo && (
        <p id={`${name}-helper`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
      
      {showErrors && fieldState?.result.errors.map((error, index) => (
        <p 
          key={`${name}-error-${index}`} 
          id={`${name}-error`}
          className={cn(
            "mt-1 text-xs text-red-600 dark:text-red-400 flex items-center",
            errorClassName
          )}
        >
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          {error}
        </p>
      ))}
      
      {showWarnings && fieldState?.result.warnings.map((warning, index) => (
        <p 
          key={`${name}-warning-${index}`} 
          id={`${name}-warning`}
          className={cn(
            "mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center",
            warningClassName
          )}
        >
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          {warning}
        </p>
      ))}
      
      {showInfos && fieldState?.result.infos.map((info, index) => (
        <p 
          key={`${name}-info-${index}`} 
          id={`${name}-info`}
          className={cn(
            "mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center",
            infoClassName
          )}
        >
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          {info}
        </p>
      ))}
    </div>
  );
}

// Validated textarea component
interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label?: string;
  rules?: ValidationRule[];
  required?: boolean;
  zodSchema?: z.ZodType<any>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  helperText?: string;
  showErrors?: boolean;
  showWarnings?: boolean;
  showInfos?: boolean;
  className?: string;
  labelClassName?: string;
  textareaClassName?: string;
  errorClassName?: string;
  warningClassName?: string;
  infoClassName?: string;
}

export function ValidatedTextarea({
  name,
  label,
  rules,
  required,
  zodSchema,
  validateOnChange,
  validateOnBlur,
  helperText,
  showErrors = true,
  showWarnings = true,
  showInfos = true,
  className,
  labelClassName,
  textareaClassName,
  errorClassName,
  warningClassName,
  infoClassName,
  ...props
}: ValidatedTextareaProps) {
  const { register, getFieldState } = useValidation();
  const fieldState = getFieldState(name);
  
  const { value, onChange, onBlur, ref } = register(name, {
    rules,
    required,
    zodSchema,
    validateOnChange,
    validateOnBlur,
    initialValue: props.defaultValue || '',
  });

  const hasError = fieldState?.result.errors.length > 0;
  const hasWarning = fieldState?.result.warnings.length > 0;
  const hasInfo = fieldState?.result.infos.length > 0;

  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <label 
          htmlFor={name} 
          className={cn(
            "block text-sm font-medium mb-1",
            hasError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300",
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        id={name}
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={cn(
          "w-full px-3 py-2 border rounded-md shadow-sm text-sm transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          hasError 
            ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500" 
            : "border-gray-300 dark:border-gray-600",
          textareaClassName
        )}
        aria-invalid={hasError}
        aria-describedby={`${name}-error ${name}-warning ${name}-info ${name}-helper`}
        {...props}
      />
      
      {helperText && !hasError && !hasWarning && !hasInfo && (
        <p id={`${name}-helper`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
      
      {showErrors && fieldState?.result.errors.map((error, index) => (
        <p 
          key={`${name}-error-${index}`} 
          id={`${name}-error`}
          className={cn(
            "mt-1 text-xs text-red-600 dark:text-red-400 flex items-center",
            errorClassName
          )}
        >
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          {error}
        </p>
      ))}
      
      {showWarnings && fieldState?.result.warnings.map((warning, index) => (
        <p 
          key={`${name}-warning-${index}`} 
          id={`${name}-warning`}
          className={cn(
            "mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center",
            warningClassName
          )}
        >
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          {warning}
        </p>
      ))}
      
      {showInfos && fieldState?.result.infos.map((info, index) => (
        <p 
          key={`${name}-info-${index}`} 
          id={`${name}-info`}
          className={cn(
            "mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center",
            infoClassName
          )}
        >
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          {info}
        </p>
      ))}
    </div>
  );
}

// Validated select component
interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label?: string;
  options: Array<{ value: string; label: string }>;
  rules?: ValidationRule[];
  required?: boolean;
  zodSchema?: z.ZodType<any>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  helperText?: string;
  showErrors?: boolean;
  showWarnings?: boolean;
  showInfos?: boolean;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
  errorClassName?: string;
  warningClassName?: string;
  infoClassName?: string;
}

export function ValidatedSelect({
  name,
  label,
  options,
  rules,
  required,
  zodSchema,
  validateOnChange,
  validateOnBlur,
  helperText,
  showErrors = true,
  showWarnings = true,
  showInfos = true,
  className,
  labelClassName,
  selectClassName,
  errorClassName,
  warningClassName,
  infoClassName,
  ...props
}: ValidatedSelectProps) {
  const { register, getFieldState } = useValidation();
  const fieldState = getFieldState(name);
  
  const { value, onChange, onBlur, ref } = register(name, {
    rules,
    required,
    zodSchema,
    validateOnChange,
    validateOnBlur,
    initialValue: props.defaultValue || '',
  });

  const hasError = fieldState?.result.errors.length > 0;
  const hasWarning = fieldState?.result.warnings.length > 0;
  const hasInfo = fieldState?.result.infos.length > 0;

  return (
    <div className={cn("mb-4", className)}>
      {label && (
        <label 
          htmlFor={name} 
          className={cn(
            "block text-sm font-medium mb-1",
            hasError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300",
            labelClassName
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={name}
        ref={ref as React.RefObject<HTMLSelectElement>}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={cn(
          "w-full px-3 py-2 border rounded-md shadow-sm text-sm transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          hasError 
            ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500" 
            : "border-gray-300 dark:border-gray-600",
          selectClassName
        )}
        aria-invalid={hasError}
        aria-describedby={`${name}-error ${name}-warning ${name}-info ${name}-helper`}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helperText && !hasError && !hasWarning && !hasInfo && (
        <p id={`${name}-helper`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
      
      {showErrors && fieldState?.result.errors.map((error, index) => (
        <p 
          key={`${name}-error-${index}`} 
          id={`${name}-error`}
          className={cn(
            "mt-1 text-xs text-red-600 dark:text-red-400 flex items-center",
            errorClassName
          )}
        >
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          {error}
        </p>
      ))}
      
      {showWarnings && fieldState?.result.warnings.map((warning, index) => (
        <p 
          key={`${name}-warning-${index}`} 
          id={`${name}-warning`}
          className={cn(
            "mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center",
            warningClassName
          )}
        >
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          {warning}
        </p>
      ))}
      
      {showInfos && fieldState?.result.infos.map((info, index) => (
        <p 
          key={`${name}-info-${index}`} 
          id={`${name}-info`}
          className={cn(
            "mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center",
            infoClassName
          )}
        >
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          {info}
        </p>
      ))}
    </div>
  );
}

// Form submission status component
interface FormStatusProps {
  className?: string;
}

export function FormStatus({ className }: FormStatusProps) {
  const { formState } = useValidation();
  const { isSubmitting, isSubmitted, isValid } = formState;
  
  if (isSubmitting) {
    return (
      <div className={cn(
        "p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md flex items-center",
        className
      )}>
        <div className="h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent dark:border-t-transparent rounded-full animate-spin mr-2"></div>
        Submitting...
      </div>
    );
  }
  
  if (isSubmitted && isValid) {
    return (
      <div className={cn(
        "p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md flex items-center",
        className
      )}>
        <CircleCheck className="h-4 w-4 mr-2" />
        Form submitted successfully!
      </div>
    );
  }
  
  return null;
}

// Form error summary component
interface FormErrorSummaryProps {
  className?: string;
  title?: string;
}

export function FormErrorSummary({ className, title = "Please fix the following errors:" }: FormErrorSummaryProps) {
  const { formState } = useValidation();
  const { errors } = formState;
  
  const errorCount = Object.values(errors).reduce((count, fieldErrors) => count + fieldErrors.length, 0);
  
  if (errorCount === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      "p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md",
      className
    )}>
      <div className="flex items-center mb-2">
        <AlertCircle className="h-4 w-4 mr-2" />
        <h3 className="font-medium">{title}</h3>
      </div>
      <ul className="list-disc list-inside pl-2 space-y-1">
        {Object.entries(errors).map(([field, fieldErrors]) => 
          fieldErrors.map((error, index) => (
            <li key={`${field}-${index}`} className="text-sm">
              <button 
                type="button"
                className="text-left hover:underline focus:outline-none focus:underline"
                onClick={() => {
                  const element = document.getElementById(field);
                  if (element) {
                    element.focus();
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                {error}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

// Submit button component
interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loadingText?: string;
  children: React.ReactNode;
}

export function SubmitButton({ loadingText = "Submitting...", children, ...props }: SubmitButtonProps) {
  const { formState } = useValidation();
  const { isSubmitting } = formState;
  
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={cn(
        "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm",
        "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        props.className
      )}
      {...props}
    >
      {isSubmitting ? (
        <>
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          {loadingText}
        </>
      ) : children}
    </button>
  );
}

// Password strength indicator component
interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = React.useMemo(() => {
    if (!password) return 0;
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    // Normalize to 0-4 range
    return Math.min(4, Math.floor(score / 1.5));
  }, [password]);
  
  const getStrengthLabel = () => {
    if (strength === 0) return 'Very Weak';
    if (strength === 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';
    return 'Strong';
  };
  
  const getStrengthColor = () => {
    if (strength === 0) return 'bg-red-500 dark:bg-red-600';
    if (strength === 1) return 'bg-orange-500 dark:bg-orange-600';
    if (strength === 2) return 'bg-yellow-500 dark:bg-yellow-600';
    if (strength === 3) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-green-500 dark:bg-green-600';
  };
  
  return (
    <div className={cn("mt-1", className)}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">Password strength:</div>
        <div className="text-xs font-medium">{getStrengthLabel()}</div>
      </div>
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300", getStrengthColor())}
          style={{ width: `${(strength / 4) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}

// Character counter component
interface CharacterCounterProps {
  value: string;
  maxLength?: number;
  className?: string;
}

export function CharacterCounter({ value, maxLength, className }: CharacterCounterProps) {
  const count = value?.length || 0;
  const isNearLimit = maxLength && count >= maxLength * 0.8;
  const isAtLimit = maxLength && count >= maxLength;
  
  return (
    <div className={cn(
      "text-xs text-right mt-1",
      isAtLimit ? "text-red-600 dark:text-red-400" : 
      isNearLimit ? "text-amber-600 dark:text-amber-400" : 
      "text-gray-500 dark:text-gray-400",
      className
    )}>
      {maxLength ? `${count}/${maxLength}` : `${count} characters`}
    </div>
  );
}