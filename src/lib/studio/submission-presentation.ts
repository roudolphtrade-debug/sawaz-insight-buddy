const ANSWER_LABEL: Record<string, string> = {
  "yt.mode": "Mode de transmission YouTube",
  "yt.exportImpossible": "Export YouTube impossible",
  "yt.missing.overview": "Vue d’ensemble YouTube indisponible",
  "yt.missing.content": "Données de contenu YouTube indisponibles",
  "yt.missing.audience": "Données d’audience YouTube indisponibles",
  "c.membresVideos": "Vidéos destinées aux membres",
  "c.membresDetail": "Précision sur les vidéos membres",
  "c.guideVipMissing": "Donnée Guide VIP indisponible",
  "c.skipDixVideos": "Analyse des 10 vidéos reportée",
  "c.traffic": "Sources de trafic disponibles",
  "c.newReturning": "Nouveaux vs spectateurs récurrents",
  "m.periode": "Période Meta",
  "m.periodeAutre": "Autre période Meta",
  "m.objectifs": "Objectifs de campagne Meta",
  "m.objectifAutre": "Autre objectif Meta",
  "m.destination": "Destination après le clic",
  "m.destinationAutre": "Autre destination",
  "m.mode": "Mode de transmission Meta",
  "m.exportImpossible": "Export Meta impossible",
  "m.results": "Résultats suivis dans Meta",
  "m.resultsAutre": "Autre résultat Meta",
  "m.resultsMissing": "Donnée Results indisponible",
  "m.tracking": "Suivi Meta installé",
};

export function answerLabel(key: string): string {
  return ANSWER_LABEL[key] ?? "Information complémentaire";
}

type RespondentIdentity = {
  respondent: string | null;
  respondentEmail: string | null;
};

/** Collection recipients are invitees, not proof of who submitted a response. */
export function deterministicRespondent(
  identity: RespondentIdentity,
  source: "submission-contact" | "collection-recipient",
): RespondentIdentity | null {
  if (source !== "submission-contact") return null;
  const respondent = identity.respondent?.trim() || null;
  const respondentEmail = identity.respondentEmail?.trim() || null;
  return respondent || respondentEmail ? { respondent, respondentEmail } : null;
}