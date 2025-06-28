import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Ticket
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TicketGenerator from "@/components/TicketGenerator";

// Mock booking data - In real app, this would come from Supabase
const mockBookings = [
  {
    id: "BK001",
    passenger: {
      firstName: "Ahmed",
      lastName: "Mohamed",
      email: "ahmed@email.com",
      phone: "+222 12 34 56 78",
      whatsapp: "+222 12 34 56 78"
    },
    flight: {
      airline: "Air France",
      flightNumber: "AF001",
      route: "NKC → CDG",
      date: "2024-07-15",
      time: "08:30"
    },
    status: "pending",
    totalAmount: 517500,
    createdAt: "2024-06-28T10:30:00Z",
    ticketPdf: null
  },
  {
    id: "BK002", 
    passenger: {
      firstName: "Fatima",
      lastName: "Ba",
      email: "fatima@email.com",
      phone: "+222 98 76 54 32",
      whatsapp: "+222 98 76 54 32"
    },
    flight: {
      airline: "Turkish Airlines",
      flightNumber: "TK002",
      route: "NKC → IST",
      date: "2024-07-20",
      time: "14:20"
    },
    status: "confirmed",
    totalAmount: 437000,
    createdAt: "2024-06-27T15:45:00Z",
    ticketPdf: "ticket_BK002.pdf"
  }
];

const AdminDashboard = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState(mockBookings);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [showTicketGenerator, setShowTicketGenerator] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  const handleStatusUpdate = (bookingId: string, newStatus: string) => {
    setBookings(prev => prev.map(booking => 
      booking.id === bookingId 
        ? { ...booking, status: newStatus }
        : booking
    ));

    toast({
      title: "Status Updated",
      description: `Booking ${bookingId} status changed to ${newStatus}`,
    });
  };

  const handleValidatePayment = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Update booking status to validated
    handleStatusUpdate(bookingId, "payment_validated");

    // Prepare ticket data
    const ticketInfo = {
      ticketNumber: `TK-${Date.now()}`,
      pnr: `${booking.id.replace('BK', 'PNR')}`,
      passenger: booking.passenger,
      flight: {
        airline: booking.flight.airline,
        flightNumber: booking.flight.flightNumber,
        aircraft: "Boeing 737-800", // This would come from Amadeus API
        departure: {
          airport: booking.flight.route.split(' → ')[0],
          city: booking.flight.route.split(' → ')[0],
          date: booking.flight.date,
          time: booking.flight.time,
          terminal: "1"
        },
        arrival: {
          airport: booking.flight.route.split(' → ')[1],
          city: booking.flight.route.split(' → ')[1],
          date: booking.flight.date,
          time: "16:45", // This would be calculated
        },
        duration: "7h 15m",
        class: "Economy",
        seatNumber: `${Math.floor(Math.random() * 30) + 1}A`
      },
      booking: {
        totalAmount: booking.totalAmount,
        currency: "MRU",
        bookingReference: booking.id,
        issueDate: new Date().toISOString()
      }
    };

    setTicketData(ticketInfo);
    setShowTicketGenerator(true);
  };

  const handleTicketGenerated = (pdfUrl: string) => {
    if (ticketData) {
      const bookingId = ticketData.booking.bookingReference;
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, ticketPdf: pdfUrl, status: "ticketed" }
          : booking
      ));

      toast({
        title: "Ticket Generated",
        description: "E-ticket has been generated successfully",
      });
    }
  };

  const handleEmailSent = () => {
    toast({
      title: "Email Sent",
      description: "Ticket has been sent to passenger's email",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "payment_validated": return "bg-purple-100 text-purple-800";
      case "ticketed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <AlertCircle className="h-4 w-4" />;
      case "payment_validated": return <CheckCircle className="h-4 w-4" />;
      case "ticketed": return <Ticket className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (showTicketGenerator && ticketData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Ticket Generator</h1>
              <Button 
                variant="outline" 
                onClick={() => setShowTicketGenerator(false)}
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <TicketGenerator
            ticketData={ticketData}
            onTicketGenerated={handleTicketGenerated}
            onEmailSent={handleEmailSent}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="text-sm">
                <Users className="h-4 w-4 mr-1" />
                {bookings.length} Total Bookings
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Bookings</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {bookings.filter(b => b.status === "pending").length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Confirmed Bookings</p>
                      <p className="text-2xl font-bold text-green-600">
                        {bookings.filter(b => b.status === "confirmed").length}
                      </p>
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
                      <p className="text-2xl font-bold text-blue-600">
                        MRU {bookings.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
                      </p>
                    </div>
                    <Plane className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Booking #{booking.id}
                      </CardTitle>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1 capitalize">{booking.status.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Passenger</Label>
                        <p className="font-medium">{booking.passenger.firstName} {booking.passenger.lastName}</p>
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3 mr-1" />
                          {booking.passenger.email}
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-1" />
                          {booking.passenger.whatsapp}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Flight Details</Label>
                        <p className="font-medium">{booking.flight.airline}</p>
                        <p className="text-sm text-gray-600">{booking.flight.flightNumber}</p>
                        <p className="text-sm text-gray-600">{booking.flight.route}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Travel Date</Label>
                        <p className="font-medium">{booking.flight.date}</p>
                        <p className="text-sm text-gray-600">{booking.flight.time}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-500">Amount</Label>
                        <p className="font-medium text-lg text-blue-600">
                          MRU {booking.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      {booking.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleValidatePayment(booking.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Validate Payment & Issue Ticket
                        </Button>
                      )}
                      
                      {booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          onClick={() => handleValidatePayment(booking.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Ticket className="h-4 w-4 mr-1" />
                          Generate Ticket
                        </Button>
                      )}

                      {booking.ticketPdf && (
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Download Ticket
                        </Button>
                      )}

                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`https://wa.me/${booking.passenger.whatsapp.replace(/[^\d]/g, '')}`, '_blank')}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Analytics dashboard will be integrated with Supabase for real-time reporting.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="markup">Default Markup Percentage</Label>
                  <Input id="markup" type="number" placeholder="15" className="w-32" />
                </div>
                <div>
                  <Label htmlFor="currency">Display Currency</Label>
                  <Input id="currency" value="Mauritanian Ouguiya (MRU)" disabled className="w-64" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
