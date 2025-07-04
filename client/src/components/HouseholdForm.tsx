import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HouseholdAPI, CreateHouseholdRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const createHouseholdSchema = z.object({
  client1FirstName: z.string().min(1, "First name is required"),
  client1LastName: z.string().min(1, "Last name is required"),
  enableClient2: z.boolean().default(false),
  client2FirstName: z.string().optional(),
  client2LastName: z.string().optional(),
}).refine((data) => {
  if (data.enableClient2) {
    return data.client2FirstName && data.client2FirstName.length > 0 &&
           data.client2LastName && data.client2LastName.length > 0;
  }
  return true;
}, {
  message: "Second client name is required when enabled",
  path: ["client2FirstName"],
});

type CreateHouseholdForm = z.infer<typeof createHouseholdSchema>;

interface HouseholdFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HouseholdForm({ open, onOpenChange }: HouseholdFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateHouseholdForm>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: {
      client1FirstName: "",
      client1LastName: "",
      enableClient2: false,
      client2FirstName: "",
      client2LastName: "",
    },
  });

  const createHouseholdMutation = useMutation({
    mutationFn: (data: CreateHouseholdRequest) => HouseholdAPI.createHousehold(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      toast({
        title: "Success",
        description: "Household created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create household",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();

  const generateHouseholdName = (): string => {
    const { client1FirstName, client1LastName, enableClient2, client2FirstName, client2LastName } = watchedValues;

    if (!client1FirstName || !client1LastName) {
      return "Enter client information above";
    }

    if (enableClient2 && client2FirstName && client2LastName) {
      if (client1LastName === client2LastName) {
        return `${client1LastName}, ${client1FirstName} & ${client2FirstName}`;
      } else {
        return `${client1LastName} & ${client2LastName}, ${client1FirstName} & ${client2FirstName}`;
      }
    }

    return `${client1LastName}, ${client1FirstName}`;
  };

  const onSubmit = (data: CreateHouseholdForm) => {
    const request: CreateHouseholdRequest = {
      client1: {
        firstName: data.client1FirstName,
        lastName: data.client1LastName,
      },
    };

    if (data.enableClient2 && data.client2FirstName && data.client2LastName) {
      request.client2 = {
        firstName: data.client2FirstName,
        lastName: data.client2LastName,
      };
    }

    createHouseholdMutation.mutate(request);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Household</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Primary Client */}
            <div>
              <h4 className="text-md font-medium text-secondary mb-4">Primary Client</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client1FirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="client1LastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Secondary Client */}
            <div>
              <div className="flex items-center mb-4">
                <h4 className="text-md font-medium text-secondary">Secondary Client (Optional)</h4>
                <FormField
                  control={form.control}
                  name="enableClient2"
                  render={({ field }) => (
                    <FormItem className="ml-4">
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <Label className="text-sm text-gray-600">Add second client</Label>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {watchedValues.enableClient2 && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="client2FirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client2LastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Household Name Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Household Name (Auto-generated)
              </Label>
              <div className="text-lg font-medium text-secondary">
                {generateHouseholdName()}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createHouseholdMutation.isPending}
              >
                {createHouseholdMutation.isPending ? "Creating..." : "Create Household"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
