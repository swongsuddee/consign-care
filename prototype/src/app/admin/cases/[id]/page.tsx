import { Suspense } from "react";
import { staticIds } from "@/lib/static-params";
import View from "./View";

export const generateStaticParams = () => staticIds("cases");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <View id={id} />
    </Suspense>
  );
}
