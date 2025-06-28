
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, Users, Wifi, Coffee, ArrowRight, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { amadeusApi, AmadeusFlightOffer } from "@/services/amadeusApi";
import { useToast } from "@/hooks/use-toast";

const FlightSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const searchData = location.state;
  const [flights, setFlights] = useState<AmadeusFlightOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchFlights = async () => {
      if (!searchData) {
        setError("No search data provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const flightOffers = await amadeusApi.searchFlights({
          originLocationCode: searchData.from,
          destinationLocationCode: searchData.to,
          departureDate: searchData.departDate,
          returnDate: searchData.tripType === 'round-trip' ? searchData.returnDate : undefined,
          adults: searchData.passengers,
          currencyCode: 'EUR', // We'll convert to MRU in display
          max: 50,
        });

        setFlights(flightOffers);
      } catch (err) {
        console.error('Flight search error:', err);
        setError('Failed to search flights. Please try again.');
        toast({
          title: "Search Failed",
          description: "Unable to fetch flights from Amadeus API. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    searchFlights();
  }, [searchData, toast]);

  const handleSelectFlight = (flight: AmadeusFlightOffer) => {
    navigate("/booking", { state: { flight, searchData } });
  };

  const convertEurToMru = (eurAmount: string): number => {
    // Approximate conversion rate: 1 EUR = 450 MRU
    const eurValue = parseFloat(eurAmount);
    return Math.round(eurValue * 450);
  };

  const formatDuration = (duration: string): string => {
    // Convert ISO 8601 duration to readable format
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    
    const hours = match[1] ? match[1].replace('H', 'h ') : '';
    const minutes = match[2] ? match[2].replace('M', 'm') : '';
    return `${hours}${minutes}`;
  };

  const getAirlineName = (carrierCode: string): string => {
    const airlines: { [key: string]: string } = {
      'AF': 'Air France',
      'TK': 'Turkish Airlines',
      'EK': 'Emirates',
      'LH': 'Lufthansa',
      'BA': 'British Airways',
      'KL': 'KLM',
      'QR': 'Qatar Airways',
      'EY': 'Etihad Airways',
      'MS': 'EgyptAir',
      'AT': 'Royal Air Maroc',
    };
    return airlines[carrierCode] || carrierCode;
  };

  const getCityName = (code: string) => {
    const cities: { [key: string]: string } = {
      'NKC': 'Nouakchott',
      'CDG': 'Paris',
      'IST': 'Istanbul',
      'DXB': 'Dubai',
      'CMN': 'Casablanca',
      'LHR': 'London',
      'JFK': 'New York',
      'DOH': 'Doha',
      'CAI': 'Cairo',
      'DKR': 'Dakar'
    };
    return cities[code] || code;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Searching flights...</h3>
              <p className="text-gray-500">Please wait while we find the best options for you</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Search Error</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Search
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            ← Back to Search
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Flights</h1>
          {searchData && (
            <div className="flex flex-wrap gap-4 text-gray-600">
              <p>{getCityName(searchData.from)} → {getCityName(searchData.to)}</p>
              <p>• {searchData.passengers} passenger(s)</p>
              <p>• {searchData.tripType === 'one-way' ? 'One Way' : 'Round Trip'}</p>
              {searchData.departDate && (
                <p>• {format(new Date(searchData.departDate), "PPP")}</p>
              )}
            </div>
          )}
          <p className="text-sm text-blue-600 mt-2">
            Found {flights.length} flight(s) from Amadeus API
          </p>
        </div>

        <div className="space-y-6">
          {flights.map((flight) => {
            const segment = flight.itineraries[0]?.segments[0];
            if (!segment) return null;

            const departureTime = format(new Date(segment.departure.at), "HH:mm");
            const arrivalTime = format(new Date(segment.arrival.at), "HH:mm");
            const duration = formatDuration(flight.itineraries[0].duration);
            const price = convertEurToMru(flight.price.total);
            const airline = getAirlineName(segment.carrierCode);

            return (
              <Card key={flight.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Plane className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{airline}</h3>
                          <p className="text-sm text-gray-500">{segment.carrierCode}{segment.number}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{departureTime}</p>
                          <p className="text-sm text-gray-500">{segment.departure.iataCode}</p>
                          <p className="text-sm font-medium">{getCityName(segment.departure.iataCode)}</p>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <div className="h-px bg-gray-300 flex-1"></div>
                            <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                            <div className="h-px bg-gray-300 flex-1"></div>
                          </div>
                          <p className="text-sm text-gray-500">{duration}</p>
                          <p className="text-xs text-gray-400">
                            {segment.numberOfStops === 0 ? "Direct" : `${segment.numberOfStops} stop(s)`}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-2xl font-bold">{arrivalTime}</p>
                          <p className="text-sm text-gray-500">{segment.arrival.iataCode}</p>
                          <p className="text-sm font-medium">{getCityName(segment.arrival.iataCode)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="secondary" className="text-xs">
                          <Wifi className="h-3 w-3 mr-1" />
                          WiFi Available
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Coffee className="h-3 w-3 mr-1" />
                          Meals Included
                        </Badge>
                        {flight.pricingOptions.fareType.includes('PUBLISHED') && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Published Fare
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-center lg:text-right">
                      <p className="text-3xl font-bold text-blue-600 mb-2">
                        MRU {price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 mb-4">per person</p>
                      <Button 
                        onClick={() => handleSelectFlight(flight)}
                        className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700"
                      >
                        Select Flight
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {flights.length === 0 && !loading && (
          <div className="text-center py-12">
            <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No flights found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or search dates</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default FlightSearch;
