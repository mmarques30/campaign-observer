import { createFileRoute } from "@tanstack/react-router";
import { AdsLayout } from "@/components/ads/AdsLayout";

export const Route = createFileRoute("/_authenticated/ads")({
  component: AdsLayout,
});
