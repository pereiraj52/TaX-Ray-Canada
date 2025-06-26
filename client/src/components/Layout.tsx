import { Link } from "wouter";
import logoPath from "@assets/Download TaxRay_Logo_1750967900646.gif";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

export default function Layout({ children, title, subtitle, actions }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background-alt">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <img 
                  src={logoPath} 
                  alt="Tax-Ray Canada" 
                  className="h-8 w-auto"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Page Header */}
      {(title || subtitle) && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {title && <h2 className="text-2xl font-bold text-secondary">{title}</h2>}
              {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
            </div>
            {actions && (
              <div className="flex items-center space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
