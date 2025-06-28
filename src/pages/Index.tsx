
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, Plane } from "lucide-react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import Footer from "@/components/Footer";
import CityAutocomplete from "@/components/CityAutocomplete";
import CalendarFlightView from "@/components/CalendarFlightView";

const Index = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'search' | 'calendar'>('search');
  const [searchData, setSearchData] = useState({
    from: "",
    to: "",
    passengers: 1,
    tripType: "round-trip"
  });

  const handleSearch = () => {
    if (!searchData.from || !searchData.to) {
      alert("Please select both departure and destination cities");
      return;
    }
    setStep('calendar');
  };

  const handleDateSelect = (date: Date) => {
    console.log("Selected date:", date);
    navigate("/search", { 
      state: { 
        ...searchData, 
        departDate: date 
      } 
    });
  };

  const handleBackToSearch = () => {
    setStep('search');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <Navigation />
      {step === 'search' && <Hero />}
      
      {/* Search Section */}
      <section className={`py-12 px-4 ${step === 'search' ? '-mt-20 relative z-10' : 'pt-24'}`}>
        <div className="max-w-6xl mx-auto">
          {step === 'calendar' && (
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={handleBackToSearch}
                className="mb-4"
              >
                ← Back to Search
              </Button>
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
          ) : (
            <CalendarFlightView 
              searchData={searchData}
              onDateSelect={handleDateSelect}
            />
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
