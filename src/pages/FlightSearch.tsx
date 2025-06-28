
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, Users, Wifi, Coffee, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

// Mock flight data - In real app, this would come from Amadeus API
const mockFlights = [
  {
    id: "AF001",
    airline: "Air France",
    departure: { time: "08:30", airport: "NKC", city: "Nouakchott" },
    arrival: { time: "16:45", airport: "CDG", city: "Paris" },
    duration: "7h 15m",
    stops: 0,
    price: 450000,
    amenities: ["wifi", "meals", "entertainment"],
    aircraft: "Boeing 737-800"
  },
  {
    id: "TK002", 
    airline: "Turkish Airlines",
    departure: { time: "14:20", airport: "NKC", city: "Nouakchott" },
    arrival: { time: "23:35", airport: "IST", city: "Istanbul" },
    duration: "6h 15m",
    stops: 0,
    price: 380000,
    amenities: ["wifi", "meals", "entertainment"],
    aircraft: "Airbus A320"
  },
  {
    id: "EK003",
    airline: "Emirates",
    departure: { time: "22:10", airport: "NKC", city: "Nouakchott" },
    arrival: { time: "08:25", airport: "DXB", city: "Dubai" },
    duration: "5h 45m",
    stops: 0,
    price: 520000,
    amenities: ["wifi", "meals", "entertainment", "premium"],
    aircraft: "Boeing 777-300ER"
  }
];

const FlightSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchData = location.state;
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);

  const handleSelectFlight = (flightId: string) => {
    const flight = mockFlights.find(f => f.id === flightId);
    navigate("/booking", { state: { flight, searchData } });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-MR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Flights</h1>
          {searchData && (
            <p className="text-gray-600">
              {searchData.from} → {searchData.to} • {searchData.passengers} passenger(s)
            </p>
          )}
        </div>

        <div className="space-y-6">
          {mockFlights.map((flight) => (
            <Card key={flight.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Plane className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{flight.airline}</h3>
                        <p className="text-sm text-gray-500">{flight.aircraft}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{flight.departure.time}</p>
                        <p className="text-sm text-gray-500">{flight.departure.airport}</p>
                        <p className="text-sm font-medium">{flight.departure.city}</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                          <div className="h-px bg-gray-300 flex-1"></div>
                        </div>
                        <p className="text-sm text-gray-500">{flight.duration}</p>
                        <p className="text-xs text-gray-400">
                          {flight.stops === 0 ? "Direct" : `${flight.stops} stop(s)`}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-2xl font-bold">{flight.arrival.time}</p>
                        <p className="text-sm text-gray-500">{flight.arrival.airport}</p>
                        <p className="text-sm font-medium">{flight.arrival.city}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {flight.amenities.includes("wifi") && (
                        <Badge variant="secondary" className="text-xs">
                          <Wifi className="h-3 w-3 mr-1" />
                          WiFi
                        </Badge>
                      )}
                      {flight.amenities.includes("meals") && (
                        <Badge variant="secondary" className="text-xs">
                          <Coffee className="h-3 w-3 mr-1" />
                          Meals
                        </Badge>
                      )}
                      {flight.amenities.includes("premium") && (
                        <Badge variant="default" className="text-xs bg-gold text-white">
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-center lg:text-right">
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      MRU {flight.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">per person</p>
                    <Button 
                      onClick={() => handleSelectFlight(flight.id)}
                      className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700"
                    >
                      Select Flight
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {mockFlights.length === 0 && (
          <div className="text-center py-12">
            <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No flights found</h3>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default FlightSearch;
