import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { z } from 'zod';
import dayjs from 'dayjs';
import { FormField, Input } from '../../../components/shared/FormField';

const actionSchemas = {
  EXPAND: z.object({
    additional_quantity: z.number().min(1, 'Additional quantity must be greater than 0'),
    notes: z.string().optional()
  }),
  EXTEND: z.object({
    new_end_date: z.string().min(1, 'New end date is required'),
    notes: z.string().optional()
  }).refine(data => {
    return dayjs(data.new_end_date).isAfter(dayjs());
  }, {
    message: "New end date must be after current date",
    path: ["new_end_date"]
  }),
  RENEW: z.object({
    new_total_quantity: z.number().min(1, 'New total quantity must be greater than 0'),
    new_start_date: z.string().min(1, 'New start date is required'),
    new_end_date: z.string().min(1, 'New end date is required'),
    notes: z.string().optional()
  }).refine(data => {
    const start = dayjs(data.new_start_date);
    const end = dayjs(data.new_end_date);
    return end.isAfter(start);
  }, {
    message: "New end date must be after new start date",
    path: ["new_end_date"]
  })
};

interface License {
  id: string;
  total_quantity: number;
  used_quantity: number;
  start_date: string;
  end_date: string;
}

interface LicenseActionFormProps {
  actionType: 'EXPAND' | 'EXTEND' | 'RENEW';
  license: License;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
}

export interface LicenseActionFormRef {
  validateAndSubmit: () => Promise<boolean>;
}

export const LicenseActionForm = forwardRef<LicenseActionFormRef, LicenseActionFormProps>(({
  actionType,
  license,
  onSubmit,
  onCancel
}, ref) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateAndSubmit = async () => {
    try {
      setFormErrors({});
      const formElement = document.getElementById('licenseActionForm') as HTMLFormElement;
      if (!formElement) return false;

      const formData = new FormData(formElement);
      let data: any = {};

      switch (actionType) {
        case 'EXPAND':
          data = {
            additional_quantity: parseInt(formData.get('additional_quantity') as string),
            notes: formData.get('notes')
          };
          break;

        case 'EXTEND':
          data = {
            new_end_date: formData.get('new_end_date'),
            notes: formData.get('notes')
          };
          break;

        case 'RENEW':
          data = {
            new_total_quantity: parseInt(formData.get('new_total_quantity') as string),
            new_start_date: formData.get('new_start_date'),
            new_end_date: formData.get('new_end_date'),
            notes: formData.get('notes')
          };
          break;
      }

      const schema = actionSchemas[actionType];
      const validatedData = schema.parse(data);
      
      await onSubmit({
        license_id: license.id,
        action_type: actionType,
        ...validatedData
      });

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    validateAndSubmit
  }));

  return (
    <div className="space-y-4">
      <form id="licenseActionForm" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {actionType === 'EXPAND' && (
          <>
            {/* Current License Information */}
            <div className="bg-[#E8F5DC] dark:bg-[#5D7E23]/20 border border-[#99C93B]/30 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Current License Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#5D7E23] dark:text-[#AAD775] font-medium">Total Quantity:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">{license.total_quantity}</span>
                </div>
                <div>
                  <span className="text-[#5D7E23] dark:text-[#AAD775] font-medium">Used:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">{license.used_quantity}</span>
                </div>
                <div>
                  <span className="text-[#5D7E23] dark:text-[#AAD775] font-medium">Available:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">{license.total_quantity - license.used_quantity}</span>
                </div>
                <div>
                  <span className="text-[#5D7E23] dark:text-[#AAD775] font-medium">Expires:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">{dayjs(license.end_date).format('MMM D, YYYY')}</span>
                </div>
              </div>
            </div>

            <FormField
              id="additional_quantity"
              label="Additional Quantity"
              required
              error={formErrors.additional_quantity}
              description={`This will increase the total quantity from ${license.total_quantity} to ${license.total_quantity} + additional quantity`}
            >
              <Input
                id="additional_quantity"
                name="additional_quantity"
                type="number"
                min="1"
                placeholder="Enter additional quantity"
              />
            </FormField>
          </>
        )}

        {actionType === 'EXTEND' && (
          <FormField
            id="new_end_date"
            label="New End Date"
            required
            error={formErrors.new_end_date}
          >
            <Input
              id="new_end_date"
              name="new_end_date"
              type="date"
              min={dayjs().add(1, 'day').format('YYYY-MM-DD')}
              defaultValue={dayjs().add(1, 'year').format('YYYY-MM-DD')}
            />
          </FormField>
        )}

        {actionType === 'RENEW' && (
          <>
            <FormField
              id="new_total_quantity"
              label="New Total Quantity"
              required
              error={formErrors.new_total_quantity}
            >
              <Input
                id="new_total_quantity"
                name="new_total_quantity"
                type="number"
                min="1"
                placeholder="Enter new total quantity"
                defaultValue={license.total_quantity}
              />
            </FormField>

            <FormField
              id="new_start_date"
              label="New Start Date"
              required
              error={formErrors.new_start_date}
            >
              <Input
                id="new_start_date"
                name="new_start_date"
                type="date"
                min={dayjs().format('YYYY-MM-DD')}
                defaultValue={dayjs().format('YYYY-MM-DD')}
              />
            </FormField>

            <FormField
              id="new_end_date"
              label="New End Date"
              required
              error={formErrors.new_end_date}
            >
              <Input
                id="new_end_date"
                name="new_end_date"
                type="date"
                min={dayjs().add(1, 'day').format('YYYY-MM-DD')}
                defaultValue={dayjs().add(1, 'year').format('YYYY-MM-DD')}
              />
            </FormField>
          </>
        )}

        <FormField
          id="notes"
          label="Notes"
          error={formErrors.notes}
        >
          <Input
            id="notes"
            name="notes"
            placeholder="Enter notes (optional)"
          />
        </FormField>
      </form>
    </div>
  );
});

LicenseActionForm.displayName = 'LicenseActionForm';