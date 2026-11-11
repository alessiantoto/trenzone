import { setRequestLocale } from "next-intl/server";
import { getAllReviewsServer } from "@/app/actions/public-reviews";
import { ReviewsClient } from "./ReviewsClient";

export const revalidate = 2592000;

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const reviews = await getAllReviewsServer();

  return <ReviewsClient initialReviews={reviews} />;
}
