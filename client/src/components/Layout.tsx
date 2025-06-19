import { Home, BarChart3, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export default function Layout({ children, title, subtitle, actions }: LayoutProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Households", href: "/", icon: Home, current: location === "/" },
    { name: "Reports", href: "/reports", icon: BarChart3, current: location === "/reports" },
    { name: "Settings", href: "/settings", icon: Settings, current: location === "/settings" },
  ];

  return (
    <div className="flex h-screen bg-background-alt">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-secondary">
            <Home className="inline mr-2 h-5 w-5 text-primary" />
            Tax Manager Pro
          </h1>
        </div>
        
        <nav className="mt-6">
          <div className="px-6 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">MAIN</p>
          </div>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <a className={`sidebar-nav-item ${item.current ? 'active' : ''}`}>
                  <Icon className="mr-3 h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-secondary">{title}</h2>
              <p className="text-gray-600 mt-1">{subtitle}</p>
            </div>
            <div className="flex items-center space-x-4">
              {actions}
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <Settings className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
