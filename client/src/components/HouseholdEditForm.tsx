import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HouseholdAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { HouseholdWithClients } from "@shared/schema";
import { Trash2 } from "lucide-react";

const editHouseholdSchema = z.object({
  householdName: z.string().min(1, "Household name is required"),
  client1FirstName: z.string().min(1, "First name is required"),
  client1LastName: z.string().min(1, "Last name is required"),
  client2FirstName: z.string().optional(),
  client2LastName: z.string().optional(),
});

type EditHouseholdForm = z.infer<typeof editHouseholdSchema>;

interface HouseholdEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  household: HouseholdWithClients;
}

export default function HouseholdEditForm({ open, onOpenChange, household }: HouseholdEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const primaryClient = household.clients.find(c => c.isPrimary);
  const secondaryClient = household.clients.find(c => !c.isPrimary);

  const form = useForm<EditHouseholdForm>({
    resolver: zodResolver(editHouseholdSchema),
    defaultValues: {
      householdName: household.name,
      client1FirstName: primaryClient?.firstName || "",
      client1LastName: primaryClient?.lastName || "",
      client2FirstName: secondaryClient?.firstName || "",
      client2LastName: secondaryClient?.lastName || "",
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
        });
      }
      
      // Update or create secondary client
      if (data.client2FirstName && data.client2LastName) {
        if (secondaryClient) {
          await HouseholdAPI.updateClient(secondaryClient.id, {
            firstName: data.client2FirstName,
            lastName: data.client2LastName,
          });
        } else {
          await HouseholdAPI.createClient({
            householdId: household.id,
            firstName: data.client2FirstName,
            lastName: data.client2LastName,
            isPrimary: false,
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
      onOpenChange(false);
      form.reset();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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