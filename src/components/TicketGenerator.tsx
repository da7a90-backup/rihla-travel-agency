
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Send, Plane, Calendar, User, MapPin } from "lucide-react";
import { format } from "date-fns";

interface TicketData {
  ticketNumber: string;
  pnr: string;
  passenger: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  flight: {
    airline: string;
    flightNumber: string;
    aircraft: string;
    departure: {
      airport: string;
      city: string;
      date: string;
      time: string;
      terminal?: string;
    };
    arrival: {
      airport: string;
      city: string;
      date: string;
      time: string;
      terminal?: string;
    };
    duration: string;
    class: string;
    seatNumber?: string;
  };
  booking: {
    totalAmount: number;
    currency: string;
    bookingReference: string;
    issueDate: string;
  };
}

interface TicketGeneratorProps {
  ticketData: TicketData;
  onTicketGenerated: (pdfUrl: string) => void;
  onEmailSent: () => void;
}

const TicketGenerator = ({ ticketData, onTicketGenerated, onEmailSent }: TicketGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [ticketPdfUrl, setTicketPdfUrl] = useState<string | null>(null);

  const generateTicketPDF = async () => {
    setIsGenerating(true);
    try {
      // This would normally call a backend service to generate the PDF
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockPdfUrl = `ticket_${ticketData.ticketNumber}.pdf`;
      setTicketPdfUrl(mockPdfUrl);
      onTicketGenerated(mockPdfUrl);
      
      console.log('Generated ticket PDF:', mockPdfUrl);
    } catch (error) {
      console.error('Failed to generate ticket PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendTicketEmail = async () => {
    setIsSendingEmail(true);
    try {
      // This would normally call a backend service to send the email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Sent ticket email to:', ticketData.passenger.email);
      onEmailSent();
    } catch (error) {
      console.error('Failed to send ticket email:', error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          E-Ticket Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ticket Preview */}
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-6 rounded-lg border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">Electronic Ticket</h3>
              <p className="text-sm text-gray-600">Ticket Number: {ticketData.ticketNumber}</p>
              <p className="text-sm text-gray-600">PNR: {ticketData.pnr}</p>
            </div>
            <Badge variant="default">CONFIRMED</Badge>
          </div>

          <Separator className="my-4" />

          {/* Passenger Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Passenger</span>
              </div>
              <p className="font-medium">{ticketData.passenger.firstName} {ticketData.passenger.lastName}</p>
              <p className="text-sm text-gray-600">{ticketData.passenger.email}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Issue Date</span>
              </div>
              <p className="font-medium">{format(new Date(ticketData.booking.issueDate), "PPP")}</p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Flight Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{ticketData.flight.airline} - {ticketData.flight.flightNumber}</span>
              <Badge variant="secondary">{ticketData.flight.class}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3 w-3 text-green-600" />
                  <span className="text-sm font-medium">Departure</span>
                </div>
                <p className="font-medium">{ticketData.flight.departure.city} ({ticketData.flight.departure.airport})</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(ticketData.flight.departure.date), "PPP")} at {ticketData.flight.departure.time}
                </p>
                {ticketData.flight.departure.terminal && (
                  <p className="text-xs text-gray-500">Terminal {ticketData.flight.departure.terminal}</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3 w-3 text-red-600" />
                  <span className="text-sm font-medium">Arrival</span>
                </div>
                <p className="font-medium">{ticketData.flight.arrival.city} ({ticketData.flight.arrival.airport})</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(ticketData.flight.arrival.date), "PPP")} at {ticketData.flight.arrival.time}
                </p>
                {ticketData.flight.arrival.terminal && (
                  <p className="text-xs text-gray-500">Terminal {ticketData.flight.arrival.terminal}</p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-gray-600">Duration: {ticketData.flight.duration}</span>
              {ticketData.flight.seatNumber && (
                <span className="text-sm text-gray-600">Seat: {ticketData.flight.seatNumber}</span>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Booking Info */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Booking Reference: {ticketData.booking.bookingReference}
            </span>
            <span className="font-bold text-lg text-blue-600">
              {ticketData.booking.currency} {ticketData.booking.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={generateTicketPDF}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating PDF..." : "Generate PDF Ticket"}
          </Button>

          {ticketPdfUrl && (
            <Button
              onClick={sendTicketEmail}
              disabled={isSendingEmail}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSendingEmail ? "Sending..." : "Email to Passenger"}
            </Button>
          )}

          {ticketPdfUrl && (
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => window.open(ticketPdfUrl, '_blank')}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h4 className="font-medium text-amber-800 mb-2">Next Steps:</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>1. Generate the PDF ticket using the button above</li>
            <li>2. Send the ticket to the passenger via email</li>
            <li>3. Update the booking status to "Ticketed"</li>
            <li>4. Passenger should arrive at airport 2-3 hours before departure</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketGenerator;
