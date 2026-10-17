import { OptionToggle } from "@/components/OptionToggle";
import { missingFlagEvidence, missingFlagRule } from "@/lib/collection/rules";
import { useCollection } from "@/lib/collection/store";

/**
 * Indicateur « Je ne trouve pas cette donnée » (ou équivalent) relié à sa preuve
 * (voir `MISSING_FLAG_RULES`) : il ne peut pas être activé tant qu'un fichier confirmé
 * — ou une réponse précise — existe pour le même élément. Rien n'est jamais supprimé
 * silencieusement : l'utilisateur est invité à retirer lui-même la preuve d'abord.
 * L'inverse (preuve arrivée après coup) est corrigé par le store.
 */
export function MissingToggle({ flagKey, label }: { flagKey: string; label: string }) {
  const { state, setAnswer } = useCollection();
  const checked = state.answers[flagKey] === true;
  const rule = missingFlagRule(flagKey);
  const evidence = rule ? missingFlagEvidence(state, rule) : null;
  const blockedReason =
    rule && evidence ? (evidence === "answer" ? rule.answerNotice : rule.fileNotice) : undefined;

  return (
    <OptionToggle
      label={label}
      checked={checked}
      onToggle={() => setAnswer(flagKey, !checked)}
      blockedReason={blockedReason}
    />
  );
}
