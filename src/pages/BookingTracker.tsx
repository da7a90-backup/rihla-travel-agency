// Create src/pages/BookingTracker.tsx
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plane, 
  CheckCircle, 
  Clock, 
  Upload, 
  MapPin, 
  Calendar,
  User,
  Phone,
  Mail,
  CreditCard,
  Download,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { amadeusApi } from "@/services/amadeusApi";

interface Booking {
  id: string;
  booking_reference: string;
  tracking_token: string;
  created_at: string;
  status: string;
  passenger_first_name: string;
  passenger_last_name: string;
  passenger_email: string;
  passenger_phone: string;
  passenger_whatsapp: string;
  flight_data: any;
  origin_code: string;
  destination_code: string;
  departure_date: string;
  return_date: string | null;
  trip_type: string;
  passengers_count: number;
  total_amount_mru: number;
  currency: string;
  payment_screenshot_url: string | null;
  payment_screenshot_uploaded_at: string | null;
  ticket_pdf_url: string | null;
  special_requests: string | null;
}

const BookingTracker = () => {
  const { trackingToken } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check if this is a new booking from the redirect
  const isNewBooking = location.state?.newBooking;

  useEffect(() => {
    const fetchBooking = async () => {
      if (!trackingToken) {
        setError("Invalid tracking token");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('bookings')
          .select('*')
          .eq('tracking_token', trackingToken)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          setError("Booking not found");
          return;
        }

        setBooking(data);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError("Failed to load booking. Please check your tracking link.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [trackingToken]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (PNG, JPG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUploadScreenshot = async () => {
    if (!selectedFile || !booking) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${booking.booking_reference}_payment_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);

      // Update booking with screenshot URL
      const { error: updateError } = await (supabase as any)
        .from('bookings')
        .update({
          payment_screenshot_url: publicUrl,
          payment_screenshot_uploaded_at: new Date().toISOString(),
          status: 'payment_screenshot_uploaded'
        })
        .eq('id', booking.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setBooking(prev => prev ? {
        ...prev,
        payment_screenshot_url: publicUrl,
        payment_screenshot_uploaded_at: new Date().toISOString(),
        status: 'payment_screenshot_uploaded'
      } : null);

      setSelectedFile(null);
      
      toast({
        title: "Screenshot Uploaded Successfully",
        description: "Our team will review your payment and process your ticket.",
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload screenshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="h-4 w-4" />,
          message: 'Awaiting Payment',
          description: 'Please complete payment and upload screenshot below'
        };
      case 'payment_screenshot_uploaded':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: <Upload className="h-4 w-4" />,
          message: 'Payment Under Review',
          description: 'Our team is verifying your payment'
        };
      case 'payment_validated':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-4 w-4" />,
          message: 'Payment Confirmed',
          description: 'Your ticket is being generated'
        };
      case 'ticketed':
        return {
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-4 w-4" />,
          message: 'Ticket Issued',
          description: 'Your e-ticket has been sent to your email'
        };
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800',
          icon: <Clock className="h-4 w-4" />,
          message: 'Cancelled',
          description: 'This booking has been cancelled'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: <Clock className="h-4 w-4" />,
          message: 'Unknown Status',
          description: ''
        };
    }
  };

  const renderFlightDetails = (flightData: any, label: string) => {
    if (!flightData) return null;
  
    const segments = flightData.itineraries[0]?.segments || [];
    if (!segments.length) return null;
  
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const totalStops = segments.length - 1;
    
    const departureTime = format(new Date(firstSegment.departure.at), "HH:mm");
    const arrivalTime = format(new Date(lastSegment.arrival.at), "HH:mm");
    const departureDate = format(new Date(firstSegment.departure.at), "MMM dd, yyyy");
    const arrivalDate = format(new Date(lastSegment.arrival.at), "MMM dd, yyyy");
    const airline = amadeusApi.getAirlineName(firstSegment.carrierCode);
    
    const [expanded, setExpanded] = useState(false);
  
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Plane className="h-4 w-4" />
          {label}
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold">{airline}</p>
              <p className="text-sm text-gray-500">{firstSegment.carrierCode}{firstSegment.number}</p>
            </div>
            <Badge variant="secondary">Economy</Badge>
          </div>
          
          {/* Main Flight Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Departure</span>
              </div>
              <p className="font-bold text-lg">{departureTime}</p>
              <p className="text-sm text-gray-600">{departureDate}</p>
              <p className="text-sm">{amadeusApi.getCityName(firstSegment.departure.iataCode)} ({firstSegment.departure.iataCode})</p>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Arrival</span>
              </div>
              <p className="font-bold text-lg">{arrivalTime}</p>
              <p className="text-sm text-gray-600">{arrivalDate}</p>
              <p className="text-sm">{amadeusApi.getCityName(lastSegment.arrival.iataCode)} ({lastSegment.arrival.iataCode})</p>
            </div>
          </div>
  
          {/* Connection Info */}
          {totalStops > 0 && (
            <div className="mt-4 pt-3 border-t">
              <button 
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <span>{totalStops} stop{totalStops > 1 ? 's' : ''}</span>
                <span className="text-xs">({expanded ? 'hide details' : 'show details'})</span>
              </button>
              
              {expanded && (
                <div className="mt-3 space-y-3">
                  {segments.map((segment, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{index + 1}.</span>
                      <div className="flex-1">
                        <span className="font-medium">
                          {amadeusApi.getCityName(segment.departure.iataCode)} → {amadeusApi.getCityName(segment.arrival.iataCode)}
                        </span>
                        <div className="text-gray-500">
                          {format(new Date(segment.departure.at), "HH:mm")} - {format(new Date(segment.arrival.at), "HH:mm")} • 
                          {amadeusApi.getAirlineName(segment.carrierCode)} {segment.carrierCode}{segment.number}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading your booking...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Booking Not Found</h3>
            <p className="text-gray-500 mb-4">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusInfo = getStatusInfo(booking.status);
  const isRoundTrip = booking.trip_type === 'round-trip';
  const flightData = booking.flight_data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Status</h1>
          <p className="text-gray-600">Reference: <span className="font-semibold">{booking.booking_reference}</span></p>
        </div>

        {/* New booking alert */}
        {isNewBooking && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your booking has been created successfully! Please complete the payment below.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Badge className={statusInfo.color}>
                    {statusInfo.icon}
                    <span className="ml-1">{statusInfo.message}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{statusInfo.description}</p>
                
                {/* Progress Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Booking Created</span>
                    <span className="text-xs text-gray-500">{format(new Date(booking.created_at), "MMM dd, HH:mm")}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      ['payment_screenshot_uploaded', 'payment_validated', 'ticketed'].includes(booking.status)
                        ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Payment Screenshot Uploaded</span>
                    {booking.payment_screenshot_uploaded_at && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(booking.payment_screenshot_uploaded_at), "MMM dd, HH:mm")}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      ['payment_validated', 'ticketed'].includes(booking.status)
                        ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Payment Verified</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      booking.status === 'ticketed' ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <Download className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">E-Ticket Issued</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Section */}
            {!['ticketed', 'cancelled'].includes(booking.status) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Complete Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Payment Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Mobile Money Payment</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Send MRU {booking.total_amount_mru.toLocaleString()} to any of these numbers:
                    </p>
                    <div className="space-y-1 text-sm font-mono">
                      <p><strong>Bankily:</strong> 36302630</p>
                      <p><strong>Sedad:</strong> 36202989</p>
                      <p><strong>Masrivi:</strong> 44564321</p>
                    </div>
                  </div>

                  {/* Screenshot Upload */}
                  {booking.status === 'pending' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Upload Payment Screenshot</h4>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-4">
                          Upload a screenshot of your mobile money payment confirmation
                        </p>
                        <input
  type="file"
  accept="image/*"
  onChange={handleFileSelect}
  className="hidden"
  id="screenshot-upload"
/>
<Button 
  variant="outline" 
  onClick={() => document.getElementById('screenshot-upload')?.click()}
  className="cursor-pointer"
>
  Select Screenshot
</Button>
                      </div>

                      {selectedFile && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm">{selectedFile.name}</span>
                          <Button 
                            onClick={handleUploadScreenshot}
                            disabled={uploading}
                            size="sm"
                          >
                            {uploading ? "Uploading..." : "Upload"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {booking.payment_screenshot_url && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-700">Payment Screenshot Uploaded</h4>
                      <p className="text-sm text-gray-600">
                        Screenshot uploaded on {format(new Date(booking.payment_screenshot_uploaded_at!), "PPP 'at' HH:mm")}
                      </p>
                      <p className="text-sm text-blue-600">Our team is reviewing your payment.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Flight Details */}
            <Card>
              <CardHeader>
                <CardTitle>Flight Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderFlightDetails(flightData.outbound, isRoundTrip ? 'Outbound Flight' : 'Flight')}
                
                {isRoundTrip && flightData.return && (
                  <>
                    <Separator />
                    {renderFlightDetails(flightData.return, 'Return Flight')}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{booking.passenger_first_name} {booking.passenger_last_name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{format(new Date(booking.departure_date), "PPP")}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-gray-500" />
                  <span className="text-sm capitalize">{booking.trip_type}</span>
                </div>

                <Separator />

                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    MRU {booking.total_amount_mru.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Amount</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{booking.passenger_email}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{booking.passenger_whatsapp}</span>
                </div>
                
                <p className="text-xs text-gray-500 mt-3">
                  Our team will contact you via WhatsApp for any updates regarding your booking.
                </p>
              </CardContent>
            </Card>

            {/* Download Ticket */}
            {booking.status === 'ticketed' && booking.ticket_pdf_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Your E-Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <a href={booking.ticket_pdf_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download E-Ticket
                    </a>
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Your e-ticket has also been sent to your email
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BookingTracker;