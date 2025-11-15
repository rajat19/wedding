import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, updateDoc, doc } from "firebase/firestore";
import { toast } from "sonner";
import { Gift, ExternalLink, Check } from "lucide-react";

interface RegistryItem {
  id: string;
  item_name: string;
  description: string | null;
  price: number | null;
  store_name: string | null;
  store_url: string | null;
  image_url: string | null;
  reserved_by: string | null;
}

const Registry = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const itemsRef = collection(db, "gift_registry");
    const q = query(itemsRef, orderBy("created_at", "asc"));
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as RegistryItem[];

    setItems(data);
    setLoading(false);
  };

  const handleReserve = async (itemId: string, isReserved: boolean) => {
    if (!user) {
      toast.error("Please sign in to reserve gifts");
      return;
    }

    try {
      await updateDoc(doc(db, "gift_registry", itemId), {
        reserved_by: isReserved ? null : user.id,
        updated_at: new Date().toISOString(),
      });

      toast.success(isReserved ? "Reservation removed" : "Item reserved!");
      fetchItems();
    } catch {
      toast.error("Failed to update reservation");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">Loading registry...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Gift className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Gift Registry</h1>
          <p className="text-xl text-muted-foreground">
            Your presence is the greatest gift, but if you wish to honor us with something more
          </p>
        </div>

        {/* Registry Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-smooth">
            <CardHeader>
              <CardTitle className="font-serif">Amazon Registry</CardTitle>
              <CardDescription>Browse our selections on Amazon</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Registry
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-smooth">
            <CardHeader>
              <CardTitle className="font-serif">Target Registry</CardTitle>
              <CardDescription>Find gifts at Target</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Registry
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Registry Items */}
        {items.length > 0 && (
          <>
            <h2 className="text-2xl font-serif font-bold mb-6">Featured Items</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const isReserved = !!item.reserved_by;
                const isReservedByUser = item.reserved_by === user?.id;

                return (
                  <Card key={item.id} className="overflow-hidden">
                    {item.image_url && (
                      <div className="aspect-square bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.item_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="pt-6 space-y-3">
                      <h3 className="font-serif font-bold">{item.item_name}</h3>

                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}

                      {item.price && (
                        <p className="font-medium text-primary">${item.price.toFixed(2)}</p>
                      )}

                      {item.store_name && (
                        <p className="text-sm text-muted-foreground">Store: {item.store_name}</p>
                      )}

                      <div className="flex flex-col gap-2">
                        {item.store_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.store_url!, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Item
                          </Button>
                        )}

                        {user && (
                          <Button
                            size="sm"
                            variant={isReservedByUser ? "secondary" : "default"}
                            disabled={isReserved && !isReservedByUser}
                            onClick={() => handleReserve(item.id, isReservedByUser)}
                          >
                            {isReserved ? (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                {isReservedByUser ? "Reserved by You" : "Reserved"}
                              </>
                            ) : (
                              "Reserve This Gift"
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Cash Gift Option */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="font-serif">Monetary Gifts</CardTitle>
            <CardDescription>
              If you prefer to give a monetary gift, we would be incredibly grateful
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your generosity will help us start our new life together. Contributions can be made
              via Venmo, Zelle, or check on the day of the wedding.
            </p>
            <div className="flex gap-4">
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Venmo: @SarahAndMichael
              </Button>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Zelle: sarah.michael@email.com
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registry;
