import { createSkill, z } from "@daydreamsai/core";

export const signalgateSentiment = createSkill({
  name: "signalgate-sentiment",
  description: "Real-time AI-powered crypto market sentiment for BTC, ETH, and SOL. Returns bullish/bearish/neutral signal with confidence score and reasoning. Costs $0.05 USDC per call via x402 on Base.",
  input: z.object({
    ticker: z.enum(["BTC", "ETH", "SOL"]).describe("Crypto ticker to analyze"),
  }),
  output: z.object({
    ticker: z.string(),
    signal: z.enum(["bullish", "bearish", "neutral"]),
    confidence: z.number(),
    reasoning: z.string(),
    timestamp: z.string(),
  }),
  async execute({ ticker }) {
    const response = await fetch(
      `https://signalgate-web.vercel.app/api/sentiment-x402?ticker=${ticker}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 402) {
      // x402 payment required - agent should handle payment
      const paymentDetails = await response.json();
      throw new Error(`Payment required: ${JSON.stringify(paymentDetails)}`);
    }

    if (!response.ok) {
      throw new Error(`SignalGate API error: ${response.statusText}`);
    }

    return response.json();
  },
});

export default signalgateSentiment;