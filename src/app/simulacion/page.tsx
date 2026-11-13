import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimulationApp } from "@/components/simulation/SimulationApp";
import { showSimulation } from "@/config/features";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Simulación",
  description: "Recorrido guiado de cómo funciona la venta de entradas y el panel de Algo Lindo.",
  robots: { index: false },
};

export default function SimulationPage() {
  if (!showSimulation) notFound();
  // `now` viene del servidor para que server y cliente rendericen las mismas fechas.
  return <SimulationApp now={Date.now()} />;
}
