import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('VITE_STRIPE_PUBLIC_KEY not set - payment features will be unavailable');
}
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const PRICING = {
  zhi1: {
    name: "ZHI 1 (Anthropic)",
    prices: [
      { amount: 5, credits: 4275000 },
      { amount: 10, credits: 8977500 },
      { amount: 25, credits: 23512500 },
      { amount: 50, credits: 51300000 },
      { amount: 100, credits: 115425000 },
    ]
  },
  zhi2: {
    name: "ZHI 2 (OpenAI)",
    prices: [
      { amount: 5, credits: 106840 },
      { amount: 10, credits: 224360 },
      { amount: 25, credits: 587625 },
      { amount: 50, credits: 1282100 },
      { amount: 100, credits: 2883400 },
    ]
  },
  zhi3: {
    name: "ZHI 3 (DeepSeek)",
    prices: [
      { amount: 5, credits: 702000 },
      { amount: 10, credits: 1474200 },
      { amount: 25, credits: 3861000 },
      { amount: 50, credits: 8424000 },
      { amount: 100, credits: 18954000 },
    ]
  },
  zhi4: {
    name: "ZHI 4 (Perplexity)",
    prices: [
      { amount: 5, credits: 6410255 },
      { amount: 10, credits: 13461530 },
      { amount: 25, credits: 35256400 },
      { amount: 50, credits: 76923050 },
      { amount: 100, credits: 173176900 },
    ]
  },
};

interface CheckoutFormProps {
  amount: number;
  credits: number;
  provider: string;
}

const CheckoutForm = ({ amount, credits, provider }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/?payment=success',
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">You are purchasing:</p>
        <p className="text-2xl font-bold">{credits.toLocaleString()} words</p>
        <p className="text-sm text-muted-foreground mt-1">for {provider}</p>
      </div>
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? "Processing..." : `Pay $${amount}`}
      </Button>
    </form>
  );
};

interface PriceCardProps {
  amount: number;
  credits: number;
  provider: string;
  onSelect: () => void;
  isPopular?: boolean;
}

const PriceCard = ({ amount, credits, provider, onSelect, isPopular }: PriceCardProps) => {
  return (
    <Card className={`relative ${isPopular ? 'border-primary border-2' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
          Popular
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-3xl">${amount}</CardTitle>
        <CardDescription className="text-lg font-semibold">
          {credits.toLocaleString()} words
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={onSelect} 
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          data-testid={`button-select-${amount}`}
        >
          Purchase
        </Button>
      </CardContent>
    </Card>
  );
};

export default function Checkout() {
  const [selectedPackage, setSelectedPackage] = useState<{ amount: number; credits: number; provider: string } | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSelectPackage = async (amount: number, credits: number, provider: string) => {
    if (!stripePromise) {
      setError("Payment system not configured");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest("POST", "/api/create-payment-intent", { amount, credits, provider });
      const data = await res.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setSelectedPackage({ amount, credits, provider });
      } else {
        throw new Error("No client secret returned");
      }
    } catch (err) {
      console.error("Error creating payment intent:", err);
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (error || !stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Payment Unavailable</CardTitle>
            <CardDescription>{error || "Payment system not configured"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (selectedPackage && clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
            <CardDescription>
              Securely purchase credits for {selectedPackage.provider}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                amount={selectedPackage.amount}
                credits={selectedPackage.credits}
                provider={selectedPackage.provider}
              />
            </Elements>
            <Button 
              variant="ghost" 
              className="w-full mt-4" 
              onClick={() => {
                setSelectedPackage(null);
                setClientSecret("");
              }}
            >
              ← Back to pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Get Credits</h1>
          <p className="text-muted-foreground">Choose your AI provider and credit package</p>
        </div>

        <Tabs defaultValue="zhi1" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="zhi1">ZHI 1</TabsTrigger>
            <TabsTrigger value="zhi2">ZHI 2</TabsTrigger>
            <TabsTrigger value="zhi3">ZHI 3</TabsTrigger>
            <TabsTrigger value="zhi4">ZHI 4</TabsTrigger>
          </TabsList>

          {Object.entries(PRICING).map(([key, data]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              <h2 className="text-2xl font-semibold text-center mb-6">{data.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {data.prices.map((price, index) => (
                  <PriceCard
                    key={price.amount}
                    amount={price.amount}
                    credits={price.credits}
                    provider={data.name}
                    onSelect={() => handleSelectPackage(price.amount, price.credits, data.name)}
                    isPopular={index === 2}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
