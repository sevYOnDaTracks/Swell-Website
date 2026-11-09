import { ProductPage, productMetadata } from "@/components/shop/ProductPage";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">) {
  return productMetadata((await params).slug);
}

export default function BoutiqueProductPage({ params }: PageProps<"/boutique/[slug]">) {
  return <ProductPage slug={params.then((p) => p.slug)} site="shop" />;
}
