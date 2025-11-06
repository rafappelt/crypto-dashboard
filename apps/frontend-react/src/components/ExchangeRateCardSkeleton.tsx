export default function ExchangeRateCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
      {/* Header skeleton */}
      <div className="mb-4">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
      
      <div className="flex-1 flex flex-col gap-4">
        {/* Chart skeleton */}
        <div className="w-full h-[200px] bg-gray-100 rounded flex items-center justify-center">
          <div className="text-gray-400 text-sm animate-pulse">Loading chart data...</div>
        </div>

        {/* Info skeleton */}
        <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

