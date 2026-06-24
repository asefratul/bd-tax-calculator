import { Analytics } from "@vercel/analytics/react";
import BDTaxCalculator from "./components/BDTaxCalculator.jsx";

export default function App() {
  return (
    <>
      <BDTaxCalculator />
      <Analytics />
    </>
  );
}
