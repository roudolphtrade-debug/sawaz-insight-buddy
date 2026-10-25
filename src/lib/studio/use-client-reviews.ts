import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listClientReviews } from "@/lib/studio/review.functions";

/**
 * Restitutions du client (lecture seule), partagées par l'onglet Restitution et la carte
 * de synthèse de la Vue d'ensemble : même clé de cache, une seule requête.
 */
export function useClientReviews(clientId: string) {
  const fetchReviews = useServerFn(listClientReviews);
  return useQuery({
    queryKey: ["studio-reviews", clientId],
    queryFn: () => fetchReviews({ data: { clientId } }),
  });
}
