// Complete src/pages/FlightSearch.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, Users, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { amadeusApi, AmadeusFlightOffer } from "@/services/amadeusApi";
import { useToast } from "@/hooks/use-toast";

interface FlightItinerary {
  id: string;
  type: 'one-way' | 'round-trip';
  outbound: AmadeusFlightOffer;
  return?: AmadeusFlightOffer;
  totalPrice: number;
  totalDuration: string;
  tags: string[];
  sameAirline: boolean;
  selfTransfer: boolean;
}

const FlightSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const searchData = location.state;
  const [itineraries, setItineraries] = useState<FlightItinerary[]>([]);
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
        
        // Format dates properly
        const formattedDepartDate = searchData.departDate instanceof Date 
          ? format(searchData.departDate, 'yyyy-MM-dd')
          : searchData.departDate;

        console.log('Searching flights:', {
          type: searchData.tripType,
          outbound: `${searchData.from} → ${searchData.to} on ${formattedDepartDate}`,
          return: searchData.returnDate ? `${searchData.to} → ${searchData.from} on ${format(searchData.returnDate, 'yyyy-MM-dd')}` : 'N/A'
        });

        if (searchData.tripType === 'one-way') {
          // One-way search
          const outboundFlights = await amadeusApi.searchFlights({
            originLocationCode: searchData.from,
            destinationLocationCode: searchData.to,
            departureDate: formattedDepartDate,
            adults: searchData.passengers,
            currencyCode: 'EUR',
            max: 50,
          });

          const oneWayItineraries: FlightItinerary[] = outboundFlights.map(flight => ({
            id: `oneway-${flight.id}`,
            type: 'one-way',
            outbound: flight,
            totalPrice: flight.price.totalMRU || 0,
            totalDuration: flight.itineraries[0]?.duration || '',
            tags: [],
            sameAirline: true,
            selfTransfer: false
          }));

          const taggedItineraries = tagItineraries(oneWayItineraries);
          setItineraries(taggedItineraries);

        } else {
          // Round-trip search - fetch both directions
          const formattedReturnDate = searchData.returnDate instanceof Date 
            ? format(searchData.returnDate, 'yyyy-MM-dd')
            : searchData.returnDate;

          console.log('Fetching round-trip flights...');
          
          const [outboundFlights, returnFlights] = await Promise.all([
            amadeusApi.searchFlights({
              originLocationCode: searchData.from,
              destinationLocationCode: searchData.to,
              departureDate: formattedDepartDate,
              adults: searchData.passengers,
              currencyCode: 'EUR',
              max: 30, // Reduced to avoid too many combinations
            }),
            amadeusApi.searchFlights({
              originLocationCode: searchData.to, // Reverse route for return
              destinationLocationCode: searchData.from,
              departureDate: formattedReturnDate,
              adults: searchData.passengers,
              currencyCode: 'EUR',
              max: 30,
            })
          ]);

          console.log(`Found ${outboundFlights.length} outbound and ${returnFlights.length} return flights`);

          // Create all combinations
          const roundTripItineraries: FlightItinerary[] = [];
          
          outboundFlights.forEach(outbound => {
            returnFlights.forEach(returnFlight => {
              const outboundCarrier = outbound.itineraries[0]?.segments[0]?.carrierCode;
              const returnCarrier = returnFlight.itineraries[0]?.segments[0]?.carrierCode;
              const sameAirline = outboundCarrier === returnCarrier;
              
              // Check for self-transfer (different airlines or multiple segments)
              const outboundStops = outbound.itineraries[0]?.segments.length > 1;
              const returnStops = returnFlight.itineraries[0]?.segments.length > 1;
              const selfTransfer = !sameAirline || outboundStops || returnStops;

              const totalPrice = (outbound.price.totalMRU || 0) + (returnFlight.price.totalMRU || 0);
              
              // Calculate total duration
              const outboundDuration = parseDuration(outbound.itineraries[0]?.duration || '');
              const returnDuration = parseDuration(returnFlight.itineraries[0]?.duration || '');
              const totalDuration = formatDuration(outboundDuration + returnDuration);

              roundTripItineraries.push({
                id: `roundtrip-${outbound.id}-${returnFlight.id}`,
                type: 'round-trip',
                outbound,
                return: returnFlight,
                totalPrice,
                totalDuration,
                tags: [],
                sameAirline,
                selfTransfer
              });
            });
          });

          console.log(`Created ${roundTripItineraries.length} round-trip combinations`);

          // Sort and tag itineraries
          const sortedItineraries = sortRoundTripItineraries(roundTripItineraries);
          const taggedItineraries = tagItineraries(sortedItineraries);
          
          setItineraries(taggedItineraries);
        }

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

  // Helper functions
  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return 0;
    
    const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
    const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
    return hours * 60 + minutes;
  };

  const formatDuration = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const sortRoundTripItineraries = (itineraries: FlightItinerary[]): FlightItinerary[] => {
    return itineraries.sort((a, b) => {
      // 1. Same airline preferred
      if (a.sameAirline && !b.sameAirline) return -1;
      if (!a.sameAirline && b.sameAirline) return 1;
      
      // 2. No self-transfer preferred
      if (!a.selfTransfer && b.selfTransfer) return -1;
      if (a.selfTransfer && !b.selfTransfer) return 1;
      
      // 3. Cheaper price
      return a.totalPrice - b.totalPrice;
    });
  };

  const tagItineraries = (itineraries: FlightItinerary[]): FlightItinerary[] => {
    if (itineraries.length === 0) return itineraries;

    const sortedByPrice = [...itineraries].sort((a, b) => a.totalPrice - b.totalPrice);
    const sortedByDuration = [...itineraries].sort((a, b) => 
      parseDuration(a.totalDuration) - parseDuration(b.totalDuration)
    );

    return itineraries.map(itinerary => {
      const tags: string[] = [];

      // Tag cheapest
      if (itinerary.id === sortedByPrice[0]?.id) {
        tags.push('Cheapest');
      }

      // Tag fastest
      if (itinerary.id === sortedByDuration[0]?.id) {
        tags.push('Fastest');
      }

      // Tag same airline for round-trip
      if (itinerary.sameAirline && itinerary.type === 'round-trip') {
        tags.push('Same Airline');
      }

      // Tag best overall (same airline + good price + duration)
      if (itinerary.sameAirline && !itinerary.selfTransfer) {
        const priceRank = sortedByPrice.findIndex(i => i.id === itinerary.id);
        const durationRank = sortedByDuration.findIndex(i => i.id === itinerary.id);
        if (priceRank < itineraries.length * 0.3 && durationRank < itineraries.length * 0.3) {
          tags.push('Best Overall');
        }
      }

      return {
        ...itinerary,
        tags
      };
    });
  };

  const handleSelectItinerary = (itinerary: FlightItinerary) => {
    if (itinerary.type === 'one-way') {
      navigate("/booking", { 
        state: { 
          flight: itinerary.outbound, 
          searchData 
        } 
      });
    } else {
      navigate("/booking", { 
        state: { 
          outboundFlight: itinerary.outbound, 
          returnFlight: itinerary.return,
          totalPrice: itinerary.totalPrice,
          searchData 
        } 
      });
    }
  };

  const renderFlightSegment = (flight: AmadeusFlightOffer, label: string) => {
    const segment = flight.itineraries[0]?.segments[0];
    if (!segment) return null;

    const departureTime = format(new Date(segment.departure.at), "HH:mm");
    const arrivalTime = format(new Date(segment.arrival.at), "HH:mm");
    const departureDate = format(new Date(segment.departure.at), "MMM dd");
    const arrivalDate = format(new Date(segment.arrival.at), "MMM dd");
    const airline = amadeusApi.getAirlineName(segment.carrierCode);
    const duration = formatDuration(parseDuration(flight.itineraries[0]?.duration || ''));
    const stops = segment.numberOfStops || 0;

    return (
      <div className="flex-1">
        <div className="text-sm text-gray-500 mb-2 font-medium">{label}</div>
        <div className="flex items-center gap-4">
          {/* Departure */}
          <div className="text-center min-w-[80px]">
            <p className="text-xl font-bold">{departureTime}</p>
            <p className="text-xs text-gray-500">{departureDate}</p>
            <p className="text-sm font-medium">{amadeusApi.getCityName(segment.departure.iataCode)}</p>
            <p className="text-xs text-gray-400">{segment.departure.iataCode}</p>
          </div>

          {/* Flight info */}
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center mb-1">
              <div className="h-px bg-gray-300 flex-1"></div>
              <div className="px-3">
                <Plane className="h-4 w-4 text-gray-400" />
              </div>
              <div className="h-px bg-gray-300 flex-1"></div>
            </div>
            <p className="text-sm font-medium text-gray-700">{airline}</p>
            <p className="text-xs text-gray-500">{segment.carrierCode}{segment.number}</p>
            <p className="text-xs text-gray-500">{duration}</p>
            {stops > 0 && (
              <p className="text-xs text-orange-600">{stops} stop{stops > 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Arrival */}
          <div className="text-center min-w-[80px]">
            <p className="text-xl font-bold">{arrivalTime}</p>
            <p className="text-xs text-gray-500">{arrivalDate}</p>
            <p className="text-sm font-medium">{amadeusApi.getCityName(segment.arrival.iataCode)}</p>
            <p className="text-xs text-gray-400">{segment.arrival.iataCode}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchData?.tripType === 'round-trip' ? 'Finding round-trip combinations...' : 'Searching flights...'}
              </h3>
              <p className="text-gray-500">Please wait while we find the best options for you</p>
              {searchData?.tripType === 'round-trip' && (
                <p className="text-sm text-gray-400 mt-2">This may take a moment as we compare all flight combinations</p>
              )}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Available {searchData?.tripType === 'round-trip' ? 'Round-Trip Itineraries' : 'Flights'}
          </h1>
          {searchData && (
            <div className="flex flex-wrap gap-4 text-gray-600 mb-2">
              <p>{amadeusApi.getCityName(searchData.from)} → {amadeusApi.getCityName(searchData.to)}</p>
              <p>• {searchData.passengers} passenger(s)</p>
              <p>• {searchData.tripType === 'one-way' ? 'One Way' : 'Round Trip'}</p>
              {searchData.departDate && (
                <p>• Outbound: {format(searchData.departDate, "PPP")}</p>
              )}
              {searchData.returnDate && (
                <p>• Return: {format(searchData.returnDate, "PPP")}</p>
              )}
            </div>
          )}
          <p className="text-sm text-blue-600">
            Found {itineraries.length} {searchData?.tripType === 'round-trip' ? 'itinerary combination(s)' : 'flight(s)'} from Amadeus API
          </p>
        </div>

        <div className="space-y-4">
          {itineraries.map((itinerary) => (
            <Card key={itinerary.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex-1">
                    {/* Tags */}
                    {(itinerary.tags.length > 0 || itinerary.selfTransfer) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {itinerary.tags.map(tag => {
                          let tagStyle = "bg-blue-100 text-blue-800";
                          if (tag === 'Cheapest') tagStyle = "bg-green-100 text-green-800";
                          if (tag === 'Fastest') tagStyle = "bg-purple-100 text-purple-800";
                          if (tag === 'Same Airline') tagStyle = "bg-indigo-100 text-indigo-800";
                          if (tag === 'Best Overall') tagStyle = "bg-yellow-100 text-yellow-800";
                          
                          return (
                            <Badge key={tag} className={`text-xs ${tagStyle}`}>
                              {tag}
                            </Badge>
                          );
                        })}
                        {itinerary.selfTransfer && (
                          <Badge variant="outline" className="text-xs border-orange-200 text-orange-600 bg-orange-50">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Self Transfer Required
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Flight Details */}
                    <div className="space-y-6">
                      {renderFlightSegment(itinerary.outbound, 'Outbound Flight')}
                      
                      {itinerary.return && (
                        <div className="border-t pt-6">
                          {renderFlightSegment(itinerary.return, 'Return Flight')}
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Total Duration: {itinerary.totalDuration}</span>
                      </div>
                      {itinerary.sameAirline && itinerary.type === 'round-trip' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Plane className="h-4 w-4" />
                          <span>Same Airline</span>
                        </div>
                      )}
                      {!itinerary.selfTransfer && (
                        <div className="flex items-center gap-1 text-green-600">
                          <span>Direct Connection</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price and Selection */}
                  <div className="text-center lg:text-right min-w-[200px]">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-3xl font-bold text-blue-600 mb-1">
                        MRU {itinerary.totalPrice.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {itinerary.type === 'round-trip' ? 'total for round-trip' : 'per person'}
                      </p>
                      {itinerary.type === 'round-trip' && (
                        <p className="text-xs text-gray-400 mt-1">
                          Outbound: MRU {(itinerary.outbound.price.totalMRU || 0).toLocaleString()}<br/>
                          Return: MRU {(itinerary.return?.price.totalMRU || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleSelectItinerary(itinerary)}
                      className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700"
                      size="lg"
                    >
                      Select {itinerary.type === 'round-trip' ? 'Itinerary' : 'Flight'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {itineraries.length === 0 && !loading && (
          <div className="text-center py-12">
            <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No flights found</h3>
            <p className="text-gray-500 mb-4">
              {searchData?.tripType === 'round-trip' 
                ? 'No round-trip combinations available for your selected dates'
                : 'No flights available for your selected date'
              }
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Try adjusting your search criteria or selecting different dates
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Try New Search
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default FlightSearch;