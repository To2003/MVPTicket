import { handleMpReturn } from "../return-handler";

export const dynamic = "force-dynamic";

export default async function MpReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await handleMpReturn(searchParams);
  return null;
}
