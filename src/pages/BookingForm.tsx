// Updated src/pages/BookingForm.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plane, User, Phone, Mail, ArrowRight, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { amadeusApi } from "@/services/amadeusApi";

const BookingForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Handle both single flight and round-trip data
  const { flight, outboundFlight, returnFlight, totalPrice, searchData } = location.state || {};
  const isRoundTrip = outboundFlight && returnFlight;
  const bookingFlight = isRoundTrip ? outboundFlight : flight;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsapp: "",
    passportNumber: "",
    dateOfBirth: "",
    nationality: "",
    specialRequests: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotalPrice = () => {
    if (isRoundTrip) {
      return totalPrice || ((outboundFlight?.price?.totalMRU || 0) + (returnFlight?.price?.totalMRU || 0));
    }
    return flight?.price?.totalMRU || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare flight data for storage
      const flightData = {
        type: isRoundTrip ? 'round-trip' : 'one-way',
        outbound: bookingFlight,
        return: isRoundTrip ? returnFlight : null,
        searchCriteria: searchData
      };

      // Calculate final price including taxes (15% markup)
      const basePrice = calculateTotalPrice();
      const finalPrice = Math.round(basePrice * 1.15);

      // Insert booking into Supabase
      const { data: booking, error } = await (supabase as any)
        .from('bookings')
        .insert({
          // Passenger information
          passenger_first_name: formData.firstName,
          passenger_last_name: formData.lastName,
          passenger_email: formData.email,
          passenger_phone: formData.phone,
          passenger_whatsapp: formData.whatsapp,
          passenger_passport: formData.passportNumber,
          passenger_date_of_birth: formData.dateOfBirth || null,
          passenger_nationality: formData.nationality,
          
          // Flight details
          amadeus_offer_id: bookingFlight?.id,
          flight_data: flightData,
          
          // Search parameters
          origin_code: searchData?.from,
          destination_code: searchData?.to,
          departure_date: searchData?.departDate,
          return_date: isRoundTrip ? searchData?.returnDate : null,
          trip_type: isRoundTrip ? 'round-trip' : 'one-way',
          passengers_count: searchData?.passengers || 1,
          
          // Pricing
          total_amount_mru: finalPrice,
          currency: 'MRU',
          
          // Special requests
          special_requests: formData.specialRequests || null,
          
          // Status
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Booking created:', booking);

      toast({
        title: "Booking Submitted Successfully!",
        description: `Booking reference: ${booking.booking_reference}`,
      });

      // Redirect to tracking page
      navigate(`/track/${booking.tracking_token}`, {
        state: { 
          bookingReference: booking.booking_reference,
          newBooking: true 
        }
      });

    } catch (error) {
      console.error('Booking submission error:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFlightDetails = (flightData: any, label: string) => {
    if (!flightData) return null;

    const segment = flightData.itineraries[0]?.segments[0];
    if (!segment) return null;

    const departureTime = format(new Date(segment.departure.at), "HH:mm");
    const arrivalTime = format(new Date(segment.arrival.at), "HH:mm");
    const departureDate = format(new Date(segment.departure.at), "MMM dd, yyyy");
    const airline = amadeusApi.getAirlineName(segment.carrierCode);

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">{label}</h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{airline}</p>
            <p className="text-sm text-gray-500">{segment.carrierCode}{segment.number}</p>
          </div>
          <Badge variant="secondary">{flightData.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy'}</Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Departure</span>
            </div>
            <p className="font-bold text-lg">{departureTime}</p>
            <p className="text-sm text-gray-600">{departureDate}</p>
            <p className="text-sm">{amadeusApi.getCityName(segment.departure.iataCode)} ({segment.departure.iataCode})</p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Arrival</span>
            </div>
            <p className="font-bold text-lg">{arrivalTime}</p>
            <p className="text-sm text-gray-600">{format(new Date(segment.arrival.at), "MMM dd, yyyy")}</p>
            <p className="text-sm">{amadeusApi.getCityName(segment.arrival.iataCode)} ({segment.arrival.iataCode})</p>
          </div>
        </div>
      </div>
    );
  };

  if (!bookingFlight) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Flight Selected</h2>
          <Button onClick={() => navigate("/search")}>Back to Search</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
          <p className="text-gray-600">Please fill in your details to reserve your {isRoundTrip ? 'round-trip flights' : 'flight'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Flight Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  {isRoundTrip ? 'Round-Trip Summary' : 'Flight Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Outbound Flight */}
                {renderFlightDetails(bookingFlight, isRoundTrip ? 'Outbound Flight' : 'Flight Details')}
                
                {/* Return Flight */}
                {isRoundTrip && returnFlight && (
                  <>
                    <Separator />
                    {renderFlightDetails(returnFlight, 'Return Flight')}
                  </>
                )}

                <Separator />

                {/* Pricing */}
                <div className="space-y-2">
                  {isRoundTrip ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Outbound Flight</span>
                        <span>MRU {(outboundFlight?.price?.totalMRU || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Return Flight</span>
                        <span>MRU {(returnFlight?.price?.totalMRU || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>MRU {calculateTotalPrice().toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span>Base Price</span>
                      <span>MRU {calculateTotalPrice().toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Taxes & Fees (15%)</span>
                    <span>MRU {Math.round(calculateTotalPrice() * 0.15).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-blue-600">MRU {Math.round(calculateTotalPrice() * 1.15).toLocaleString()}</span>
                  </div>
                </div>

                <Badge variant="secondary" className="w-full justify-center">
                  Payment via mobile money confirmation
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Passenger Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          required
                          className="pl-10 border-gray-200 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          required
                          className="pl-10 border-gray-200 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                      <Input
                        id="whatsapp"
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                        required
                        placeholder="+222 XX XX XX XX"
                        className="pl-10 border-gray-200 focus:border-green-500"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Our team will contact you on this number for payment confirmation
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passportNumber">Passport Number *</Label>
                      <Input
                        id="passportNumber"
                        value={formData.passportNumber}
                        onChange={(e) => handleInputChange("passportNumber", e.target.value)}
                        required
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                        required
                        className="border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality *</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => handleInputChange("nationality", e.target.value)}
                      required
                      className="border-gray-200 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialRequests">Special Requests</Label>
                    <Input
                      id="specialRequests"
                      value={formData.specialRequests}
                      onChange={(e) => handleInputChange("specialRequests", e.target.value)}
                      placeholder="Meal preferences, accessibility needs, etc."
                      className="border-gray-200 focus:border-blue-500"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>1. Submit this form to reserve your seat</li>
                      <li>2. You'll be redirected to your booking status page</li>
                      <li>3. Complete payment using mobile money and upload screenshot</li>
                      <li>4. Our team will verify payment and issue your e-ticket</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 h-12 text-lg"
                  >
                    {isSubmitting ? "Submitting..." : "Reserve Flight"}
                    {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BookingForm;