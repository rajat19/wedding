import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Hotel, Plane, Car, Info } from 'lucide-react';

const Travel = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Plane className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Travel & Stay</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about getting here
          </p>
        </div>

        <div className="space-y-8">
          {/* Venue Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <MapPin className="w-5 h-5 text-primary" />
                Venue Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">The Grand Estate</p>
                <p className="text-muted-foreground">
                  123 Wedding Lane, Beautiful City, CA 90210
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    'https://www.google.com/maps/search/?api=1&query=The+Grand+Estate',
                    '_blank'
                  )
                }
              >
                Open in Maps
              </Button>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3305.4!2d-118.4!3d34.05!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDAzJzAwLjAiTiAxMTjCsDI0JzAwLjAiVw!5e0!3m2!1sen!2sus!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Venue location map"
                />
              </div>
            </CardContent>
          </Card>

          {/* Accommodations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Hotel className="w-5 h-5 text-primary" />
                Where to Stay
              </CardTitle>
              <CardDescription>
                We've reserved room blocks at the following hotels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 pb-4 border-b">
                <h4 className="font-medium">The Grand Hotel</h4>
                <p className="text-sm text-muted-foreground">
                  456 Main Street, Beautiful City, CA 90210
                </p>
                <p className="text-sm">
                  <span className="font-medium">Distance:</span> 0.5 miles from venue
                </p>
                <p className="text-sm text-muted-foreground">
                  Mention "Smith-Johnson Wedding" for discounted rate ($179/night)
                </p>
                <Button variant="outline" size="sm">
                  Book Now
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Comfort Inn & Suites</h4>
                <p className="text-sm text-muted-foreground">
                  789 Oak Avenue, Beautiful City, CA 90210
                </p>
                <p className="text-sm">
                  <span className="font-medium">Distance:</span> 1.2 miles from venue
                </p>
                <p className="text-sm text-muted-foreground">
                  Mention "Smith-Johnson Wedding" for discounted rate ($129/night)
                </p>
                <Button variant="outline" size="sm">
                  Book Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Getting There */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Car className="w-5 h-5 text-primary" />
                Getting There
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">By Air</h4>
                <p className="text-sm text-muted-foreground">
                  The closest airport is Beautiful City International Airport (BCA), about 30
                  minutes from the venue. Rental cars and rideshares are available.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">By Car</h4>
                <p className="text-sm text-muted-foreground">
                  Free parking is available at the venue. Valet service will also be provided.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Rideshare</h4>
                <p className="text-sm text-muted-foreground">
                  Uber and Lyft are readily available in the area. We encourage guests to use
                  rideshare services if you plan to enjoy cocktails at the reception!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Local Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Info className="w-5 h-5 text-primary" />
                Things to Do
              </CardTitle>
              <CardDescription>
                Arriving early or staying late? Here are some local favorites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">Beautiful Beach</h4>
                <p className="text-sm text-muted-foreground">
                  Stunning coastline perfect for a morning walk or sunset viewing
                </p>
              </div>
              <div>
                <h4 className="font-medium">Downtown District</h4>
                <p className="text-sm text-muted-foreground">
                  Great restaurants, shops, and galleries within walking distance
                </p>
              </div>
              <div>
                <h4 className="font-medium">Scenic Vineyard Tours</h4>
                <p className="text-sm text-muted-foreground">
                  Several award-winning wineries offer tastings and tours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Travel;
