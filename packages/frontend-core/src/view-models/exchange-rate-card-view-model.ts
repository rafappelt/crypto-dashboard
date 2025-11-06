export interface ExchangeRateCardViewModel {
  pair: string;
  pairDisplay: string;
  quoteCurrency: string;
  currentPrice: string;
  lastUpdate: string;
  hourlyAverage: string;
  chartData: Array<{
    time: string;
    price: number;
  }>;
  hasData: boolean;
  yAxisDomain: [number, number] | undefined;
  formatYAxisValue: (value: number) => string;
  formatXAxisTick: (value: string) => string;
  formatTooltipLabel: (label: string) => string;
}

