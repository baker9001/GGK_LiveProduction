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

// Define Zod schemas for validation
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number');

export function SimpleFormExample() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Contact Form</h2>
      
      <ValidationProvider>
        <FormErrorSummary className="mb-4" />
        
        <ValidatedInput
          name="name"
          label="Name"
          required
          zodSchema={nameSchema}
          placeholder="Enter your name"
          helperText="Your full name"
        />
        
        <ValidatedInput
          name="email"
          label="Email"
          type="email"
          required
          zodSchema={emailSchema}
          placeholder="Enter your email"
          helperText="We'll never share your email"
        />
        
        <ValidatedTextarea
          name="message"
          label="Message"
          required
          rules={[
            {
              validator: (value) => value.length >= 10,
              message: 'Message must be at least 10 characters'
            }
          ]}
          placeholder="Enter your message"
          rows={4}
        />
        
        <div className="mt-6">
          <FormStatus className="mb-4" />
          <SubmitButton>Submit</SubmitButton>
        </div>
      </ValidationProvider>
    </div>
  );
}

export function AdvancedFormExample() {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Registration Form</h2>
      
      <ValidationProvider
        validateOnChange={false}
        validateOnBlur={true}
        onSubmit={async (data) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log('Form submitted:', data);
          // In a real app, you would submit to your API here
        }}
      >
        {({ formState }) => (
          <>
            <FormErrorSummary className="mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                name="firstName"
                label="First Name"
                required
                zodSchema={nameSchema}
                placeholder="Enter your first name"
              />
              
              <ValidatedInput
                name="lastName"
                label="Last Name"
                required
                zodSchema={nameSchema}
                placeholder="Enter your last name"
              />
            </div>
            
            <ValidatedInput
              name="email"
              label="Email"
              type="email"
              required
              zodSchema={emailSchema}
              placeholder="Enter your email"
              helperText="We'll never share your email"
            />
            
            <PasswordField />
            
            <ValidatedInput
              name="phone"
              label="Phone Number"
              required
              zodSchema={phoneSchema}
              placeholder="Enter your phone number"
              helperText="Format: +1234567890"
            />
            
            <ValidatedSelect
              name="country"
              label="Country"
              required
              options={[
                { value: 'us', label: 'United States' },
                { value: 'ca', label: 'Canada' },
                { value: 'uk', label: 'United Kingdom' },
                { value: 'au', label: 'Australia' },
              ]}
              helperText="Select your country of residence"
            />
            
            <ValidatedTextarea
              name="address"
              label="Address"
              required
              placeholder="Enter your address"
              rows={3}
            />
            
            <div className="mt-6">
              <FormStatus className="mb-4" />
              
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Reset form logic would go here
                  }}
                >
                  Reset
                </Button>
                
                <SubmitButton
                  disabled={formState.isSubmitting}
                  loadingText="Creating Account..."
                >
                  Create Account
                </SubmitButton>
              </div>
            </div>
          </>
        )}
      </ValidationProvider>
    </div>
  );
}

function PasswordField() {
  const [showPassword, setShowPassword] = useState(false);
  const { register, getFieldState } = useValidation();
  
  const { value, onChange, onBlur, ref } = register('password', {
    required: true,
    zodSchema: passwordSchema,
    validateOnChange: true,
  });
  
  const fieldState = getFieldState('password');
  const hasError = fieldState?.result.errors.length > 0;
  
  return (
    <div className="mb-4">
      <label 
        htmlFor="password" 
        className={`block text-sm font-medium mb-1 ${hasError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
      >
        Password <span className="text-red-500">*</span>
      </label>
      
      <div className="relative">
        <input
          id="password"
          ref={ref as React.RefObject<HTMLInputElement>}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm text-sm transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            ${hasError ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600"}`}
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
      
      <PasswordStrength password={value} className="mt-2" />
      
      {fieldState?.result.errors.map((error, index) => (
        <p 
          key={`password-error-${index}`} 
          className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center"
        >
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          {error}
        </p>
      ))}
      
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Password must be at least 8 characters
      </p>
    </div>
  );
}

// Import the necessary icon
function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}