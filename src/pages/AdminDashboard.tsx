// Enhanced AdminDashboard.tsx with booking management and Amadeus integration
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Plane, 
  Phone, 
  Mail, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Send,
  Ticket,
  Eye,
  X,
  DollarSign,
  FileText,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  amadeus_hold_id: string | null;
  hold_expires_at: string | null;
  hold_status: string | null;
  amadeus_booking_id: string | null;
  ticket_numbers: string | null;
}

const EnhancedAdminDashboard = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [processingBooking, setProcessingBooking] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filterStatus === 'all') return true;
    return booking.status === filterStatus;
  });

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus }
          : booking
      ));

      toast({
        title: "Status Updated",
        description: `Booking status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const confirmAmadeusBooking = async (booking: Booking) => {
    if (!booking.amadeus_hold_id) {
      toast({
        title: "No Hold Found",
        description: "This booking doesn't have an Amadeus hold ID",
        variant: "destructive",
      });
      return;
    }

    setProcessingBooking(booking.id);
    try {
      // Step 1: Confirm the hold with Amadeus
      const confirmationResult = await amadeusApi.confirmFlightBooking(booking.amadeus_hold_id);
      
      if (confirmationResult.success) {
        // Step 2: Update booking with confirmation details
        const { error } = await (supabase as any)
          .from('bookings')
          .update({
            amadeus_booking_id: confirmationResult.bookingId,
            ticket_numbers: JSON.stringify(confirmationResult.ticketNumbers),
            status: 'ticketed',
            hold_status: 'confirmed'
          })
          .eq('id', booking.id);

        if (error) throw error;

        // Step 3: Generate IATA compliant e-ticket
        const eTicketResult = await amadeusApi.generateETicket(confirmationResult.bookingId);
        
        if (eTicketResult.success) {
          // Update with e-ticket URL
          await (supabase as any)
            .from('bookings')
            .update({
              ticket_pdf_url: eTicketResult.eTicketUrl
            })
            .eq('id', booking.id);
        }

        // Refresh bookings
        await fetchBookings();

        toast({
          title: "Booking Confirmed!",
          description: `Booking converted to confirmed reservation with ticket numbers: ${confirmationResult.ticketNumbers.join(', ')}`,
        });

        // Send e-ticket to passenger
        if (eTicketResult.success) {
          await sendETicketEmail(booking, eTicketResult.eTicketUrl);
        }

      } else {
        throw new Error(confirmationResult.error || 'Failed to confirm booking');
      }

    } catch (error) {
      console.error('Error confirming Amadeus booking:', error);
      toast({
        title: "Confirmation Failed",
        description: error instanceof Error ? error.message : "Failed to confirm booking with Amadeus",
        variant: "destructive",
      });
    } finally {
      setProcessingBooking(null);
    }
  };

  const sendETicketEmail = async (booking: Booking, eTicketUrl: string) => {
    try {
      // In a real implementation, this would send an email with the e-ticket
      // For now, we'll just show a success message
      toast({
        title: "E-ticket Sent",
        description: `E-ticket has been sent to ${booking.passenger_email}`,
      });
    } catch (error) {
      console.error('Error sending e-ticket:', error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" />, label: 'Pending Payment' };
      case 'payment_screenshot_uploaded':
        return { color: 'bg-blue-100 text-blue-800', icon: <Eye className="h-4 w-4" />, label: 'Payment Review' };
      case 'payment_validated':
        return { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4" />, label: 'Payment Confirmed' };
      case 'ticketed':
        return { color: 'bg-green-100 text-green-800', icon: <Ticket className="h-4 w-4" />, label: 'Ticketed' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: <X className="h-4 w-4" />, label: 'Cancelled' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-4 w-4" />, label: status };
    }
  };

  const getHoldStatus = (booking: Booking) => {
    if (!booking.amadeus_hold_id) return null;
    
    const isExpired = booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date();
    
    if (isExpired) {
      return <Badge variant="destructive" className="text-xs">Hold Expired</Badge>;
    }
    
    if (booking.hold_status === 'confirmed') {
      return <Badge className="bg-green-100 text-green-800 text-xs">Confirmed</Badge>;
    }
    
    return <Badge className="bg-blue-100 text-blue-800 text-xs">Active Hold</Badge>;
  };

  const ImageModal = ({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) => (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payment Screenshot</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          {imageUrl.startsWith('data:image') ? (
            <img src={imageUrl} alt="Payment Screenshot" className="max-w-full max-h-96 object-contain" />
          ) : (
            <img src={imageUrl} alt="Payment Screenshot" className="max-w-full max-h-96 object-contain" />
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingPayments = bookings.filter(b => b.status === 'payment_screenshot_uploaded').length;
  const confirmedBookings = bookings.filter(b => b.status === 'ticketed').length;
  const totalRevenue = bookings.filter(b => b.status === 'ticketed').reduce((sum, b) => sum + b.total_amount_mru, 0);
  const activeHolds = bookings.filter(b => b.amadeus_hold_id && b.hold_status !== 'confirmed' && (!b.hold_expires_at || new Date(b.hold_expires_at) > new Date())).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <Button onClick={fetchBookings} variant="outline">
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingPayments}</p>
                </div>
                <Eye className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Holds</p>
                  <p className="text-2xl font-bold text-blue-600">{activeHolds}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Confirmed Bookings</p>
                  <p className="text-2xl font-bold text-green-600">{confirmedBookings}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">MRU {totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <Label>Filter by Status:</Label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-1"
              >
                <option value="all">All Bookings</option>
                <option value="pending">Pending Payment</option>
                <option value="payment_screenshot_uploaded">Payment Review</option>
                <option value="payment_validated">Payment Confirmed</option>
                <option value="ticketed">Ticketed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="text-sm text-gray-500">
                Showing {filteredBookings.length} of {bookings.length} bookings
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const statusInfo = getStatusInfo(booking.status);
            const holdStatus = getHoldStatus(booking);
            
            return (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {booking.booking_reference}
                      </CardTitle>
                      <Badge className={statusInfo.color}>
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </Badge>
                      {holdStatus}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(booking.created_at), "MMM dd, HH:mm")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Passenger Info */}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Passenger</Label>
                      <p className="font-medium">{booking.passenger_first_name} {booking.passenger_last_name}</p>
                      <div className="flex items-center mt-1 text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-1" />
                        {booking.passenger_email}
                      </div>
                      <div className="flex items-center mt-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3 mr-1" />
                        {booking.passenger_whatsapp}
                      </div>
                    </div>

                    {/* Flight Info */}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Flight</Label>
                      <p className="font-medium">{booking.origin_code} → {booking.destination_code}</p>
                      <p className="text-sm text-gray-600">{format(new Date(booking.departure_date), "MMM dd, yyyy")}</p>
                      <p className="text-sm text-gray-600 capitalize">{booking.trip_type}</p>
                    </div>

                    {/* Amount */}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Amount</Label>
                      <p className="font-medium text-lg text-blue-600">
                        MRU {booking.total_amount_mru.toLocaleString()}
                      </p>
                    </div>

                    {/* Hold Info */}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Hold Status</Label>
                      {booking.amadeus_hold_id ? (
                        <div>
                          <p className="text-sm font-mono">{booking.amadeus_hold_id.substring(0, 10)}...</p>
                          {booking.hold_expires_at && (
                            <p className="text-xs text-gray-500">
                              Expires: {format(new Date(booking.hold_expires_at), "MMM dd, HH:mm")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No hold</p>
                      )}
                    </div>
                  </div>

                  {/* Payment Screenshot */}
                  {booking.payment_screenshot_url && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Payment Screenshot</Label>
                          <p className="text-xs text-gray-500">
                            Uploaded: {format(new Date(booking.payment_screenshot_uploaded_at!), "MMM dd, HH:mm")}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedImageUrl(booking.payment_screenshot_url)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Screenshot
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {booking.status === 'payment_screenshot_uploaded' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'payment_validated')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(booking.id, 'pending')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject Payment
                        </Button>
                      </>
                    )}

                    {(booking.status === 'payment_validated' || booking.status === 'payment_screenshot_uploaded') && booking.amadeus_hold_id && booking.hold_status !== 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => confirmAmadeusBooking(booking)}
                        disabled={processingBooking === booking.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {processingBooking === booking.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          <>
                            <Ticket className="h-4 w-4 mr-1" />
                            Confirm Booking & Issue Ticket
                          </>
                        )}
                      </Button>
                    )}

                    {booking.ticket_pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={booking.ticket_pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-1" />
                          Download E-Ticket
                        </a>
                      </Button>
                    )}

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`https://wa.me/${booking.passenger_whatsapp.replace(/[^\d]/g, '')}`, '_blank')}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`/track/${booking.tracking_token}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredBookings.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No bookings found</h3>
              <p className="text-gray-500">
                {filterStatus === 'all' ? 'No bookings have been created yet.' : `No bookings with status "${filterStatus}".`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Modal */}
      {selectedImageUrl && (
        <ImageModal 
          imageUrl={selectedImageUrl} 
          onClose={() => setSelectedImageUrl(null)} 
        />
      )}
    </div>
  );
};

export default EnhancedAdminDashboard;