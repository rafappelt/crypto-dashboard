import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExchangeRateCardViewModel } from '@crypto-dashboard/frontend-core';
import { useI18n } from '../hooks/use-i18n';
import ExchangeRateCardSkeleton from './ExchangeRateCardSkeleton';

interface ExchangeRateCardProps {
  viewModel: ExchangeRateCardViewModel;
  isLoading?: boolean;
}

export default function ExchangeRateCard({ viewModel, isLoading = false }: ExchangeRateCardProps) {
  const chartData = viewModel.chartData;
  const messages = useI18n();

  // Show skeleton when loading or when connected but no data yet
  if (isLoading || (!viewModel.hasData && chartData.length === 0)) {
    return <ExchangeRateCardSkeleton />;
  }

  // Fallback formatters if not provided (defensive programming)
  const formatYAxisValue = viewModel.formatYAxisValue || ((value: number) => value.toFixed(2));
  const formatXAxisTick = viewModel.formatXAxisTick || ((value: string) => new Date(value).toLocaleTimeString());
  const formatTooltipLabel = viewModel.formatTooltipLabel || ((label: string) => new Date(label).toLocaleString());

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 flex flex-col transition-shadow hover:shadow-lg">
      <div className="mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">{viewModel.pairDisplay}</h2>
      </div>
      
      <div className="flex-1 flex flex-col gap-3 md:gap-4">
        <div className="w-full h-[180px] md:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tickFormatter={formatXAxisTick}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                type="number"
                domain={viewModel.yAxisDomain}
                tickFormatter={formatYAxisValue}
                allowDataOverflow={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number) => formatYAxisValue(value)}
                labelFormatter={formatTooltipLabel}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-2 md:gap-3 pt-3 md:pt-4 border-t border-gray-200">
          {viewModel.hasData && viewModel.currentPrice && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{messages.exchangeRateCard.currentPrice}</span>
              <span className="text-sm font-medium text-gray-900">{viewModel.currentPrice}</span>
            </div>
          )}
          
          {viewModel.hasData && viewModel.lastUpdate && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{messages.exchangeRateCard.lastUpdate}</span>
              <span className="text-sm font-medium text-gray-900">{viewModel.lastUpdate}</span>
            </div>
          )}
          
          {viewModel.hasData && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{messages.exchangeRateCard.hourlyAverage}</span>
              <span className="text-base font-semibold text-blue-600">
                {viewModel.hourlyAverage ? `${viewModel.hourlyAverage} ${viewModel.quoteCurrency}` : '—'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

