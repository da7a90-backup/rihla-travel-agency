// Updated CalendarFlightView.tsx with rate limiting
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Plane, Loader2, AlertCircle } from "lucide-react";
import { amadeusApi } from "@/services/amadeusApi";
import { useToast } from "@/hooks/use-toast";

interface FlightPrice {
  date: Date;
  price: number;
  available: boolean;
  flightCount: number;
  loading: boolean;
  error: string | null;
}

interface CalendarFlightViewProps {
  searchData: {
    from: string;
    to: string;
    passengers: number;
    tripType: string;
  };
  onDateSelect: (date: Date) => void;
}

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const CalendarFlightView = ({ searchData, onDateSelect }: CalendarFlightViewProps) => {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [flightPrices, setFlightPrices] = useState<FlightPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlightPrices = async () => {
      setLoading(true);
      setMonthError(null);
      
      try {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        
        // Initialize all days
        const initialPrices = days.map(date => ({
          date,
          price: 0,
          available: false,
          flightCount: 0,
          loading: date >= new Date(),
          error: null
        }));
        
        setFlightPrices(initialPrices);

        // Filter only future dates
        const futureDays = days.filter(date => date >= new Date());
        
        // Sort dates by priority: this week first, then next week, etc.
        const today = new Date();
        const prioritizedDays = futureDays.sort((a, b) => {
          const diffA = Math.abs(a.getTime() - today.getTime());
          const diffB = Math.abs(b.getTime() - today.getTime());
          return diffA - diffB;
        });

        console.log(`Loading flights for ${prioritizedDays.length} days with 2-second delays`);

        // Process dates sequentially with delay to avoid rate limits
        for (let i = 0; i < prioritizedDays.length; i++) {
          const date = prioritizedDays[i];
          const dayIndex = days.findIndex(d => isSameDay(d, date));
          
          try {
            // Add 2-second delay between requests (except for first one)
            if (i > 0) {
              await delay(2000);
            }

            console.log(`Fetching flights for ${format(date, 'yyyy-MM-dd')} (${i + 1}/${prioritizedDays.length})`);

            const flights = await amadeusApi.searchFlights({
              originLocationCode: searchData.from,
              destinationLocationCode: searchData.to,
              departureDate: format(date, 'yyyy-MM-dd'),
              adults: searchData.passengers,
              currencyCode: 'EUR',
              max: 50, // Reduced to 5 flights per day
            });

            const dayResult = {
              date,
              price: 0,
              available: false,
              flightCount: 0,
              loading: false,
              error: null
            };

            if (flights.length > 0) {
              const prices = flights.map(flight => flight.price.totalMRU || 0);
              const minPrice = Math.min(...prices);
              
              dayResult.price = minPrice;
              dayResult.available = true;
              dayResult.flightCount = flights.length;
            }

            // Update this specific date
            setFlightPrices(prev => prev.map((fp, index) => 
              index === dayIndex ? dayResult : fp
            ));

          } catch (error) {
            console.error(`Error fetching flights for ${format(date, 'yyyy-MM-dd')}:`, error);
            
            const errorResult = {
              date,
              price: 0,
              available: false,
              flightCount: 0,
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to load flights'
            };

            // If it's a rate limit error, add longer delay before next request
            if (error instanceof Error && error.message.includes('rate limit')) {
              console.log('Rate limit hit, adding 5-second delay');
              await delay(5000);
            }

            setFlightPrices(prev => prev.map((fp, index) => 
              index === dayIndex ? errorResult : fp
            ));
          }
        }

        console.log('Finished loading all flight prices');
        
      } catch (error) {
        console.error('Error fetching flight calendar:', error);
        setMonthError("Failed to load flight calendar. Please check your connection and try again.");
        
        toast({
          title: "Calendar Load Error",
          description: "Failed to load flight prices. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFlightPrices();
  }, [currentMonth, searchData, toast]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getPriceColor = (price: number, available: boolean, error: string | null) => {
    if (error) return "bg-red-100 text-red-600 border-red-200";
    if (!available) return "bg-gray-100 text-gray-400 border-gray-200";
    
    if (price < 250000) return "bg-green-100 text-green-800 border-green-200";
    if (price < 350000) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const handleDateClick = (flightPrice: FlightPrice) => {
    if (flightPrice.available && !flightPrice.loading) {
      onDateSelect(flightPrice.date);
    }
  };

  // Count loading dates
  const loadingCount = flightPrices.filter(fp => fp.loading).length;
  const loadedCount = flightPrices.filter(fp => !fp.loading && fp.date >= new Date()).length;
  const totalFutureDates = flightPrices.filter(fp => fp.date >= new Date()).length;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Select Your Travel Date</h3>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading progress */}
        {loading && (
          <div className="mb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">
                Loading prices: {loadedCount}/{totalFutureDates} days
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${totalFutureDates > 0 ? (loadedCount / totalFutureDates) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {flightPrices.map((flightPrice) => (
            <div
              key={flightPrice.date.toISOString()}
              className={`min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                getPriceColor(flightPrice.price, flightPrice.available, flightPrice.error)
              } ${flightPrice.loading ? 'animate-pulse' : ''}`}
              onClick={() => handleDateClick(flightPrice)}
            >
              <div className="text-center">
                <div className="font-semibold text-sm mb-1">
                  {format(flightPrice.date, "d")}
                </div>
                
                {flightPrice.loading ? (
                  <div className="text-xs">
                    <Loader2 className="h-3 w-3 animate-spin mx-auto mb-1" />
                    <div>Loading...</div>
                  </div>
                ) : flightPrice.error ? (
                  <div className="text-xs">
                    <AlertCircle className="h-3 w-3 mx-auto mb-1" />
                    <div>Error</div>
                  </div>
                ) : flightPrice.available ? (
                  <div className="text-xs">
                    <div className="flex items-center justify-center mb-1">
                      <Plane className="h-3 w-3" />
                    </div>
                    <div>MRU {(flightPrice.price / 1000).toFixed(0)}k</div>
                    <div className="text-xs opacity-70">{flightPrice.flightCount} flight(s)</div>
                  </div>
                ) : (
                  <div className="text-xs">N/A</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            <span>Best Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            <span>High Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded"></div>
            <span>No Flights</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarFlightView;