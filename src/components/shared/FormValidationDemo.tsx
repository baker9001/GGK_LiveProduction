import React, { useState } from 'react';
import { z } from 'zod';
import { 
  ValidationProvider, 
  ValidatedInput, 
  ValidatedTextarea, 
  ValidatedSelect,
  FormErrorSummary,
  FormStatus,
  SubmitButton,
  PasswordStrength,
  CharacterCounter,
  useValidation
} from './FormValidation';
import { Button } from './Button';

export function FormValidationDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 text-center text-gray-900 dark:text-white">Form Validation Examples</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Real-time Validation</h2>
          <RealtimeValidationExample />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Submit Validation</h2>
          <SubmitValidationExample />
        </div>
      </div>
      
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Multi-step Form</h2>
        <MultiStepFormExample />
      </div>
    </div>
  );
}

// Example with real-time validation
function RealtimeValidationExample() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <ValidationProvider validateOnChange={true} validateOnBlur={true}>
        <FormErrorSummary className="mb-4" />
        
        <ValidatedInput
          name="email"
          label="Email"
          type="email"
          required
          zodSchema={z.string().email('Please enter a valid email address')}
          placeholder="Enter your email"
          helperText="We'll validate this as you type"
        />
        
        <PasswordWithConfirmation />
        
        <ValidatedInput
          name="username"
          label="Username"
          required
          rules={[
            {
              validator: (value) => /^[a-zA-Z0-9_]+$/.test(value),
              message: 'Username can only contain letters, numbers, and underscores',
            },
            {
              validator: (value) => value.length >= 3 && value.length <= 20,
              message: 'Username must be between 3 and 20 characters',
            }
          ]}
          placeholder="Choose a username"
        />
        
        <div className="mt-6">
          <FormStatus className="mb-4" />
          <SubmitButton>Create Account</SubmitButton>
        </div>
      </ValidationProvider>
    </div>
  );
}

// Password with confirmation field
function PasswordWithConfirmation() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, getFieldState, validateField } = useValidation();
  
  const passwordRegister = register('password', {
    required: true,
    zodSchema: z.string().min(8, 'Password must be at least 8 characters'),
    validateOnChange: true,
  });
  
  const confirmPasswordRegister = register('confirmPassword', {
    required: true,
    rules: [
      {
        validator: (value) => {
          const passwordValue = getFieldState('password')?.value || '';
          return value === passwordValue;
        },
        message: 'Passwords do not match',
      }
    ],
    validateOnChange: true,
  });
  
  // Revalidate confirm password when password changes
  React.useEffect(() => {
    if (getFieldState('confirmPassword')?.value) {
      validateField('confirmPassword');
    }
  }, [getFieldState('password')?.value]);
  
  const passwordState = getFieldState('password');
  const confirmPasswordState = getFieldState('confirmPassword');
  
  const passwordHasError = passwordState?.result.errors.length > 0;
  const confirmPasswordHasError = confirmPasswordState?.result.errors.length > 0;
  
  return (
    <>
      <div className="mb-4">
        <label 
          htmlFor="password" 
          className={`block text-sm font-medium mb-1 ${passwordHasError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
        >
          Password <span className="text-red-500">*</span>
        </label>
        
        <div className="relative">
          <input
            id="password"
            ref={passwordRegister.ref as React.RefObject<HTMLInputElement>}
            type={showPassword ? "text" : "password"}
            value={passwordRegister.value}
            onChange={passwordRegister.onChange}
            onBlur={passwordRegister.onBlur}
            className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm text-sm transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              ${passwordHasError ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600"}`}
            placeholder="Enter your password"
          />
          
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        
        <PasswordStrength password={passwordRegister.value} className="mt-2" />
        
        {passwordState?.result.errors.map((error, index) => (
          <p 
            key={`password-error-${index}`} 
            className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        ))}
      </div>
      
      <div className="mb-4">
        <label 
          htmlFor="confirmPassword" 
          className={`block text-sm font-medium mb-1 ${confirmPasswordHasError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
        >
          Confirm Password <span className="text-red-500">*</span>
        </label>
        
        <div className="relative">
          <input
            id="confirmPassword"
            ref={confirmPasswordRegister.ref as React.RefObject<HTMLInputElement>}
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPasswordRegister.value}
            onChange={confirmPasswordRegister.onChange}
            onBlur={confirmPasswordRegister.onBlur}
            className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm text-sm transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              ${confirmPasswordHasError ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600"}`}
            placeholder="Confirm your password"
          />
          
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        
        {confirmPasswordState?.result.errors.map((error, index) => (
          <p 
            key={`confirmPassword-error-${index}`} 
            className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        ))}
      </div>
    </>
  );
}

