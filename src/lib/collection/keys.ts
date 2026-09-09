/** Clés de réponses et emplacements de fichiers, partagés entre écrans et récapitulatif. */

export const K = {
  yt: {
    mode: "yt.mode",
    exportImpossible: "yt.exportImpossible",
    missingOverview: "yt.missing.overview",
    missingContent: "yt.missing.content",
    missingAudience: "yt.missing.audience",
  },
  contenus: {
    membresVideos: "c.membresVideos",
    membresDetail: "c.membresDetail",
    guideVipMissing: "c.guideVipMissing",
    skipDixVideos: "c.skipDixVideos",
    traffic: "c.traffic",
    newReturning: "c.newReturning",
  },
  meta: {
    periode: "m.periode",
    periodeAutre: "m.periodeAutre",
    objectifs: "m.objectifs",
    objectifAutre: "m.objectifAutre",
    destination: "m.destination",
    destinationAutre: "m.destinationAutre",
    mode: "m.mode",
    exportImpossible: "m.exportImpossible",
    results: "m.results",
    resultsAutre: "m.resultsAutre",
    resultsMissing: "m.resultsMissing",
    tracking: "m.tracking",
  },
} as const;

export const SLOT = {
  ytExport: "yt.export",
  ytOverview: "yt.capture.overview",
  ytContent: "yt.capture.content",
  ytAudience: "yt.capture.audience",
  guideVip: "c.guideVip",
  dixVideos: "c.dixVideos",
  traffic: "c.traffic",
  newReturning: "c.newReturning",
  metaExport: "m.export",
  metaCaptures: "m.captures",
  metaResults: "m.results",
} as const;
