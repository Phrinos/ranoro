
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Bold } from 'lucide-react';

interface TextFieldWithBoldnessProps {
  name: string;
  label: string;
  control: any;
  isTextarea?: boolean;
}

export const TextFieldWithBoldness: React.FC<TextFieldWithBoldnessProps> = ({
  name,
  label,
  control,
  isTextarea = false,
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-2">
            <FormControl>{isTextarea ? <Textarea {...field} /> : <Input {...field} />}</FormControl>
            <FormField
              control={control}
              name={`${name}Bold`}
              render={({ field: boldField }) => (
                <FormItem className="flex items-center space-x-1.5 space-y-0" title="Negrita">
                  <FormControl>
                    <Checkbox
                      checked={boldField.value}
                      onCheckedChange={boldField.onChange}
                      aria-label={`Toggle bold for ${label}`}
                    />
                  </FormControl>
                  <Bold className="h-4 w-4" />
                </FormItem>
              )}
            />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
