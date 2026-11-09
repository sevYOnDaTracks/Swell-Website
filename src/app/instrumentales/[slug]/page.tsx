import { ProductPage, productMetadata } from "@/components/shop/ProductPage";

export async function generateMetadata({ params }: PageProps<"/instrumentales/[slug]">) {
  return productMetadata((await params).slug);
}

export default function InstrumentalProductPage({ params }: PageProps<"/instrumentales/[slug]">) {
  return <ProductPage slug={params.then((p) => p.slug)} site="mix" />;
}
