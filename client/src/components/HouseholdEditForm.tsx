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
import { HouseholdAPI, ChildrenAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { HouseholdWithClients, Child } from "@shared/schema";
import { Trash2, Plus } from "lucide-react";

const childSchema = z.object({
  id: z.number().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  disabled: z.boolean().default(false),
});

const editHouseholdSchema = z.object({
  householdName: z.string().min(1, "Household name is required"),
  client1FirstName: z.string().min(1, "First name is required"),
  client1LastName: z.string().min(1, "Last name is required"),
  client1Disabled: z.boolean().default(false),
  client2FirstName: z.string().optional(),
  client2LastName: z.string().optional(),
  client2Disabled: z.boolean().default(false),
  children: z.array(childSchema).default([]),
});

type EditHouseholdForm = z.infer<typeof editHouseholdSchema>;
type ChildForm = z.infer<typeof childSchema>;

interface HouseholdEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: HouseholdWithClients;
}

export default function HouseholdEditForm({ open, onOpenChange, household }: HouseholdEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [childrenToDelete, setChildrenToDelete] = useState<number[]>([]);

  const primaryClient = household.clients.find(c => c.isPrimary);
  const secondaryClient = household.clients.find(c => !c.isPrimary);

  const form = useForm<EditHouseholdForm>({
    resolver: zodResolver(editHouseholdSchema),
    defaultValues: {
      householdName: household.name,
      client1FirstName: primaryClient?.firstName || "",
      client1LastName: primaryClient?.lastName || "",
      client1Disabled: primaryClient?.disabled || false,
      client2FirstName: secondaryClient?.firstName || "",
      client2LastName: secondaryClient?.lastName || "",
      client2Disabled: secondaryClient?.disabled || false,
      children: household.children?.map(child => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth,
        disabled: child.disabled || false,
      })) || [],
    },
  });

  const updateHouseholdMutation = useMutation({
    mutationFn: async (data: EditHouseholdForm) => {
      // Update household name
      await HouseholdAPI.updateHousehold(household.id, { name: data.householdName });
      
      // Update primary client
      if (primaryClient) {
        await HouseholdAPI.updateClient(primaryClient.id, {
          firstName: data.client1FirstName,
          lastName: data.client1LastName,
          disabled: data.client1Disabled,
        });
      }
      
      // Update or create secondary client
      if (data.client2FirstName && data.client2LastName) {
        if (secondaryClient) {
          await HouseholdAPI.updateClient(secondaryClient.id, {
            firstName: data.client2FirstName,
            lastName: data.client2LastName,
            disabled: data.client2Disabled,
          });
        } else {
          await HouseholdAPI.createClient({
            householdId: household.id,
            firstName: data.client2FirstName,
            lastName: data.client2LastName,
            isPrimary: false,
            disabled: data.client2Disabled,
          });
        }
      }

      // Handle children operations
      // Delete children marked for deletion
      for (const childId of childrenToDelete) {
        await ChildrenAPI.deleteChild(childId);
      }

      // Update or create children
      for (const child of data.children) {
        if (child.id) {
          // Update existing child
          await ChildrenAPI.updateChild(child.id, {
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: child.dateOfBirth,
          });
        } else {
          // Create new child
          await ChildrenAPI.createChild({
            householdId: household.id,
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: child.dateOfBirth,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households", household.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      toast({
        title: "Success",
        description: "Household updated successfully",
      });
      handleDialogClose(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update household",
        variant: "destructive",
      });
    },
  });

  const deleteSecondaryClientMutation = useMutation({
    mutationFn: async () => {
      if (secondaryClient) {
        await HouseholdAPI.deleteClient(secondaryClient.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households", household.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      form.setValue("client2FirstName", "");
      form.setValue("client2LastName", "");
      toast({
        title: "Success",
        description: "Secondary client removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove secondary client",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditHouseholdForm) => {
    updateHouseholdMutation.mutate(data);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setChildrenToDelete([]); // Clear children deletion state
      form.reset(); // Reset form
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Household Members</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Household Name */}
            <FormField
              control={form.control}
              name="householdName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Household Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter household name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Primary Client */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Primary Client</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client1FirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Secondary Client */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Secondary Client</h3>
                {secondaryClient && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSecondaryClientMutation.mutate()}
                    disabled={deleteSecondaryClientMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client2FirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
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
                      <FormLabel>Last Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Children Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Children</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentChildren = form.getValues("children");
                    form.setValue("children", [
                      ...currentChildren,
                      { firstName: "", lastName: "", dateOfBirth: "" }
                    ]);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Child
                </Button>
              </div>

              {form.watch("children").map((child, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Child {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentChildren = form.getValues("children");
                        const childToRemove = currentChildren[index];
                        
                        // If child has an ID, mark for deletion
                        if (childToRemove.id) {
                          setChildrenToDelete(prev => [...prev, childToRemove.id!]);
                        }
                        
                        // Remove from form
                        const newChildren = currentChildren.filter((_, i) => i !== index);
                        form.setValue("children", newChildren);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`children.${index}.firstName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`children.${index}.lastName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`children.${index}.dateOfBirth`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateHouseholdMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {updateHouseholdMutation.isPending ? "Updating..." : "Update Household"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}