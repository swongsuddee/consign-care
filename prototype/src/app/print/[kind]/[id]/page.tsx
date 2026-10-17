import { Suspense } from "react";
import { staticDocs } from "@/lib/static-params";
import View from "./View";

export const generateStaticParams = () => staticDocs();

export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  return (
    <Suspense>
      <View kind={kind} id={id} />
    </Suspense>
  );
}
