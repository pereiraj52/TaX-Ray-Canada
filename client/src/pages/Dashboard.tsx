import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import HouseholdForm from "@/components/HouseholdForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { HouseholdAPI } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: households = [], isLoading } = useQuery<HouseholdWithClients[]>({
    queryKey: ["/api/households"],
    queryFn: () => HouseholdAPI.getHouseholds(),
  });

  const deleteHouseholdMutation = useMutation({
    mutationFn: (householdId: number) => HouseholdAPI.deleteHousehold(householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households"] });
      toast({
        title: "Success",
        description: "Household deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete household",
        variant: "destructive",
      });
    },
  });

  const filteredHouseholds = households.filter(household => {
    const matchesSearch = household.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         household.clients.some(client => 
                           `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    return matchesSearch;
  });



  const getClientStatusBadge = (client: any) => {
    const t1Count = client.t1Returns?.length || 0;
    const completedCount = client.t1Returns?.filter((t: any) => t.processingStatus === 'completed').length || 0;
    const pendingCount = client.t1Returns?.filter((t: any) => t.processingStatus === 'processing').length || 0;

    if (completedCount > 0) {
      return <span className="status-badge status-complete">{completedCount} Complete</span>;
    } else if (pendingCount > 0) {
      return <span className="status-badge status-pending">{pendingCount} Pending</span>;
    } else {
      return <span className="status-badge status-failed">0 Returns</span>;
    }
  };

  const getClientAvatarColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[index % colors.length];
  };



  if (isLoading) {
    return (
      <Layout 
        title="" 
        subtitle=""
      >
        <div className="p-6">
          Loading households...
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="" 
      subtitle=""
    >
      <div className="p-6">

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search households..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Household
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Households Table */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-secondary">Active Households</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Household Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHouseholds.map((household) => (
                  <tr key={household.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-secondary">{household.name}</div>
                      <div className="text-sm text-gray-500">
                        {household.clients.length} client{household.clients.length !== 1 ? 's' : ''}
                        {household.children && household.children.length > 0 && (
                          <span>, {household.children.length} child{household.children.length !== 1 ? 'ren' : ''}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-2">
                        {household.clients.map((client, index) => (
                          <div
                            key={client.id}
                            className={`client-avatar ${getClientAvatarColor(index)}`}
                            title={`${client.firstName} ${client.lastName}`}
                          >
                            {client.firstName[0]}{client.lastName[0]}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(household.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <Link href={`/household/${household.id}`}>
                          <Button variant="outline" size="sm">
                            Open
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Household</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{household.name}"? This action will permanently delete the household, all associated clients, children, and T1 returns. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteHouseholdMutation.mutate(household.id)}
                                disabled={deleteHouseholdMutation.isPending}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deleteHouseholdMutation.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <HouseholdForm 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />
    </Layout>
  );
}
