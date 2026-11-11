/**
 * Sanitizes and formats approved review records for public API and SSR delivery.
 */
export function formatPublicReviews(rawReviews: any[], limit: number = 40) {
  return (rawReviews || []).slice(0, limit).map((r) => ({
    ...r,
    name: r.customer_name || r.name,
    text: r.comment || r.text,
    images: Array.isArray(r.images)
      ? r.images.filter((img: string) => typeof img === 'string' && !img.includes('cdn.shopify.com'))
      : [],
    product: r.product
      ? {
          ...r.product,
          image:
            typeof r.product.image === 'string' && !r.product.image.includes('cdn.shopify.com')
              ? r.product.image
              : '',
        }
      : null,
  }));
}

