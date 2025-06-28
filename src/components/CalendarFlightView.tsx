
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plane } from "lucide-react";

interface FlightPrice {
  date: Date;
  price: number;
  available: boolean;
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

// Mock flight prices - In real app, this would come from Amadeus API
const generateMockPrices = (month: Date): FlightPrice[] => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  
  return days.map(date => ({
    date,
    price: Math.floor(Math.random() * 300000) + 200000, // Random prices between 200k-500k MRU
    available: Math.random() > 0.2 // 80% availability
  }));
};

const CalendarFlightView = ({ searchData, onDateSelect }: CalendarFlightViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const flightPrices = generateMockPrices(currentMonth);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getPriceColor = (price: number) => {
    if (price < 250000) return "bg-green-100 text-green-800 border-green-200";
    if (price < 350000) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

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
                flightPrice.available 
                  ? getPriceColor(flightPrice.price) 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              onClick={() => flightPrice.available && onDateSelect(flightPrice.date)}
            >
              <div className="text-center">
                <div className="font-semibold text-sm mb-1">
                  {format(flightPrice.date, "d")}
                </div>
                {flightPrice.available ? (
                  <div className="text-xs">
                    <div className="flex items-center justify-center mb-1">
                      <Plane className="h-3 w-3" />
                    </div>
                    <div>MRU {(flightPrice.price / 1000).toFixed(0)}k</div>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarFlightView;
