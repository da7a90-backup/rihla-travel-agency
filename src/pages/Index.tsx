// Updated src/pages/Index.tsx with sequential round-trip selection
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, Plane, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import Footer from "@/components/Footer";
import CityAutocomplete from "@/components/CityAutocomplete";
import CalendarFlightView from "@/components/CalendarFlightView";

const Index = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'search' | 'outbound-calendar' | 'return-calendar'>('search');
  const [searchData, setSearchData] = useState({
    from: "",
    to: "",
    passengers: 1,
    tripType: "round-trip"
  });
  const [selectedOutboundDate, setSelectedOutboundDate] = useState<Date | null>(null);
  const [selectedReturnDate, setSelectedReturnDate] = useState<Date | null>(null);

  const handleSearch = () => {
    if (!searchData.from || !searchData.to) {
      alert("Please select both departure and destination cities");
      return;
    }
    setStep('outbound-calendar');
  };

  const handleOutboundDateSelect = (date: Date) => {
    setSelectedOutboundDate(date);
    
    if (searchData.tripType === 'one-way') {
      // Go directly to flight search for one-way
      navigate("/search", { 
        state: { 
          ...searchData, 
          departDate: date 
        } 
      });
    } else {
      // Show return calendar for round-trip
      setStep('return-calendar');
    }
  };

  const handleReturnDateSelect = (date: Date) => {
    setSelectedReturnDate(date);
    
    // Navigate to flight search with both dates
    navigate("/search", { 
      state: { 
        ...searchData, 
        departDate: selectedOutboundDate,
        returnDate: date
      } 
    });
  };

  const handleBackToSearch = () => {
    setStep('search');
    setSelectedOutboundDate(null);
    setSelectedReturnDate(null);
  };

  const handleBackToOutbound = () => {
    setStep('outbound-calendar');
    setSelectedReturnDate(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <Navigation />
      {step === 'search' && <Hero />}
      
      {/* Search Section */}
      <section className={`py-12 px-4 ${step === 'search' ? '-mt-20 relative z-10' : 'pt-24'}`}>
        <div className="max-w-6xl mx-auto">
          {step !== 'search' && (
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={step === 'return-calendar' ? handleBackToOutbound : handleBackToSearch}
                className="mb-4"
              >
                ← {step === 'return-calendar' ? 'Back to Outbound' : 'Back to Search'}
              </Button>
              
              {/* Progress indicator for round-trip */}
              {searchData.tripType === 'round-trip' && (
                <div className="flex items-center gap-4 mb-6">
                  <div className={`flex items-center gap-2 ${step === 'outbound-calendar' ? 'text-blue-600' : 'text-green-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 'outbound-calendar' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {selectedOutboundDate ? '✓' : '1'}
                    </div>
                    <span>Outbound Flight</span>
                    {selectedOutboundDate && (
                      <span className="text-sm text-gray-500">
                        ({selectedOutboundDate.toLocaleDateString()})
                      </span>
                    )}
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  
                  <div className={`flex items-center gap-2 ${step === 'return-calendar' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === 'return-calendar' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {selectedReturnDate ? '✓' : '2'}
                    </div>
                    <span>Return Flight</span>
                    {selectedReturnDate && (
                      <span className="text-sm text-gray-500">
                        ({selectedReturnDate.toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'search' ? (
            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <Label className="text-lg font-semibold mb-4 block">Trip Type</Label>
                    <RadioGroup
                      value={searchData.tripType}
                      onValueChange={(value) => setSearchData({...searchData, tripType: value})}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="round-trip" id="round-trip" />
                        <Label htmlFor="round-trip">Round Trip</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one-way" id="one-way" />
                        <Label htmlFor="one-way">One Way</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">From</Label>
                      <CityAutocomplete
                        value={searchData.from}
                        onChange={(value) => setSearchData({...searchData, from: value})}
                        placeholder="Departure city"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">To</Label>
                      <CityAutocomplete
                        value={searchData.to}
                        onChange={(value) => setSearchData({...searchData, to: value})}
                        placeholder="Destination city"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Passengers</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-3 h-5 w-5 text-blue-600" />
                        <Input
                          type="number"
                          min="1"
                          max="9"
                          value={searchData.passengers}
                          onChange={(e) => setSearchData({...searchData, passengers: parseInt(e.target.value) || 1})}
                          className="pl-10 h-12 border-gray-200 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSearch}
                      className="h-12 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold px-8"
                    >
                      <Plane className="mr-2 h-5 w-5" />
                      Search Flights
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : step === 'outbound-calendar' ? (
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Outbound Flight Date</h2>
                <p className="text-gray-600">
                  {searchData.from} → {searchData.to} • {searchData.passengers} passenger(s)
                </p>
              </div>
              <CalendarFlightView 
                searchData={searchData}
                onDateSelect={handleOutboundDateSelect}
              />
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Return Flight Date</h2>
                <p className="text-gray-600">
                  {searchData.to} → {searchData.from} • {searchData.passengers} passenger(s)
                </p>
              </div>
              <CalendarFlightView 
                searchData={{
                  ...searchData,
                  from: searchData.to,  // Reverse the route for return
                  to: searchData.from
                }}
                onDateSelect={handleReturnDateSelect}
              />
            </div>
          )}
        </div>
      </section>

      {step === 'search' && (
        <>
          <FeaturedDestinations />
          <Footer />
        </>
      )}
    </div>
  );
};

export default Index;