// Example with validation on submit
function SubmitValidationExample() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <ValidationProvider 
        validateOnChange={false} 
        validateOnBlur={false}
        onSubmit={async (data) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log('Form submitted:', data);
        }}
      >
        <FormErrorSummary className="mb-4" />
        
        <ValidatedInput
          name="fullName"
          label="Full Name"
          required
          zodSchema={z.string().min(2, 'Name must be at least 2 characters')}
          placeholder="Enter your full name"
        />
        
        <ValidatedInput
          name="phone"
          label="Phone Number"
          required
          zodSchema={z.string().regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number')}
          placeholder="Enter your phone number"
          helperText="Format: +1234567890"
        />
        
        <ValidatedSelect
          name="subject"
          label="Subject"
          required
          options={[
            { value: 'general', label: 'General Inquiry' },
            { value: 'support', label: 'Technical Support' },
            { value: 'billing', label: 'Billing Question' },
            { value: 'other', label: 'Other' },
          ]}
        />
        
        <ValidatedTextarea
          name="message"
          label="Message"
          required
          rules={[
            {
              validator: (value) => value.length >= 20,
              message: 'Message must be at least 20 characters'
            }
          ]}
          placeholder="Enter your message"
          rows={4}
        />
        
        <MessageLengthCounter />
        
        <div className="mt-6">
          <FormStatus className="mb-4" />
          <SubmitButton>Send Message</SubmitButton>
        </div>
      </ValidationProvider>
    </div>
  );
}

// Message length counter component
function MessageLengthCounter() {
  const { getFieldState } = useValidation();
  const messageState = getFieldState('message');
  const messageValue = messageState?.value || '';
  
  return (
    <div className="flex justify-end">
      <CharacterCounter value={messageValue} maxLength={500} />
    </div>
  );
}

// Multi-step form example
function MultiStepFormExample() {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  
  const goToNextStep = () => {
    setStep(prev => Math.min(prev + 1, totalSteps));
  };
  
  const goToPreviousStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <div className={`flex-1 h-1 ${index < step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
              )}
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                index + 1 === step 
                  ? 'bg-blue-500 text-white' 
                  : index + 1 < step 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {index + 1 < step ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
        
        <div className="flex justify-between mt-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Personal Info</div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Details</div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmation</div>
        </div>
      </div>
      
      <ValidationProvider>
        {({ validateForm, formState }) => (
          <>
            <FormErrorSummary className="mb-4" />
            
            {step === 1 && (
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Personal Information</h3>
                
                <ValidatedInput
                  name="firstName"
                  label="First Name"
                  required
                  zodSchema={z.string().min(2, 'First name must be at least 2 characters')}
                  placeholder="Enter your first name"
                />
                
                <ValidatedInput
                  name="lastName"
                  label="Last Name"
                  required
                  zodSchema={z.string().min(2, 'Last name must be at least 2 characters')}
                  placeholder="Enter your last name"
                />
                
                <ValidatedInput
                  name="email"
                  label="Email"
                  type="email"
                  required
                  zodSchema={z.string().email('Please enter a valid email address')}
                  placeholder="Enter your email"
                />
                
                <ValidatedInput
                  name="phone"
                  label="Phone Number"
                  required
                  zodSchema={z.string().regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number')}
                  placeholder="Enter your phone number"
                />
                
                <div className="mt-6 flex justify-end">
                  <Button
                    type="button"
                    onClick={async () => {
                      const isValid = await validateForm();
                      if (isValid) {
                        goToNextStep();
                      }
                    }}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Account Details</h3>
                
                <ValidatedInput
                  name="username"
                  label="Username"
                  required
                  rules={[
                    {
                      validator: (value) => /^[a-zA-Z0-9_]+$/.test(value),
                      message: 'Username can only contain letters, numbers, and underscores',
                    },
                    {
                      validator: (value) => value.length >= 3 && value.length <= 20,
                      message: 'Username must be between 3 and 20 characters',
                    }
                  ]}
                  placeholder="Choose a username"
                />
                
                <PasswordWithConfirmation />
                
                <div className="mt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                  >
                    Previous Step
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={async () => {
                      const isValid = await validateForm();
                      if (isValid) {
                        goToNextStep();
                      }
                    }}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div>
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Confirmation</h3>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    Please review your information before submitting:
                  </p>
                  
                  <ReviewField label="First Name" fieldName="firstName" />
                  <ReviewField label="Last Name" fieldName="lastName" />
                  <ReviewField label="Email" fieldName="email" />
                  <ReviewField label="Phone" fieldName="phone" />
                  <ReviewField label="Username" fieldName="username" />
                </div>
                
                <ValidatedInput
                  name="terms"
                  type="checkbox"
                  required
                  rules={[
                    {
                      validator: (value) => value === true,
                      message: 'You must agree to the terms and conditions',
                    }
                  ]}
                  label="I agree to the terms and conditions"
                  className="flex items-center space-x-2"
                  labelClassName="ml-2 text-sm text-gray-700 dark:text-gray-300"
                />
                
                <div className="mt-6">
                  <FormStatus className="mb-4" />
                  
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToPreviousStep}
                    >
                      Previous Step
                    </Button>
                    
                    <SubmitButton>
                      Complete Registration
                    </SubmitButton>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </ValidationProvider>
    </div>
  );
}

// Review field component for multi-step form
function ReviewField({ label, fieldName }: { label: string; fieldName: string }) {
  const { getFieldState } = useValidation();
  const fieldState = getFieldState(fieldName);
  const value = fieldState?.value || '';
  
  return (
    <div className="mb-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}:</span>{' '}
      <span className="text-sm text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}