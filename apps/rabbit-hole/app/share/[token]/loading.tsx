/**
 * Loading Component for Share Pages
 *
 * Displays loading state while share token is being validated
 * and timeline data is being fetched
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse">
            {/* Timeline Header */}
            <div className="mb-4">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>

            {/* Timeline Chart Placeholder */}
            <div className="h-[300px] bg-gray-100 rounded border flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">
                  Loading timeline...
                </p>
              </div>
            </div>

            {/* Footer placeholder */}
            <div className="mt-4">
              <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
