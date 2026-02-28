import { createSkill, z } from "@lucid-agents/core";

const SIGNALGATE_URL = "https://signalgate-web.vercel.app/api/sentiment-x402";
const PAYMENT_AMOUNT = "0.05";
const PAYMENT_CURRENCY = "USDC";
const PAYMENT_NETWORK = "base";

async function payAndFetch(url: string, ticker: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${url}?ticker=${ticker}`, {
      signal: controller.signal,
    });

    if (res.status === 402) {
      const paymentDetails = await res.json();
      const { payTo, amount, currency, network, nonce } = paymentDetails;

      const paymentHeader = btoa(
        JSON.stringify({
          payTo,
          amount: amount || PAYMENT_AMOUNT,
          currency: currency || PAYMENT_CURRENCY,
          network: network || PAYMENT_NETWORK,
          nonce,
        })
      );

      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 10000);

      const paidRes = await fetch(`${url}?ticker=${ticker}`, {
        headers: {
          "X-Payment": paymentHeader,
          "Content-Type": "application/json",
        },
        signal: retryController.signal,
      });

      clearTimeout(retryTimeout);

      if (!paidRes.ok) {
        throw new Error(`Payment failed or rejected: ${paidRes.status}`);
      }

      return await paidRes.json();
    }

    if (!res.ok) {
      throw new Error(`SignalGate API error: ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const signalgateSentiment = createSkill({
  name: "signalgate-sentiment",
  description:
    "Real-time AI-powered crypto market sentiment for BTC, ETH, and SOL. Returns bullish/bearish/neutral signal with confidence score and reasoning. Costs $0.05 USDC per call via x402 micropayment on Base — no API key needed.",
  input: z.object({
    ticker: z
      .enum(["BTC", "ETH", "SOL"])
      .describe("The crypto asset to get sentiment for"),
  }),
  output: z.object({
    ticker: z.string(),
    signal: z.enum(["bullish", "bearish", "neutral"]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  }),
  async execute({ ticker }: { ticker: "BTC" | "ETH" | "SOL" }) {
    const data = await payAndFetch(SIGNALGATE_URL, ticker);
    return {
      ticker: data.ticker,
      signal: data.signal,
      confidence: data.confidence,
      reasoning: data.reasoning,
    };
  },
});

export default signalgateSentiment;
