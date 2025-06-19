import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Home, FileText, Clock, Calendar, Search, Eye } from "lucide-react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import HouseholdForm from "@/components/HouseholdForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { HouseholdAPI } from "@/lib/api";
import { HouseholdWithClients } from "@shared/schema";

export default function Dashboard() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const { data: households = [], isLoading } = useQuery<HouseholdWithClients[]>({
    queryKey: ["/api/households"],
    queryFn: () => HouseholdAPI.getHouseholds(),
  });

  const filteredHouseholds = households.filter(household => {
    const matchesSearch = household.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         household.clients.some(client => 
                           `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesProvince = provinceFilter === "all" || 
                           household.clients.some(client => client.province === provinceFilter);
    
    return matchesSearch && matchesProvince;
  });

  const stats = {
    totalHouseholds: households.length,
    t1Returns: households.reduce((total, h) => 
      total + h.clients.reduce((clientTotal, c) => clientTotal + (c.t1Returns?.length || 0), 0), 0
    ),
    pendingReviews: households.reduce((total, h) => 
      total + h.clients.reduce((clientTotal, c) => 
        clientTotal + (c.t1Returns?.filter(t => t.processingStatus === 'processing').length || 0), 0
      ), 0
    ),
    currentYear: new Date().getFullYear(),
  };

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

  const headerActions = (
    <Button onClick={() => setCreateModalOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      New Household
    </Button>
  );

  if (isLoading) {
    return (
      <Layout 
        title="Household Management" 
        subtitle="Manage client households and T1 tax returns"
        actions={headerActions}
      >
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stats-card animate-pulse">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="ml-4">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Household Management" 
      subtitle="Manage client households and T1 tax returns"
      actions={headerActions}
    >
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="stats-card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Home className="text-primary text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Households</p>
                <p className="text-2xl font-bold text-secondary">{stats.totalHouseholds}</p>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="text-accent text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">T1 Returns Processed</p>
                <p className="text-2xl font-bold text-secondary">{stats.t1Returns}</p>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="text-warning text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-secondary">{stats.pendingReviews}</p>
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-purple-600 text-xl h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tax Year {stats.currentYear}</p>
                <p className="text-2xl font-bold text-secondary">Active</p>
              </div>
            </div>
          </div>
        </div>

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
                <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Provinces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    <SelectItem value="Ontario">Ontario</SelectItem>
                    <SelectItem value="Quebec">Quebec</SelectItem>
                    <SelectItem value="British Columbia">British Columbia</SelectItem>
                    <SelectItem value="Alberta">Alberta</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
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
                    T1 Returns
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHouseholds.map((household) => (
                  <tr key={household.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-secondary">{household.name}</div>
                      <div className="text-sm text-gray-500">{household.clients.length} client{household.clients.length !== 1 ? 's' : ''}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {household.clients.map((client) => getClientStatusBadge(client))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(household.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/household/${household.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
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
